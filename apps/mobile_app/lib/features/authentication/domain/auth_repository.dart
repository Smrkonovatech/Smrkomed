import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_user.dart';

class LoginCredentials {
  const LoginCredentials({
    required this.email,
    required this.password,
    this.rememberForThirtyDays = false,
  });

  final String email;
  final String password;

  /// Remembers the email on this device. The session JWT is always stored
  /// securely until logout. Never persist the password.
  final bool rememberForThirtyDays;
}

class AuthSession {
  const AuthSession({required this.user, required this.accessToken});

  final AuthUser user;
  final String accessToken;
}

abstract class AuthRepository {
  Future<AuthSession> login(LoginCredentials credentials);
  Future<void> logout();
  Future<AuthSession?> restoreSession();
  Future<AuthUser> validateSession();

  /// Backend does not currently expose a password-reset API.
  Future<void> requestPasswordReset(String email);
}

class PasswordResetUnavailableException extends AppException {
  const PasswordResetUnavailableException()
    : super(
        kind: AppErrorKind.unknown,
        message:
            'Password reset is not available from this app yet. Ask your clinic administrator to reset access from the web application.',
        code: 'PASSWORD_RESET_UNAVAILABLE',
      );
}
