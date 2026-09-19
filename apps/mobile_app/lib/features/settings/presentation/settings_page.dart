import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/routing/shell_tabs.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_shared.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 16, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => openShellTab(context, ShellTabs.home),
                    icon: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 18,
                    ),
                    color: const Color(0xFF3D2E7C),
                  ),
                  const Text(
                    'Settings',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: AppTokens.fontWeightBold,
                      color: Color(0xFF3D2E7C),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                children: [
                  _DoctorCard(
                    onOpenProfile: () =>
                        context.push(AppRoutes.moreAvailability),
                    onCamera: () =>
                        showChangePhotoSheet(context: context, ref: ref),
                  ),
                  const SizedBox(height: 16),
                  _SettingsGroup(
                    children: [
                      _SettingsRow(
                        icon: Icons.person_outline,
                        label: 'Profile',
                        onTap: () => context.push(AppRoutes.moreProfile),
                      ),
                      _SettingsRow(
                        icon: Icons.notifications_none_rounded,
                        label: 'Notifications',
                        onTap: () => context.push(AppRoutes.notifications),
                      ),
                      _SettingsRow(
                        icon: Icons.lock_outline,
                        label: 'Security',
                        onTap: () => context.push(AppRoutes.moreSecurity),
                      ),
                      _SettingsRow(
                        icon: Icons.mail_outline,
                        label: 'Communication Preferences',
                        onTap: () => context.push(AppRoutes.moreCommunication),
                      ),
                      _SettingsRow(
                        icon: Icons.language,
                        label: 'Language',
                        trailing: SettingsPlaceholders.language,
                        onTap: () => context.push(AppRoutes.moreLanguage),
                      ),
                      _SettingsRow(
                        icon: Icons.description_outlined,
                        label: 'Terms and Privacy',
                        onTap: () => context.push(AppRoutes.moreTerms),
                      ),
                      _SettingsRow(
                        icon: Icons.support_agent_outlined,
                        label: 'Help & Support',
                        onTap: () => context.push(AppRoutes.moreHelp),
                      ),
                      _SettingsRow(
                        icon: Icons.logout_rounded,
                        label: 'Logout',
                        destructive: true,
                        onTap: () => _confirmLogout(context, ref),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    SettingsPlaceholders.versionLine,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTokens.colorHomeMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    SettingsPlaceholders.complianceLine,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTokens.colorHomeMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DoctorCard extends ConsumerWidget {
  const _DoctorCard({required this.onOpenProfile, required this.onCamera});

  final VoidCallback onOpenProfile;
  final VoidCallback onCamera;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onOpenProfile,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 12, 16),
          child: Row(
            children: [
              DoctorAvatar(
                size: 64,
                showCamera: true,
                showVerified: true,
                onCamera: onCamera,
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      SettingsPlaceholders.doctorName,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: AppTokens.fontWeightBold,
                        color: AppTokens.colorHomeTitle,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      SettingsPlaceholders.specialty,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: AppTokens.fontWeightSemibold,
                        color: AppTokens.colorPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      SettingsPlaceholders.clinic,
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTokens.colorHomeMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppTokens.colorHomeMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            children[i],
            if (i != children.length - 1)
              const Divider(height: 1, indent: 72, color: Color(0xFFF0ECF6)),
          ],
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive
        ? const Color(0xFFE24C4C)
        : const Color(0xFF6B5AE0);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: destructive
                    ? const Color(0x1AE24C4C)
                    : const Color(0xFFF0E9FF),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: AppTokens.fontWeightMedium,
                  color: destructive
                      ? const Color(0xFFE24C4C)
                      : AppTokens.colorHomeTitle,
                ),
              ),
            ),
            if (trailing != null)
              Padding(
                padding: const EdgeInsets.only(right: 4),
                child: Text(
                  trailing!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTokens.colorHomeMuted,
                  ),
                ),
              ),
            Icon(
              Icons.chevron_right,
              color: destructive
                  ? const Color(0xFFE24C4C)
                  : AppTokens.colorHomeMuted,
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) {
      return Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Are you sure you want to log out?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: AppTokens.fontWeightSemibold,
                  color: AppTokens.colorHomeTitle,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(dialogContext).pop(false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTokens.colorHomeTitle,
                        side: const BorderSide(color: Color(0xFFE4DFF0)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('No'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(dialogContext).pop(true),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTokens.colorPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('Yes'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
  if (confirmed == true) {
    await ref.read(authControllerProvider.notifier).logout();
  }
}
