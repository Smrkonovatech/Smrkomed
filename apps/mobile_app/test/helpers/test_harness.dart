import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/core/network/connectivity_monitor.dart';
import 'package:smrkomed_doctor_app/core/routing/app_router.dart';
import 'package:smrkomed_doctor_app/core/security/biometric_service.dart';
import 'package:smrkomed_doctor_app/core/storage/secure_store.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_repository.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/auth_user.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/core/constants/staff_role.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';
import 'package:smrkomed_doctor_app/features/home/data/home_repository_impl.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/home_controller.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

AuthUser doctorUser() => const AuthUser(
  id: 'user_1',
  email: 'doctor@clinic.example',
  name: 'Dr Test',
  organizationId: 'org_1',
  organizationName: 'Org',
  clinicId: 'clinic_1',
  clinicName: 'Clinic',
  role: StaffRole.doctor,
);

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.session, this.loginError, this.loginDelay});

  AuthSession? session;
  AppException? loginError;
  Duration? loginDelay;
  LoginCredentials? lastCredentials;

  @override
  Future<AuthSession> login(LoginCredentials credentials) async {
    lastCredentials = credentials;
    if (loginDelay != null) {
      await Future<void>.delayed(loginDelay!);
    }
    if (loginError != null) throw loginError!;
    session = AuthSession(user: doctorUser(), accessToken: 'token');
    return session!;
  }

  @override
  Future<void> logout() async {
    session = null;
  }

  @override
  Future<void> requestPasswordReset(String email) async {
    throw const PasswordResetUnavailableException();
  }

  @override
  Future<AuthSession?> restoreSession() async => session;

  @override
  Future<AuthUser> validateSession() async {
    final current = session;
    if (current == null) throw AppException.unauthorized();
    return current.user;
  }
}

class FakeHomeRepository implements HomeRepository {
  FakeHomeRepository({this.dashboard, this.error, this.onLoad});

  HomeDashboard? dashboard;
  Object? error;
  int loads = 0;
  VoidCallback? onLoad;

  @override
  Future<HomeDashboard> loadDashboard({
    DateTime? now,
    String? doctorName,
    String? doctorId,
  }) async {
    loads += 1;
    onLoad?.call();
    if (error != null) throw error!;
    return dashboard ?? emptyHomeDashboard();
  }
}

HomeDashboard emptyHomeDashboard() => const HomeDashboard(
  activeJourneyCount: 0,
  todayVisitCount: 0,
  todayAppointments: [],
  journeyPreviews: [],
  needsAttentionCount: 0,
  patientsUnderCare: 0,
  ivfCount: 0,
  iuiCount: 0,
  addedThisWeek: 0,
  onTrackCount: 0,
  dueTodayCount: 0,
  exceptionsCount: 0,
);

HomeDashboard populatedHomeDashboard() => HomeDashboard(
  activeJourneyCount: 2,
  todayVisitCount: 2,
  todayAppointments: const [
    HomeScheduleItem(id: 'a1', patientLabel: 'Patient A', time: '9:30 AM'),
    HomeScheduleItem(id: 'a2', patientLabel: 'Patient B', time: '11:00 AM'),
  ],
  journeyPreviews: const [
    HomeJourneyPreview(
      id: 'c1',
      initials: 'PA',
      kind: JourneyKind.consultation,
      label: 'Patient A',
      detail: 'Scan review',
      time: '9:30 AM',
    ),
  ],
  needsAttentionCount: 1,
  urgentEscalationCount: 1,
  patientsUnderCare: 3,
  ivfCount: 2,
  iuiCount: 1,
  addedThisWeek: 1,
  onTrackCount: 2,
  dueTodayCount: 4,
  exceptionsCount: 1,
);

class SeededAuthController extends AuthController {
  SeededAuthController(this._user);

  final AuthUser _user;

  @override
  AuthState build() {
    return AuthState(status: AuthStatus.authenticated, user: _user);
  }
}

List<Override> testOverrides({
  AuthRepository? auth,
  SecureStore? store,
  HomeRepository? home,
  AuthUser? signedInUser,
}) {
  const config = AppConfig(
    environment: AppEnvironment.development,
    apiBaseUrl: 'http://localhost:4000',
    webAuthBaseUrl: 'http://localhost:3000',
    deepLinkScheme: 'smrkomed',
  );
  final signedIn = signedInUser;
  return [
    appConfigProvider.overrideWithValue(config),
    secureStoreProvider.overrideWithValue(store ?? InMemorySecureStore()),
    authRepositoryProvider.overrideWithValue(auth ?? FakeAuthRepository()),
    biometricServiceProvider.overrideWithValue(
      const UnsupportedBiometricService(),
    ),
    connectivityMonitorProvider.overrideWithValue(
      const AlwaysOnlineConnectivity(),
    ),
    homeRepositoryProvider.overrideWithValue(home ?? FakeHomeRepository()),
    if (signedIn != null)
      authControllerProvider.overrideWith(() => SeededAuthController(signedIn)),
  ];
}

Widget wrap(Widget child, {List<Override> overrides = const []}) {
  return ProviderScope(
    overrides: overrides.isEmpty ? testOverrides() : overrides,
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: child,
    ),
  );
}
