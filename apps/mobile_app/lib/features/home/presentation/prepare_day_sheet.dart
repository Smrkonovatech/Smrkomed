import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/home/data/prepare_day_model.dart';

final prepareDayProvider = FutureProvider.autoDispose<PrepareDayData>((ref) async {
  final client = ref.watch(apiClientProvider);
  return client.get<PrepareDayData>(
    ApiPaths.doctorPrepareDay,
    parse: (data) {
      if (data is! Map) {
        throw Exception('Invalid Prepare My Day response');
      }
      return PrepareDayData.fromJson(Map<String, dynamic>.from(data));
    },
  );
});

void showPrepareDaySheet({required BuildContext context}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => const _PrepareDaySheetContent(),
  );
}

class _PrepareDaySheetContent extends ConsumerWidget {
  const _PrepareDaySheetContent();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(prepareDayProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Prepare My Day ✨',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: AppTokens.fontWeightBold,
                          color: AppTokens.colorHomeTitle,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Doctor Daily Clinical Briefing',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTokens.colorHomeMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: AppTokens.colorHomeMuted,
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: state.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Unable to load Prepare My Day briefing.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppTokens.colorHomeMuted),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => ref.invalidate(prepareDayProvider),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F0FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE5DCFF)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.auto_awesome,
                              size: 16,
                              color: Color(0xFF6F4FE0),
                            ),
                            SizedBox(width: 6),
                            Text(
                              'DAILY BRIEFING',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.8,
                                color: Color(0xFF6F4FE0),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          data.summary,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.4,
                            color: Color(0xFF332255),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _MetricChip(
                        label: 'Appointments',
                        count: data.todayAppointmentsCount,
                        color: const Color(0xFF5B3FA0),
                      ),
                      _MetricChip(
                        label: 'Pending Reports',
                        count: data.pendingReportsCount,
                        color: const Color(0xFFD97706),
                      ),
                      _MetricChip(
                        label: 'Escalations',
                        count: data.escalationsCount,
                        color: const Color(0xFFDC2626),
                      ),
                      _MetricChip(
                        label: 'Active Cycles',
                        count: data.activeTreatmentsCount,
                        color: const Color(0xFF059669),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    "Today's Appointments",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: AppTokens.fontWeightBold,
                      color: AppTokens.colorHomeTitle,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (data.todayAppointments.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        'No appointments scheduled today.',
                        style: TextStyle(color: AppTokens.colorHomeMuted),
                      ),
                    )
                  else
                    for (final appt in data.todayAppointments)
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9F8FD),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFEDE9F5)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    appt.patientName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    appt.type,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTokens.colorHomeMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                  context.push(
                                    '${AppRoutes.consultation}?appointmentId=${appt.id}&coupleId=${appt.coupleId ?? ''}&patientName=${Uri.encodeComponent(appt.patientName)}',
                                  );
                              },
                              child: const Text('Consult'),
                            ),
                          ],
                        ),
                      ),
                  const SizedBox(height: 20),
                  const Text(
                    'Pending Reports',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: AppTokens.fontWeightBold,
                      color: AppTokens.colorHomeTitle,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (data.pendingReports.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        'No diagnostic reports awaiting review.',
                        style: TextStyle(color: AppTokens.colorHomeMuted),
                      ),
                    )
                  else
                    for (final rep in data.pendingReports.take(5))
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9F8FD),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFEDE9F5)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    rep.title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    rep.patientName,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTokens.colorHomeMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                context.push(AppRoutes.reports);
                              },
                              child: const Text('Review'),
                            ),
                          ],
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
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$count',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
