import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/features/consultation/data/consultation_repository.dart';
import 'package:smrkomed_doctor_app/features/consultation/presentation/consultation_controller.dart';
import 'package:smrkomed_doctor_app/features/consultation/presentation/consultation_page.dart';

class FakeConsultationRepository implements ConsultationRepository {
  FakeConsultationRepository(this.records);
  final List<ConsultationRecord> records;
  SaveConsultationInput? lastRecordedInput;
  String? lastRecordedAppointmentId;

  @override
  Future<List<ConsultationRecord>> getConsultations({
    String? coupleId,
    String? appointmentId,
  }) async {
    if (coupleId != null && coupleId.isNotEmpty) {
      return records.where((r) => r.coupleId == coupleId).toList();
    }
    return records;
  }

  @override
  Future<void> recordConsultation(
    String appointmentId,
    SaveConsultationInput input,
  ) async {
    lastRecordedAppointmentId = appointmentId;
    lastRecordedInput = input;
  }
}

void main() {
  testWidgets('consultation page renders form and history tabs',
      (tester) async {
    final fakeRecords = [
      const ConsultationRecord(
        id: 'c_1',
        coupleId: 'cp_1',
        patientName: 'Sunita Rao',
        doctorName: 'Dr. Test',
        consultationDate: '2026-09-19T09:00:00Z',
        reasonForVisit: 'Initial IVF Assessment',
        summary: 'Patient counseled on IVF protocol. AFC: 12.',
        createdAt: '2026-09-19T09:30:00Z',
      ),
    ];

    final repo = FakeConsultationRepository(fakeRecords);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          consultationRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(
          home: ConsultationPage(
            appointmentId: 'apt_123',
            patientName: 'Sunita Rao',
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Doctor Consultation'), findsOneWidget);
    expect(find.text('Sunita Rao'), findsAtLeastNWidgets(1));
    expect(find.text('Record Note'), findsOneWidget);
    expect(find.text('Consultation History'), findsOneWidget);
    expect(find.text('Complete & Save Consultation'), findsOneWidget);
  });
}
