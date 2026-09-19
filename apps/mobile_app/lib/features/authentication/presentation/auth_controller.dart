import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/storage/secure_store.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_repository.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_user.dart';

enum AuthStatus { unknown, unauthenticated, needsBiometric, authenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.errorMessage,
    this.busy = false,
  });

  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;
  final bool busy;

  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? errorMessage,
    bool? busy,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      busy: busy ?? this.busy,
    );
  }
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState(status: AuthStatus.unknown);

  AuthRepository get _repository => ref.read(authRepositoryProvider);
  SecureStore get _store => ref.read(secureStoreProvider);

  Future<void> bootstrap() async {
    try {
      final session = await _repository.restoreSession();
      if (session == null) {
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }
      final biometricEnabled = await _store.read(
        SecureStoreKeys.biometricUnlockEnabled,
      );
      if (biometricEnabled == 'true') {
        state = AuthState(
          status: AuthStatus.needsBiometric,
          user: session.user,
        );
        return;
      }
      state = AuthState(status: AuthStatus.authenticated, user: session.user);
    } on AppException catch (error) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: error.message,
      );
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login({
    required String email,
    required String password,
    bool rememberForThirtyDays = false,
  }) async {
    state = state.copyWith(busy: true, clearError: true);
    try {
      final session = await _repository.login(
        LoginCredentials(
          email: email,
          password: password,
          rememberForThirtyDays: rememberForThirtyDays,
        ),
      );
      await _writeRememberPreference(
        email: email,
        remember: rememberForThirtyDays,
      );
      state = AuthState(status: AuthStatus.authenticated, user: session.user);
      return true;
    } on AppException catch (error) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: error.message,
      );
      return false;
    } catch (_) {
      state = const AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: 'Authentication failed.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> onSessionExpired() async {
    await _repository.logout();
    state = const AuthState(
      status: AuthStatus.unauthenticated,
      errorMessage: 'Your session expired. Please sign in again.',
    );
  }

  void completeBiometricUnlock() {
    final user = state.user;
    if (user == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }
    state = AuthState(status: AuthStatus.authenticated, user: user);
  }

  void cancelBiometricUnlock() {
    state = state.copyWith(status: AuthStatus.unauthenticated, clearUser: true);
  }

  Future<({bool remember, String? email})> loadRememberPreference() async {
    final remember = await _store.read(SecureStoreKeys.rememberForThirtyDays);
    final email = await _store.read(SecureStoreKeys.rememberedEmail);
    return (remember: remember == 'true', email: email);
  }

  Future<void> _writeRememberPreference({
    required String email,
    required bool remember,
  }) async {
    if (remember) {
      await _store.write(
        key: SecureStoreKeys.rememberForThirtyDays,
        value: 'true',
      );
      await _store.write(
        key: SecureStoreKeys.rememberedEmail,
        value: email.trim().toLowerCase(),
      );
    } else {
      await _store.write(
        key: SecureStoreKeys.rememberForThirtyDays,
        value: 'false',
      );
      await _store.delete(SecureStoreKeys.rememberedEmail);
    }
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  throw UnimplementedError(
    'authRepositoryProvider must be overridden in bootstrap',
  );
});

final secureStoreProvider = Provider<SecureStore>((ref) {
  throw UnimplementedError(
    'secureStoreProvider must be overridden in bootstrap',
  );
});
