import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/routing/shell_tabs.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/schedule/data/schedule_repository.dart';
import 'package:smrkomed_doctor_app/features/schedule/presentation/schedule_controller.dart';

class SchedulePage extends ConsumerStatefulWidget {
  const SchedulePage({super.key});

  @override
  ConsumerState<SchedulePage> createState() => _SchedulePageState();
}

class _SchedulePageState extends ConsumerState<SchedulePage> {
  var _upcoming = false;

  @override
  Widget build(BuildContext context) {
    final schedule = ref.watch(scheduleControllerProvider);
    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => openShellTab(context, ShellTabs.home),
                    icon: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 18,
                    ),
                    color: AppTokens.colorHomeTitle,
                  ),
                  const Expanded(
                    child: Text(
                      'Appointments',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: AppTokens.fontWeightBold,
                        color: Color(0xFF3D2E7C),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Appointment filters are not available in this app yet.',
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.tune_rounded),
                    color: AppTokens.colorHomeTitle,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _TabChip(
                    label: 'Today',
                    selected: !_upcoming,
                    onTap: () => setState(() => _upcoming = false),
                  ),
                  const SizedBox(width: 10),
                  _TabChip(
                    label: 'Upcoming',
                    selected: _upcoming,
                    onTap: () => setState(() => _upcoming = true),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: schedule.when(
                skipLoadingOnReload: true,
                skipLoadingOnRefresh: true,
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => _ScheduleMessage(
                  text: 'Unable to load appointments.',
                  action: 'Try again',
                  onAction: () =>
                      ref.read(scheduleControllerProvider.notifier).refresh(),
                ),
                data: (snapshot) {
                  if (snapshot.error != null) {
                    return _ScheduleMessage(
                      text: 'Unable to load appointments.',
                      action: 'Try again',
                      onAction: () => ref
                          .read(scheduleControllerProvider.notifier)
                          .refresh(),
                    );
                  }
                  final items = _upcoming ? snapshot.upcoming : snapshot.today;
                  if (items.isEmpty) {
                    return _ScheduleMessage(
                      text: _upcoming
                          ? 'No upcoming appointments'
                          : 'No appointments scheduled today',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () =>
                        ref.read(scheduleControllerProvider.notifier).refresh(),
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      itemCount: items.length,
                      separatorBuilder: (context, index) =>
                          const Divider(height: 1, color: Color(0xFFE8E4F0)),
                      itemBuilder: (context, index) {
                        return _AppointmentTile(item: items[index]);
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE8DDF8) : Colors.white,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: AppTokens.fontWeightSemibold,
            color: selected
                ? const Color(0xFF5B3FA0)
                : AppTokens.colorHomeMuted,
          ),
        ),
      ),
    );
  }
}

class _AppointmentTile extends StatelessWidget {
  const _AppointmentTile({required this.item});

  final ScheduleAppointment item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: const Color(0xFFD9C7F0),
                child: Text(
                  item.initials,
                  style: const TextStyle(
                    color: Color(0xFF4B2E83),
                    fontWeight: AppTokens.fontWeightBold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            item.patientName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: AppTokens.fontWeightBold,
                              color: AppTokens.colorHomeTitle,
                            ),
                          ),
                        ),
                        if (item.patientCode != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            item.patientCode!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppTokens.colorHomeMuted,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.access_time,
                          size: 14,
                          color: Color(0xFF7B6EA8),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            [
                              item.time,
                              if (item.subtitle.isNotEmpty) item.subtitle,
                            ].join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF7B6EA8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Appointment detail is not available in this app yet.',
                  ),
                ),
              );
            },
            style: OutlinedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppTokens.colorHomeTitle,
              side: BorderSide.none,
              elevation: 0,
              shadowColor: Colors.transparent,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              shape: const StadiumBorder(),
            ),
            child: const Text(
              'View details',
              style: TextStyle(fontWeight: AppTokens.fontWeightMedium),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleMessage extends StatelessWidget {
  const _ScheduleMessage({required this.text, this.action, this.onAction});

  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTokens.colorHomeMuted),
            ),
            if (onAction != null && action != null)
              TextButton(onPressed: onAction, child: Text(action!)),
          ],
        ),
      ),
    );
  }
}
