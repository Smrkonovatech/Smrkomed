import 'package:dio/dio.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_envelope.dart';
import 'package:smrkomed_doctor_app/core/network/auth_header_interceptor.dart';
import 'package:smrkomed_doctor_app/core/network/safe_http_failure.dart';
import 'package:smrkomed_doctor_app/core/network/safe_retry_interceptor.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';

class ApiClient {
  ApiClient({
    required AppConfig config,
    required SessionStore sessionStore,
    required AppLogger logger,
    SessionExpiredCallback? onUnauthorized,
    Dio? dio,
  }) : _dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: config.apiV1BaseUrl,
               connectTimeout: config.connectTimeout,
               receiveTimeout: config.receiveTimeout,
               sendTimeout: config.sendTimeout,
               headers: {
                 'Accept': 'application/json',
                 'Content-Type': 'application/json',
                 'x-clinic-id': config.defaultClinicId,
               },
             ),
           ) {
    if (dio == null) {
      _dio.interceptors.addAll([
        AuthHeaderInterceptor(
          sessionStore: sessionStore,
          logger: logger,
          clinicId: config.defaultClinicId,
          onUnauthorized: onUnauthorized,
        ),
        SafeRetryInterceptor(_dio),
      ]);
    }
  }

  final Dio _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? query,
    T Function(dynamic data)? parse,
  }) {
    final mergedQuery = <String, dynamic>{
      ...?query,
      if (query == null || !query.containsKey('clinicId'))
        'clinicId': 'kochi',
    };
    return _send(
      () => _dio.get<dynamic>(path, queryParameters: mergedQuery),
      parse: parse,
    );
  }

  Future<T> post<T>(
    String path, {
    Object? data,
    T Function(dynamic data)? parse,
  }) {
    return _send(() => _dio.post<dynamic>(path, data: data), parse: parse);
  }

  Future<T> put<T>(
    String path, {
    Object? data,
    T Function(dynamic data)? parse,
  }) {
    return _send(() => _dio.put<dynamic>(path, data: data), parse: parse);
  }

  Future<T> patch<T>(
    String path, {
    Object? data,
    T Function(dynamic data)? parse,
  }) {
    return _send(() => _dio.patch<dynamic>(path, data: data), parse: parse);
  }

  Future<T> delete<T>(
    String path, {
    Object? data,
    T Function(dynamic data)? parse,
  }) {
    return _send(() => _dio.delete<dynamic>(path, data: data), parse: parse);
  }

  Future<T> _send<T>(
    Future<Response<dynamic>> Function() request, {
    T Function(dynamic data)? parse,
  }) async {
    try {
      final response = await request();
      final envelope = ApiEnvelope.parse(response.data);
      if (envelope.success == false) {
        throw AppException.fromHttpStatus(
          statusCode: response.statusCode ?? 400,
          code: envelope.errorCode,
          message: envelope.errorMessage,
          requestId: envelope.requestId,
        );
      }
      final data = envelope.data ?? response.data;
      if (parse != null) return parse(data);
      return data as T;
    } on AppException {
      rethrow;
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }
}
