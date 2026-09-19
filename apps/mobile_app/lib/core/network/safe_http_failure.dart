import 'dart:io';

import 'package:dio/dio.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/network/api_envelope.dart';

/// Safe, non-secret summary of a failed HTTP attempt.
class SafeHttpFailure {
  const SafeHttpFailure({
    required this.category,
    required this.exceptionType,
    required this.host,
    required this.path,
    required this.safeError,
    this.innerType,
    this.statusCode,
    this.isTls = false,
    this.isSocket = false,
    this.isDns = false,
    this.isTimeout = false,
  });

  final String category;
  final String exceptionType;
  final String? innerType;
  final String host;
  final String path;
  final String safeError;
  final int? statusCode;
  final bool isTls;
  final bool isSocket;
  final bool isDns;
  final bool isTimeout;

  Map<String, Object?> toLogContext() => {
    'category': category,
    'exceptionType': exceptionType,
    'innerType': innerType,
    'host': host,
    'path': path,
    'statusCode': statusCode,
    'safeError': safeError,
    'tls': isTls,
    'socket': isSocket,
    'dns': isDns,
    'timeout': isTimeout,
  };

  static SafeHttpFailure fromDio(DioException error) {
    final uri = error.requestOptions.uri;
    final inner = error.error;
    final raw = _firstLine('${error.message ?? ''} ${inner ?? ''}');
    final isTimeout =
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout;
    final isTls =
        inner is HandshakeException ||
        inner is TlsException ||
        inner is CertificateException ||
        error.type == DioExceptionType.badCertificate ||
        raw.contains('HandshakeException') ||
        raw.contains('TlsException') ||
        raw.contains('CERTIFICATE_VERIFY_FAILED');
    final isDns =
        inner is SocketException &&
        (inner.osError?.errorCode == 8 ||
            inner.message.contains('Failed host lookup'));
    final isSocket =
        inner is SocketException || raw.contains('SocketException');
    return SafeHttpFailure(
      category: error.type.name,
      exceptionType: error.runtimeType.toString(),
      innerType: inner?.runtimeType.toString(),
      host: uri.host,
      path: uri.path,
      safeError: _safe(raw),
      statusCode: error.response?.statusCode,
      isTls: isTls,
      isSocket: isSocket,
      isDns: isDns,
      isTimeout: isTimeout,
    );
  }

  static String _firstLine(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'none';
    return trimmed.split('\n').first;
  }

  static String _safe(String value) {
    var out = value;
    out = out.replaceAll(
      RegExp(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', caseSensitive: false),
      'Bearer [REDACTED]',
    );
    if (out.length > 180) out = out.substring(0, 180);
    return out;
  }
}

AppException mapDioException(DioException error) {
  final failure = SafeHttpFailure.fromDio(error);
  if (failure.isTimeout) return AppException.timeout();
  if (failure.isTls || failure.isDns || failure.isSocket) {
    return AppException.network();
  }
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return AppException.timeout();
    case DioExceptionType.connectionError:
    case DioExceptionType.badCertificate:
      return AppException.network();
    case DioExceptionType.badResponse:
      final status = error.response?.statusCode ?? 0;
      final envelope = ApiEnvelope.parse(error.response?.data);
      return AppException.fromHttpStatus(
        statusCode: status,
        code: envelope.errorCode,
        message: envelope.errorMessage,
        requestId: envelope.requestId,
      );
    case DioExceptionType.cancel:
      return AppException.unknown('Request cancelled.');
    case DioExceptionType.unknown:
    case DioExceptionType.transformTimeout:
      return AppException.unknown();
  }
}
