import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/notifications/data/notifications_repository.dart';
import 'package:smrkomed_doctor_app/features/notifications/presentation/notifications_controller.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final snapshotAsync = ref.watch(notificationsControllerProvider);

    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: AppTokens.colorHomeCard,
        elevation: 0.5,
        title: const Text(
          'Notifications & Alerts',
          style: TextStyle(
            color: AppTokens.colorHomeTitle,
            fontWeight: AppTokens.fontWeightBold,
            fontSize: AppTokens.fontSizeLg,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTokens.colorPrimary,
          unselectedLabelColor: AppTokens.colorHomeMuted,
          indicatorColor: AppTokens.colorPrimary,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Alerts & Escalations'),
                  if ((snapshotAsync.valueOrNull?.exceptions.length ?? 0) > 0) ...[
                    const SizedBox(width: AppTokens.space8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppTokens.space8,
                        vertical: AppTokens.space2,
                      ),
                      decoration: BoxDecoration(
                        color: AppTokens.colorError,
                        borderRadius:
                            BorderRadius.circular(AppTokens.radiusFull),
                      ),
                      child: Text(
                        '${snapshotAsync.valueOrNull!.exceptions.length}',
                        style: const TextStyle(
                          color: AppTokens.colorOnError,
                          fontSize: 10,
                          fontWeight: AppTokens.fontWeightBold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Activity Feed'),
          ],
        ),
      ),
      body: snapshotAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(
            color: AppTokens.colorPrimary,
          ),
        ),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppTokens.space24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline,
                  color: AppTokens.colorError,
                  size: AppTokens.iconXl,
                ),
                const SizedBox(height: AppTokens.space12),
                const Text(
                  'Failed to load notifications',
                  style: TextStyle(
                    color: AppTokens.colorHomeTitle,
                    fontWeight: AppTokens.fontWeightSemibold,
                    fontSize: AppTokens.fontSizeMd,
                  ),
                ),
                const SizedBox(height: AppTokens.space16),
                ElevatedButton(
                  onPressed: () => ref
                      .read(notificationsControllerProvider.notifier)
                      .refresh(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTokens.colorPrimary,
                    foregroundColor: AppTokens.colorOnPrimary,
                  ),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (snapshot) {
          return TabBarView(
            controller: _tabController,
            children: [
              _buildExceptionsTab(context, ref, snapshot.exceptions),
              _buildActivityTab(context, ref, snapshot.activities),
            ],
          );
        },
      ),
    );
  }

  Widget _buildExceptionsTab(
    BuildContext context,
    WidgetRef ref,
    List<CareLoopExceptionItem> exceptions,
  ) {
    if (exceptions.isEmpty) {
      return RefreshIndicator(
        onRefresh: () =>
            ref.read(notificationsControllerProvider.notifier).refresh(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.4,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.shield_outlined,
                      size: 56,
                      color: AppTokens.colorSuccess.withValues(alpha: 0.5),
                    ),
                    const SizedBox(height: AppTokens.space12),
                    const Text(
                      'No open clinical alerts',
                      style: TextStyle(
                        color: AppTokens.colorHomeTitle,
                        fontWeight: AppTokens.fontWeightSemibold,
                        fontSize: AppTokens.fontSizeMd,
                      ),
                    ),
                    const SizedBox(height: AppTokens.space4),
                    const Text(
                      'All Care Loop tasks and journeys are on schedule.',
                      style: TextStyle(
                        color: AppTokens.colorHomeMuted,
                        fontSize: AppTokens.fontSizeSm,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(notificationsControllerProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space16,
          vertical: AppTokens.space12,
        ),
        itemCount: exceptions.length,
        separatorBuilder: (context, index) =>
            const SizedBox(height: AppTokens.space12),
        itemBuilder: (context, index) {
          final item = exceptions[index];
          return _ExceptionCard(item: item);
        },
      ),
    );
  }

  Widget _buildActivityTab(
    BuildContext context,
    WidgetRef ref,
    List<ActivityItem> activities,
  ) {
    if (activities.isEmpty) {
      return RefreshIndicator(
        onRefresh: () =>
            ref.read(notificationsControllerProvider.notifier).refresh(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.4,
              child: const Center(
                child: Text(
                  'No recent activity',
                  style: TextStyle(
                    color: AppTokens.colorHomeMuted,
                    fontSize: AppTokens.fontSizeSm,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(notificationsControllerProvider.notifier).refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space16,
          vertical: AppTokens.space12,
        ),
        itemCount: activities.length,
        separatorBuilder: (context, index) =>
            const SizedBox(height: AppTokens.space8),
        itemBuilder: (context, index) {
          final act = activities[index];
          return _ActivityTile(activity: act);
        },
      ),
    );
  }
}

class _ExceptionCard extends ConsumerWidget {
  const _ExceptionCard({required this.item});

  final CareLoopExceptionItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(
        color: AppTokens.colorHomeCard,
        borderRadius: BorderRadius.circular(AppTokens.radiusMd),
        border: Border.all(
          color: item.severity.toUpperCase() == 'CRITICAL'
              ? AppTokens.colorError.withValues(alpha: 0.5)
              : AppTokens.colorBorder,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.all(AppTokens.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                item.coupleName,
                style: const TextStyle(
                  color: AppTokens.colorHomeTitle,
                  fontWeight: AppTokens.fontWeightBold,
                  fontSize: AppTokens.fontSizeMd,
                ),
              ),
              _SeverityBadge(severity: item.severity),
            ],
          ),
          if (item.taskTitle != null) ...[
            const SizedBox(height: AppTokens.space4),
            Text(
              'Task: ${item.taskTitle!}',
              style: const TextStyle(
                color: AppTokens.colorPrimary,
                fontSize: AppTokens.fontSizeSm,
                fontWeight: AppTokens.fontWeightMedium,
              ),
            ),
          ],
          const SizedBox(height: AppTokens.space8),
          Text(
            item.reason,
            style: const TextStyle(
              color: AppTokens.colorHomeSubtitle,
              fontSize: AppTokens.fontSizeSm,
            ),
          ),
          const SizedBox(height: AppTokens.space12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Assigned to: ${item.assignedTo}',
                style: const TextStyle(
                  color: AppTokens.colorHomeMuted,
                  fontSize: AppTokens.fontSizeXs,
                ),
              ),
              ElevatedButton(
                onPressed: () => _showResolveDialog(context, ref, item),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTokens.colorSuccess,
                  foregroundColor: AppTokens.colorOnPrimary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppTokens.space12,
                    vertical: AppTokens.space8,
                  ),
                  textStyle: const TextStyle(
                    fontSize: AppTokens.fontSizeXs,
                    fontWeight: AppTokens.fontWeightSemibold,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTokens.radiusSm),
                  ),
                ),
                child: const Text('Resolve Alert'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showResolveDialog(
    BuildContext context,
    WidgetRef ref,
    CareLoopExceptionItem item,
  ) {
    final notesController = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Resolve Alert'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Resolve escalation for ${item.coupleName}?',
              style: const TextStyle(fontSize: AppTokens.fontSizeSm),
            ),
            const SizedBox(height: AppTokens.space12),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                hintText: 'Resolution notes (optional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final success = await ref
                  .read(notificationsControllerProvider.notifier)
                  .resolveException(
                    item.id,
                    notes: notesController.text.trim(),
                  );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      success
                          ? 'Alert resolved successfully'
                          : 'Failed to resolve alert',
                    ),
                    backgroundColor:
                        success ? AppTokens.colorSuccess : AppTokens.colorError,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTokens.colorSuccess,
              foregroundColor: AppTokens.colorOnPrimary,
            ),
            child: const Text('Resolve'),
          ),
        ],
      ),
    );
  }
}

class _SeverityBadge extends StatelessWidget {
  const _SeverityBadge({required this.severity});

  final String severity;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        bg = AppTokens.colorHomeAttentionSoft;
        fg = AppTokens.colorError;
        break;
      case 'MEDIUM':
        bg = const Color(0xFFFEF0C7);
        fg = AppTokens.colorWarning;
        break;
      default:
        bg = AppTokens.colorHomeBackground;
        fg = AppTokens.colorHomeMuted;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space8,
        vertical: AppTokens.space4,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTokens.radiusFull),
      ),
      child: Text(
        severity.toUpperCase(),
        style: TextStyle(
          color: fg,
          fontSize: AppTokens.fontSizeXs,
          fontWeight: AppTokens.fontWeightSemibold,
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.activity});

  final ActivityItem activity;

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color iconColor;
    switch (activity.tone) {
      case 'success':
        icon = Icons.check_circle_outline;
        iconColor = AppTokens.colorSuccess;
        break;
      case 'warning':
        icon = Icons.warning_amber_rounded;
        iconColor = AppTokens.colorWarning;
        break;
      default:
        icon = Icons.info_outline;
        iconColor = AppTokens.colorPrimary;
    }

    return Container(
      padding: const EdgeInsets.all(AppTokens.space12),
      decoration: BoxDecoration(
        color: AppTokens.colorHomeCard,
        borderRadius: BorderRadius.circular(AppTokens.radiusSm),
        border: Border.all(color: AppTokens.colorBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: AppTokens.space12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity.activity,
                  style: const TextStyle(
                    color: AppTokens.colorHomeTitle,
                    fontWeight: AppTokens.fontWeightMedium,
                    fontSize: AppTokens.fontSizeSm,
                  ),
                ),
                const SizedBox(height: AppTokens.space2),
                Text(
                  activity.patient,
                  style: const TextStyle(
                    color: AppTokens.colorHomeMuted,
                    fontSize: AppTokens.fontSizeXs,
                  ),
                ),
              ],
            ),
          ),
          Text(
            activity.time,
            style: const TextStyle(
              color: AppTokens.colorHomeMuted,
              fontSize: AppTokens.fontSizeXs,
            ),
          ),
        ],
      ),
    );
  }
}
