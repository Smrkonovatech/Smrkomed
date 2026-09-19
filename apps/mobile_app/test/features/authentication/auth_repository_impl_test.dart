import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';
import 'package:smrkomed_doctor_app/core/storage/secure_store.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_js_cookies.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_remote_data_source.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_repository_impl.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_repository.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_user.dart';
import '../../helpers/test_harness.dart';

const _config = AppConfig(
  environment: AppEnvironment.development,
  apiBaseUrl: 'http://localhost:4000',
  webAuthBaseUrl: 'http://localhost:3000',
  deepLinkScheme: 'smrkomed',
);

class _StubRemote extends AuthRemoteDataSource {
  _StubRemote({this.profileError})
    : super(
        config: _config,
        apiClient: ApiClient(
          config: _config,
          sessionStore: SecureSessionStore(InMemorySecureStore()),
          logger: const AppLogger(enableDebug: false),
          dio: Dio(),
        ),
        logger: const AppLogger(enableDebug: false),
      );

  AppException? profileError;

  @override
  Future<AuthJsSessionCookie> loginAndReadSessionToken({
    required String email,
    required String password,
  }) async {
    return const AuthJsSessionCookie(
      name: 'authjs.session-token',
      value: 'jwt-session',
    );
  }

  @override
  Future<AuthUser> fetchCurrentUser() async {
    final error = profileError;
    if (error != null) throw error;
    return doctorUser();
  }

  @override
  Future<void> signOutOnWeb(String sessionToken) async {}
}

void main() {
  test(
    'login persists the session JWT even without remember-for-30-days',
    () async {
      final store = InMemorySecureStore();
      final sessions = SecureSessionStore(store);
      final repo = AuthRepositoryImpl(
        remote: _StubRemote(),
        sessionStore: sessions,
        logger: const AppLogger(enableDebug: false),
      );

      await repo.login(
        const LoginCredentials(
          email: 'doctor@clinic.example',
          password: 'secret',
        ),
      );

      expect(await store.read(SecureStoreKeys.sessionToken), 'jwt-session');
      expect(
        await store.read(SecureStoreKeys.sessionCookieName),
        'authjs.session-token',
      );
      expect((await sessions.read())?.accessToken, 'jwt-session');
    },
  );

  test(
    'restoreSession returns Home-ready doctor when stored JWT is valid',
    () async {
      final store = InMemorySecureStore();
      final sessions = SecureSessionStore(store);
      await sessions.save(
        const SessionTokens(
          accessToken: 'jwt-session',
          cookieName: 'authjs.session-token',
        ),
      );
      final repo = AuthRepositoryImpl(
        remote: _StubRemote(),
        sessionStore: sessions,
        logger: const AppLogger(enableDebug: false),
      );

      final restored = await repo.restoreSession();
      expect(restored?.user.role.apiValue, 'DOCTOR');
      expect(await store.read(SecureStoreKeys.sessionToken), 'jwt-session');
    },
  );

  test('restoreSession clears an invalid 401 session', () async {
    final store = InMemorySecureStore();
    final sessions = SecureSessionStore(store);
    await sessions.save(const SessionTokens(accessToken: 'stale-jwt'));
    final repo = AuthRepositoryImpl(
      remote: _StubRemote(
        profileError: AppException.server('Session could not be established.'),
      ),
      sessionStore: sessions,
      logger: const AppLogger(enableDebug: false),
    );

    expect(await repo.restoreSession(), isNull);
    expect(await sessions.read(), isNull);
    expect(await store.read(SecureStoreKeys.sessionToken), isNull);
  });

  test('logout clears the persisted session', () async {
    final store = InMemorySecureStore();
    final sessions = SecureSessionStore(store);
    final repo = AuthRepositoryImpl(
      remote: _StubRemote(),
      sessionStore: sessions,
      logger: const AppLogger(enableDebug: false),
    );
    await repo.login(
      const LoginCredentials(
        email: 'doctor@clinic.example',
        password: 'secret',
      ),
    );
    await repo.logout();
    expect(await sessions.read(), isNull);
    expect(await store.read(SecureStoreKeys.sessionToken), isNull);
  });
}
