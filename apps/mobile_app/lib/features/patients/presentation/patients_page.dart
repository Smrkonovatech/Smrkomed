import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_metrics.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

class PatientsPage extends ConsumerWidget {
  const PatientsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patients = ref.watch(patientsControllerProvider);
    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: AppTokens.colorHomeBackground,
        elevation: 0,
        title: const Text(
          'Patients',
          style: TextStyle(
            color: AppTokens.colorHomeTitle,
            fontWeight: AppTokens.fontWeightBold,
          ),
        ),
      ),
      body: patients.when(
        skipLoadingOnReload: true,
        skipLoadingOnRefresh: true,
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Unable to load patients.'),
              TextButton(
                onPressed: () =>
                    ref.read(patientsControllerProvider.notifier).refresh(),
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return const Center(child: Text('No active journeys'));
          }
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(patientsControllerProvider.notifier).refresh(),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: rows.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final row = rows[index];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: colorForKind(row.kind),
                    child: Text(
                      row.initials,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  title: Text(
                    row.name,
                    style: const TextStyle(
                      fontWeight: AppTokens.fontWeightSemibold,
                    ),
                  ),
                  subtitle: Text(
                    [
                      if (row.code != null) row.code!,
                      row.detail,
                    ].where((part) => part.isNotEmpty).join(' · '),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

Color colorForKind(JourneyKind kind) {
  return switch (kind) {
    JourneyKind.consultation => AppTokens.colorHomeConsultation,
    JourneyKind.lab => AppTokens.colorHomeLab,
    JourneyKind.review => AppTokens.colorHomeReview,
  };
}

class PatientRow {
  const PatientRow({
    required this.id,
    required this.name,
    required this.initials,
    required this.kind,
    required this.detail,
    this.code,
  });

  final String id;
  final String name;
  final String initials;
  final JourneyKind kind;
  final String detail;
  final String? code;
}

class PatientsController extends AsyncNotifier<List<PatientRow>> {
  @override
  Future<List<PatientRow>> build() => _load();

  Future<List<PatientRow>> _load() async {
    final rows = await ref
        .read(apiClientProvider)
        .get<List<ClinicCouple>>(
          ApiPaths.couples,
          parse: (data) {
            if (data is! List) return const [];
            return data
                .whereType<Map>()
                .map(
                  (row) =>
                      ClinicCouple.fromJson(Map<String, dynamic>.from(row)),
                )
                .toList();
          },
        );
    final active = rows.where((couple) => couple.isActiveJourney).toList();
    return active
        .map(
          (couple) => PatientRow(
            id: couple.id,
            name: couple.displayName,
            initials: couple.primary.initials,
            kind: HomeMetrics.kindFor(couple),
            detail: couple.nextStep ?? couple.stage,
            code: couple.patientCode.isEmpty ? null : couple.patientCode,
          ),
        )
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading<List<PatientRow>>().copyWithPrevious(state);
    state = await AsyncValue.guard(_load);
  }
}

final patientsControllerProvider =
    AsyncNotifierProvider<PatientsController, List<PatientRow>>(
      PatientsController.new,
    );
