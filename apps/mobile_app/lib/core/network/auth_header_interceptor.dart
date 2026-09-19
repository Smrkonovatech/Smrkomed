import 'package:dio/dio.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';

typedef SessionExpiredCallback = void Function();

class AuthHeaderInterceptor extends Interceptor {
  AuthHeaderInterceptor({
    required SessionStore sessionStore,
    required AppLogger logger,
    this.onUnauthorized,
  }) : _sessionStore = sessionStore,
       _logger = logger;

  final SessionStore _sessionStore;
  final AppLogger _logger;
  final SessionExpiredCallback? onUnauthorized;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final session = await _sessionStore.read();
    if (session != null) {
      options.headers['Authorization'] = 'Bearer ${session.accessToken}';
      final cookieName = session.cookieName;
      if (cookieName != null && cookieName.isNotEmpty) {
        options.headers['Cookie'] = '$cookieName=${session.accessToken}';
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      _logger.warn(
        'Session rejected by API',
        context: {'statusCode': 401, 'path': err.requestOptions.uri.path},
      );
      onUnauthorized?.call();
    }
    handler.next(err);
  }
}
