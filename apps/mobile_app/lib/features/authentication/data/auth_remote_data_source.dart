import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';
import 'package:smrkomed_doctor_app/core/network/safe_http_failure.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_js_cookies.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_js_http_client.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_user.dart';

/// Talks to existing Auth.js (`apps/web`) and Hono (`GET /api/v1/users/me`).
/// Does not invent mobile-only endpoints.
class AuthRemoteDataSource {
  AuthRemoteDataSource({
    required AppConfig config,
    required ApiClient apiClient,
    required AppLogger logger,
    Dio? webDio,
    AuthWebTransport? transport,
  }) : _config = config,
       _apiClient = apiClient,
       _logger = logger,
       _transport =
           transport ??
           (webDio != null
               ? DioAuthWebTransport(webDio)
               : IoAuthWebTransport(config, logger: logger));

  final AppConfig _config;
  final ApiClient _apiClient;
  final AppLogger _logger;
  final AuthWebTransport _transport;

  Future<AuthJsSessionCookie> loginAndReadSessionToken({
    required String email,
    required String password,
  }) async {
    _logger.info(
      'Auth.js credentials sign-in started',
      context: {'origin': _config.webAuthOrigin, 'auth_diag': 'v4'},
    );
    try {
      final cookies = AuthJsCookieJar();
      final normalizedEmail = email.trim().toLowerCase();
      await _ensureDemoWorkspaceIfNeeded(normalizedEmail, cookies);

      final csrfResponse = await _transport.get(
        WebAuthPaths.csrf,
        followRedirects: true,
      );
      _logStatus(WebAuthPaths.csrf, csrfResponse.statusCode);
      cookies.addFromSetCookieHeaders(csrfResponse.setCookie);

      final csrfBody = asJson(csrfResponse.data);
      final csrfToken =
          csrfTokenFromBody(csrfBody) ?? cookies.csrfTokenFromCookie();
      _logger.info(
        'Auth.js csrf parsed',
        context: {
          'path': WebAuthPaths.csrf,
          'statusCode': csrfResponse.statusCode,
          'bodyKind': csrfResponse.data.runtimeType.toString(),
          'parsedCsrf': csrfToken != null && csrfToken.isNotEmpty,
          'csrfHeaderCount': csrfResponse.setCookie.length,
        },
      );
      if (csrfToken == null || csrfToken.isEmpty) {
        throw AppException.unknown('Authentication failed.');
      }

      final credentialFields = {
        'csrfToken': csrfToken,
        'email': normalizedEmail,
        'password': password,
        'redirect': 'false',
        'json': 'true',
        'callbackUrl': '${_config.webAuthOrigin}/home',
      };
      final loginResponse = await _postCredentials(
        WebAuthPaths.credentialsCallback,
        fields: credentialFields,
        cookieHeader: cookies.cookieHeader,
      );
      _logStatus(WebAuthPaths.credentialsCallback, loginResponse.statusCode);
      cookies.addFromSetCookieHeaders(loginResponse.setCookie);

      var loginBody = asJson(loginResponse.data);
      if (isCredentialsSignInFailure(
        loginBody,
        loginResponse.statusCode,
        loginResponse.location,
      )) {
        throw AppException.unauthorized('Invalid email or password.');
      }

      var session = cookies.sessionCookie();
      if (session == null || session.value.isEmpty) {
        final fallback = await _postCredentials(
          WebAuthPaths.credentialsSignIn,
          fields: credentialFields,
          cookieHeader: cookies.cookieHeader,
        );
        _logStatus(WebAuthPaths.credentialsSignIn, fallback.statusCode);
        cookies.addFromSetCookieHeaders(fallback.setCookie);
        loginBody = asJson(fallback.data);
        if (isCredentialsSignInFailure(
          loginBody,
          fallback.statusCode,
          fallback.location,
        )) {
          throw AppException.unauthorized('Invalid email or password.');
        }
        session = cookies.sessionCookie();
      }

      if (session == null || session.value.isEmpty) {
        throw AppException.server('Session could not be established.');
      }
      _logger.info(
        'Auth.js session cookie received',
        context: {
          'statusCode': loginResponse.statusCode,
          'headerName': session.name,
        },
      );
      return session;
    } on AppException {
      rethrow;
    } on TimeoutException {
      _logger.warn(
        'Auth.js sign-in failed',
        context: {'category': 'TimeoutException'},
      );
      throw const AppException(
        kind: AppErrorKind.timeout,
        message: 'Unable to reach sign-in service',
        code: 'TIMEOUT',
      );
    } on DioException catch (error) {
      throw _mapSignInDioException(error);
    } on HandshakeException catch (error) {
      throw _mapIoFailure(error, WebAuthPaths.csrf);
    } on TlsException catch (error) {
      throw _mapIoFailure(error, WebAuthPaths.csrf);
    } on SocketException catch (error) {
      throw _mapIoFailure(error, WebAuthPaths.csrf);
    } on HttpException catch (error) {
      throw _mapIoFailure(error, WebAuthPaths.csrf);
    } catch (error) {
      _logger.warn(
        'Auth.js sign-in failed',
        context: {'category': error.runtimeType.toString()},
      );
      throw AppException.unknown('Authentication failed.');
    }
  }

  Future<void> _ensureDemoWorkspaceIfNeeded(
    String email,
    AuthJsCookieJar cookies,
  ) async {
    if (!email.endsWith('@abcfertility.demo')) return;
    try {
      final setup = await _transport.postForm(
        '/api/demo/setup',
        fields: const {},
        followRedirects: true,
        timeout: const Duration(seconds: 4),
      );
      cookies.addFromSetCookieHeaders(setup.setCookie);
      _logger.info(
        'Demo workspace setup',
        context: {'path': '/api/demo/setup', 'statusCode': setup.statusCode},
      );
    } catch (error) {
      _logger.warn(
        'Demo workspace setup skipped',
        context: {'category': error.runtimeType.toString()},
      );
    }
  }

  Future<AuthHttpExchange> _postCredentials(
    String path, {
    required Map<String, String> fields,
    required String? cookieHeader,
  }) async {
    try {
      return await _transport.postForm(
        path,
        fields: fields,
        cookieHeader: cookieHeader,
        followRedirects: false,
      );
    } on TimeoutException {
      _logger.warn(
        'Auth.js credentials retry after timeout',
        context: {'path': path},
      );
      return _transport.postForm(
        path,
        fields: fields,
        cookieHeader: cookieHeader,
        followRedirects: false,
      );
    }
  }

  AppException _mapIoFailure(Object error, String path) {
    final isTls =
        error is HandshakeException ||
        error is TlsException ||
        error is CertificateException;
    _logger.warn(
      'Auth.js request failed',
      context: {
        'path': path,
        'host': _config.webAuthOrigin,
        'statusCode': null,
        'category': isTls ? 'tls' : 'io',
        'exceptionType': error.runtimeType.toString(),
        'safeError': error.toString().split('\n').first,
        'tls': isTls,
      },
    );
    return const AppException(
      kind: AppErrorKind.networkUnavailable,
      message: 'Unable to reach sign-in service',
      code: 'NETWORK_UNAVAILABLE',
    );
  }

  AppException _mapSignInDioException(DioException error) {
    final failure = SafeHttpFailure.fromDio(error);
    _logger.warn('Auth.js request failed', context: failure.toLogContext());
    final mapped = mapDioException(error);
    if (mapped.kind == AppErrorKind.networkUnavailable ||
        mapped.kind == AppErrorKind.timeout ||
        failure.isTls) {
      return AppException(
        kind: mapped.kind == AppErrorKind.timeout
            ? AppErrorKind.timeout
            : AppErrorKind.networkUnavailable,
        message: 'Unable to reach sign-in service',
        code: mapped.code,
      );
    }
    if (mapped.kind == AppErrorKind.unauthorized) {
      return AppException.unauthorized('Invalid email or password.');
    }
    return AppException.unknown('Authentication failed.');
  }

  Future<AuthUser> fetchCurrentUser() async {
    try {
      return await _apiClient.get<AuthUser>(
        ApiPaths.usersMe,
        parse: (data) {
          if (data is! Map) {
            throw AppException.server('Unable to load doctor profile.');
          }
          return AuthUser.fromJson(Map<String, dynamic>.from(data));
        },
      );
    } on AppException catch (error) {
      _logger.warn(
        'Doctor profile request failed',
        context: {
          'path': ApiPaths.usersMe,
          'statusCode': error.statusCode,
          'category': error.kind.name,
        },
      );
      if (error.kind == AppErrorKind.unauthorized) {
        throw AppException.server('Session could not be established.');
      }
      if (error.message == 'Unable to load doctor profile.') rethrow;
      throw AppException.server('Unable to load doctor profile.');
    } catch (_) {
      throw AppException.server('Unable to load doctor profile.');
    }
  }

  Future<void> signOutOnWeb(String sessionToken) async {
    try {
      await _transport.postForm(
        WebAuthPaths.signOut,
        fields: const {},
        cookieHeader: 'authjs.session-token=$sessionToken',
      );
    } catch (error) {
      _logger.warn(
        'Web sign-out skipped',
        context: {'reason': error.runtimeType.toString()},
      );
    }
  }

  void _logStatus(String path, int? statusCode) {
    _logger.info(
      'Auth.js response',
      context: {'path': path, 'statusCode': statusCode},
    );
  }

  String get webOrigin => _config.webAuthOrigin;
}
