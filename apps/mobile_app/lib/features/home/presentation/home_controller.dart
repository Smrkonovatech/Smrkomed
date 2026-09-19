import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/home/data/home_repository_impl.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  return HomeRepositoryImpl(
    HomeRemoteDataSource(
      apiClient: ref.watch(apiClientProvider),
      logger: ref.watch(appLoggerProvider),
    ),
  );
});

class HomeController extends AsyncNotifier<HomeDashboard> {
  @override
  Future<HomeDashboard> build() {
    return _load();
  }

  Future<HomeDashboard> _load() {
    final user = ref.read(authControllerProvider).user;
    return ref
        .read(homeRepositoryProvider)
        .loadDashboard(doctorName: user?.name, doctorId: user?.id);
  }

  Future<void> refresh() async {
    state = const AsyncLoading<HomeDashboard>().copyWithPrevious(state);
    state = await AsyncValue.guard(_load);
  }
}

final homeControllerProvider =
    AsyncNotifierProvider<HomeController, HomeDashboard>(HomeController.new);
