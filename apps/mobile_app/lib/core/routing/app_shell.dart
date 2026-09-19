import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/routing/shell_tabs.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/home_controller.dart';
import 'package:smrkomed_doctor_app/features/patients/presentation/patients_page.dart';
import 'package:smrkomed_doctor_app/features/schedule/presentation/schedule_controller.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final destinations = [
      _Dest(l10n.navHome, Icons.home_outlined, Icons.home_rounded),
      _Dest(
        l10n.navSchedule,
        Icons.calendar_today_outlined,
        Icons.calendar_today,
      ),
      _Dest(l10n.navPatients, Icons.people_outline, Icons.people),
      _Dest(l10n.navInbox, Icons.chat_bubble_outline, Icons.chat_bubble),
      _Dest(l10n.navMore, Icons.more_horiz, Icons.more_horiz),
    ];

    return Scaffold(
      body: navigationShell,
      backgroundColor: AppTokens.colorHomeBackground,
      bottomNavigationBar: Material(
        color: Colors.white,
        elevation: 8,
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: AppTokens.bottomNavHeight,
            child: Row(
              children: [
                for (var i = 0; i < destinations.length; i++)
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        navigationShell.goBranch(
                          i,
                          initialLocation: i == navigationShell.currentIndex,
                        );
                        if (i == ShellTabs.home) {
                          ref.read(homeControllerProvider.notifier).refresh();
                        } else if (i == ShellTabs.schedule) {
                          ref
                              .read(scheduleControllerProvider.notifier)
                              .refresh();
                        } else if (i == ShellTabs.patients) {
                          ref
                              .read(patientsControllerProvider.notifier)
                              .refresh();
                        }
                      },
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            i == navigationShell.currentIndex
                                ? destinations[i].selectedIcon
                                : destinations[i].icon,
                            color: i == navigationShell.currentIndex
                                ? AppTokens.colorPrimary
                                : AppTokens.colorHomeMuted,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            destinations[i].label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: i == navigationShell.currentIndex
                                  ? AppTokens.fontWeightSemibold
                                  : AppTokens.fontWeightRegular,
                              color: i == navigationShell.currentIndex
                                  ? AppTokens.colorPrimary
                                  : AppTokens.colorHomeMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Dest {
  const _Dest(this.label, this.icon, this.selectedIcon);
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
