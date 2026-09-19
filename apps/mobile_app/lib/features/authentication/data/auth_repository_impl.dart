import 'package:smrkomed_doctor_app/core/constants/staff_role.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_remote_data_source.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_repository.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_user.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required AuthRemoteDataSource remote,
    required SessionStore sessionStore,
    required AppLogger logger,
  }) : _remote = remote,
       _sessionStore = sessionStore,
       _logger = logger;

  final AuthRemoteDataSource _remote;
  final SessionStore _sessionStore;
  final AppLogger _logger;

  @override
  Future<AuthSession> login(LoginCredentials credentials) async {
    final sessionCookie = await _remote.loginAndReadSessionToken(
      email: credentials.email,
      password: credentials.password,
    );
    await _sessionStore.save(
      SessionTokens(
        accessToken: sessionCookie.value,
        cookieName: sessionCookie.name,
      ),
    );
    try {
      final user = _requireDoctor(await _remote.fetchCurrentUser());
      _logger.info('Doctor session established', context: user.toSafeLog());
      return AuthSession(user: user, accessToken: sessionCookie.value);
    } on AppException catch (error) {
      await _sessionStore.clear();
      if (error.kind == AppErrorKind.forbidden) rethrow;
      if (error.message == 'Unable to load doctor profile.' ||
          error.message == 'Session could not be established.') {
        rethrow;
      }
      throw AppException.server('Unable to load doctor profile.');
    } catch (_) {
      await _sessionStore.clear();
      throw AppException.server('Unable to load doctor profile.');
    }
  }

  @override
  Future<void> logout() async {
    final session = await _sessionStore.read();
    if (session != null) {
      await _remote.signOutOnWeb(session.accessToken);
    }
    await _sessionStore.clear();
    _logger.info('Local session cleared');
  }

  @override
  Future<AuthSession?> restoreSession() async {
    final tokens = await _sessionStore.read();
    if (tokens == null) return null;
    try {
      final user = _requireDoctor(await _remote.fetchCurrentUser());
      return AuthSession(user: user, accessToken: tokens.accessToken);
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized ||
          error.kind == AppErrorKind.forbidden ||
          error.message == 'Session could not be established.') {
        await _sessionStore.clear();
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<AuthUser> validateSession() async {
    return _requireDoctor(await _remote.fetchCurrentUser());
  }

  @override
  Future<void> requestPasswordReset(String email) async {
    throw const PasswordResetUnavailableException();
  }

  AuthUser _requireDoctor(AuthUser user) {
    if (!user.isActive || !DoctorAccessPolicy.isAuthorizedDoctor(user.role)) {
      throw AppException.forbidden(
        'This app is only for authorized doctor accounts.',
      );
    }
    return user;
  }
}
