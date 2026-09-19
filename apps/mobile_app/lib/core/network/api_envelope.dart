class ApiEnvelope<T> {
  const ApiEnvelope({
    required this.success,
    this.data,
    this.errorCode,
    this.errorMessage,
    this.requestId,
  });

  final bool success;
  final T? data;
  final String? errorCode;
  final String? errorMessage;
  final String? requestId;

  static ApiEnvelope<dynamic> parse(dynamic body) {
    if (body is! Map) {
      return const ApiEnvelope(success: true, data: null);
    }
    final map = Map<String, dynamic>.from(body);
    final success = map['success'] == true;
    final error = map['error'];
    String? code;
    String? message;
    String? requestId;
    if (error is Map) {
      code = error['code'] as String?;
      message = error['message'] as String?;
      requestId = error['requestId'] as String?;
    }
    return ApiEnvelope(
      success: success,
      data: map['data'],
      errorCode: code,
      errorMessage: message,
      requestId: requestId,
    );
  }
}
