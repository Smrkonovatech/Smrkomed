import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_metrics.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

export 'package:smrkomed_doctor_app/features/home/presentation/overview_card.dart';

class HomeSectionError extends StatelessWidget {
  const HomeSectionError({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTokens.space8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppTokens.colorHomeMuted,
                fontSize: AppTokens.fontSizeSm,
              ),
            ),
          ),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class HomeWhiteCard extends StatelessWidget {
  const HomeWhiteCard({super.key, required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(AppTokens.space16),
      decoration: BoxDecoration(
        color: AppTokens.colorHomeCard,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class TodayScheduleCard extends StatelessWidget {
  const TodayScheduleCard({
    super.key,
    required this.dashboard,
    required this.onOpenSchedule,
    this.onRetry,
  });

  final HomeDashboard dashboard;
  final VoidCallback onOpenSchedule;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final items = dashboard.todayAppointments.take(3).toList();
    return HomeWhiteCard(
      child: Column(
        children: [
          Row(
            children: [
              const Icon(
                Icons.calendar_today_outlined,
                size: 18,
                color: AppTokens.colorPrimary,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "TODAY'S SCHEDULE",
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: AppTokens.fontWeightSemibold,
                    letterSpacing: 0.8,
                    color: AppTokens.colorHomeMuted,
                  ),
                ),
              ),
              IconButton(
                onPressed: onOpenSchedule,
                icon: const Icon(Icons.arrow_forward, size: 18),
                color: AppTokens.colorHomeMuted,
              ),
            ],
          ),
          if (dashboard.appointmentsError != null)
            HomeSectionError(
              message: 'Unable to load today’s schedule.',
              onRetry: onRetry,
            )
          else ...[
            Text(
              HomeMetrics.appointmentCountLabel(dashboard.todayVisitCount),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: AppTokens.fontWeightSemibold,
                color: AppTokens.colorHomeTitle,
              ),
            ),
            const SizedBox(height: AppTokens.space12),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppTokens.space12),
                child: Text(
                  'No appointments scheduled today',
                  style: TextStyle(color: AppTokens.colorHomeMuted),
                ),
              )
            else
              for (final item in items) _ScheduleRow(item: item),
          ],
        ],
      ),
    );
  }
}

class _ScheduleRow extends StatelessWidget {
  const _ScheduleRow({required this.item});

  final HomeScheduleItem item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              item.patientLabel,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: AppTokens.fontWeightMedium,
                color: AppTokens.colorHomeTitle,
              ),
            ),
          ),
          Text(
            item.time,
            style: const TextStyle(
              fontSize: 13,
              color: AppTokens.colorHomeMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class NeedsAttentionCard extends StatelessWidget {
  const NeedsAttentionCard({super.key, required this.dashboard, this.onRetry});

  final HomeDashboard dashboard;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return HomeWhiteCard(
      child: dashboard.couplesError != null && dashboard.tasksError != null
          ? HomeSectionError(message: 'Unable to load.', onRetry: onRetry)
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTokens.colorHomeAttentionSoft,
                  child: Icon(
                    Icons.access_time_filled,
                    size: 18,
                    color: AppTokens.colorHomeAttention,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '${dashboard.needsAttentionCount}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: AppTokens.fontWeightBold,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
                const Text(
                  'Needs Attention',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: AppTokens.fontWeightMedium,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
                if (dashboard.urgentEscalationCount != null &&
                    dashboard.urgentEscalationCount! > 0) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${dashboard.urgentEscalationCount} Urgent escalations',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTokens.colorHomeAttention,
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}

class PatientsUnderCareCard extends StatelessWidget {
  const PatientsUnderCareCard({
    super.key,
    required this.dashboard,
    this.onRetry,
  });

  final HomeDashboard dashboard;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return HomeWhiteCard(
      child: dashboard.couplesError != null
          ? HomeSectionError(
              message: 'Unable to load patients.',
              onRetry: onRetry,
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const CircleAvatar(
                      radius: 16,
                      backgroundColor: Color(0xFFEDE6FF),
                      child: Icon(
                        Icons.favorite,
                        size: 16,
                        color: AppTokens.colorPrimary,
                      ),
                    ),
                    if (dashboard.addedThisWeek > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8FBF1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '+${dashboard.addedThisWeek} this wk',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF1B9E5A),
                            fontWeight: AppTokens.fontWeightSemibold,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '${dashboard.patientsUnderCare}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: AppTokens.fontWeightBold,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
                const Text(
                  'Patients under care',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: AppTokens.fontWeightMedium,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
                if (dashboard.ivfCount > 0 || dashboard.iuiCount > 0) ...[
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (dashboard.ivfCount > 0) '${dashboard.ivfCount} IVF',
                      if (dashboard.iuiCount > 0) '${dashboard.iuiCount} IUI',
                    ].join('  ·  '),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTokens.colorHomeMuted,
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}

class StatusSummaryRow extends StatelessWidget {
  const StatusSummaryRow({super.key, required this.dashboard, this.onRetry});

  final HomeDashboard dashboard;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatusCard(
            label: 'On Track',
            value: dashboard.onTrackCount,
            icon: Icons.calendar_today_outlined,
            color: AppTokens.colorPrimary,
            error: dashboard.couplesError,
            onRetry: onRetry,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatusCard(
            label: 'Due today',
            value: dashboard.dueTodayCount,
            icon: Icons.access_time,
            color: AppTokens.colorHomeAttention,
            error: dashboard.tasksError,
            onRetry: onRetry,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatusCard(
            label: 'Exceptions',
            value: dashboard.exceptionsCount,
            icon: Icons.warning_amber_rounded,
            color: AppTokens.colorHomeSuccessRing,
            error: dashboard.exceptionsError ?? dashboard.analyticsError,
            onRetry: onRetry,
          ),
        ),
      ],
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.error,
    this.onRetry,
  });

  final String label;
  final int value;
  final IconData icon;
  final Color color;
  final String? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return HomeWhiteCard(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      child: error != null
          ? IconButton(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
            )
          : Column(
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTokens.colorHomeMuted,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  value.toString().padLeft(2, '0'),
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: AppTokens.fontWeightBold,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: 36,
                  height: 36,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: 0.72,
                        strokeWidth: 3,
                        color: color,
                        backgroundColor: color.withValues(alpha: 0.15),
                      ),
                      Icon(icon, size: 14, color: color),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class PrepareMyDayCard extends StatelessWidget {
  const PrepareMyDayCard({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              colors: [
                AppTokens.colorPrepareDayStart,
                AppTokens.colorPrepareDayEnd,
              ],
            ),
          ),
          child: const Padding(
            padding: EdgeInsets.fromLTRB(20, 18, 14, 18),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Prepare My Day ✨',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: AppTokens.fontWeightBold,
                        ),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Get an AI-powered summary of your patients, appointments and important updates.',
                        style: TextStyle(
                          color: Color(0xFFEDE6FF),
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Icon(
                    Icons.chevron_right,
                    color: AppTokens.colorPrimary,
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
