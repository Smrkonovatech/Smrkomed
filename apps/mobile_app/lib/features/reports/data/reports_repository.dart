import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';

class ReportItem {
  const ReportItem({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.dueDate,
    this.lastAction,
    required this.patientName,
    this.coupleId,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final String? dueDate;
  final String? lastAction;
  final String patientName;
  final String? coupleId;
  final String createdAt;

  factory ReportItem.fromJson(Map<String, dynamic> json) {
    return ReportItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Diagnostic Report',
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'WAITING',
      priority: json['priority'] as String? ?? 'NORMAL',
      dueDate: json['dueDate'] as String?,
      lastAction: json['lastAction'] as String?,
      patientName: json['patientName'] as String? ?? 'Patient',
      coupleId: json['coupleId'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class ReportSignOffResult {
  const ReportSignOffResult({
    required this.id,
    required this.status,
    this.lastAction,
    this.reviewedAt,
  });

  final String id;
  final String status;
  final String? lastAction;
  final String? reviewedAt;

  factory ReportSignOffResult.fromJson(Map<String, dynamic> json) {
    return ReportSignOffResult(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'COMPLETED',
      lastAction: json['lastAction'] as String?,
      reviewedAt: json['reviewedAt'] as String?,
    );
  }
}

abstract class ReportsRepository {
  Future<List<ReportItem>> getReports({String filter = 'pending_review'});
  Future<ReportSignOffResult> signOffReport(
    String orderId, {
    required String action,
    String? clinicalNotes,
  });
}

class ReportsRemoteRepository implements ReportsRepository {
  ReportsRemoteRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<List<ReportItem>> getReports({String filter = 'pending_review'}) async {
    try {
      return await _apiClient.get<List<ReportItem>>(
        ApiPaths.doctorReports,
        query: {'filter': filter},
        parse: (data) {
          if (data is! List) return const [];
          return data
              .whereType<Map>()
              .map((row) => ReportItem.fromJson(Map<String, dynamic>.from(row)))
              .toList();
        },
      );
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      return const [];
    }
  }

  @override
  Future<ReportSignOffResult> signOffReport(
    String orderId, {
    required String action,
    String? clinicalNotes,
  }) async {
    return await _apiClient.post<ReportSignOffResult>(
      '${ApiPaths.doctorReports}/$orderId/review',
      data: {
        'action': action,
        if (clinicalNotes != null && clinicalNotes.trim().isNotEmpty)
          'clinicalNotes': clinicalNotes.trim(),
      },
      parse: (data) {
        if (data is Map) {
          return ReportSignOffResult.fromJson(Map<String, dynamic>.from(data));
        }
        return ReportSignOffResult(id: orderId, status: 'COMPLETED');
      },
    );
  }
}
