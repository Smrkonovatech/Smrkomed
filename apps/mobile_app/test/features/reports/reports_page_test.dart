import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/features/reports/data/reports_repository.dart';
import 'package:smrkomed_doctor_app/features/reports/presentation/reports_controller.dart';
import 'package:smrkomed_doctor_app/features/reports/presentation/reports_page.dart';

class FakeReportsRepository implements ReportsRepository {
  FakeReportsRepository(this.reports);
  final List<ReportItem> reports;
  String? signedOffId;
  String? signedOffAction;

  @override
  Future<List<ReportItem>> getReports({String filter = 'pending_review'}) async {
    return reports;
  }

  @override
  Future<ReportSignOffResult> signOffReport(
    String orderId, {
    required String action,
    String? clinicalNotes,
  }) async {
    signedOffId = orderId;
    signedOffAction = action;
    return ReportSignOffResult(id: orderId, status: 'COMPLETED');
  }
}

void main() {
  testWidgets('reports page renders reports list and sign-off button',
      (tester) async {
    final fakeReports = [
      const ReportItem(
        id: 'rep_1',
        title: 'Semen Analysis',
        description: 'Motility 45%, Normal Morphology',
        status: 'WAITING',
        priority: 'HIGH',
        dueDate: '2026-09-20T10:00:00Z',
        patientName: 'Ananya Sharma',
        createdAt: '2026-09-19T08:00:00Z',
      ),
    ];

    final repo = FakeReportsRepository(fakeReports);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportsRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(
          home: ReportsPage(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Clinical Reports'), findsOneWidget);
    expect(find.text('Ananya Sharma'), findsOneWidget);
    expect(find.text('Semen Analysis'), findsOneWidget);
    expect(find.text('Review & Sign Off'), findsOneWidget);
    expect(find.text('HIGH'), findsOneWidget);
  });
}
