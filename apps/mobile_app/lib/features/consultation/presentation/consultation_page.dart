import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/consultation/data/consultation_repository.dart';
import 'package:smrkomed_doctor_app/features/consultation/presentation/consultation_controller.dart';

class ConsultationPage extends ConsumerStatefulWidget {
  const ConsultationPage({
    super.key,
    this.appointmentId,
    this.patientName,
    this.coupleId,
  });

  final String? appointmentId;
  final String? patientName;
  final String? coupleId;

  @override
  ConsumerState<ConsultationPage> createState() => _ConsultationPageState();
}

class _ConsultationPageState extends ConsumerState<ConsultationPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _appointmentIdController;
  final _reasonController = TextEditingController();
  final _diagnosisController = TextEditingController();
  final _notesController = TextEditingController();
  final _prescriptionController = TextEditingController();
  final _nextStepsController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: (widget.appointmentId != null || widget.coupleId != null) ? 0 : 1,
    );
    final initialTargetId = widget.appointmentId ?? widget.coupleId ?? '';
    _appointmentIdController = TextEditingController(text: initialTargetId);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _appointmentIdController.dispose();
    _reasonController.dispose();
    _diagnosisController.dispose();
    _notesController.dispose();
    _prescriptionController.dispose();
    _nextStepsController.dispose();
    super.dispose();
  }

  Future<void> _submitConsultation() async {
    if (!_formKey.currentState!.validate()) return;

    final targetId = _appointmentIdController.text.trim().isNotEmpty
        ? _appointmentIdController.text.trim()
        : (widget.appointmentId ?? widget.coupleId ?? '');
    if (targetId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please provide an Appointment ID or Patient ID.'),
          backgroundColor: AppTokens.colorError,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final input = SaveConsultationInput(
      reasonForVisit: _reasonController.text.trim(),
      diagnosis: _diagnosisController.text.trim(),
      impression: _diagnosisController.text.trim(),
      clinicalNotes: _notesController.text.trim(),
      prescriptionNotes: _prescriptionController.text.trim(),
      nextSteps: _nextStepsController.text.trim(),
      status: 'COMPLETED',
    );

    final success = await ref
        .read(consultationsListControllerProvider(widget.coupleId).notifier)
        .recordConsultation(targetId, input);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Consultation recorded successfully!'),
            backgroundColor: AppTokens.colorSuccess,
          ),
        );
        _clearForm();
        _tabController.animateTo(1);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to save consultation. Please try again.'),
            backgroundColor: AppTokens.colorError,
          ),
        );
      }
    }
  }

  void _clearForm() {
    _reasonController.clear();
    _diagnosisController.clear();
    _notesController.clear();
    _prescriptionController.clear();
    _nextStepsController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: AppTokens.colorHomeCard,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: AppTokens.colorHomeTitle),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Doctor Consultation',
              style: TextStyle(
                color: AppTokens.colorHomeTitle,
                fontWeight: AppTokens.fontWeightBold,
                fontSize: AppTokens.fontSizeMd,
              ),
            ),
            if (widget.patientName != null)
              Text(
                widget.patientName!,
                style: const TextStyle(
                  color: AppTokens.colorHomeMuted,
                  fontSize: AppTokens.fontSizeXs,
                ),
              ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTokens.colorPrimary,
          unselectedLabelColor: AppTokens.colorHomeMuted,
          indicatorColor: AppTokens.colorPrimary,
          tabs: const [
            Tab(text: 'Record Note'),
            Tab(text: 'Consultation History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRecordForm(),
          _buildConsultationHistory(),
        ],
      ),
    );
  }

  Widget _buildRecordForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTokens.space16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.patientName != null || widget.coupleId != null || widget.appointmentId != null) ...[
              Container(
                margin: const EdgeInsets.only(bottom: AppTokens.space16),
                padding: const EdgeInsets.all(AppTokens.space12),
                decoration: BoxDecoration(
                  color: AppTokens.colorPrimary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppTokens.radiusMd),
                  border: Border.all(color: AppTokens.colorPrimary.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppTokens.colorPrimary,
                      radius: 18,
                      child: Text(
                        (widget.patientName != null && widget.patientName!.isNotEmpty)
                            ? widget.patientName![0].toUpperCase()
                            : 'P',
                        style: const TextStyle(
                          color: AppTokens.colorOnPrimary,
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
                            widget.patientName ?? 'Patient Consultation',
                            style: const TextStyle(
                              color: AppTokens.colorHomeTitle,
                              fontWeight: AppTokens.fontWeightBold,
                              fontSize: AppTokens.fontSizeSm,
                            ),
                          ),
                          if (widget.coupleId != null || widget.appointmentId != null)
                            Text(
                              [
                                if (widget.coupleId != null) 'Patient ID: ${widget.coupleId}',
                                if (widget.appointmentId != null) 'Appt: ${widget.appointmentId}',
                              ].join(' · '),
                              style: const TextStyle(
                                color: AppTokens.colorHomeMuted,
                                fontSize: AppTokens.fontSizeXs,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              _buildFieldLabel('Appointment / Patient ID *'),
              TextFormField(
                controller: _appointmentIdController,
                decoration: _inputDecoration('Enter Appointment or Patient ID'),
                validator: (val) => (val == null || val.trim().isEmpty)
                    ? 'Appointment ID is required'
                    : null,
              ),
              const SizedBox(height: AppTokens.space16),
            ],
            _buildFieldLabel('Reason for Visit'),
            TextFormField(
              controller: _reasonController,
              decoration: _inputDecoration('e.g., Follicular Monitoring / IVF Review'),
            ),
            const SizedBox(height: AppTokens.space16),
            _buildFieldLabel('Clinical Impression / Diagnosis'),
            TextFormField(
              controller: _diagnosisController,
              decoration: _inputDecoration('e.g., Bilateral PCOS, Normal Semen Parameters'),
            ),
            const SizedBox(height: AppTokens.space16),
            _buildFieldLabel('SOAP / Clinical Notes'),
            TextFormField(
              controller: _notesController,
              maxLines: 4,
              decoration: _inputDecoration('Subjective, Objective findings, ultrasound observations...'),
            ),
            const SizedBox(height: AppTokens.space16),
            _buildFieldLabel('Prescriptions & Orders'),
            TextFormField(
              controller: _prescriptionController,
              maxLines: 3,
              decoration: _inputDecoration('Medications, dosage, diagnostic tests requested...'),
            ),
            const SizedBox(height: AppTokens.space16),
            _buildFieldLabel('Next Steps & Patient Advice'),
            TextFormField(
              controller: _nextStepsController,
              maxLines: 2,
              decoration: _inputDecoration('Follow-up schedule, lifestyle advice, trigger timing...'),
            ),
            const SizedBox(height: AppTokens.space24),
            SizedBox(
              width: double.infinity,
              height: AppTokens.buttonHeight,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitConsultation,
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
                        'Complete & Save Consultation',
                        style: TextStyle(
                          fontWeight: AppTokens.fontWeightSemibold,
                          fontSize: AppTokens.fontSizeSm,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: AppTokens.space24),
          ],
        ),
      ),
    );
  }

  Widget _buildConsultationHistory() {
    final historyAsync = ref.watch(consultationsListControllerProvider(widget.coupleId));

    return historyAsync.when(
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
                'Failed to load past consultations',
                style: TextStyle(
                  color: AppTokens.colorHomeTitle,
                  fontWeight: AppTokens.fontWeightSemibold,
                  fontSize: AppTokens.fontSizeMd,
                ),
              ),
              const SizedBox(height: AppTokens.space16),
              ElevatedButton(
                onPressed: () => ref
                    .read(consultationsListControllerProvider(widget.coupleId).notifier)
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
      data: (records) {
        final filteredRecords = (widget.coupleId != null && widget.coupleId!.isNotEmpty)
            ? records.where((r) => r.coupleId == widget.coupleId).toList()
            : records;

        if (filteredRecords.isEmpty) {
          return RefreshIndicator(
            onRefresh: () => ref
                .read(consultationsListControllerProvider(widget.coupleId).notifier)
                .refresh(),
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
                          Icons.note_alt_outlined,
                          size: 56,
                          color: AppTokens.colorHomeMuted.withValues(alpha: 0.5),
                        ),
                        const SizedBox(height: AppTokens.space12),
                        Text(
                          widget.patientName != null
                              ? 'No consultations recorded for ${widget.patientName}'
                              : 'No consultations recorded yet',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppTokens.colorHomeTitle,
                            fontWeight: AppTokens.fontWeightSemibold,
                            fontSize: AppTokens.fontSizeMd,
                          ),
                        ),
                        const SizedBox(height: AppTokens.space4),
                        const Text(
                          'Completed consultations will appear in this history.',
                          textAlign: TextAlign.center,
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
          onRefresh: () => ref
              .read(consultationsListControllerProvider(widget.coupleId).notifier)
              .refresh(),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTokens.space16,
              vertical: AppTokens.space12,
            ),
            itemCount: filteredRecords.length,
            separatorBuilder: (context, index) =>
                const SizedBox(height: AppTokens.space12),
            itemBuilder: (context, index) {
              final rec = filteredRecords[index];
              return _ConsultationCard(record: rec);
            },
          ),
        );
      },
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.space8),
      child: Text(
        label,
        style: const TextStyle(
          color: AppTokens.colorHomeTitle,
          fontWeight: AppTokens.fontWeightMedium,
          fontSize: AppTokens.fontSizeSm,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: AppTokens.colorLoginFieldHint,
        fontSize: AppTokens.fontSizeSm,
      ),
      filled: true,
      fillColor: AppTokens.colorHomeCard,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusSm),
        borderSide: const BorderSide(color: AppTokens.colorBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.radiusSm),
        borderSide: const BorderSide(color: AppTokens.colorBorder),
      ),
      contentPadding: const EdgeInsets.all(AppTokens.space12),
    );
  }
}

class _ConsultationCard extends StatelessWidget {
  const _ConsultationCard({required this.record});

  final ConsultationRecord record;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTokens.colorHomeCard,
        borderRadius: BorderRadius.circular(AppTokens.radiusMd),
        border: Border.all(color: AppTokens.colorBorder),
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
                record.patientName,
                style: const TextStyle(
                  color: AppTokens.colorHomeTitle,
                  fontWeight: AppTokens.fontWeightSemibold,
                  fontSize: AppTokens.fontSizeMd,
                ),
              ),
              Text(
                _formatDate(record.consultationDate),
                style: const TextStyle(
                  color: AppTokens.colorHomeMuted,
                  fontSize: AppTokens.fontSizeXs,
                ),
              ),
            ],
          ),
          if (record.reasonForVisit != null) ...[
            const SizedBox(height: AppTokens.space4),
            Text(
              'Reason: ${record.reasonForVisit!}',
              style: const TextStyle(
                color: AppTokens.colorPrimary,
                fontSize: AppTokens.fontSizeSm,
                fontWeight: AppTokens.fontWeightMedium,
              ),
            ),
          ],
          if (record.summary != null && record.summary!.isNotEmpty) ...[
            const SizedBox(height: AppTokens.space8),
            Text(
              record.summary!,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppTokens.colorHomeSubtitle,
                fontSize: AppTokens.fontSizeSm,
              ),
            ),
          ],
          if (record.nextSteps != null && record.nextSteps!.isNotEmpty) ...[
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
                'Next: ${record.nextSteps!}',
                style: const TextStyle(
                  color: AppTokens.colorHomeTitle,
                  fontSize: AppTokens.fontSizeXs,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }
}
