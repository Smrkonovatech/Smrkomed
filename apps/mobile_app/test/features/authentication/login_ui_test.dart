import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/forgot_password_page.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/login_page.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/splash_page.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

import '../../helpers/test_harness.dart';

Widget _app({required Widget home, List<Override>? overrides}) {
  return ProviderScope(
    overrides: overrides ?? testOverrides(),
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: home,
    ),
  );
}

Widget _loginRouter({List<Override>? overrides}) {
  final router = GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
    ],
  );
  return ProviderScope(
    overrides: overrides ?? testOverrides(),
    child: MaterialApp.router(
      routerConfig: router,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
    ),
  );
}

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('splash is cyan with centered logo and Smrkonova byline', (
    tester,
  ) async {
    _phone(tester);
    await tester.pumpWidget(_app(home: const SplashPage()));
    await tester.pump();
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, AppTokens.colorSplashBackground);
    expect(find.byType(Image), findsNWidgets(2));
    expect(find.text('By Smrkonova'), findsNothing);
    await tester.pump(AppTokens.splashMinDisplay);
  });

  testWidgets('login renders approved copy and controls', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_loginRouter());
    await tester.pumpAndSettle();
    expect(find.text('Welcome Back!'), findsOneWidget);
    expect(
      find.text('Focus on care. We’ll organize the rest.'),
      findsOneWidget,
    );
    expect(find.text('Enter your email'), findsOneWidget);
    expect(find.text('Remember for 30 days'), findsOneWidget);
    expect(find.text('Forgot password'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });

  testWidgets('invalid email shows an error', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_loginRouter());
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'not-an-email');
    await tester.enterText(find.byType(TextField).at(1), 'secret');
    await tester.tap(find.text('Login'));
    await tester.pump();
    expect(find.text('Enter a valid email address.'), findsOneWidget);
  });

  testWidgets('empty password shows an error', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_loginRouter());
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField).first,
      'doctor@clinic.example',
    );
    await tester.tap(find.text('Login'));
    await tester.pump();
    expect(find.text('Enter your password.'), findsOneWidget);
  });

  testWidgets('password can be revealed and hidden', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_loginRouter());
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField).at(1)).obscureText,
      isTrue,
    );
    await tester.tap(find.byIcon(Icons.visibility_outlined));
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField).at(1)).obscureText,
      isFalse,
    );
    await tester.tap(find.byIcon(Icons.visibility_off_outlined));
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField).at(1)).obscureText,
      isTrue,
    );
  });

  testWidgets('remember-for-30-days checkbox toggles', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_loginRouter());
    await tester.pumpAndSettle();
    final checkbox = find.byType(Checkbox);
    expect(tester.widget<Checkbox>(checkbox).value, isFalse);
    await tester.tap(checkbox);
    await tester.pump();
    expect(tester.widget<Checkbox>(checkbox).value, isTrue);
  });

  testWidgets('forgot password navigates to the existing page', (tester) async {
    _phone(tester);
    await tester.pumpWidget(_loginRouter());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Forgot password'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Password reset is not available from this app yet. Ask your clinic administrator to reset access from the web application.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('login shows a loading indicator while authenticating', (
    tester,
  ) async {
    _phone(tester);
    final repo = FakeAuthRepository(
      loginDelay: const Duration(milliseconds: 200),
    );
    await tester.pumpWidget(_loginRouter(overrides: testOverrides(auth: repo)));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField).first,
      'ananya@abcfertility.demo',
    );
    await tester.enterText(find.byType(TextField).at(1), 'Demo@12345');
    await tester.tap(find.text('Login'));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pumpAndSettle();
  });

  testWidgets('login failure shows a safe error', (tester) async {
    _phone(tester);
    final repo = FakeAuthRepository(
      loginError: AppException.unauthorized('Invalid email or password.'),
    );
    await tester.pumpWidget(_loginRouter(overrides: testOverrides(auth: repo)));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField).first,
      'ananya@abcfertility.demo',
    );
    await tester.enterText(find.byType(TextField).at(1), 'wrong');
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();
    expect(find.text('Invalid email or password.'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
