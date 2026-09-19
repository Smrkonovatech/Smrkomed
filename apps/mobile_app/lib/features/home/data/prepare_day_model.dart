class PrepareDayData {
  const PrepareDayData({
    required this.date,
    required this.summary,
    required this.todayAppointmentsCount,
    required this.pendingReportsCount,
    required this.escalationsCount,
    required this.activeTreatmentsCount,
    required this.missedFollowUpsCount,
    required this.todayAppointments,
    required this.pendingReports,
    required this.escalations,
  });

  final String date;
  final String summary;
  final int todayAppointmentsCount;
  final int pendingReportsCount;
  final int escalationsCount;
  final int activeTreatmentsCount;
  final int missedFollowUpsCount;
  final List<PrepareDayAppointment> todayAppointments;
  final List<PrepareDayReport> pendingReports;
  final List<PrepareDayEscalation> escalations;

  factory PrepareDayData.fromJson(Map<String, dynamic> json) {
    final briefing = json['briefing'] is Map
        ? Map<String, dynamic>.from(json['briefing'] as Map)
        : <String, dynamic>{};
    final metrics = briefing['metrics'] is Map
        ? Map<String, dynamic>.from(briefing['metrics'] as Map)
        : <String, dynamic>{};

    final apptsRaw = json['todayAppointments'];
    final reportsRaw = json['pendingReports'];
    final escalationsRaw = json['escalations'];

    return PrepareDayData(
      date: briefing['date']?.toString() ?? '',
      summary: briefing['summary']?.toString() ?? 'No briefing summary available.',
      todayAppointmentsCount: _asInt(metrics['todayAppointmentsCount']),
      pendingReportsCount: _asInt(metrics['pendingReportsCount']),
      escalationsCount: _asInt(metrics['escalationsCount']),
      activeTreatmentsCount: _asInt(metrics['activeTreatmentsCount']),
      missedFollowUpsCount: _asInt(metrics['missedFollowUpsCount']),
      todayAppointments: apptsRaw is List
          ? apptsRaw
              .whereType<Map>()
              .map((a) => PrepareDayAppointment.fromJson(Map<String, dynamic>.from(a)))
              .toList()
          : const [],
      pendingReports: reportsRaw is List
          ? reportsRaw
              .whereType<Map>()
              .map((r) => PrepareDayReport.fromJson(Map<String, dynamic>.from(r)))
              .toList()
          : const [],
      escalations: escalationsRaw is List
          ? escalationsRaw
              .whereType<Map>()
              .map((e) => PrepareDayEscalation.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}

class PrepareDayAppointment {
  const PrepareDayAppointment({
    required this.id,
    required this.patientName,
    required this.type,
    required this.status,
    required this.startsAt,
    this.room,
    this.notes,
    this.coupleId,
  });

  final String id;
  final String patientName;
  final String type;
  final String status;
  final String startsAt;
  final String? room;
  final String? notes;
  final String? coupleId;

  factory PrepareDayAppointment.fromJson(Map<String, dynamic> json) {
    return PrepareDayAppointment(
      id: json['id']?.toString() ?? '',
      patientName: json['patientName']?.toString() ?? 'Patient',
      type: json['type']?.toString() ?? 'Consultation',
      status: json['status']?.toString() ?? 'Confirmed',
      startsAt: json['startsAt']?.toString() ?? '',
      room: json['room']?.toString(),
      notes: json['notes']?.toString(),
      coupleId: json['coupleId']?.toString(),
    );
  }
}

class PrepareDayReport {
  const PrepareDayReport({
    required this.id,
    required this.title,
    required this.patientName,
    required this.status,
  });

  final String id;
  final String title;
  final String patientName;
  final String status;

  factory PrepareDayReport.fromJson(Map<String, dynamic> json) {
    final couple = json['couple'] is Map ? json['couple'] as Map : null;
    final primary = couple != null && couple['primaryPatient'] is Map
        ? couple['primaryPatient'] as Map
        : null;
    final patientName = primary != null
        ? '${primary['firstName'] ?? ''} ${primary['lastName'] ?? ''}'.trim()
        : 'Patient';

    return PrepareDayReport(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Diagnostic Report',
      patientName: patientName.isEmpty ? 'Patient' : patientName,
      status: json['status']?.toString() ?? 'WAITING',
    );
  }
}

class PrepareDayEscalation {
  const PrepareDayEscalation({
    required this.id,
    required this.title,
    required this.patientName,
    required this.priority,
  });

  final String id;
  final String title;
  final String patientName;
  final String priority;

  factory PrepareDayEscalation.fromJson(Map<String, dynamic> json) {
    final couple = json['couple'] is Map ? json['couple'] as Map : null;
    final primary = couple != null && couple['primaryPatient'] is Map
        ? couple['primaryPatient'] as Map
        : null;
    final patientName = primary != null
        ? '${primary['firstName'] ?? ''} ${primary['lastName'] ?? ''}'.trim()
        : 'Patient';

    return PrepareDayEscalation(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Clinical Escalation',
      patientName: patientName.isEmpty ? 'Patient' : patientName,
      priority: json['priority']?.toString() ?? 'HIGH',
    );
  }
}
