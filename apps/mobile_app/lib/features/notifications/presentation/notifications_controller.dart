import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/features/notifications/data/notifications_repository.dart';

final notificationsRepositoryProvider =
    Provider<NotificationsRepository>((ref) {
  return NotificationsRemoteRepository(
      apiClient: ref.watch(apiClientProvider));
});

class NotificationsController extends AsyncNotifier<NotificationsSnapshot> {
  @override
  Future<NotificationsSnapshot> build() {
    return ref.read(notificationsRepositoryProvider).loadNotifications();
  }

  Future<void> refresh() async {
    state = const AsyncLoading<NotificationsSnapshot>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref.read(notificationsRepositoryProvider).loadNotifications(),
    );
  }

  Future<bool> resolveException(String id, {String? notes}) async {
    try {
      await ref
          .read(notificationsRepositoryProvider)
          .resolveException(id, notes: notes);
      await refresh();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final notificationsControllerProvider =
    AsyncNotifierProvider<NotificationsController, NotificationsSnapshot>(
  NotificationsController.new,
);
