import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/core/widgets/app_components.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class ForgotPasswordPage extends StatelessWidget {
  const ForgotPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppTopBar(title: l10n.forgotPasswordTitle),
      body: Padding(
        padding: const EdgeInsets.all(AppTokens.space24),
        child: AppEmptyState(
          title: l10n.forgotPasswordTitle,
          body: l10n.forgotPasswordUnavailable,
        ),
      ),
    );
  }
}
