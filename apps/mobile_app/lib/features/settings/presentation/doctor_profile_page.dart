import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_shared.dart';

import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';

class DoctorProfilePage extends ConsumerWidget {
  const DoctorProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final doctorName =
        (user != null && user.name != 'Dr Test' && user.name.trim().isNotEmpty)
            ? user.name.trim()
            : SettingsPlaceholders.doctorName;
    final specialty = (user != null && user.title?.trim().isNotEmpty == true)
        ? user.title!.trim()
        : SettingsPlaceholders.specialty;
    final clinic =
        (user != null && user.clinicName != 'Clinic' && user.clinicName.trim().isNotEmpty)
            ? user.clinicName.trim()
            : SettingsPlaceholders.clinic;
    final email =
        (user != null && user.email != 'doctor@clinic.example' && user.email.trim().isNotEmpty)
            ? user.email.trim()
            : SettingsPlaceholders.email;
    final phone = (user?.phone?.trim().isNotEmpty == true)
        ? user!.phone!.trim()
        : SettingsPlaceholders.phone;
    final role = user?.role.apiValue ?? 'DOCTOR';

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
          Text(
            doctorName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: AppTokens.fontWeightBold,
              color: AppTokens.colorHomeTitle,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            specialty,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTokens.colorPrimary,
              fontWeight: AppTokens.fontWeightSemibold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            clinic,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTokens.colorHomeMuted),
          ),
          const SizedBox(height: 24),
          _ProfileField(label: 'Email', value: email),
          _ProfileField(label: 'Phone', value: phone),
          const _ProfileField(
            label: 'Language',
            value: SettingsPlaceholders.language,
          ),
          _ProfileField(label: 'Role', value: role),
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
