import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/routing/app_shell.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/biometric_unlock_page.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/forgot_password_page.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/login_page.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/splash_page.dart';
import 'package:smrkomed_doctor_app/features/consultation/consultation.dart';
import 'package:smrkomed_doctor_app/features/home/home_page.dart';
import 'package:smrkomed_doctor_app/features/inbox/inbox.dart';
import 'package:smrkomed_doctor_app/features/notifications/notifications.dart';
import 'package:smrkomed_doctor_app/features/patients/presentation/patients_page.dart';
import 'package:smrkomed_doctor_app/features/reports/reports.dart';
import 'package:smrkomed_doctor_app/features/schedule/presentation/schedule_page.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/doctor_availability_page.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/doctor_profile_page.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_page.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_placeholders.dart';

class GoRouterRefresh extends ChangeNotifier {
  GoRouterRefresh(Ref ref) {
    _sub = ref.listen<AuthState>(authControllerProvider, (previous, next) {
      if (previous != next) notifyListeners();
    });
  }

  late final ProviderSubscription<AuthState> _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}

String? authRedirect(AuthState auth, String location) {
  final loggingIn =
      location == AppRoutes.login || location == AppRoutes.forgotPassword;
  final atSplash = location == AppRoutes.splash;
  final atBiometric = location == AppRoutes.biometric;

  switch (auth.status) {
    case AuthStatus.unknown:
      return atSplash ? null : AppRoutes.splash;
    case AuthStatus.unauthenticated:
      if (loggingIn) return null;
      return AppRoutes.login;
    case AuthStatus.needsBiometric:
      return atBiometric ? null : AppRoutes.biometric;
    case AuthStatus.authenticated:
      if (loggingIn || atSplash || atBiometric) return AppRoutes.home;
      return null;
  }
}

GoRouter createAppRouter({
  required AppConfig config,
  required Listenable refresh,
  required AuthState Function() auth,
}) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    redirect: (context, state) => authRedirect(auth(), state.matchedLocation),
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: AppRoutes.biometric,
        builder: (context, state) => const BiometricUnlockPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.home,
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.schedule,
                builder: (context, state) => const SchedulePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.patients,
                builder: (context, state) => const PatientsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.inbox,
                builder: (context, state) => const InboxPage(),
                routes: [
                  GoRoute(
                    path: ':conversationId',
                    builder: (context, state) {
                      final conversationId =
                          state.pathParameters['conversationId'] ?? '';
                      final patientName =
                          state.uri.queryParameters['name'];
                      return ChatPage(
                        conversationId: conversationId,
                        initialPatientName: patientName,
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.more,
                builder: (context, state) => const SettingsPage(),
                routes: [
                  GoRoute(
                    path: 'availability',
                    builder: (context, state) => const DoctorAvailabilityPage(),
                  ),
                  GoRoute(
                    path: 'profile',
                    builder: (context, state) => const DoctorProfilePage(),
                  ),
                  GoRoute(
                    path: 'security',
                    builder: (context, state) => const SettingsPlaceholderPage(
                      title: 'Security',
                      body:
                          'Security preferences will be connected in a later phase. This screen is UI only.',
                    ),
                  ),
                  GoRoute(
                    path: 'communication',
                    builder: (context, state) => const SettingsPlaceholderPage(
                      title: 'Communication Preferences',
                      body:
                          'Communication preferences will be connected in a later phase. This screen is UI only.',
                    ),
                  ),
                  GoRoute(
                    path: 'language',
                    builder: (context, state) => const LanguageSettingsPage(),
                  ),
                  GoRoute(
                    path: 'terms',
                    builder: (context, state) => const SettingsPlaceholderPage(
                      title: 'Terms and Privacy',
                      body:
                          'Terms and privacy content will be added in a later phase. This screen is UI only.',
                    ),
                  ),
                  GoRoute(
                    path: 'help',
                    builder: (context, state) => const SettingsPlaceholderPage(
                      title: 'Help & Support',
                      body:
                          'Help and support will be connected in a later phase. This screen is UI only.',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.reports,
        builder: (context, state) => const ReportsPage(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: AppRoutes.consultation,
        builder: (context, state) {
          final appointmentId = state.uri.queryParameters['appointmentId'];
          final patientName = state.uri.queryParameters['patientName'];
          final coupleId = state.uri.queryParameters['coupleId'];
          return ConsultationPage(
            appointmentId: appointmentId,
            patientName: patientName,
            coupleId: coupleId,
          );
        },
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => const DoctorProfilePage(),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: AppRoutes.availability,
        builder: (context, state) => const DoctorAvailabilityPage(),
      ),
    ],
  );
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final config = ref.watch(appConfigProvider);
  final refresh = GoRouterRefresh(ref);
  ref.onDispose(refresh.dispose);
  return createAppRouter(
    config: config,
    refresh: refresh,
    auth: () => ref.read(authControllerProvider),
  );
});

final appConfigProvider = Provider<AppConfig>((ref) {
  throw UnimplementedError('appConfigProvider must be overridden');
});
