import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/features/inbox/data/inbox_repository.dart';
import 'package:smrkomed_doctor_app/features/inbox/presentation/inbox_controller.dart';
import 'package:smrkomed_doctor_app/features/inbox/presentation/inbox_page.dart';

class FakeInboxRepository implements InboxRepository {
  FakeInboxRepository(this.conversations);
  final List<InboxConversation> conversations;

  @override
  Future<List<InboxConversation>> getConversations({
    String filter = 'all',
    String? query,
  }) async {
    return conversations;
  }

  @override
  Future<ConversationDetail> getConversationDetail(
      String conversationId) async {
    return ConversationDetail(
      id: conversationId,
      patientName: 'Priya Patel',
      phone: '+919876543210',
      status: 'OPEN',
      messages: const [
        ChatMessage(
          id: 'm1',
          direction: 'INBOUND',
          senderType: 'PATIENT',
          content: 'When should I take the trigger injection?',
          messageType: 'TEXT',
          status: 'DELIVERED',
          createdAt: '2026-09-19T10:00:00Z',
        ),
      ],
    );
  }

  @override
  Future<void> sendReply(String conversationId, String message) async {}
}

void main() {
  testWidgets('inbox page renders conversations with patient info',
      (tester) async {
    final fakeList = [
      const InboxConversation(
        id: 'conv_1',
        status: 'OPEN',
        priority: 'NORMAL',
        patientName: 'Priya Patel',
        initials: 'PP',
        phone: '+919876543210',
        lastMessageText: 'When should I take the trigger injection?',
        lastMessageTime: '2026-09-19T10:00:00Z',
        unreadCount: 1,
        updatedAt: '2026-09-19T10:00:00Z',
      ),
    ];

    final repo = FakeInboxRepository(fakeList);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          inboxRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(
          home: InboxPage(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Patient Messages'), findsOneWidget);
    expect(find.text('Priya Patel'), findsOneWidget);
    expect(find.text('When should I take the trigger injection?'),
        findsOneWidget);
  });
}
