import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/reports/data/reports_repository.dart';
import 'package:smrkomed_doctor_app/features/reports/presentation/reports_controller.dart';

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(reportsControllerProvider);
    final activeFilter = ref.watch(reportsFilterProvider);

    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Clinical Reports',
          style: TextStyle(
            color: AppTokens.colorHomeTitle,
            fontWeight: AppTokens.fontWeightBold,
            fontSize: AppTokens.fontSizeLg,
          ),
        ),
      ),
      body: Column(
        children: [
          _buildFilterBar(context, ref, activeFilter),
          Expanded(
            child: reportsAsync.when(
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
                      Text(
                        'Failed to load reports',
                        style: const TextStyle(
                          color: AppTokens.colorHomeTitle,
                          fontWeight: AppTokens.fontWeightSemibold,
                          fontSize: AppTokens.fontSizeMd,
                        ),
                      ),
                      const SizedBox(height: AppTokens.space8),
                      Text(
                        err.toString(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppTokens.colorHomeMuted,
                          fontSize: AppTokens.fontSizeSm,
                        ),
                      ),
                      const SizedBox(height: AppTokens.space16),
                      ElevatedButton(
                        onPressed: () =>
                            ref.read(reportsControllerProvider.notifier).refresh(),
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
              data: (reports) {
                if (reports.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: () =>
                        ref.read(reportsControllerProvider.notifier).refresh(),
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
                                  Icons.assignment_turned_in_outlined,
                                  size: 56,
                                  color: AppTokens.colorHomeMuted.withValues(alpha: 0.5),
                                ),
                                const SizedBox(height: AppTokens.space12),
                                const Text(
                                  'No reports in this queue',
                                  style: TextStyle(
                                    color: AppTokens.colorHomeTitle,
                                    fontWeight: AppTokens.fontWeightSemibold,
                                    fontSize: AppTokens.fontSizeMd,
                                  ),
                                ),
                                const SizedBox(height: AppTokens.space4),
                                const Text(
                                  'All caught up with diagnostic reviews.',
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
                      ref.read(reportsControllerProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTokens.space16,
                      vertical: AppTokens.space8,
                    ),
                    itemCount: reports.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: AppTokens.space12),
                    itemBuilder: (context, index) {
                      return _ReportCard(report: reports[index]);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(
    BuildContext context,
    WidgetRef ref,
    String activeFilter,
  ) {
    final filters = [
      {'label': 'Pending Review', 'value': 'pending_review'},
      {'label': 'Reviewed', 'value': 'reviewed'},
      {'label': 'All Reports', 'value': 'all'},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space16,
        vertical: AppTokens.space8,
      ),
      child: Row(
        children: filters.map((f) {
          final isSelected = activeFilter == f['value'];
          return Padding(
            padding: const EdgeInsets.only(right: AppTokens.space8),
            child: ChoiceChip(
              label: Text(f['label']!),
              selected: isSelected,
              selectedColor: AppTokens.colorPrimary,
              labelStyle: TextStyle(
                color: isSelected
                    ? AppTokens.colorOnPrimary
                    : AppTokens.colorHomeTitle,
                fontWeight: isSelected
                    ? AppTokens.fontWeightSemibold
                    : AppTokens.fontWeightRegular,
                fontSize: AppTokens.fontSizeSm,
              ),
              backgroundColor: AppTokens.colorHomeCard,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTokens.radiusFull),
                side: BorderSide(
                  color: isSelected
                      ? AppTokens.colorPrimary
                      : AppTokens.colorBorder,
                ),
              ),
              onSelected: (_) {
                ref.read(reportsFilterProvider.notifier).state = f['value']!;
              },
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ReportCard extends ConsumerWidget {
  const _ReportCard({required this.report});

  final ReportItem report;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isPending = report.status != 'COMPLETED';

    return Container(
      decoration: BoxDecoration(
        color: AppTokens.colorHomeCard,
        borderRadius: BorderRadius.circular(AppTokens.radiusMd),
        border: Border.all(color: AppTokens.colorBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(AppTokens.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppTokens.colorPrimary.withValues(alpha: 0.12),
                child: Text(
                  report.patientName.isNotEmpty
                      ? report.patientName[0].toUpperCase()
                      : 'P',
                  style: const TextStyle(
                    color: AppTokens.colorPrimary,
                    fontWeight: AppTokens.fontWeightBold,
                    fontSize: AppTokens.fontSizeSm,
                  ),
                ),
              ),
              const SizedBox(width: AppTokens.space12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.patientName,
                      style: const TextStyle(
                        color: AppTokens.colorHomeTitle,
                        fontWeight: AppTokens.fontWeightSemibold,
                        fontSize: AppTokens.fontSizeMd,
                      ),
                    ),
                    if (report.dueDate != null)
                      Text(
                        'Due: ${report.dueDate!.split('T').first}',
                        style: const TextStyle(
                          color: AppTokens.colorHomeMuted,
                          fontSize: AppTokens.fontSizeXs,
                        ),
                      ),
                  ],
                ),
              ),
              _PriorityBadge(priority: report.priority),
            ],
          ),
          const SizedBox(height: AppTokens.space12),
          Text(
            report.title,
            style: const TextStyle(
              color: AppTokens.colorHomeTitle,
              fontWeight: AppTokens.fontWeightMedium,
              fontSize: AppTokens.fontSizeSm,
            ),
          ),
          if (report.description != null && report.description!.isNotEmpty) ...[
            const SizedBox(height: AppTokens.space4),
            Text(
              report.description!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppTokens.colorHomeSubtitle,
                fontSize: AppTokens.fontSizeSm,
              ),
            ),
          ],
          if (report.lastAction != null && report.lastAction!.isNotEmpty) ...[
            const SizedBox(height: AppTokens.space8),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTokens.space8,
                vertical: AppTokens.space4,
              ),
              decoration: BoxDecoration(
                color: AppTokens.colorHomeBackground,
                borderRadius: BorderRadius.circular(AppTokens.radiusSm),
              ),
              child: Text(
                'Action: ${report.lastAction!}',
                style: const TextStyle(
                  color: AppTokens.colorPrimary,
                  fontSize: AppTokens.fontSizeXs,
                  fontWeight: AppTokens.fontWeightMedium,
                ),
              ),
            ),
          ],
          const SizedBox(height: AppTokens.space12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _StatusBadge(status: report.status),
              if (isPending)
                ElevatedButton.icon(
                  onPressed: () => _showSignOffSheet(context, ref, report),
                  icon: const Icon(Icons.check_circle_outline, size: 16),
                  label: const Text('Review & Sign Off'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTokens.colorPrimary,
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
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _showSignOffSheet(
    BuildContext context,
    WidgetRef ref,
    ReportItem report,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTokens.radiusLg)),
      ),
      builder: (ctx) => _SignOffBottomSheet(report: report),
    );
  }
}

class _SignOffBottomSheet extends ConsumerStatefulWidget {
  const _SignOffBottomSheet({required this.report});

  final ReportItem report;

  @override
  ConsumerState<_SignOffBottomSheet> createState() =>
      _SignOffBottomSheetState();
}

class _SignOffBottomSheetState extends ConsumerState<_SignOffBottomSheet> {
  String _selectedAction = 'APPROVED';
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    final success = await ref
        .read(reportsControllerProvider.notifier)
        .signOffReport(
          widget.report.id,
          action: _selectedAction,
          clinicalNotes: _notesController.text.trim(),
        );
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Report signed off successfully'),
          backgroundColor: AppTokens.colorSuccess,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to sign off report. Please try again.'),
          backgroundColor: AppTokens.colorError,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final actions = [
      {'label': 'Approve', 'value': 'APPROVED'},
      {'label': 'Acknowledge', 'value': 'ACKNOWLEDGED'},
      {'label': 'Repeat Test', 'value': 'REPEAT_TEST'},
      {'label': 'Follow-up Required', 'value': 'FOLLOWUP_REQUIRED'},
    ];

    return Padding(
      padding: EdgeInsets.only(
        left: AppTokens.space16,
        right: AppTokens.space16,
        top: AppTokens.space20,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppTokens.space24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Clinical Review & Sign-Off',
                style: TextStyle(
                  color: AppTokens.colorHomeTitle,
                  fontWeight: AppTokens.fontWeightBold,
                  fontSize: AppTokens.fontSizeMd,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.space4),
          Text(
            '${widget.report.title} — ${widget.report.patientName}',
            style: const TextStyle(
              color: AppTokens.colorHomeMuted,
              fontSize: AppTokens.fontSizeSm,
            ),
          ),
          const SizedBox(height: AppTokens.space16),
          const Text(
            'Clinical Action',
            style: TextStyle(
              color: AppTokens.colorHomeTitle,
              fontWeight: AppTokens.fontWeightMedium,
              fontSize: AppTokens.fontSizeSm,
            ),
          ),
          const SizedBox(height: AppTokens.space8),
          Wrap(
            spacing: AppTokens.space8,
            runSpacing: AppTokens.space4,
            children: actions.map((a) {
              final isSelected = _selectedAction == a['value'];
              return ChoiceChip(
                label: Text(a['label']!),
                selected: isSelected,
                selectedColor: AppTokens.colorPrimary,
                labelStyle: TextStyle(
                  color: isSelected
                      ? AppTokens.colorOnPrimary
                      : AppTokens.colorHomeTitle,
                  fontSize: AppTokens.fontSizeXs,
                  fontWeight: isSelected
                      ? AppTokens.fontWeightSemibold
                      : AppTokens.fontWeightRegular,
                ),
                backgroundColor: AppTokens.colorHomeBackground,
                onSelected: (_) {
                  setState(() => _selectedAction = a['value']!);
                },
              );
            }).toList(),
          ),
          const SizedBox(height: AppTokens.space16),
          const Text(
            'Doctor Clinical Notes (Optional)',
            style: TextStyle(
              color: AppTokens.colorHomeTitle,
              fontWeight: AppTokens.fontWeightMedium,
              fontSize: AppTokens.fontSizeSm,
            ),
          ),
          const SizedBox(height: AppTokens.space8),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Add clinical interpretation, instructions, or recommendations...',
              hintStyle: const TextStyle(
                color: AppTokens.colorLoginFieldHint,
                fontSize: AppTokens.fontSizeSm,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppTokens.radiusSm),
                borderSide: const BorderSide(color: AppTokens.colorBorder),
              ),
              contentPadding: const EdgeInsets.all(AppTokens.space12),
            ),
          ),
          const SizedBox(height: AppTokens.space20),
          SizedBox(
            width: double.infinity,
            height: AppTokens.buttonHeight,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTokens.colorPrimary,
                foregroundColor: AppTokens.colorOnPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTokens.radiusSm),
                ),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTokens.colorOnPrimary,
                      ),
                    )
                  : const Text(
                      'Confirm Sign-Off',
                      style: TextStyle(
                        fontWeight: AppTokens.fontWeightSemibold,
                        fontSize: AppTokens.fontSizeSm,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  const _PriorityBadge({required this.priority});

  final String priority;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    switch (priority.toUpperCase()) {
      case 'URGENT':
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
        priority.toUpperCase(),
        style: TextStyle(
          color: fg,
          fontSize: AppTokens.fontSizeXs,
          fontWeight: AppTokens.fontWeightSemibold,
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final isDone = status == 'COMPLETED';
    final bg = isDone ? const Color(0xFFECFDF3) : const Color(0xFFEFF8FF);
    final fg = isDone ? AppTokens.colorSuccess : AppTokens.colorInfo;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space8,
        vertical: AppTokens.space4,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTokens.radiusSm),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: fg,
          fontSize: AppTokens.fontSizeXs,
          fontWeight: AppTokens.fontWeightMedium,
        ),
      ),
    );
  }
}
