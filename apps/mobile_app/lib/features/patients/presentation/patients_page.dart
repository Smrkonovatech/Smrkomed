import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/routing/shell_tabs.dart';
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
                  onTap: () => _showPatientActionSheet(context, row),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showPatientActionSheet(BuildContext context, PatientRow row) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: colorForKind(row.kind),
                      child: Text(
                        row.initials,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTokens.colorHomeTitle,
                            ),
                          ),
                          if (row.code != null)
                            Text(
                              row.code!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTokens.colorHomeMuted,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Stage: ${row.detail}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF554477),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      context.push(
                        '${AppRoutes.consultation}?coupleId=${row.id}&patientName=${Uri.encodeComponent(row.name)}',
                      );
                    },
                    icon: const Icon(Icons.edit_note_rounded),
                    label: const Text('Start Consultation'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF5B3FA0),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      openShellTab(context, ShellTabs.inbox);
                    },
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Message Patient'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
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
    final active = rows.where((couple) {
      final id = couple.clinicId.trim().toLowerCase();
      if (id == 'cmt0exo9n000vl804rbaabh32' || id == 'blr' || id.contains('bangalore')) {
        return false;
      }
      if (couple.isQrCheckin) {
        return false;
      }
      return true;
    }).toList();
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
