import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_metrics.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

void main() {
  final now = DateTime.utc(2026, 9, 12, 10);

  ClinicCouple couple({
    required String id,
    required String status,
    required String careLoop,
    String treatment = 'IVF',
    String stage = 'Consultation',
    String since = '12 Sep 2026',
    String first = 'Ada',
    String last = 'Patient',
  }) {
    return ClinicCouple(
      id: id,
      status: status,
      careLoop: careLoop,
      treatment: treatment,
      stage: stage,
      since: since,
      primary: ClinicPerson(
        id: 'p-$id',
        name: '$first $last',
        firstName: first,
        lastName: last,
      ),
    );
  }

  test('assembles schedule, journeys, and metrics from API DTOs', () {
    final dashboard = HomeMetrics.assemble(
      now: now,
      couples: [
        couple(id: 'c1', status: 'On Track', careLoop: 'Active'),
        couple(
          id: 'c2',
          status: 'Needs Attention',
          careLoop: 'Active',
          treatment: 'IUI',
          stage: 'Lab work',
        ),
        couple(id: 'c3', status: 'On Track', careLoop: 'Paused'),
      ],
      appointments: const [
        ClinicAppointment(
          id: 'a1',
          coupleId: 'c1',
          type: 'Scan',
          status: 'Confirmed',
          time: '9:30 AM',
          date: '2026-09-12',
        ),
        ClinicAppointment(
          id: 'a2',
          coupleId: 'c2',
          type: 'Consult',
          status: 'No-show',
          time: '8:00 AM',
          date: '2026-09-12',
        ),
      ],
      tasks: const [
        ClinicTask(id: 't1', status: 'waiting', due: '12 Sep'),
        ClinicTask(id: 't2', status: 'in_progress', due: '12 Sep'),
        ClinicTask(id: 't3', status: 'overdue', due: '11 Sep'),
      ],
      analytics: const CareLoopAnalytics(
        activeJourneys: 7,
        openExceptions: 3,
        overdueTasks: 1,
        stageDistribution: {},
      ),
      exceptions: const [
        CareLoopException(id: 'e1', status: 'OPEN', severity: 'HIGH'),
        CareLoopException(id: 'e2', status: 'OPEN', severity: 'LOW'),
        CareLoopException(id: 'e3', status: 'RESOLVED', severity: 'HIGH'),
      ],
    );

    expect(dashboard.activeJourneyCount, 7);
    expect(dashboard.todayVisitCount, 1);
    expect(dashboard.todayAppointments.single.patientLabel, 'Ada Patient');
    expect(dashboard.needsAttentionCount, 1);
    expect(dashboard.urgentEscalationCount, 1);
    expect(dashboard.patientsUnderCare, 3);
    expect(dashboard.ivfCount, 2);
    expect(dashboard.iuiCount, 1);
    expect(dashboard.onTrackCount, 2);
    expect(dashboard.dueTodayCount, 2);
    expect(dashboard.exceptionsCount, 3);
    expect(dashboard.journeyPreviews, isNotEmpty);
  });

  test('empty sources stay empty without invented counts', () {
    final dashboard = HomeMetrics.assemble(now: now);
    expect(dashboard.activeJourneyCount, 0);
    expect(dashboard.todayVisitCount, 0);
    expect(dashboard.todayAppointments, isEmpty);
    expect(dashboard.journeyPreviews, isEmpty);
    expect(dashboard.patientsUnderCare, 0);
  });

  test('doctorFirstName strips a title', () {
    expect(doctorFirstName('Dr Ananya Rao'), 'Ananya');
    expect(doctorFirstName(''), 'Doctor');
  });

  test('today includes UTC-dated appointments that fall on the local day', () {
    const lateUtc = ClinicAppointment(
      id: 'late',
      coupleId: 'c1',
      type: 'Consult',
      status: 'Confirmed',
      time: '11:30 pm',
      date: '2026-09-11',
    );
    final localInstant = HomeMetrics.startsAtUtc(lateUtc)!.toLocal();
    final nowOnThatLocalDay = DateTime(
      localInstant.year,
      localInstant.month,
      localInstant.day,
      10,
    );
    expect(HomeMetrics.isTodayAppointment(lateUtc, nowOnThatLocalDay), isTrue);

    final now = DateTime.utc(2026, 9, 12, 10);
    final items = [
      for (var i = 1; i <= 8; i++)
        ClinicAppointment(
          id: 'a$i',
          coupleId: 'c$i',
          type: 'Consult',
          status: 'Confirmed',
          time: '0$i:00 am',
          date: '2026-09-12',
        ),
    ];
    expect(HomeMetrics.todaysAppointments(items, now).length, 8);
  });

  test('unassigned and matching doctor appointments stay visible', () {
    const mine = ClinicAppointment(
      id: 'a1',
      coupleId: 'c1',
      type: 'Consult',
      status: 'Confirmed',
      time: '9:00 am',
      date: '2026-09-12',
      doctor: 'Dr. Ananya Rao',
    );
    const open = ClinicAppointment(
      id: 'a2',
      coupleId: 'c2',
      type: 'Scan',
      status: 'Confirmed',
      time: '10:00 am',
      date: '2026-09-12',
      doctor: 'Unassigned',
    );
    const other = ClinicAppointment(
      id: 'a3',
      coupleId: 'c3',
      type: 'Consult',
      status: 'Confirmed',
      time: '11:00 am',
      date: '2026-09-12',
      doctor: 'Dr. Other',
    );
    final visible = HomeMetrics.scopedAppointments(
      appointments: const [mine, open, other],
      coupleById: const {},
      doctorName: 'Dr. Ananya Rao',
      doctorId: 'user_1',
    );
    expect(visible.map((item) => item.id), ['a1', 'a2']);
  });

  test('appointment grammar is singular for one visit', () {
    expect(HomeMetrics.appointmentCountLabel(1), '1 Appointment scheduled');
    expect(HomeMetrics.appointmentCountLabel(8), '8 Appointments scheduled');
  });

  test('upcoming excludes today and completed visits', () {
    final now = DateTime(2026, 9, 12, 10);
    final upcoming = HomeMetrics.upcomingAppointments(const [
      ClinicAppointment(
        id: 'today',
        coupleId: 'c1',
        type: 'Consult',
        status: 'Confirmed',
        time: '11:00 am',
        date: '2026-09-12',
      ),
      ClinicAppointment(
        id: 'next',
        coupleId: 'c2',
        type: 'Consult',
        status: 'Confirmed',
        time: '11:00 am',
        date: '2026-09-20',
      ),
      ClinicAppointment(
        id: 'done',
        coupleId: 'c3',
        type: 'Consult',
        status: 'Completed',
        time: '11:00 am',
        date: '2026-09-20',
      ),
    ], now);
    expect(upcoming.map((item) => item.id), ['next']);
  });
}
