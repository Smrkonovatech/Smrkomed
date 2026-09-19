/// Clinic DTO shapes from `apps/api` `clinic-dto.ts` and care-loop routes.
class ClinicPerson {
  const ClinicPerson({
    required this.id,
    required this.name,
    required this.firstName,
    required this.lastName,
  });

  final String id;
  final String name;
  final String firstName;
  final String lastName;

  factory ClinicPerson.fromJson(Map<String, dynamic> json) {
    return ClinicPerson(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
    );
  }

  String get initials {
    final a = firstName.isNotEmpty ? firstName : (name.isNotEmpty ? name : '?');
    final b = lastName;
    final first = a.isNotEmpty ? a[0] : '';
    final second = b.isNotEmpty ? b[0] : '';
    final value = '$first$second'.toUpperCase();
    return value.isEmpty ? '?' : value;
  }
}

class ClinicCouple {
  const ClinicCouple({
    required this.id,
    required this.status,
    required this.careLoop,
    required this.treatment,
    required this.stage,
    required this.since,
    required this.primary,
    this.partner,
    this.nextStep,
    this.slug,
    this.doctor,
    this.assignedDoctorId,
  });

  final String id;
  final String status;
  final String careLoop;
  final String treatment;
  final String stage;
  final String since;
  final ClinicPerson primary;
  final ClinicPerson? partner;
  final String? nextStep;
  final String? slug;
  final String? doctor;
  final String? assignedDoctorId;

  factory ClinicCouple.fromJson(Map<String, dynamic> json) {
    final partnerRaw = json['partner'];
    return ClinicCouple(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      careLoop: json['careLoop']?.toString() ?? '',
      treatment: json['treatment']?.toString() ?? '',
      stage: json['stage']?.toString() ?? '',
      since: json['since']?.toString() ?? '',
      primary: ClinicPerson.fromJson(
        json['primary'] is Map
            ? Map<String, dynamic>.from(json['primary'] as Map)
            : <String, dynamic>{},
      ),
      partner: partnerRaw is Map
          ? ClinicPerson.fromJson(Map<String, dynamic>.from(partnerRaw))
          : null,
      nextStep: json['nextStep']?.toString(),
      slug: json['slug']?.toString(),
      doctor: json['doctor']?.toString(),
      assignedDoctorId: json['assignedDoctorId']?.toString(),
    );
  }

  bool get isActiveJourney => careLoop.toLowerCase() == 'active';

  String get patientCode {
    final value = slug?.trim() ?? '';
    return value;
  }

  String get displayName {
    final primaryName = primary.name.trim().isNotEmpty
        ? primary.name.trim()
        : '${primary.firstName} ${primary.lastName}'.trim();
    final partnerFirst = partner?.firstName.trim() ?? '';
    if (partnerFirst.isNotEmpty) {
      final first = primary.firstName.trim().isNotEmpty
          ? primary.firstName.trim()
          : primaryName;
      return '$first & $partnerFirst';
    }
    return primaryName.isEmpty ? 'Patient' : primaryName;
  }
}

class ClinicAppointment {
  const ClinicAppointment({
    required this.id,
    required this.coupleId,
    required this.type,
    required this.status,
    required this.time,
    required this.date,
    this.doctor = '',
    this.room = '',
    this.notes = '',
  });

  final String id;
  final String coupleId;
  final String type;
  final String status;
  final String time;
  final String date;
  final String doctor;
  final String room;
  final String notes;

  factory ClinicAppointment.fromJson(Map<String, dynamic> json) {
    return ClinicAppointment(
      id: json['id']?.toString() ?? '',
      coupleId: json['coupleId']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      time: json['time']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      doctor: json['doctor']?.toString() ?? '',
      room: json['room']?.toString() ?? '',
      notes: json['notes']?.toString() ?? '',
    );
  }

  bool get isCancelledLike =>
      status.toLowerCase() == 'no-show' || status.toLowerCase() == 'cancelled';
}

class ClinicTask {
  const ClinicTask({required this.id, required this.status, required this.due});

  final String id;
  final String status;
  final String due;

  factory ClinicTask.fromJson(Map<String, dynamic> json) {
    return ClinicTask(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      due: json['due']?.toString() ?? '',
    );
  }
}

class CareLoopAnalytics {
  const CareLoopAnalytics({
    required this.activeJourneys,
    required this.openExceptions,
    required this.overdueTasks,
    required this.stageDistribution,
  });

  final int activeJourneys;
  final int openExceptions;
  final int overdueTasks;
  final Map<String, int> stageDistribution;

  factory CareLoopAnalytics.fromJson(Map<String, dynamic> json) {
    final raw = json['stageDistribution'];
    final stages = <String, int>{};
    if (raw is Map) {
      for (final entry in raw.entries) {
        final value = entry.value;
        stages[entry.key.toString()] = value is int
            ? value
            : int.tryParse(value.toString()) ?? 0;
      }
    }
    return CareLoopAnalytics(
      activeJourneys: _asInt(json['activeJourneys']),
      openExceptions: _asInt(json['openExceptions']),
      overdueTasks: _asInt(json['overdueTasks']),
      stageDistribution: stages,
    );
  }
}

class CareLoopException {
  const CareLoopException({
    required this.id,
    required this.status,
    required this.severity,
  });

  final String id;
  final String status;
  final String severity;

  factory CareLoopException.fromJson(Map<String, dynamic> json) {
    return CareLoopException(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      severity: json['severity']?.toString() ?? '',
    );
  }

  bool get isOpen => status.toUpperCase() == 'OPEN';

  bool get isUrgent {
    final value = severity.toUpperCase();
    return value == 'HIGH' || value == 'CRITICAL';
  }
}

class HomeScheduleItem {
  const HomeScheduleItem({
    required this.id,
    required this.patientLabel,
    required this.time,
  });

  final String id;
  final String patientLabel;
  final String time;
}

enum JourneyKind { consultation, lab, review }

class HomeJourneyPreview {
  const HomeJourneyPreview({
    required this.id,
    required this.initials,
    required this.kind,
    this.label,
    this.detail,
    this.time,
  });

  final String id;
  final String initials;
  final JourneyKind kind;
  final String? label;
  final String? detail;
  final String? time;
}

class HomeDashboard {
  const HomeDashboard({
    required this.activeJourneyCount,
    required this.todayVisitCount,
    required this.todayAppointments,
    required this.journeyPreviews,
    required this.needsAttentionCount,
    this.urgentEscalationCount,
    required this.patientsUnderCare,
    required this.ivfCount,
    required this.iuiCount,
    required this.addedThisWeek,
    required this.onTrackCount,
    required this.dueTodayCount,
    required this.exceptionsCount,
    this.couplesError,
    this.appointmentsError,
    this.tasksError,
    this.analyticsError,
    this.exceptionsError,
  });

  final int activeJourneyCount;
  final int todayVisitCount;
  final List<HomeScheduleItem> todayAppointments;
  final List<HomeJourneyPreview> journeyPreviews;
  final int needsAttentionCount;
  final int? urgentEscalationCount;
  final int patientsUnderCare;
  final int ivfCount;
  final int iuiCount;
  final int addedThisWeek;
  final int onTrackCount;
  final int dueTodayCount;
  final int exceptionsCount;
  final String? couplesError;
  final String? appointmentsError;
  final String? tasksError;
  final String? analyticsError;
  final String? exceptionsError;

  bool get hasBlockingError =>
      couplesError != null &&
      appointmentsError != null &&
      tasksError != null &&
      analyticsError != null &&
      exceptionsError != null;
}

int _asInt(Object? value) {
  if (value is int) return value;
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
