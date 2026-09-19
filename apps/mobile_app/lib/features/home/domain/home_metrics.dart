import 'package:intl/intl.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

abstract final class HomeMetrics {
  static String ymd(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  /// API `date` is `startsAt.toISOString().slice(0, 10)` (UTC calendar day).
  static String? apiCalendarDate(String raw) {
    final match = RegExp(r'(\d{4}-\d{2}-\d{2})').firstMatch(raw);
    return match?.group(1);
  }

  static int timeMinutes(String time) {
    final normalized = time.trim().toLowerCase().replaceAll('.', ':');
    final match = RegExp(r'(\d{1,2}):(\d{2})').firstMatch(normalized);
    if (match == null) return 0;
    var hour = int.tryParse(match.group(1) ?? '') ?? 0;
    final minute = int.tryParse(match.group(2) ?? '') ?? 0;
    if (normalized.contains('pm') && hour < 12) hour += 12;
    if (normalized.contains('am') && hour == 12) hour = 0;
    return hour * 60 + minute;
  }

  /// Reconstructs the UTC instant the API encoded as date + en-IN UTC time.
  static DateTime? startsAtUtc(ClinicAppointment item) {
    final date = apiCalendarDate(item.date);
    if (date == null) return null;
    final parts = date.split('-');
    if (parts.length != 3) return null;
    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final day = int.tryParse(parts[2]);
    if (year == null || month == null || day == null) return null;
    return DateTime.utc(
      year,
      month,
      day,
    ).add(Duration(minutes: timeMinutes(item.time)));
  }

  static bool _sameYmd(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static bool isTodayDate(String apiDate, DateTime now) {
    final ymdValue = apiCalendarDate(apiDate);
    if (ymdValue == null) return false;
    return ymdValue == ymd(now.toUtc()) || ymdValue == ymd(now.toLocal());
  }

  static bool isTodayAppointment(ClinicAppointment item, DateTime now) {
    final start = startsAtUtc(item);
    if (start != null) {
      if (_sameYmd(start.toLocal(), now.toLocal())) return true;
      if (_sameYmd(start.toUtc(), now.toUtc())) return true;
    }
    return isTodayDate(item.date, now);
  }

  static bool isUpcomingAppointment(ClinicAppointment item, DateTime now) {
    if (item.isCancelledLike) return false;
    if (item.status.toLowerCase() == 'completed') return false;
    if (isTodayAppointment(item, now)) return false;
    final start = startsAtUtc(item);
    if (start != null) {
      return start.toLocal().isAfter(now.toLocal());
    }
    final api = apiCalendarDate(item.date);
    if (api == null) return false;
    return api.compareTo(ymd(now.toLocal())) > 0 ||
        api.compareTo(ymd(now.toUtc())) > 0;
  }

  static bool _isUnassigned(String? value) {
    final text = value?.trim().toLowerCase() ?? '';
    return text.isEmpty || text == 'unassigned' || text == 'null';
  }

  static String _stripTitle(String name) {
    return name.trim().toLowerCase().replaceFirst(RegExp(r'^dr\.?\s+'), '');
  }

  static bool doctorNameMatches(String field, String userName) {
    if (_isUnassigned(field) || userName.trim().isEmpty) return false;
    final left = _stripTitle(field);
    final right = _stripTitle(userName);
    if (left == right) return true;
    if (left.contains(right) || right.contains(left)) return true;
    final tokens = right.split(RegExp(r'\s+')).where((part) => part.length > 2);
    return tokens.any(left.contains);
  }

  static bool visibleToDoctor({
    required ClinicAppointment appointment,
    ClinicCouple? couple,
    String? doctorName,
    String? doctorId,
  }) {
    if (doctorId != null &&
        doctorId.isNotEmpty &&
        couple?.assignedDoctorId == doctorId) {
      return true;
    }
    if (doctorName != null && doctorName.trim().isNotEmpty) {
      if (doctorNameMatches(appointment.doctor, doctorName)) return true;
      if (couple != null &&
          doctorNameMatches(couple.doctor ?? '', doctorName)) {
        return true;
      }
    }
    final namedDoctor = !_isUnassigned(appointment.doctor);
    final namedCoupleDoctor = !_isUnassigned(couple?.doctor);
    final assignedId = couple?.assignedDoctorId?.trim() ?? '';
    if (!namedDoctor && !namedCoupleDoctor && assignedId.isEmpty) {
      return true;
    }
    return false;
  }

  static List<ClinicAppointment> scopedAppointments({
    required List<ClinicAppointment> appointments,
    required Map<String, ClinicCouple> coupleById,
    String? doctorName,
    String? doctorId,
  }) {
    return appointments
        .where(
          (item) => visibleToDoctor(
            appointment: item,
            couple: coupleById[item.coupleId],
            doctorName: doctorName,
            doctorId: doctorId,
          ),
        )
        .toList();
  }

  static List<ClinicAppointment> todaysAppointments(
    List<ClinicAppointment> appointments,
    DateTime now,
  ) {
    final today = appointments
        .where((item) => isTodayAppointment(item, now) && !item.isCancelledLike)
        .toList();
    today.sort((a, b) => timeMinutes(a.time).compareTo(timeMinutes(b.time)));
    return today;
  }

  static List<ClinicAppointment> upcomingAppointments(
    List<ClinicAppointment> appointments,
    DateTime now,
  ) {
    final upcoming = appointments
        .where((item) => isUpcomingAppointment(item, now))
        .toList();
    upcoming.sort((a, b) {
      final date = (apiCalendarDate(a.date) ?? '').compareTo(
        apiCalendarDate(b.date) ?? '',
      );
      if (date != 0) return date;
      return timeMinutes(a.time).compareTo(timeMinutes(b.time));
    });
    return upcoming;
  }

  static JourneyKind kindFor(ClinicCouple couple) {
    if (couple.status.toLowerCase() == 'needs attention') {
      return JourneyKind.review;
    }
    final stage = couple.stage.toLowerCase();
    if (stage.contains('lab') ||
        stage.contains('scan') ||
        stage.contains('test') ||
        stage.contains('ultrasound')) {
      return JourneyKind.lab;
    }
    return JourneyKind.consultation;
  }

  static DateTime? parseSince(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    for (final pattern in ['dd MMM yyyy', 'd MMM yyyy', 'dd MMM, yyyy']) {
      try {
        return DateFormat(pattern, 'en').parseStrict(trimmed);
      } catch (_) {}
    }
    return DateTime.tryParse(trimmed);
  }

  static String appointmentCountLabel(int count) {
    if (count == 1) return '1 Appointment scheduled';
    return '$count Appointments scheduled';
  }

  static String visitCountLabel(int count) {
    if (count == 1) return '1 patient visit scheduled today';
    return '$count patient visits scheduled today';
  }

  static HomeDashboard assemble({
    required DateTime now,
    List<ClinicCouple>? couples,
    List<ClinicAppointment>? appointments,
    List<ClinicTask>? tasks,
    CareLoopAnalytics? analytics,
    List<CareLoopException>? exceptions,
    String? couplesError,
    String? appointmentsError,
    String? tasksError,
    String? analyticsError,
    String? exceptionsError,
    String? doctorName,
    String? doctorId,
  }) {
    final coupleList = couples ?? const <ClinicCouple>[];
    final coupleById = {for (final couple in coupleList) couple.id: couple};
    final scoped = appointments == null
        ? const <ClinicAppointment>[]
        : scopedAppointments(
            appointments: appointments,
            coupleById: coupleById,
            doctorName: doctorName,
            doctorId: doctorId,
          );
    final today = todaysAppointments(scoped, now);

    final schedule = today
        .map((item) {
          final couple = coupleById[item.coupleId];
          return HomeScheduleItem(
            id: item.id,
            patientLabel: couple?.displayName ?? item.type,
            time: item.time,
          );
        })
        .toList(growable: false);

    final timeByCouple = <String, String>{};
    for (final item in today) {
      timeByCouple.putIfAbsent(item.coupleId, () => item.time);
    }

    final activeCouples = coupleList
        .where((couple) => couple.isActiveJourney)
        .toList();
    final previews = <HomeJourneyPreview>[];
    for (final couple in activeCouples.take(12)) {
      previews.add(
        HomeJourneyPreview(
          id: couple.id,
          initials: couple.primary.initials,
          kind: kindFor(couple),
          label: couple.displayName,
          detail: couple.nextStep ?? couple.stage,
          time: timeByCouple[couple.id],
        ),
      );
    }

    final weekAgo = now.subtract(const Duration(days: 7));
    var addedThisWeek = 0;
    for (final couple in coupleList) {
      final created = parseSince(couple.since);
      if (created != null && !created.isBefore(weekAgo)) {
        addedThisWeek += 1;
      }
    }

    final openExceptions =
        exceptions?.where((item) => item.isOpen).toList() ??
        const <CareLoopException>[];
    final urgent = exceptions == null
        ? null
        : openExceptions.where((item) => item.isUrgent).length;

    final needsAttention = coupleList
        .where((couple) => couple.status.toLowerCase() == 'needs attention')
        .length;
    final overdueOrEscalated =
        tasks
            ?.where(
              (task) => task.status == 'overdue' || task.status == 'escalated',
            )
            .length ??
        0;

    final dueToday =
        tasks
            ?.where(
              (task) =>
                  task.status == 'waiting' || task.status == 'in_progress',
            )
            .length ??
        0;

    return HomeDashboard(
      activeJourneyCount: analytics?.activeJourneys ?? activeCouples.length,
      todayVisitCount: today.length,
      todayAppointments: schedule,
      journeyPreviews: previews,
      needsAttentionCount: needsAttention > 0
          ? needsAttention
          : overdueOrEscalated,
      urgentEscalationCount: urgent,
      patientsUnderCare: coupleList.length,
      ivfCount: coupleList
          .where((couple) => couple.treatment.toUpperCase() == 'IVF')
          .length,
      iuiCount: coupleList
          .where((couple) => couple.treatment.toUpperCase() == 'IUI')
          .length,
      addedThisWeek: addedThisWeek,
      onTrackCount: coupleList
          .where((couple) => couple.status.toLowerCase() == 'on track')
          .length,
      dueTodayCount: dueToday,
      exceptionsCount: analytics?.openExceptions ?? openExceptions.length,
      couplesError: couplesError,
      appointmentsError: appointmentsError,
      tasksError: tasksError,
      analyticsError: analyticsError,
      exceptionsError: exceptionsError,
    );
  }
}

String greetingForHour(int hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

String doctorFirstName(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return 'Doctor';
  final withoutTitle = trimmed.replaceFirst(
    RegExp(r'^(dr\.?|doctor)\s+', caseSensitive: false),
    '',
  );
  final parts = withoutTitle.split(RegExp(r'\s+'));
  if (parts.isEmpty || parts.first.isEmpty) return 'Doctor';
  return parts.first;
}
