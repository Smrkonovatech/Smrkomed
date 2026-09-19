import 'package:dio/dio.dart';

/// Retries safe methods only. Never retries POST/PATCH/PUT/DELETE.
class SafeRetryInterceptor extends Interceptor {
  SafeRetryInterceptor(this._dio, {this.maxRetries = 2});

  final Dio _dio;
  final int maxRetries;

  static const _retryable = {'GET', 'HEAD'};

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final method = err.requestOptions.method.toUpperCase();
    if (!_retryable.contains(method)) {
      handler.next(err);
      return;
    }
    final attempt = err.requestOptions.extra['retryAttempt'] as int? ?? 0;
    if (attempt >= maxRetries || !_shouldRetry(err)) {
      handler.next(err);
      return;
    }
    await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
    final options = err.requestOptions;
    options.extra['retryAttempt'] = attempt + 1;
    try {
      final response = await _dio.fetch<dynamic>(options);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  bool _shouldRetry(DioException err) {
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      return true;
    }
    final status = err.response?.statusCode ?? 0;
    return status == 408 || status == 429 || status >= 500;
  }
}
