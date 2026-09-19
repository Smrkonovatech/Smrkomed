import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';

class InboxConversation {
  const InboxConversation({
    required this.id,
    required this.status,
    required this.priority,
    required this.patientName,
    required this.initials,
    this.phone,
    this.lastMessageText,
    this.lastMessageTime,
    required this.unreadCount,
    required this.updatedAt,
    this.coupleId,
  });

  final String id;
  final String status;
  final String priority;
  final String patientName;
  final String initials;
  final String? phone;
  final String? lastMessageText;
  final String? lastMessageTime;
  final int unreadCount;
  final String updatedAt;
  final String? coupleId;

  factory InboxConversation.fromJson(Map<String, dynamic> json) {
    final patient = json['patient'] as Map<String, dynamic>?;
    final patientName = patient != null
        ? '${patient['firstName'] ?? ''} ${patient['lastName'] ?? ''}'.trim()
        : (json['contactPhone'] as String? ?? 'Unknown Contact');
    final initials = patient?['initials'] as String? ??
        (patientName.isNotEmpty ? patientName[0].toUpperCase() : 'P');

    final lastMessage = json['lastMessage'] as Map<String, dynamic>?;

    return InboxConversation(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'OPEN',
      priority: json['priority'] as String? ?? 'NORMAL',
      patientName: patientName.isNotEmpty ? patientName : 'Patient',
      initials: initials,
      phone: patient?['phone'] as String? ?? json['contactPhone'] as String?,
      lastMessageText: lastMessage?['preview'] as String?,
      lastMessageTime: lastMessage?['createdAt'] as String?,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      updatedAt: json['updatedAt'] as String? ?? '',
      coupleId: json['coupleId'] as String?,
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.direction,
    required this.senderType,
    required this.content,
    required this.messageType,
    required this.status,
    required this.createdAt,
    this.mediaUrl,
  });

  final String id;
  final String direction; // 'INBOUND' or 'OUTBOUND'
  final String senderType; // 'PATIENT', 'STAFF', 'AI', 'SYSTEM'
  final String content;
  final String messageType;
  final String status;
  final String createdAt;
  final String? mediaUrl;

  bool get isInbound => direction == 'INBOUND';

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final media = json['whatsappMedia'] as Map<String, dynamic>?;
    return ChatMessage(
      id: json['id'] as String? ?? '',
      direction: json['direction'] as String? ?? 'INBOUND',
      senderType: json['senderType'] as String? ?? 'PATIENT',
      content: json['content'] as String? ?? '',
      messageType: json['messageType'] as String? ?? 'TEXT',
      status: json['status'] as String? ?? 'DELIVERED',
      createdAt: json['createdAt'] as String? ?? '',
      mediaUrl: media != null ? '/api/v1/whatsapp-automation/inbox/media/${media['id']}' : null,
    );
  }
}

class ConversationDetail {
  const ConversationDetail({
    required this.id,
    required this.patientName,
    this.phone,
    required this.status,
    required this.messages,
    this.coupleId,
  });

  final String id;
  final String patientName;
  final String? phone;
  final String status;
  final List<ChatMessage> messages;
  final String? coupleId;

  factory ConversationDetail.fromJson(Map<String, dynamic> json) {
    final patient = json['patient'] as Map<String, dynamic>?;
    final patientName = patient != null
        ? '${patient['firstName'] ?? ''} ${patient['lastName'] ?? ''}'.trim()
        : 'Patient';

    final messagesList = (json['messages'] as List?)
            ?.whereType<Map>()
            .map((m) => ChatMessage.fromJson(Map<String, dynamic>.from(m)))
            .toList() ??
        [];

    return ConversationDetail(
      id: json['id'] as String? ?? '',
      patientName: patientName.isNotEmpty ? patientName : 'Patient',
      phone: patient?['phone'] as String?,
      status: json['status'] as String? ?? 'OPEN',
      messages: messagesList,
      coupleId: (json['couple'] as Map?)?['id'] as String?,
    );
  }
}

abstract class InboxRepository {
  Future<List<InboxConversation>> getConversations({
    String filter = 'all',
    String? query,
  });
  Future<ConversationDetail> getConversationDetail(String conversationId);
  Future<void> sendReply(String conversationId, String message);
}

class InboxRemoteRepository implements InboxRepository {
  InboxRemoteRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<List<InboxConversation>> getConversations({
    String filter = 'all',
    String? query,
  }) async {
    try {
      final q = <String, dynamic>{
        'filter': filter,
        if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      };
      return await _apiClient.get<List<InboxConversation>>(
        ApiPaths.whatsappInbox,
        query: q,
        parse: (data) {
          if (data is! List) return const [];
          return data
              .whereType<Map>()
              .map((row) =>
                  InboxConversation.fromJson(Map<String, dynamic>.from(row)))
              .toList();
        },
      );
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      return const [];
    }
  }

  @override
  Future<ConversationDetail> getConversationDetail(
      String conversationId) async {
    return await _apiClient.get<ConversationDetail>(
      '${ApiPaths.whatsappInbox}/$conversationId',
      parse: (data) {
        if (data is Map) {
          return ConversationDetail.fromJson(
              Map<String, dynamic>.from(data));
        }
        return ConversationDetail(
          id: conversationId,
          patientName: 'Patient',
          status: 'OPEN',
          messages: const [],
        );
      },
    );
  }

  @override
  Future<void> sendReply(String conversationId, String message) async {
    await _apiClient.post<dynamic>(
      '${ApiPaths.whatsappInbox}/$conversationId/reply',
      data: {'body': message},
    );
  }
}
