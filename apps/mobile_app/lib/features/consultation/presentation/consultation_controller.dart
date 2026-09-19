import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/features/consultation/data/consultation_repository.dart';

final consultationRepositoryProvider = Provider<ConsultationRepository>((ref) {
  return ConsultationRemoteRepository(apiClient: ref.watch(apiClientProvider));
});

class ConsultationsListController
    extends FamilyAsyncNotifier<List<ConsultationRecord>, String?> {
  @override
  Future<List<ConsultationRecord>> build(String? arg) {
    return ref
        .read(consultationRepositoryProvider)
        .getConsultations(coupleId: arg);
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<ConsultationRecord>>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => ref
          .read(consultationRepositoryProvider)
          .getConsultations(coupleId: arg),
    );
  }

  Future<bool> recordConsultation(
    String appointmentId,
    SaveConsultationInput input,
  ) async {
    try {
      await ref
          .read(consultationRepositoryProvider)
          .recordConsultation(appointmentId, input);
      await refresh();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final consultationsListControllerProvider = AsyncNotifierProvider.family<
    ConsultationsListController, List<ConsultationRecord>, String?>(
  ConsultationsListController.new,
);
