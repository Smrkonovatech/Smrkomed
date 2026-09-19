import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/home_page.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

import '../../helpers/test_harness.dart';

Widget _homeApp({required FakeHomeRepository home, DateTime? now}) {
  final router = GoRouter(
    initialLocation: AppRoutes.home,
    routes: [
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) =>
            HomePage(now: now ?? DateTime(2026, 9, 12, 10)),
      ),
      GoRoute(
        path: AppRoutes.schedule,
        builder: (context, state) =>
            const Scaffold(body: Text('Schedule screen')),
      ),
      GoRoute(
        path: AppRoutes.patients,
        builder: (context, state) =>
            const Scaffold(body: Text('Patients screen')),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) =>
            const Scaffold(body: Text('Notifications screen')),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) =>
            const Scaffold(body: Text('Profile screen')),
      ),
    ],
  );
  return ProviderScope(
    overrides: testOverrides(home: home, signedInUser: doctorUser()),
    child: MaterialApp.router(
      routerConfig: router,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
    ),
  );
}

Future<void> _pumpHome(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 1200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('home loading state shows a spinner', (tester) async {
    _phone(tester);
    final home = FakeHomeRepository(
      dashboard: populatedHomeDashboard(),
      onLoad: () {},
    );
    home.dashboard = populatedHomeDashboard();
    // Delay by never completing: use a custom repo
    await tester.pumpWidget(_homeApp(home: _PendingHomeRepository()));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('home renders doctor name and live metrics', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      _homeApp(home: FakeHomeRepository(dashboard: populatedHomeDashboard())),
    );
    await _pumpHome(tester);
    expect(find.textContaining('Dr. Test'), findsOneWidget);
    expect(find.text('2 patient visits scheduled today'), findsOneWidget);
    expect(find.text('OVERVIEW'), findsOneWidget);
    expect(find.text('ACTIVE\nJOURNEYS'), findsOneWidget);
    expect(find.text('PA'), findsWidgets);
    expect(find.text('Consultation'), findsOneWidget);
    expect(find.text('Lab'), findsOneWidget);
    expect(find.text('Review Needed'), findsOneWidget);
    expect(find.text('2 Appointments scheduled'), findsOneWidget);
    expect(find.text('Patient A'), findsWidgets);
    expect(find.text('9:30 AM'), findsWidgets);
    await tester.scrollUntilVisible(find.text('Needs Attention'), 300);
    expect(find.text('Needs Attention'), findsOneWidget);
    expect(find.text('Patients under care'), findsOneWidget);
    expect(find.text('On Track'), findsOneWidget);
    expect(find.text('Due today'), findsOneWidget);
    expect(find.text('Exceptions'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Prepare My Day ✨'), 300);
    expect(find.text('Prepare My Day ✨'), findsOneWidget);
  });

  testWidgets('empty schedule and journeys show empty copy', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      _homeApp(home: FakeHomeRepository(dashboard: emptyHomeDashboard())),
    );
    await _pumpHome(tester);
    expect(find.text('No appointments scheduled today'), findsOneWidget);
    expect(find.text('No active journeys'), findsOneWidget);
    expect(find.text('0 patient visits scheduled today'), findsOneWidget);
  });

  testWidgets('home API error shows retry', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      _homeApp(
        home: FakeHomeRepository(
          error: AppException.server('Unable to load Home.'),
        ),
      ),
    );
    await _pumpHome(tester);
    expect(find.text('Unable to load Home.'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
  });

  testWidgets('schedule arrow opens the schedule route', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      _homeApp(home: FakeHomeRepository(dashboard: populatedHomeDashboard())),
    );
    await _pumpHome(tester);
    await tester.tap(find.byIcon(Icons.arrow_forward));
    await _pumpHome(tester);
    expect(find.text('Schedule screen'), findsOneWidget);
  });

  testWidgets('view all opens patients', (tester) async {
    _phone(tester);
    await tester.pumpWidget(
      _homeApp(home: FakeHomeRepository(dashboard: populatedHomeDashboard())),
    );
    await _pumpHome(tester);
    await tester.tap(find.text('View all ↗'));
    await _pumpHome(tester);
    expect(find.text('Patients screen'), findsOneWidget);
  });

  testWidgets('pull-to-refresh reloads home', (tester) async {
    _phone(tester);
    final repo = FakeHomeRepository(dashboard: populatedHomeDashboard());
    await tester.pumpWidget(_homeApp(home: repo));
    await _pumpHome(tester);
    expect(repo.loads, 1);
    await tester.fling(find.text('OVERVIEW'), const Offset(0, 300), 1000);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(repo.loads, greaterThan(1));
  });
}

class _PendingHomeRepository extends FakeHomeRepository {
  @override
  Future<HomeDashboard> loadDashboard({
    DateTime? now,
    String? doctorName,
    String? doctorId,
  }) {
    return Completer<HomeDashboard>().future;
  }
}
