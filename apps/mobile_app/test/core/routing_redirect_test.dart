import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/core/routing/app_router.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';

void main() {
  AuthState unauth() => const AuthState(status: AuthStatus.unauthenticated);
  AuthState auth() => const AuthState(status: AuthStatus.authenticated);
  AuthState unknown() => const AuthState(status: AuthStatus.unknown);
  AuthState bio() => const AuthState(status: AuthStatus.needsBiometric);

  test('unauthenticated users are sent to login except public routes', () {
    expect(authRedirect(unauth(), AppRoutes.home), AppRoutes.login);
    expect(authRedirect(unauth(), AppRoutes.login), isNull);
    expect(authRedirect(unauth(), AppRoutes.forgotPassword), isNull);
  });

  test('unknown session stays on splash', () {
    expect(authRedirect(unknown(), AppRoutes.splash), isNull);
    expect(authRedirect(unknown(), AppRoutes.home), AppRoutes.splash);
  });

  test('authenticated users leave login and splash', () {
    expect(authRedirect(auth(), AppRoutes.login), AppRoutes.home);
    expect(authRedirect(auth(), AppRoutes.splash), AppRoutes.home);
    expect(authRedirect(auth(), AppRoutes.home), isNull);
  });

  test('biometric-required sessions go to unlock', () {
    expect(authRedirect(bio(), AppRoutes.home), AppRoutes.biometric);
    expect(authRedirect(bio(), AppRoutes.biometric), isNull);
  });
}
