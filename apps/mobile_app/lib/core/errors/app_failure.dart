import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';

/// Presentation-ready error. Never includes tokens, PHI, or stack traces.
class AppFailure {
  const AppFailure({required this.kind, required this.userMessage, this.code});

  final AppErrorKind kind;
  final String userMessage;
  final String? code;

  factory AppFailure.from(AppException exception) {
    return AppFailure(
      kind: exception.kind,
      userMessage: exception.message,
      code: exception.code,
    );
  }
}
