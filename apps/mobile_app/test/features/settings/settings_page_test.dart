import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/local_photo.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_page.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

import '../../helpers/test_harness.dart';

class _FakePhotoPicker implements LocalPhotoPicker {
  _FakePhotoPicker(this.bytes);
  final Uint8List bytes;
  var cameraCalls = 0;
  var galleryCalls = 0;

  @override
  Future<Uint8List?> takePhoto() async {
    cameraCalls += 1;
    return null;
  }

  @override
  Future<Uint8List?> pickFromGallery() async {
    galleryCalls += 1;
    return null;
  }
}

class _CountingAuth extends SeededAuthController {
  _CountingAuth() : super(doctorUser());
  var logouts = 0;

  @override
  Future<void> logout() async {
    logouts += 1;
  }
}

Widget _settingsApp({LocalPhotoPicker? photos, _CountingAuth? auth}) {
  final picker = photos ?? _FakePhotoPicker(Uint8List.fromList([1, 2, 3]));
  final router = GoRouter(
    initialLocation: AppRoutes.more,
    routes: [
      GoRoute(
        path: AppRoutes.more,
        builder: (context, state) => const SettingsPage(),
        routes: [
          GoRoute(
            path: 'availability',
            builder: (context, state) =>
                const Scaffold(body: Text('Availability screen')),
          ),
          GoRoute(
            path: 'profile',
            builder: (context, state) =>
                const Scaffold(body: Text('Profile screen')),
          ),
          GoRoute(
            path: 'security',
            builder: (context, state) =>
                const Scaffold(body: Text('Security screen')),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) =>
            const Scaffold(body: Text('Notifications screen')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      ...testOverrides(signedInUser: doctorUser()),
      localPhotoPickerProvider.overrideWithValue(picker),
      if (auth != null) authControllerProvider.overrideWith(() => auth),
    ],
    child: MaterialApp.router(
      routerConfig: router,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
    ),
  );
}

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 1200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('settings shows placeholder doctor and rows', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_settingsApp());
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Dr. Ananya'), findsOneWidget);
    expect(find.text('Fertility Specialist'), findsOneWidget);
    expect(find.text('ABC Fertility Clinic'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Logout'), findsOneWidget);
    expect(find.text('English (US)'), findsOneWidget);
  });

  testWidgets('doctor card opens the availability route', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_settingsApp());
    await tester.tap(find.text('Dr. Ananya'));
    await tester.pumpAndSettle();
    expect(find.text('Availability screen'), findsOneWidget);
  });

  testWidgets('profile row opens the profile route', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_settingsApp());
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Profile screen'), findsOneWidget);
  });

  testWidgets('notifications row opens the existing notifications route', (
    tester,
  ) async {
    _phone(tester);
    await tester.pumpWidget(_settingsApp());
    await tester.tap(find.text('Notifications'));
    await tester.pumpAndSettle();
    expect(find.text('Notifications screen'), findsOneWidget);
  });

  testWidgets('camera sheet can take a local photo', (tester) async {
    _phone(tester);
    final picker = _FakePhotoPicker(Uint8List.fromList([1, 2, 3]));
    await tester.pumpWidget(_settingsApp(photos: picker));
    await tester.tap(find.byIcon(Icons.photo_camera_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Change Profile Photo'), findsOneWidget);
    await tester.tap(find.text('Take Photo'));
    await tester.pumpAndSettle();
    expect(picker.cameraCalls, 1);
  });

  testWidgets('logout no keeps settings visible', (tester) async {
    _phone(tester);
    final auth = _CountingAuth();
    await tester.pumpWidget(_settingsApp(auth: auth));
    await tester.scrollUntilVisible(find.text('Logout'), 300);
    await tester.tap(find.text('Logout'));
    await tester.pumpAndSettle();
    expect(find.text('Are you sure you want to log out?'), findsOneWidget);
    await tester.tap(find.text('No'));
    await tester.pumpAndSettle();
    expect(find.text('Settings'), findsOneWidget);
    expect(auth.logouts, 0);
  });

  testWidgets('logout yes uses existing logout', (tester) async {
    _phone(tester);
    final auth = _CountingAuth();
    await tester.pumpWidget(_settingsApp(auth: auth));
    await tester.scrollUntilVisible(find.text('Logout'), 300);
    await tester.tap(find.text('Logout'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yes'));
    await tester.pumpAndSettle();
    expect(auth.logouts, 1);
  });
}
