import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_shared.dart';

class DoctorProfilePage extends ConsumerWidget {
  const DoctorProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SettingsSubpage(
      title: 'Profile',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Center(
            child: DoctorAvatar(
              size: 108,
              showCamera: true,
              showVerified: true,
              onCamera: () => showChangePhotoSheet(context: context, ref: ref),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            SettingsPlaceholders.doctorName,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: AppTokens.fontWeightBold,
              color: AppTokens.colorHomeTitle,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            SettingsPlaceholders.specialty,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTokens.colorPrimary,
              fontWeight: AppTokens.fontWeightSemibold,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            SettingsPlaceholders.clinic,
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTokens.colorHomeMuted),
          ),
          const SizedBox(height: 24),
          _ProfileField(label: 'Email', value: SettingsPlaceholders.email),
          _ProfileField(label: 'Phone', value: SettingsPlaceholders.phone),
          const _ProfileField(
            label: 'Language',
            value: SettingsPlaceholders.language,
          ),
          const _ProfileField(label: 'Role', value: 'Doctor'),
        ],
      ),
    );
  }
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTokens.colorHomeMuted,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: AppTokens.fontWeightMedium,
              color: AppTokens.colorHomeTitle,
            ),
          ),
        ],
      ),
    );
  }
}
