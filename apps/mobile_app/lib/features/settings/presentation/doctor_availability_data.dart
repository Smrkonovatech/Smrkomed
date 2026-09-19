enum SlotKind { available, closed, booked }

enum DayBadgeKind { active, opu, morning }

class AvailabilitySlot {
  const AvailabilitySlot({
    required this.id,
    required this.label,
    required this.kind,
  });

  final String id;
  final String label;
  final SlotKind kind;
}

class WeeklyDayPlaceholder {
  const WeeklyDayPlaceholder({
    required this.day,
    required this.badge,
    required this.badgeKind,
    required this.hours,
    required this.slot,
  });

  final String day;
  final String badge;
  final DayBadgeKind badgeKind;
  final String hours;
  final String slot;
}

/// Static UI placeholders for the Doctor Profile / Availability screen.
/// Not loaded from APIs.
abstract final class AvailabilityPlaceholders {
  static const doctorName = 'Dr. Shreya Gupta';
  static const specialty = 'Lead Fertility Specialist';
  static const department = 'Reproductive Medicine';
  static const registration = 'MCI-2018-94821';
  static const inCare = '42';
  static const todaysAppts = '8';
  static const utilizationPercent = 67;
  static const bookedSlots = 8;
  static const availableSlots = 4;

  static const slots = [
    AvailabilitySlot(
      id: 's1',
      label: '09:00 - 09:30',
      kind: SlotKind.available,
    ),
    AvailabilitySlot(id: 's2', label: '09:30 - 10:00', kind: SlotKind.booked),
    AvailabilitySlot(
      id: 's3',
      label: '10:00 - 10:30',
      kind: SlotKind.available,
    ),
    AvailabilitySlot(id: 's4', label: '10:30 - 11:00', kind: SlotKind.closed),
    AvailabilitySlot(
      id: 's5',
      label: '11:00 - 11:30',
      kind: SlotKind.available,
    ),
    AvailabilitySlot(id: 's6', label: '11:30 - 12:00', kind: SlotKind.booked),
    AvailabilitySlot(
      id: 's7',
      label: '14:00 - 14:30',
      kind: SlotKind.available,
    ),
    AvailabilitySlot(id: 's8', label: '14:30 - 15:00', kind: SlotKind.closed),
    AvailabilitySlot(
      id: 's9',
      label: '15:00 - 15:30',
      kind: SlotKind.available,
    ),
    AvailabilitySlot(id: 's10', label: '15:30 - 16:00', kind: SlotKind.booked),
    AvailabilitySlot(
      id: 's11',
      label: '16:00 - 16:30',
      kind: SlotKind.available,
    ),
    AvailabilitySlot(id: 's12', label: '16:30 - 17:00', kind: SlotKind.closed),
  ];

  static const weeklyDays = [
    WeeklyDayPlaceholder(
      day: 'Monday',
      badge: 'Active',
      badgeKind: DayBadgeKind.active,
      hours: '09:00 AM – 05:00 PM',
      slot: 'Slot: 20m',
    ),
    WeeklyDayPlaceholder(
      day: 'Tuesday',
      badge: 'Active',
      badgeKind: DayBadgeKind.active,
      hours: '09:00 AM – 05:00 PM',
      slot: 'Slot: 20m',
    ),
    WeeklyDayPlaceholder(
      day: 'Wednesday',
      badge: 'OPU & OT Day',
      badgeKind: DayBadgeKind.opu,
      hours: '08:00 AM – 02:00 PM',
      slot: 'Slot: 45m',
    ),
    WeeklyDayPlaceholder(
      day: 'Thursday',
      badge: 'Active',
      badgeKind: DayBadgeKind.active,
      hours: '09:00 AM – 05:00 PM',
      slot: 'Slot: 20m',
    ),
    WeeklyDayPlaceholder(
      day: 'Friday',
      badge: 'Active',
      badgeKind: DayBadgeKind.active,
      hours: '09:00 AM – 04:00 PM',
      slot: 'Slot: 20m',
    ),
    WeeklyDayPlaceholder(
      day: 'Saturday',
      badge: 'Morning Only',
      badgeKind: DayBadgeKind.morning,
      hours: '09:30 AM – 01:00 PM',
      slot: 'Slot: 30m',
    ),
  ];
}
