import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:smrkomed_doctor_app/core/constants/brand_assets.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/routing/shell_tabs.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_metrics.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/home_controller.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/home_widgets.dart';
import 'package:smrkomed_doctor_app/features/home/presentation/prepare_day_sheet.dart';
import 'package:smrkomed_doctor_app/features/patients/presentation/patients_page.dart';
import 'package:smrkomed_doctor_app/features/schedule/presentation/schedule_controller.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key, this.now});

  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clock = now ?? DateTime.now();
    final user = ref.watch(authControllerProvider).user;
    final home = ref.watch(homeControllerProvider);
    final doctorName = doctorFirstName(user?.name ?? '');
    final greeting = greetingForHour(clock.hour);
    final dateLabel = DateFormat('EEE, dd MMM').format(clock);
    final initials = doctorName.isNotEmpty
        ? doctorName.substring(0, 1).toUpperCase()
        : 'D';

    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      body: SafeArea(
        child: home.when(
          skipLoadingOnReload: true,
          skipLoadingOnRefresh: true,
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => AppHomeError(
            onRetry: () => ref.read(homeControllerProvider.notifier).refresh(),
          ),
          data: (dashboard) {
            if (dashboard.hasBlockingError) {
              return AppHomeError(
                onRetry: () =>
                    ref.read(homeControllerProvider.notifier).refresh(),
              );
            }
            return RefreshIndicator(
              onRefresh: () =>
                  ref.read(homeControllerProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  _HomeHeader(
                    initials: initials,
                    notificationCount: dashboard.exceptionsCount,
                    onNotifications: () =>
                        context.push(AppRoutes.notifications),
                    onProfile: () => context.push(AppRoutes.profile),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    dateLabel,
                    style: const TextStyle(
                      color: AppTokens.colorHomeMuted,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$greeting, Dr. $doctorName',
                    style: const TextStyle(
                      fontSize: 24,
                      height: 1.2,
                      fontWeight: AppTokens.fontWeightBold,
                      color: AppTokens.colorHomeTitle,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    dashboard.appointmentsError != null
                        ? 'Unable to load today’s visit count'
                        : HomeMetrics.visitCountLabel(
                            dashboard.todayVisitCount,
                          ),
                    style: const TextStyle(
                      color: AppTokens.colorHomeSubtitle,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 18),
                  OverviewCard(
                    dashboard: dashboard,
                    onViewAll: () {
                      openShellTab(context, ShellTabs.patients);
                      ref.read(patientsControllerProvider.notifier).refresh();
                    },
                    onRetry: () =>
                        ref.read(homeControllerProvider.notifier).refresh(),
                  ),
                  const SizedBox(height: 14),
                  TodayScheduleCard(
                    dashboard: dashboard,
                    onOpenSchedule: () {
                      openShellTab(context, ShellTabs.schedule);
                      ref.read(scheduleControllerProvider.notifier).refresh();
                    },
                    onRetry: () =>
                        ref.read(homeControllerProvider.notifier).refresh(),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: NeedsAttentionCard(
                          dashboard: dashboard,
                          onRetry: () => ref
                              .read(homeControllerProvider.notifier)
                              .refresh(),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: PatientsUnderCareCard(
                          dashboard: dashboard,
                          onRetry: () => ref
                              .read(homeControllerProvider.notifier)
                              .refresh(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  StatusSummaryRow(
                    dashboard: dashboard,
                    onRetry: () =>
                        ref.read(homeControllerProvider.notifier).refresh(),
                  ),
                  const SizedBox(height: 14),
                  PrepareMyDayCard(
                    onTap: () => showPrepareDaySheet(context: context),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class AppHomeError extends StatelessWidget {
  const AppHomeError({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Unable to load Home.',
              style: TextStyle(
                fontWeight: AppTokens.fontWeightSemibold,
                color: AppTokens.colorHomeTitle,
              ),
            ),
            const SizedBox(height: 12),
            TextButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.initials,
    required this.notificationCount,
    required this.onNotifications,
    required this.onProfile,
  });

  final String initials;
  final int notificationCount;
  final VoidCallback onNotifications;
  final VoidCallback onProfile;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Image.asset(BrandAssets.loginWordmark, height: 28),
        const Spacer(),
        IconButton(
          onPressed: onNotifications,
          tooltip: 'Notifications',
          icon: Badge(
            isLabelVisible: notificationCount > 0,
            label: Text(
              notificationCount > 9 ? '9+' : '$notificationCount',
              style: const TextStyle(fontSize: 10),
            ),
            child: const Icon(
              Icons.notifications_none_rounded,
              color: AppTokens.colorHomeTitle,
            ),
          ),
        ),
        GestureDetector(
          onTap: onProfile,
          child: CircleAvatar(
            radius: 18,
            backgroundColor: AppTokens.colorPrimary,
            child: Text(
              initials,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: AppTokens.fontWeightBold,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
