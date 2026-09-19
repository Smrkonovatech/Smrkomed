import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/inbox/data/inbox_repository.dart';
import 'package:smrkomed_doctor_app/features/inbox/presentation/inbox_controller.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({
    super.key,
    required this.conversationId,
    this.initialPatientName,
  });

  final String conversationId;
  final String? initialPatientName;

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _messageController.clear();

    final success = await ref
        .read(chatControllerProvider(widget.conversationId).notifier)
        .sendMessage(text);

    if (mounted) {
      setState(() => _isSending = false);
      if (success) {
        _scrollToBottom();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send message via WhatsApp.'),
            backgroundColor: AppTokens.colorError,
          ),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: AppTokens.durationMedium,
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatAsync = ref.watch(chatControllerProvider(widget.conversationId));

    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: AppTokens.colorHomeCard,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: AppTokens.colorHomeTitle),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              chatAsync.valueOrNull?.patientName ??
                  widget.initialPatientName ??
                  'Patient Chat',
              style: const TextStyle(
                color: AppTokens.colorHomeTitle,
                fontWeight: AppTokens.fontWeightSemibold,
                fontSize: AppTokens.fontSizeMd,
              ),
            ),
            if (chatAsync.valueOrNull?.phone != null)
              Text(
                chatAsync.valueOrNull!.phone!,
                style: const TextStyle(
                  color: AppTokens.colorHomeMuted,
                  fontSize: AppTokens.fontSizeXs,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref
                .read(chatControllerProvider(widget.conversationId).notifier)
                .refresh(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: chatAsync.when(
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
                        'Failed to load messages',
                        style: TextStyle(
                          color: AppTokens.colorHomeTitle,
                          fontWeight: AppTokens.fontWeightSemibold,
                          fontSize: AppTokens.fontSizeMd,
                        ),
                      ),
                      const SizedBox(height: AppTokens.space16),
                      ElevatedButton(
                        onPressed: () => ref
                            .read(chatControllerProvider(widget.conversationId)
                                .notifier)
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
              data: (detail) {
                if (detail.messages.isEmpty) {
                  return const Center(
                    child: Text(
                      'No messages yet in this conversation.',
                      style: TextStyle(
                        color: AppTokens.colorHomeMuted,
                        fontSize: AppTokens.fontSizeSm,
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppTokens.space16,
                    vertical: AppTokens.space12,
                  ),
                  itemCount: detail.messages.length,
                  itemBuilder: (context, index) {
                    final msg = detail.messages[index];
                    return _MessageBubble(message: msg);
                  },
                );
              },
            ),
          ),
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: EdgeInsets.only(
        left: AppTokens.space12,
        right: AppTokens.space8,
        top: AppTokens.space8,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppTokens.space8,
      ),
      decoration: BoxDecoration(
        color: AppTokens.colorHomeCard,
        border: const Border(
          top: BorderSide(color: AppTokens.colorBorder),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                textCapitalization: TextCapitalization.sentences,
                minLines: 1,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Reply via WhatsApp...',
                  hintStyle: const TextStyle(
                    color: AppTokens.colorLoginFieldHint,
                    fontSize: AppTokens.fontSizeSm,
                  ),
                  filled: true,
                  fillColor: AppTokens.colorHomeBackground,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTokens.radiusLoginField),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppTokens.space16,
                    vertical: AppTokens.space8,
                  ),
                ),
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            const SizedBox(width: AppTokens.space8),
            IconButton(
              onPressed: _isSending ? null : _sendMessage,
              icon: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTokens.colorPrimary,
                      ),
                    )
                  : const Icon(
                      Icons.send_rounded,
                      color: AppTokens.colorPrimary,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isInbound = message.isInbound;

    return Align(
      alignment: isInbound ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppTokens.space8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space12,
          vertical: AppTokens.space8,
        ),
        decoration: BoxDecoration(
          color: isInbound
              ? AppTokens.colorHomeCard
              : AppTokens.colorPrimary,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppTokens.radiusMd),
            topRight: const Radius.circular(AppTokens.radiusMd),
            bottomLeft: Radius.circular(isInbound ? 0 : AppTokens.radiusMd),
            bottomRight: Radius.circular(isInbound ? AppTokens.radiusMd : 0),
          ),
          border: isInbound
              ? Border.all(color: AppTokens.colorBorder)
              : null,
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment:
              isInbound ? CrossAxisAlignment.start : CrossAxisAlignment.end,
          children: [
            if (!isInbound && message.senderType != 'DOCTOR') ...[
              Text(
                message.senderType,
                style: TextStyle(
                  color: AppTokens.colorOnPrimary.withValues(alpha: 0.75),
                  fontSize: AppTokens.fontSizeXs,
                  fontWeight: AppTokens.fontWeightMedium,
                ),
              ),
              const SizedBox(height: AppTokens.space2),
            ],
            Text(
              message.content,
              style: TextStyle(
                color: isInbound
                    ? AppTokens.colorHomeTitle
                    : AppTokens.colorOnPrimary,
                fontSize: AppTokens.fontSizeSm,
              ),
            ),
            const SizedBox(height: AppTokens.space4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _formatTime(message.createdAt),
                  style: TextStyle(
                    color: isInbound
                        ? AppTokens.colorHomeMuted
                        : AppTokens.colorOnPrimary.withValues(alpha: 0.7),
                    fontSize: AppTokens.fontSizeXs,
                  ),
                ),
                if (!isInbound) ...[
                  const SizedBox(width: AppTokens.space4),
                  Icon(
                    message.status == 'READ'
                        ? Icons.done_all
                        : Icons.done,
                    size: 12,
                    color: AppTokens.colorOnPrimary.withValues(alpha: 0.7),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return '';
    }
  }
}
