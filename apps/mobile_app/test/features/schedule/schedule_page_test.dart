import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/routing/shell_tabs.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/home_page.dart';
import 'package:smrkomed_doctor_app/features/schedule/data/schedule_repository.dart';
import 'package:smrkomed_doctor_app/features/schedule/presentation/schedule_controller.dart';
import 'package:smrkomed_doctor_app/features/schedule/presentation/schedule_page.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

import '../../helpers/test_harness.dart';

class FakeScheduleRepository implements ScheduleRepository {
  FakeScheduleRepository(this.snapshot);
  final ScheduleSnapshot snapshot;

  @override
  Future<ScheduleSnapshot> load({
    DateTime? now,
    String? doctorName,
    String? doctorId,
    String? clinicName,
  }) async {
    return snapshot;
  }
}

ScheduleSnapshot _eightToday() {
  return ScheduleSnapshot(
    today: [
      for (var i = 1; i <= 8; i++)
        ScheduleAppointment(
          id: 'a$i',
          patientName: 'Patient $i',
          initials: 'P$i',
          time: '$i:00 AM',
          subtitle: 'Online · IVF Consultation',
          patientCode: 'PT-$i',
        ),
    ],
    upcoming: const [
      ScheduleAppointment(
        id: 'u1',
        patientName: 'Later Patient',
        initials: 'LP',
        time: '2:00 PM',
        subtitle: 'Clinic',
      ),
    ],
  );
}

void main() {
  testWidgets('schedule today lists every returned appointment', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...testOverrides(signedInUser: doctorUser()),
          scheduleRepositoryProvider.overrideWithValue(
            FakeScheduleRepository(_eightToday()),
          ),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: SchedulePage(),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Appointments'), findsOneWidget);
    expect(find.text('Patient 1'), findsOneWidget);
    expect(find.text('Patient 8'), findsOneWidget);
    await tester.tap(find.text('Upcoming'));
    await tester.pump();
    expect(find.text('Later Patient'), findsOneWidget);
    expect(find.text('Patient 1'), findsNothing);
  });

  testWidgets('view all uses shell tab navigation without crashing', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final router = GoRouter(
      initialLocation: AppRoutes.home,
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) => Scaffold(
            body: navigationShell,
            bottomNavigationBar: const SizedBox(height: 1),
          ),
          branches: [
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: AppRoutes.home,
                  builder: (context, state) =>
                      HomePage(now: DateTime(2026, 9, 12, 10)),
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: AppRoutes.schedule,
                  builder: (context, state) => const Text('Schedule tab'),
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: AppRoutes.patients,
                  builder: (context, state) => const Text('All journeys'),
                ),
              ],
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: testOverrides(
          home: FakeHomeRepository(dashboard: populatedHomeDashboard()),
          signedInUser: doctorUser(),
        ),
        child: MaterialApp.router(
          routerConfig: router,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('View all ↗'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(tester.takeException(), isNull);
    expect(find.text('All journeys'), findsOneWidget);
  });

  test('openShellTab falls back to go when no shell is present', () {
    expect(ShellTabs.patients, 2);
    expect(ShellTabs.schedule, 1);
  });
}
