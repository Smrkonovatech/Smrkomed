import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/features/reports/data/reports_repository.dart';

final reportsRepositoryProvider = Provider<ReportsRepository>((ref) {
  return ReportsRemoteRepository(apiClient: ref.watch(apiClientProvider));
});

final reportsFilterProvider = StateProvider<String>((ref) => 'pending_review');

class ReportsController extends AsyncNotifier<List<ReportItem>> {
  @override
  Future<List<ReportItem>> build() {
    final filter = ref.watch(reportsFilterProvider);
    return ref.read(reportsRepositoryProvider).getReports(filter: filter);
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<ReportItem>>().copyWithPrevious(state);
    final filter = ref.read(reportsFilterProvider);
    state = await AsyncValue.guard(
      () => ref.read(reportsRepositoryProvider).getReports(filter: filter),
    );
  }

  Future<bool> signOffReport(
    String orderId, {
    required String action,
    String? clinicalNotes,
  }) async {
    try {
      await ref.read(reportsRepositoryProvider).signOffReport(
            orderId,
            action: action,
            clinicalNotes: clinicalNotes,
          );
      await refresh();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final reportsControllerProvider =
    AsyncNotifierProvider<ReportsController, List<ReportItem>>(
  ReportsController.new,
);
