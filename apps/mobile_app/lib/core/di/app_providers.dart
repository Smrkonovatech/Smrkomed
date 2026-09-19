import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';
import 'package:smrkomed_doctor_app/core/network/connectivity_monitor.dart';
import 'package:smrkomed_doctor_app/core/network/connectivity_plus_monitor.dart';
import 'package:smrkomed_doctor_app/core/routing/app_router.dart';
import 'package:smrkomed_doctor_app/core/security/biometric_service.dart';
import 'package:smrkomed_doctor_app/core/security/local_auth_biometric_service.dart';
import 'package:smrkomed_doctor_app/core/storage/flutter_secure_store.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_remote_data_source.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_repository_impl.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';

final appLoggerProvider = Provider<AppLogger>((ref) {
  final config = ref.watch(appConfigProvider);
  return AppLogger(enableDebug: !config.environment.isProduction);
});

final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SecureSessionStore(ref.watch(secureStoreProvider));
});

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return LocalAuthBiometricService();
});

final connectivityMonitorProvider = Provider<ConnectivityMonitor>((ref) {
  return ConnectivityPlusMonitor();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    config: ref.watch(appConfigProvider),
    sessionStore: ref.watch(sessionStoreProvider),
    logger: ref.watch(appLoggerProvider),
    onUnauthorized: () {
      ref.read(authControllerProvider.notifier).onSessionExpired();
    },
  );
});

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSource(
    config: ref.watch(appConfigProvider),
    apiClient: ref.watch(apiClientProvider),
    logger: ref.watch(appLoggerProvider),
  );
});

List<Override> createProductionOverrides(AppConfig config) {
  return [
    appConfigProvider.overrideWithValue(config),
    secureStoreProvider.overrideWithValue(FlutterSecureStore()),
    authRepositoryProvider.overrideWith((ref) {
      return AuthRepositoryImpl(
        remote: ref.watch(authRemoteDataSourceProvider),
        sessionStore: ref.watch(sessionStoreProvider),
        logger: ref.watch(appLoggerProvider),
      );
    }),
  ];
}

class NetworkStatusNotifier extends Notifier<NetworkStatus> {
  @override
  NetworkStatus build() {
    final monitor = ref.watch(connectivityMonitorProvider);
    monitor.changes.listen((status) => state = status);
    monitor.current().then((status) => state = status);
    return NetworkStatus.online;
  }
}

final networkStatusProvider =
    NotifierProvider<NetworkStatusNotifier, NetworkStatus>(
      NetworkStatusNotifier.new,
    );
