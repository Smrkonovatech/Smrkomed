import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';

class CareLoopExceptionItem {
  const CareLoopExceptionItem({
    required this.id,
    required this.coupleId,
    required this.coupleName,
    this.slug,
    this.careTaskId,
    this.taskTitle,
    required this.type,
    required this.severity,
    required this.reason,
    required this.status,
    required this.assignedTo,
    required this.createdAt,
  });

  final String id;
  final String coupleId;
  final String coupleName;
  final String? slug;
  final String? careTaskId;
  final String? taskTitle;
  final String type;
  final String severity;
  final String reason;
  final String status;
  final String assignedTo;
  final String createdAt;

  factory CareLoopExceptionItem.fromJson(Map<String, dynamic> json) {
    return CareLoopExceptionItem(
      id: json['id'] as String? ?? '',
      coupleId: json['coupleId'] as String? ?? '',
      coupleName: json['coupleName'] as String? ?? 'Couple',
      slug: json['slug'] as String?,
      careTaskId: json['careTaskId'] as String?,
      taskTitle: json['taskTitle'] as String?,
      type: json['type'] as String? ?? 'ESCALATION',
      severity: json['severity'] as String? ?? 'MEDIUM',
      reason: json['reason'] as String? ?? '',
      status: json['status'] as String? ?? 'OPEN',
      assignedTo: json['assignedTo'] as String? ?? 'Care Team',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class ActivityItem {
  const ActivityItem({
    required this.id,
    required this.patient,
    required this.activity,
    required this.time,
    required this.tone,
  });

  final String id;
  final String patient;
  final String activity;
  final String time;
  final String tone;

  factory ActivityItem.fromJson(Map<String, dynamic> json) {
    return ActivityItem(
      id: json['id'] as String? ?? '',
      patient: json['patient'] as String? ?? 'Clinic',
      activity: json['activity'] as String? ?? 'Activity updated',
      time: json['time'] as String? ?? '',
      tone: json['tone'] as String? ?? 'info',
    );
  }
}

class NotificationsSnapshot {
  const NotificationsSnapshot({
    required this.exceptions,
    required this.activities,
  });

  final List<CareLoopExceptionItem> exceptions;
  final List<ActivityItem> activities;
}

abstract class NotificationsRepository {
  Future<NotificationsSnapshot> loadNotifications();
  Future<void> resolveException(String id, {String? notes});
}

class NotificationsRemoteRepository implements NotificationsRepository {
  NotificationsRemoteRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<NotificationsSnapshot> loadNotifications() async {
    try {
      final exceptionsFuture = _apiClient.get<List<CareLoopExceptionItem>>(
        ApiPaths.careLoopExceptions,
        parse: (data) {
          if (data is! List) return const [];
          return data
              .whereType<Map>()
              .map((row) => CareLoopExceptionItem.fromJson(
                  Map<String, dynamic>.from(row)))
              .toList();
        },
      );

      final activityFuture = _apiClient.get<List<ActivityItem>>(
        ApiPaths.activity,
        parse: (data) {
          if (data is! List) return const [];
          return data
              .whereType<Map>()
              .map((row) =>
                  ActivityItem.fromJson(Map<String, dynamic>.from(row)))
              .toList();
        },
      );

      final results = await Future.wait([exceptionsFuture, activityFuture]);

      return NotificationsSnapshot(
        exceptions: results[0] as List<CareLoopExceptionItem>,
        activities: results[1] as List<ActivityItem>,
      );
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      return const NotificationsSnapshot(exceptions: [], activities: []);
    }
  }

  @override
  Future<void> resolveException(String id, {String? notes}) async {
    await _apiClient.post<dynamic>(
      '${ApiPaths.careLoopExceptions}/$id/resolve',
      data: {
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
  }
}
