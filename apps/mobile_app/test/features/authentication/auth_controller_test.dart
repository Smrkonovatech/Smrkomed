import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_repository.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';

import '../../helpers/test_harness.dart';

void main() {
  test('bootstrap restores an existing doctor session', () async {
    final repo = FakeAuthRepository(
      session: AuthSession(user: doctorUser(), accessToken: 'token'),
    );
    final container = ProviderContainer(overrides: testOverrides(auth: repo));
    addTearDown(container.dispose);

    await container.read(authControllerProvider.notifier).bootstrap();
    expect(
      container.read(authControllerProvider).status,
      AuthStatus.authenticated,
    );
    expect(
      container.read(authControllerProvider).user?.role.apiValue,
      'DOCTOR',
    );
  });

  test('bootstrap without a session is unauthenticated', () async {
    final container = ProviderContainer(overrides: testOverrides());
    addTearDown(container.dispose);
    await container.read(authControllerProvider.notifier).bootstrap();
    expect(
      container.read(authControllerProvider).status,
      AuthStatus.unauthenticated,
    );
  });

  test('failed login stays unauthenticated with a safe message', () async {
    final repo = FakeAuthRepository(
      loginError: AppException.unauthorized('Invalid email or password.'),
    );
    final container = ProviderContainer(overrides: testOverrides(auth: repo));
    addTearDown(container.dispose);
    final ok = await container
        .read(authControllerProvider.notifier)
        .login(email: 'a@b.co', password: 'wrong');
    expect(ok, isFalse);
    expect(
      container.read(authControllerProvider).status,
      AuthStatus.unauthenticated,
    );
    expect(container.read(authControllerProvider).errorMessage, isNotNull);
  });

  test('logout clears authenticated state', () async {
    final repo = FakeAuthRepository(
      session: AuthSession(user: doctorUser(), accessToken: 'token'),
    );
    final container = ProviderContainer(overrides: testOverrides(auth: repo));
    addTearDown(container.dispose);
    await container.read(authControllerProvider.notifier).bootstrap();
    await container.read(authControllerProvider.notifier).logout();
    expect(
      container.read(authControllerProvider).status,
      AuthStatus.unauthenticated,
    );
    expect(repo.session, isNull);
  });
}
