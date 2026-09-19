import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/inbox/data/inbox_repository.dart';
import 'package:smrkomed_doctor_app/features/inbox/presentation/chat_page.dart';
import 'package:smrkomed_doctor_app/features/inbox/presentation/inbox_controller.dart';

class InboxPage extends ConsumerWidget {
  const InboxPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inboxAsync = ref.watch(inboxControllerProvider);
    final activeFilter = ref.watch(inboxFilterProvider);

    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Patient Messages',
          style: TextStyle(
            color: AppTokens.colorHomeTitle,
            fontWeight: AppTokens.fontWeightBold,
            fontSize: AppTokens.fontSizeLg,
          ),
        ),
      ),
      body: Column(
        children: [
          _buildSearchBar(ref),
          _buildFilterBar(ref, activeFilter),
          Expanded(
            child: inboxAsync.when(
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
                        'Failed to load conversations',
                        style: TextStyle(
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
                            ref.read(inboxControllerProvider.notifier).refresh(),
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
              data: (conversations) {
                if (conversations.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: () =>
                        ref.read(inboxControllerProvider.notifier).refresh(),
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
                                  Icons.chat_bubble_outline_rounded,
                                  size: 56,
                                  color: AppTokens.colorHomeMuted.withValues(alpha: 0.5),
                                ),
                                const SizedBox(height: AppTokens.space12),
                                const Text(
                                  'No conversations found',
                                  style: TextStyle(
                                    color: AppTokens.colorHomeTitle,
                                    fontWeight: AppTokens.fontWeightSemibold,
                                    fontSize: AppTokens.fontSizeMd,
                                  ),
                                ),
                                const SizedBox(height: AppTokens.space4),
                                const Text(
                                  'WhatsApp patient messages will appear here.',
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
                      ref.read(inboxControllerProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTokens.space16,
                      vertical: AppTokens.space8,
                    ),
                    itemCount: conversations.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: AppTokens.space8),
                    itemBuilder: (context, index) {
                      return _ConversationCard(
                        item: conversations[index],
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => ChatPage(
                                conversationId: conversations[index].id,
                                initialPatientName:
                                    conversations[index].patientName,
                              ),
                            ),
                          );
                        },
                      );
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

  Widget _buildSearchBar(WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space16,
        vertical: AppTokens.space4,
      ),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Search patient name or phone...',
          hintStyle: const TextStyle(
            color: AppTokens.colorLoginFieldHint,
            fontSize: AppTokens.fontSizeSm,
          ),
          prefixIcon: const Icon(
            Icons.search,
            color: AppTokens.colorHomeMuted,
            size: AppTokens.iconMd,
          ),
          filled: true,
          fillColor: AppTokens.colorHomeCard,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusMd),
            borderSide: const BorderSide(color: AppTokens.colorBorder),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space12,
            vertical: AppTokens.space8,
          ),
        ),
        onChanged: (val) {
          ref.read(inboxQueryProvider.notifier).state = val;
        },
      ),
    );
  }

  Widget _buildFilterBar(WidgetRef ref, String activeFilter) {
    final filters = [
      {'label': 'All', 'value': 'all'},
      {'label': 'Unread', 'value': 'unread'},
      {'label': 'Waiting Patient', 'value': 'waiting_patient'},
      {'label': 'Escalated', 'value': 'escalated'},
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
                ref.read(inboxFilterProvider.notifier).state = f['value']!;
              },
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ConversationCard extends StatelessWidget {
  const _ConversationCard({
    required this.item,
    required this.onTap,
  });

  final InboxConversation item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasUnread = item.unreadCount > 0;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTokens.radiusMd),
      child: Container(
        decoration: BoxDecoration(
          color: AppTokens.colorHomeCard,
          borderRadius: BorderRadius.circular(AppTokens.radiusMd),
          border: Border.all(
            color: hasUnread
                ? AppTokens.colorPrimary.withValues(alpha: 0.5)
                : AppTokens.colorBorder,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        padding: const EdgeInsets.all(AppTokens.space12),
        child: Row(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor:
                      AppTokens.colorPrimary.withValues(alpha: 0.12),
                  child: Text(
                    item.initials,
                    style: const TextStyle(
                      color: AppTokens.colorPrimary,
                      fontWeight: AppTokens.fontWeightBold,
                      fontSize: AppTokens.fontSizeSm,
                    ),
                  ),
                ),
                if (hasUnread)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppTokens.colorPrimary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: AppTokens.space12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item.patientName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppTokens.colorHomeTitle,
                            fontWeight: hasUnread
                                ? AppTokens.fontWeightBold
                                : AppTokens.fontWeightSemibold,
                            fontSize: AppTokens.fontSizeSm,
                          ),
                        ),
                      ),
                      if (item.lastMessageTime != null)
                        Text(
                          _formatDate(item.lastMessageTime!),
                          style: const TextStyle(
                            color: AppTokens.colorHomeMuted,
                            fontSize: AppTokens.fontSizeXs,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppTokens.space4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.lastMessageText ?? 'No message history',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: hasUnread
                                ? AppTokens.colorHomeTitle
                                : AppTokens.colorHomeMuted,
                            fontWeight: hasUnread
                                ? AppTokens.fontWeightMedium
                                : AppTokens.fontWeightRegular,
                            fontSize: AppTokens.fontSizeXs,
                          ),
                        ),
                      ),
                      if (item.status == 'ESCALATED') ...[
                        const SizedBox(width: AppTokens.space8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTokens.space4,
                            vertical: AppTokens.space2,
                          ),
                          decoration: BoxDecoration(
                            color: AppTokens.colorHomeAttentionSoft,
                            borderRadius:
                                BorderRadius.circular(AppTokens.radiusSm),
                          ),
                          child: const Text(
                            'ESCALATED',
                            style: TextStyle(
                              color: AppTokens.colorError,
                              fontSize: 9,
                              fontWeight: AppTokens.fontWeightBold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        final hour = dt.hour.toString().padLeft(2, '0');
        final minute = dt.minute.toString().padLeft(2, '0');
        return '$hour:$minute';
      }
      return '${dt.day}/${dt.month}';
    } catch (_) {
      return '';
    }
  }
}
