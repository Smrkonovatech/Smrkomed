import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/schedule/data/schedule_repository.dart';

final scheduleRepositoryProvider = Provider<ScheduleRepository>((ref) {
  return ScheduleRemoteRepository(apiClient: ref.watch(apiClientProvider));
});

class ScheduleController extends AsyncNotifier<ScheduleSnapshot> {
  @override
  Future<ScheduleSnapshot> build() => _load();

  Future<ScheduleSnapshot> _load() {
    final user = ref.read(authControllerProvider).user;
    return ref
        .read(scheduleRepositoryProvider)
        .load(
          doctorName: user?.name,
          doctorId: user?.id,
          clinicName: user?.clinicName,
        );
  }

  Future<void> refresh() async {
    state = const AsyncLoading<ScheduleSnapshot>().copyWithPrevious(state);
    state = await AsyncValue.guard(_load);
  }
}

final scheduleControllerProvider =
    AsyncNotifierProvider<ScheduleController, ScheduleSnapshot>(
      ScheduleController.new,
    );
