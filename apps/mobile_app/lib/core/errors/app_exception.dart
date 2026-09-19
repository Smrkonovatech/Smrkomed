enum AppErrorKind {
  networkUnavailable,
  timeout,
  unauthorized,
  forbidden,
  validation,
  serverFailure,
  unknown,
}

class AppException implements Exception {
  const AppException({
    required this.kind,
    required this.message,
    this.code,
    this.statusCode,
    this.requestId,
  });

  final AppErrorKind kind;
  final String message;
  final String? code;
  final int? statusCode;
  final String? requestId;

  factory AppException.network() => const AppException(
    kind: AppErrorKind.networkUnavailable,
    message: 'You appear to be offline.',
    code: 'NETWORK_UNAVAILABLE',
  );

  factory AppException.timeout() => const AppException(
    kind: AppErrorKind.timeout,
    message: 'The request took too long. Try again.',
    code: 'TIMEOUT',
  );

  factory AppException.unauthorized([String? message]) => AppException(
    kind: AppErrorKind.unauthorized,
    message: message ?? 'Your session expired. Please sign in again.',
    code: 'UNAUTHENTICATED',
    statusCode: 401,
  );

  factory AppException.forbidden([String? message]) => AppException(
    kind: AppErrorKind.forbidden,
    message: message ?? 'You do not have access to this action.',
    code: 'FORBIDDEN',
    statusCode: 403,
  );

  factory AppException.validation([String? message]) => AppException(
    kind: AppErrorKind.validation,
    message: message ?? 'Please check the highlighted fields.',
    code: 'VALIDATION',
    statusCode: 422,
  );

  factory AppException.server([
    String? message,
    int? statusCode,
    String? requestId,
  ]) => AppException(
    kind: AppErrorKind.serverFailure,
    message: message ?? 'Something went wrong. Please try again.',
    code: 'SERVER_FAILURE',
    statusCode: statusCode,
    requestId: requestId,
  );

  factory AppException.unknown([String? message]) => AppException(
    kind: AppErrorKind.unknown,
    message: message ?? 'An unexpected error occurred.',
    code: 'UNKNOWN',
  );

  factory AppException.fromHttpStatus({
    required int statusCode,
    String? code,
    String? message,
    String? requestId,
  }) {
    final safeMessage = _safeClientMessage(message);
    if (statusCode == 401) {
      return AppException.unauthorized(safeMessage);
    }
    if (statusCode == 403) {
      return AppException.forbidden(safeMessage);
    }
    if (statusCode == 408) {
      return AppException.timeout();
    }
    if (statusCode == 422 || statusCode == 400) {
      return AppException.validation(safeMessage);
    }
    if (statusCode >= 500) {
      return AppException.server(safeMessage, statusCode, requestId);
    }
    return AppException(
      kind: AppErrorKind.unknown,
      message: safeMessage ?? 'An unexpected error occurred.',
      code: code ?? 'HTTP_$statusCode',
      statusCode: statusCode,
      requestId: requestId,
    );
  }

  static String? _safeClientMessage(String? message) {
    if (message == null || message.trim().isEmpty) return null;
    final lower = message.toLowerCase();
    if (lower.contains('password') ||
        lower.contains('token') ||
        lower.contains('secret') ||
        lower.contains('stack') ||
        lower.contains('sql')) {
      return null;
    }
    return message;
  }

  @override
  String toString() => 'AppException($kind, $code, $statusCode)';
}
