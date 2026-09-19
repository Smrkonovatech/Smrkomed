import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';

class ConsultationRecord {
  const ConsultationRecord({
    required this.id,
    this.appointmentId,
    required this.coupleId,
    required this.patientName,
    this.partnerName,
    required this.doctorName,
    required this.consultationDate,
    this.reasonForVisit,
    this.summary,
    this.nextSteps,
    required this.createdAt,
  });

  final String id;
  final String? appointmentId;
  final String coupleId;
  final String patientName;
  final String? partnerName;
  final String doctorName;
  final String consultationDate;
  final String? reasonForVisit;
  final String? summary;
  final String? nextSteps;
  final String createdAt;

  factory ConsultationRecord.fromJson(Map<String, dynamic> json) {
    return ConsultationRecord(
      id: json['id'] as String? ?? '',
      appointmentId: json['appointmentId'] as String?,
      coupleId: json['coupleId'] as String? ?? '',
      patientName: json['patientName'] as String? ?? 'Patient',
      partnerName: json['partnerName'] as String?,
      doctorName: json['doctorName'] as String? ?? 'Doctor',
      consultationDate: json['consultationDate'] as String? ?? '',
      reasonForVisit: json['reasonForVisit'] as String?,
      summary: json['summary'] as String?,
      nextSteps: json['nextSteps'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class SaveConsultationInput {
  const SaveConsultationInput({
    this.reasonForVisit,
    this.summary,
    this.clinicalNotes,
    this.impression,
    this.diagnosis,
    this.prescriptionNotes,
    this.nextSteps,
    this.status = 'COMPLETED',
  });

  final String? reasonForVisit;
  final String? summary;
  final String? clinicalNotes;
  final String? impression;
  final String? diagnosis;
  final String? prescriptionNotes;
  final String? nextSteps;
  final String status;

  Map<String, dynamic> toJson() {
    return {
      if (reasonForVisit != null && reasonForVisit!.isNotEmpty)
        'reasonForVisit': reasonForVisit,
      if (summary != null && summary!.isNotEmpty) 'summary': summary,
      if (clinicalNotes != null && clinicalNotes!.isNotEmpty)
        'clinicalNotes': clinicalNotes,
      if (impression != null && impression!.isNotEmpty)
        'impression': impression,
      if (diagnosis != null && diagnosis!.isNotEmpty) 'diagnosis': diagnosis,
      if (prescriptionNotes != null && prescriptionNotes!.isNotEmpty)
        'prescriptionNotes': prescriptionNotes,
      if (nextSteps != null && nextSteps!.isNotEmpty) 'nextSteps': nextSteps,
      'status': status,
    };
  }
}

abstract class ConsultationRepository {
  Future<List<ConsultationRecord>> getConsultations({
    String? coupleId,
    String? appointmentId,
  });
  Future<void> recordConsultation(
    String appointmentId,
    SaveConsultationInput input,
  );
}

class ConsultationRemoteRepository implements ConsultationRepository {
  ConsultationRemoteRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<List<ConsultationRecord>> getConsultations({
    String? coupleId,
    String? appointmentId,
  }) async {
    try {
      final query = <String, dynamic>{};
      if (coupleId != null && coupleId.isNotEmpty) {
        query['coupleId'] = coupleId;
      }
      if (appointmentId != null && appointmentId.isNotEmpty) {
        query['appointmentId'] = appointmentId;
      }

      return await _apiClient.get<List<ConsultationRecord>>(
        ApiPaths.doctorConsultations,
        query: query.isNotEmpty ? query : null,
        parse: (data) {
          if (data is! List) return const [];
          return data
              .whereType<Map>()
              .map((row) => ConsultationRecord.fromJson(
                  Map<String, dynamic>.from(row)))
              .toList();
        },
      );
    } on AppException catch (error) {
      if (error.kind == AppErrorKind.unauthorized) rethrow;
      return const [];
    }
  }

  @override
  Future<void> recordConsultation(
    String appointmentId,
    SaveConsultationInput input,
  ) async {
    await _apiClient.post<dynamic>(
      '${ApiPaths.doctorConsultations}/$appointmentId',
      data: input.toJson(),
    );
  }
}
