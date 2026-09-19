import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';

class AuthHttpExchange {
  const AuthHttpExchange({
    required this.statusCode,
    required this.data,
    required this.setCookie,
    this.location,
  });

  final int statusCode;
  final dynamic data;
  final List<String> setCookie;
  final String? location;
}

abstract class AuthWebTransport {
  Future<AuthHttpExchange> get(
    String path, {
    bool followRedirects = true,
    Duration? timeout,
  });

  Future<AuthHttpExchange> postForm(
    String path, {
    required Map<String, String> fields,
    String? cookieHeader,
    bool followRedirects = false,
    Duration? timeout,
  });
}

/// Production Auth.js transport. Uses dart:io cookies (`response.cookies`)
/// instead of relying on Dio to surface `Set-Cookie`.
class IoAuthWebTransport implements AuthWebTransport {
  IoAuthWebTransport(this._config, {AppLogger? logger})
    : _logger = logger,
      _origins = AppConfig.webAuthOrigins(_config);

  final AppConfig _config;
  final AppLogger? _logger;
  final List<String> _origins;
  int _originIndex = 0;
  HttpClient? _client;

  String get _origin => _origins[_originIndex];

  HttpClient _http() {
    return _client ??= HttpClient()
      ..connectionTimeout = _config.connectTimeout
      ..userAgent = 'SMRKoMedDoctorApp/1.0';
  }

  void _closeClient() {
    _client?.close(force: true);
    _client = null;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse(_origin);
    return base.replace(
      path: path,
      queryParameters: query == null || query.isEmpty ? null : query,
    );
  }

  void _commonHeaders(HttpHeaders headers, {String? cookieHeader}) {
    headers.set(HttpHeaders.acceptHeader, 'application/json');
    headers.set('Origin', _origin);
    headers.set('Referer', '$_origin/login');
    if (cookieHeader != null && cookieHeader.isNotEmpty) {
      headers.set(HttpHeaders.cookieHeader, cookieHeader);
    }
  }

  Future<AuthHttpExchange> _withTlsFallback(
    Future<AuthHttpExchange> Function() send,
  ) async {
    Object? last;
    for (var i = _originIndex; i < _origins.length; i++) {
      _originIndex = i;
      try {
        return await send();
      } on HandshakeException catch (error) {
        last = error;
        _noteTlsFailure(error);
      } on TlsException catch (error) {
        last = error;
        _noteTlsFailure(error);
      }
    }
    Error.throwWithStackTrace(last!, StackTrace.current);
  }

  void _noteTlsFailure(Object error) {
    final next = _originIndex + 1;
    _logger?.warn(
      'Auth.js TLS fallback',
      context: {
        'fromHost': _origin,
        'toHost': next < _origins.length ? _origins[next] : 'none',
        'exceptionType': error.runtimeType.toString(),
      },
    );
    _closeClient();
  }

  Future<AuthHttpExchange> _finish(
    HttpClientResponse response, {
    required Duration timeout,
  }) async {
    final body = await utf8.decodeStream(response).timeout(timeout);
    final cookies = <String>[
      ...?response.headers[HttpHeaders.setCookieHeader],
      ...response.cookies.map((cookie) => '${cookie.name}=${cookie.value}'),
    ];
    return AuthHttpExchange(
      statusCode: response.statusCode,
      data: body,
      setCookie: cookies,
      location: response.headers.value(HttpHeaders.locationHeader),
    );
  }

  Future<AuthHttpExchange> _exchange({
    required Future<HttpClientRequest> Function() open,
    required void Function(HttpClientRequest request) configure,
    required Duration timeout,
  }) {
    return _withTlsFallback(() async {
      late final HttpClientRequest request;
      try {
        request = await open().timeout(timeout);
      } on TimeoutException {
        _closeClient();
        rethrow;
      }
      configure(request);
      try {
        final response = await request.close().timeout(timeout);
        return _finish(response, timeout: timeout);
      } on TimeoutException {
        try {
          request.abort();
        } catch (_) {}
        _closeClient();
        rethrow;
      } catch (_) {
        _closeClient();
        rethrow;
      }
    });
  }

  @override
  Future<AuthHttpExchange> get(
    String path, {
    bool followRedirects = true,
    Duration? timeout,
  }) {
    final limit = timeout ?? _config.receiveTimeout;
    return _exchange(
      open: () => _http().getUrl(_uri(path)),
      timeout: limit,
      configure: (request) {
        request.followRedirects = followRedirects;
        request.maxRedirects = 5;
        _commonHeaders(request.headers);
      },
    );
  }

  @override
  Future<AuthHttpExchange> postForm(
    String path, {
    required Map<String, String> fields,
    String? cookieHeader,
    bool followRedirects = false,
    Duration? timeout,
  }) {
    final limit = timeout ?? _config.receiveTimeout;
    return _exchange(
      open: () => _http().postUrl(_uri(path, const {'json': 'true'})),
      timeout: limit,
      configure: (request) {
        request.followRedirects = followRedirects;
        request.maxRedirects = 5;
        _commonHeaders(request.headers, cookieHeader: cookieHeader);
        request.headers.contentType = ContentType(
          'application',
          'x-www-form-urlencoded',
          charset: 'utf-8',
        );
        request.write(
          fields.entries
              .map(
                (e) =>
                    '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}',
              )
              .join('&'),
        );
      },
    );
  }
}

class DioAuthWebTransport implements AuthWebTransport {
  DioAuthWebTransport(this._dio);

  final Dio _dio;

  @override
  Future<AuthHttpExchange> get(
    String path, {
    bool followRedirects = true,
    Duration? timeout,
  }) async {
    final response = await _dio.get<dynamic>(
      path,
      options: Options(
        followRedirects: followRedirects,
        maxRedirects: 5,
        responseType: ResponseType.plain,
        receiveTimeout: timeout,
        sendTimeout: timeout,
        validateStatus: (status) => status != null && status < 500,
      ),
    );
    return _fromDio(response);
  }

  @override
  Future<AuthHttpExchange> postForm(
    String path, {
    required Map<String, String> fields,
    String? cookieHeader,
    bool followRedirects = false,
    Duration? timeout,
  }) async {
    final response = await _dio.post<dynamic>(
      path,
      queryParameters: const {'json': 'true'},
      data: fields,
      options: Options(
        contentType: Headers.formUrlEncodedContentType,
        followRedirects: followRedirects,
        maxRedirects: 5,
        responseType: ResponseType.plain,
        receiveTimeout: timeout,
        sendTimeout: timeout,
        validateStatus: (status) => status != null && status < 500,
        headers: {'Cookie': ?cookieHeader},
      ),
    );
    return _fromDio(response);
  }

  AuthHttpExchange _fromDio(Response<dynamic> response) {
    return AuthHttpExchange(
      statusCode: response.statusCode ?? 0,
      data: response.data,
      setCookie: response.headers.map['set-cookie'] ?? const [],
      location: response.headers.value('location'),
    );
  }
}
