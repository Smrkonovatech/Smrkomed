import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/features/notifications/data/notifications_repository.dart';
import 'package:smrkomed_doctor_app/features/notifications/presentation/notifications_controller.dart';
import 'package:smrkomed_doctor_app/features/notifications/presentation/notifications_page.dart';

class FakeNotificationsRepository implements NotificationsRepository {
  FakeNotificationsRepository(this.snapshot);
  final NotificationsSnapshot snapshot;
  String? resolvedId;

  @override
  Future<NotificationsSnapshot> loadNotifications() async {
    return snapshot;
  }

  @override
  Future<void> resolveException(String id, {String? notes}) async {
    resolvedId = id;
  }
}

void main() {
  testWidgets('notifications page renders alerts and activity tabs',
      (tester) async {
    final fakeSnapshot = NotificationsSnapshot(
      exceptions: const [
        CareLoopExceptionItem(
          id: 'esc_1',
          coupleId: 'cp_1',
          coupleName: 'Meera & Rajesh',
          taskTitle: 'Trigger Injection Confirmation',
          type: 'OVERDUE_TASK',
          severity: 'HIGH',
          reason: 'Patient has not confirmed trigger injection after 2 hours',
          status: 'OPEN',
          assignedTo: 'Dr. Test',
          createdAt: '2026-09-19T11:00:00Z',
        ),
      ],
      activities: const [
        ActivityItem(
          id: 'act_1',
          patient: 'Meera & Rajesh',
          activity: 'Care plan updated',
          time: '11:30 AM',
          tone: 'success',
        ),
      ],
    );

    final repo = FakeNotificationsRepository(fakeSnapshot);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notificationsRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(
          home: NotificationsPage(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Notifications & Alerts'), findsOneWidget);
    expect(find.text('Meera & Rajesh'), findsOneWidget);
    expect(
      find.textContaining('Trigger Injection Confirmation'),
      findsWidgets,
    );
    expect(find.text('Resolve Alert'), findsOneWidget);
  });
}
