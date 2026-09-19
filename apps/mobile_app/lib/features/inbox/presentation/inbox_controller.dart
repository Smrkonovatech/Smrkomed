import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/features/inbox/data/inbox_repository.dart';

final inboxRepositoryProvider = Provider<InboxRepository>((ref) {
  return InboxRemoteRepository(apiClient: ref.watch(apiClientProvider));
});

final inboxFilterProvider = StateProvider<String>((ref) => 'all');
final inboxQueryProvider = StateProvider<String>((ref) => '');

class InboxController extends AsyncNotifier<List<InboxConversation>> {
  @override
  Future<List<InboxConversation>> build() {
    final filter = ref.watch(inboxFilterProvider);
    final query = ref.watch(inboxQueryProvider);
    return ref.read(inboxRepositoryProvider).getConversations(
          filter: filter,
          query: query.isEmpty ? null : query,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<InboxConversation>>().copyWithPrevious(state);
    final filter = ref.read(inboxFilterProvider);
    final query = ref.read(inboxQueryProvider);
    state = await AsyncValue.guard(
      () => ref.read(inboxRepositoryProvider).getConversations(
            filter: filter,
            query: query.isEmpty ? null : query,
          ),
    );
  }
}

final inboxControllerProvider =
    AsyncNotifierProvider<InboxController, List<InboxConversation>>(
  InboxController.new,
);

class ChatController
    extends AutoDisposeFamilyAsyncNotifier<ConversationDetail, String> {
  @override
  Future<ConversationDetail> build(String arg) {
    return ref.read(inboxRepositoryProvider).getConversationDetail(arg);
  }

  Future<void> refresh() async {
    state = const AsyncLoading<ConversationDetail>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref.read(inboxRepositoryProvider).getConversationDetail(arg),
    );
  }

  Future<bool> sendMessage(String text) async {
    if (text.trim().isEmpty) return false;
    try {
      await ref.read(inboxRepositoryProvider).sendReply(arg, text.trim());
      await refresh();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final chatControllerProvider = AsyncNotifierProvider.autoDispose
    .family<ChatController, ConversationDetail, String>(
  ChatController.new,
);
