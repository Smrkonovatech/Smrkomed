import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_metrics.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

class ScheduleSnapshot {
  const ScheduleSnapshot({
    required this.today,
    required this.upcoming,
    this.error,
  });

  final List<ScheduleAppointment> today;
  final List<ScheduleAppointment> upcoming;
  final String? error;
}

class ScheduleAppointment {
  const ScheduleAppointment({
    required this.id,
    required this.patientName,
    required this.initials,
    required this.time,
    required this.subtitle,
    this.patientCode,
  });

  final String id;
  final String patientName;
  final String initials;
  final String time;
  final String subtitle;
  final String? patientCode;
}

abstract class ScheduleRepository {
  Future<ScheduleSnapshot> load({
    DateTime? now,
    String? doctorName,
    String? doctorId,
    String? clinicName,
  });
}

class ScheduleRemoteRepository implements ScheduleRepository {
  ScheduleRemoteRepository({required ApiClient apiClient})
    : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<ScheduleSnapshot> load({
    DateTime? now,
    String? doctorName,
    String? doctorId,
    String? clinicName,
  }) async {
    try {
      final couples = await _list(ApiPaths.couples, ClinicCouple.fromJson);
      final appointments = await _list(
        ApiPaths.appointments,
        ClinicAppointment.fromJson,
      );
      final clock = now ?? DateTime.now();
      final coupleById = {for (final couple in couples) couple.id: couple};
      final scoped = HomeMetrics.scopedAppointments(
        appointments: appointments,
        coupleById: coupleById,
        doctorName: doctorName,
        doctorId: doctorId,
      );
      return ScheduleSnapshot(
        today: HomeMetrics.todaysAppointments(scoped, clock)
            .map((item) => _map(item, coupleById[item.coupleId], clinicName))
            .toList(),
        upcoming: HomeMetrics.upcomingAppointments(scoped, clock)
            .map((item) => _map(item, coupleById[item.coupleId], clinicName))
            .toList(),
      );
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      return ScheduleSnapshot(
        today: const [],
        upcoming: const [],
        error: error.message,
      );
    }
  }

  ScheduleAppointment _map(
    ClinicAppointment item,
    ClinicCouple? couple,
    String? clinicName,
  ) {
    final location = _location(item, clinicName);
    final type = item.type.trim();
    final subtitle = [
      if (location.isNotEmpty) location,
      if (type.isNotEmpty) type,
    ].join(' · ');
    return ScheduleAppointment(
      id: item.id,
      patientName: couple?.displayName.isNotEmpty == true
          ? couple!.displayName
          : (type.isNotEmpty ? type : 'Patient'),
      initials: couple?.primary.initials ?? 'P',
      time: item.time,
      subtitle: subtitle,
      patientCode: (couple?.patientCode.isNotEmpty ?? false)
          ? couple!.patientCode
          : null,
    );
  }

  String _location(ClinicAppointment item, String? clinicName) {
    final room = item.room.trim();
    if (room.isNotEmpty) return room;
    final type = item.type.toLowerCase();
    if (type.contains('online') ||
        type.contains('video') ||
        type.contains('tele')) {
      return 'Online';
    }
    return clinicName?.trim() ?? '';
  }

  Future<List<T>> _list<T>(
    String path,
    T Function(Map<String, dynamic> json) parse,
  ) {
    return _apiClient.get<List<T>>(
      path,
      parse: (data) {
        if (data is! List) return const [];
        return data
            .whereType<Map>()
            .map((row) => parse(Map<String, dynamic>.from(row)))
            .toList();
      },
    );
  }
}
