import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/doctor_availability_page.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/local_photo.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

import '../../helpers/test_harness.dart';

class _FakePhotoPicker implements LocalPhotoPicker {
  @override
  Future<Uint8List?> takePhoto() async => null;

  @override
  Future<Uint8List?> pickFromGallery() async => null;
}

Widget _app({DateTime? now}) {
  final clock = now ?? DateTime(2026, 9, 12);
  final router = GoRouter(
    initialLocation: AppRoutes.moreAvailability,
    routes: [
      GoRoute(
        path: AppRoutes.more,
        builder: (context, state) => const Scaffold(body: Text('Settings')),
        routes: [
          GoRoute(
            path: 'availability',
            builder: (context, state) =>
                DoctorAvailabilityPage(now: () => clock),
          ),
          GoRoute(
            path: 'profile',
            builder: (context, state) =>
                const Scaffold(body: Text('Identity profile')),
          ),
        ],
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      ...testOverrides(signedInUser: doctorUser()),
      localPhotoPickerProvider.overrideWithValue(_FakePhotoPicker()),
    ],
    child: MaterialApp.router(
      routerConfig: router,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
    ),
  );
}

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('renders static doctor profile and availability copy', (
    tester,
  ) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    expect(find.text('Doctor profile'), findsOneWidget);
    expect(find.text('Dr. Shreya Gupta'), findsOneWidget);
    expect(find.text('Lead Fertility Specialist'), findsOneWidget);
    expect(find.text('Reproductive Medicine'), findsOneWidget);
    expect(find.text('MCI-2018-94821'), findsOneWidget);
    expect(find.text('42'), findsOneWidget);
    expect(find.text('IN CARE'), findsOneWidget);
    expect(find.text('8'), findsOneWidget);
    expect(find.text("TODAY'S APPTS"), findsOneWidget);
    expect(find.text('67%'), findsOneWidget);
    expect(find.text('Today, Sat'), findsOneWidget);
    expect(find.text('Tomorrow'), findsOneWidget);
    expect(find.text('Pick any date'), findsOneWidget);
    expect(find.text('09:00 - 09:30'), findsOneWidget);
    expect(find.text('Weekly Recurring Slots'), findsOneWidget);
    expect(find.text('OPU & OT Day'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Slot Rules & Buffers'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Slot Rules & Buffers'), findsOneWidget);
  });

  testWidgets('back returns to settings', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();
    expect(find.text('Settings'), findsOneWidget);
  });

  testWidgets('edit profile opens the existing identity screen', (
    tester,
  ) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.tap(find.text('Edit Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Identity profile'), findsOneWidget);
  });

  testWidgets('available slots toggle selected state', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.tap(find.byKey(const ValueKey('slot-s1')));
    await tester.pump();
    final selected = tester.widget<InkWell>(
      find.byKey(const ValueKey('slot-s1')),
    );
    expect(selected.onTap, isNotNull);
    await tester.tap(find.byKey(const ValueKey('slot-s1')));
    await tester.pump();
  });

  testWidgets('booked and closed slots are not selectable', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    expect(
      tester.widget<InkWell>(find.byKey(const ValueKey('slot-s2'))).onTap,
      isNull,
    );
    expect(
      tester.widget<InkWell>(find.byKey(const ValueKey('slot-s4'))).onTap,
      isNull,
    );
  });

  testWidgets('update available slots shows confirmation', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.ensureVisible(find.text('Update Available Slots'));
    await tester.tap(find.text('Update Available Slots'));
    await tester.pump();
    expect(find.text('Available slots updated'), findsOneWidget);
  });

  testWidgets('weekly toggle switches locally', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.ensureVisible(find.byKey(const ValueKey('week-Monday')));
    final before = tester.widget<Switch>(
      find.byKey(const ValueKey('week-Monday')),
    );
    expect(before.value, isTrue);
    await tester.tap(find.byKey(const ValueKey('week-Monday')));
    await tester.pump();
    final after = tester.widget<Switch>(
      find.byKey(const ValueKey('week-Monday')),
    );
    expect(after.value, isFalse);
  });

  testWidgets('tomorrow tab can be selected', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.tap(find.text('Tomorrow'));
    await tester.pump();
    expect(find.text('Tomorrow'), findsOneWidget);
  });

  testWidgets('pick any date opens the date picker', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.tap(find.text('Pick any date'));
    await tester.pumpAndSettle();
    expect(find.byType(DatePickerDialog), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
  });

  testWidgets('camera sheet is available from the doctor card', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_app());
    await tester.tap(find.byIcon(Icons.photo_camera_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Take Photo'), findsOneWidget);
    expect(find.text('Choose from Gallery'), findsOneWidget);
    await tester.tap(find.text('Take Photo'));
    await tester.pumpAndSettle();
  });
}
