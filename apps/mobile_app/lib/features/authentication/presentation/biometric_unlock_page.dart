import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/core/widgets/app_components.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class BiometricUnlockPage extends ConsumerWidget {
  const BiometricUnlockPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(AppTokens.space24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              l10n.biometricUnlockTitle,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.space8),
            Text(l10n.biometricUnlockMessage, textAlign: TextAlign.center),
            const SizedBox(height: AppTokens.space32),
            AppPrimaryButton(
              label: l10n.biometricUnlockTitle,
              onPressed: () async {
                final ok = await ref
                    .read(biometricServiceProvider)
                    .authenticate(localizedReason: l10n.biometricUnlockMessage);
                if (ok) {
                  ref
                      .read(authControllerProvider.notifier)
                      .completeBiometricUnlock();
                }
              },
            ),
            const SizedBox(height: AppTokens.space12),
            AppSecondaryButton(
              label: l10n.usePasswordInstead,
              onPressed: () async {
                await ref.read(authControllerProvider.notifier).logout();
              },
            ),
          ],
        ),
      ),
    );
  }
}
