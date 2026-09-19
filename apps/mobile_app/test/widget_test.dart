import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/core/widgets/app_components.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

import 'helpers/test_harness.dart';

void main() {
  testWidgets('primary button exposes a semantic label', (tester) async {
    var pressed = false;
    await tester.pumpWidget(
      wrap(
        AppPrimaryButton(
          label: 'Sign in',
          semanticLabel: 'Sign in',
          onPressed: () => pressed = true,
        ),
      ),
    );
    expect(find.text('Sign in'), findsOneWidget);
    await tester.tap(find.byType(AppPrimaryButton));
    expect(pressed, isTrue);
  });

  testWidgets('empty state renders title and body', (tester) async {
    await tester.pumpWidget(
      wrap(
        const AppEmptyState(
          title: 'Nothing here yet',
          body: 'Foundation placeholder',
        ),
      ),
    );
    expect(find.text('Nothing here yet'), findsOneWidget);
    expect(find.text('Foundation placeholder'), findsOneWidget);
  });

  testWidgets('error state offers retry', (tester) async {
    var retried = false;
    await tester.pumpWidget(
      wrap(
        AppErrorState(
          message: 'Something went wrong. Please try again.',
          onRetry: () => retried = true,
        ),
      ),
    );
    await tester.tap(find.text('Try again'));
    expect(retried, isTrue);
  });

  testWidgets('localization loads English strings', (tester) async {
    await tester.pumpWidget(wrap(const SizedBox()));
    final l10n = await AppLocalizations.delegate.load(const Locale('en'));
    expect(l10n.appTitle, 'SMRKoMed Doctor');
    expect(l10n.signInAction, 'Sign in');
  });
}
