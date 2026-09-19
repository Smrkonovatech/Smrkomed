import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/doctor_availability_data.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_shared.dart';

class DoctorAvailabilityPage extends ConsumerStatefulWidget {
  const DoctorAvailabilityPage({super.key, this.now});

  /// Injected for tests. Production uses the device clock.
  final DateTime Function()? now;

  @override
  ConsumerState<DoctorAvailabilityPage> createState() =>
      _DoctorAvailabilityPageState();
}

class _DoctorAvailabilityPageState
    extends ConsumerState<DoctorAvailabilityPage> {
  late DateTime _selectedDate;
  final Set<String> _selectedSlots = {};
  late Map<String, bool> _dayEnabled;
  var _bufferMins = 10;
  var _maxPatients = 15;
  var _minAdvanceHours = 2;

  DateTime get _now => widget.now?.call() ?? DateTime.now();

  DateTime _dateOnly(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  @override
  void initState() {
    super.initState();
    _selectedDate = _dateOnly(_now);
    _dayEnabled = {
      for (final day in AvailabilityPlaceholders.weeklyDays) day.day: true,
    };
  }

  @override
  Widget build(BuildContext context) {
    return SettingsSubpage(
      title: 'Doctor profile',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          _ProfileHeroCard(
            onEditProfile: () => context.push(AppRoutes.moreProfile),
            onPhoto: () => showChangePhotoSheet(context: context, ref: ref),
          ),
          const SizedBox(height: 14),
          const _SummaryRow(),
          const SizedBox(height: 14),
          const _SlotUtilizationCard(),
          const SizedBox(height: 14),
          _ChooseSlotsCard(
            now: _now,
            selectedDate: _selectedDate,
            selectedSlots: _selectedSlots,
            onSelectToday: () =>
                setState(() => _selectedDate = _dateOnly(_now)),
            onSelectTomorrow: () => setState(
              () =>
                  _selectedDate = _dateOnly(_now).add(const Duration(days: 1)),
            ),
            onPickDate: _pickDate,
            onToggleSlot: _toggleSlot,
            onUpdate: _confirmUpdate,
            onInfo: _showSlotInfo,
          ),
          const SizedBox(height: 22),
          const Text(
            'SCHEDULE CONFIGURATION',
            style: TextStyle(
              fontSize: 12,
              letterSpacing: 0.6,
              fontWeight: AppTokens.fontWeightSemibold,
              color: AppTokens.colorHomeMuted,
            ),
          ),
          const SizedBox(height: 10),
          _WeeklyCard(
            enabled: _dayEnabled,
            onToggle: (day, value) => setState(() => _dayEnabled[day] = value),
          ),
          const SizedBox(height: 22),
          const Text(
            'OPD SAFEGUARDS',
            style: TextStyle(
              fontSize: 12,
              letterSpacing: 0.6,
              fontWeight: AppTokens.fontWeightSemibold,
              color: AppTokens.colorHomeMuted,
            ),
          ),
          const SizedBox(height: 10),
          _SafeguardsCard(
            bufferMins: _bufferMins,
            maxPatients: _maxPatients,
            minAdvanceHours: _minAdvanceHours,
            onBuffer: () => setState(
              () => _bufferMins = _bufferMins == 10
                  ? 15
                  : _bufferMins == 15
                  ? 5
                  : 10,
            ),
            onMax: () => setState(
              () => _maxPatients = _maxPatients == 15
                  ? 20
                  : _maxPatients == 20
                  ? 10
                  : 15,
            ),
            onAdvance: () => setState(
              () => _minAdvanceHours = _minAdvanceHours == 2
                  ? 4
                  : _minAdvanceHours == 4
                  ? 1
                  : 2,
            ),
          ),
        ],
      ),
    );
  }

  void _toggleSlot(AvailabilitySlot slot) {
    if (slot.kind != SlotKind.available) return;
    setState(() {
      if (_selectedSlots.contains(slot.id)) {
        _selectedSlots.remove(slot.id);
      } else {
        _selectedSlots.add(slot.id);
      }
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: _dateOnly(_now),
      lastDate: _dateOnly(_now).add(const Duration(days: 90)),
    );
    if (picked == null) return;
    setState(() => _selectedDate = _dateOnly(picked));
  }

  void _confirmUpdate() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppTokens.colorHomeTitle,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        content: const Text('Available slots updated'),
      ),
    );
  }

  void _showSlotInfo() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Choose Available Slots'),
          content: const Text(
            'Tap slots to open or close availability. Slots with existing appointments are locked.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }
}

class _ProfileHeroCard extends StatelessWidget {
  const _ProfileHeroCard({required this.onEditProfile, required this.onPhoto});

  final VoidCallback onEditProfile;
  final VoidCallback onPhoto;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1826),
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x331C1826),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: onPhoto,
                child: DoctorAvatar(
                  size: 64,
                  showCamera: true,
                  showOnline: true,
                  borderColor: const Color(0xFF3A3348),
                  onCamera: onPhoto,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AvailabilityPlaceholders.doctorName,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: AppTokens.fontWeightBold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      AvailabilityPlaceholders.specialty,
                      style: TextStyle(
                        color: Color(0xFFC8B8F0),
                        fontSize: 13,
                        fontWeight: AppTokens.fontWeightMedium,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      AvailabilityPlaceholders.department,
                      style: TextStyle(color: Color(0xFF9A93A8), fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          InkWell(
            onTap: onEditProfile,
            borderRadius: BorderRadius.circular(10),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Text(
                    'Edit Profile',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: AppTokens.fontWeightMedium,
                    ),
                  ),
                  Spacer(),
                  Icon(Icons.chevron_right, color: Colors.white, size: 22),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Divider(color: Color(0xFF3A3348), height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.badge_outlined,
                color: Color(0xFFC8B8F0),
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                AvailabilityPlaceholders.registration,
                style: const TextStyle(
                  color: Color(0xFFD8D2E4),
                  fontSize: 13,
                  fontWeight: AppTokens.fontWeightMedium,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(
          child: _MetricCard(
            value: AvailabilityPlaceholders.inCare,
            label: 'IN CARE',
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            value: AvailabilityPlaceholders.todaysAppts,
            label: "TODAY'S APPTS",
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFEAE4F4)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F5B3FA0),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: AppTokens.fontWeightBold,
              color: AppTokens.colorHomeTitle,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 0.4,
              fontWeight: AppTokens.fontWeightSemibold,
              color: AppTokens.colorHomeMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _SlotUtilizationCard extends StatelessWidget {
  const _SlotUtilizationCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFEAE4F4)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Slot Utilization',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: AppTokens.fontWeightBold,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
              ),
              const Text(
                'Today',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: AppTokens.fontWeightMedium,
                  color: AppTokens.colorHomeMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                width: 108,
                height: 108,
                child: CustomPaint(
                  painter: _UtilizationPainter(
                    AvailabilityPlaceholders.utilizationPercent / 100,
                  ),
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${AvailabilityPlaceholders.utilizationPercent}%',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: AppTokens.fontWeightBold,
                            color: AppTokens.colorHomeTitle,
                          ),
                        ),
                        Text(
                          'BOOKED',
                          style: TextStyle(
                            fontSize: 10,
                            letterSpacing: 0.6,
                            fontWeight: AppTokens.fontWeightSemibold,
                            color: AppTokens.colorHomeMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _UtilStat(
                      color: AppTokens.colorPrimary,
                      label:
                          'Booked ${AvailabilityPlaceholders.bookedSlots} slots',
                    ),
                    SizedBox(height: 12),
                    _UtilStat(
                      color: AppTokens.colorHomeSuccessRing,
                      label:
                          'Available ${AvailabilityPlaceholders.availableSlots} slots',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _UtilStat extends StatelessWidget {
  const _UtilStat({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: AppTokens.fontWeightMedium,
              color: AppTokens.colorHomeTitle,
            ),
          ),
        ),
      ],
    );
  }
}

class _UtilizationPainter extends CustomPainter {
  const _UtilizationPainter(this.fraction);

  final double fraction;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2 - 8;
    final track = Paint()
      ..color = const Color(0xFFEDE7F8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    final fill = Paint()
      ..color = AppTokens.colorPrimary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, track);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -1.5708,
      6.2832 * fraction.clamp(0, 1),
      false,
      fill,
    );
  }

  @override
  bool shouldRepaint(covariant _UtilizationPainter oldDelegate) =>
      oldDelegate.fraction != fraction;
}

class _ChooseSlotsCard extends StatelessWidget {
  const _ChooseSlotsCard({
    required this.now,
    required this.selectedDate,
    required this.selectedSlots,
    required this.onSelectToday,
    required this.onSelectTomorrow,
    required this.onPickDate,
    required this.onToggleSlot,
    required this.onUpdate,
    required this.onInfo,
  });

  final DateTime now;
  final DateTime selectedDate;
  final Set<String> selectedSlots;
  final VoidCallback onSelectToday;
  final VoidCallback onSelectTomorrow;
  final VoidCallback onPickDate;
  final ValueChanged<AvailabilitySlot> onToggleSlot;
  final VoidCallback onUpdate;
  final VoidCallback onInfo;

  DateTime _dateOnly(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  @override
  Widget build(BuildContext context) {
    final today = _dateOnly(now);
    final tomorrow = today.add(const Duration(days: 1));
    final selected = _dateOnly(selectedDate);
    final weekday = DateFormat('E').format(today);
    final customLabel = selected == today || selected == tomorrow
        ? 'Pick any date'
        : DateFormat('EEE, d MMM').format(selected);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFEAE4F4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Choose Available Slots',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: AppTokens.fontWeightBold,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
              ),
              IconButton(
                onPressed: onInfo,
                icon: const Icon(Icons.info_outline, size: 20),
                color: AppTokens.colorHomeMuted,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const Text(
            'Tap slots to open or close availability. Slots with existing appointments are locked.',
            style: TextStyle(
              fontSize: 13,
              height: 1.4,
              color: AppTokens.colorHomeMuted,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _DateChip(
                label: 'Today, $weekday',
                selected: selected == today,
                onTap: onSelectToday,
              ),
              _DateChip(
                label: 'Tomorrow',
                selected: selected == tomorrow,
                onTap: onSelectTomorrow,
              ),
              _DateChip(
                label: customLabel,
                selected: selected != today && selected != tomorrow,
                onTap: onPickDate,
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              _LegendDot(
                color: AppTokens.colorHomeSuccessRing,
                label: 'Available',
              ),
              _LegendDot(color: Color(0xFF3A3348), label: 'Closed'),
              _LegendLock(),
            ],
          ),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.8,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            children: [
              for (final slot in AvailabilityPlaceholders.slots)
                _SlotTile(
                  slot: slot,
                  selected: selectedSlots.contains(slot.id),
                  onTap: () => onToggleSlot(slot),
                ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton(
              onPressed: onUpdate,
              style: FilledButton.styleFrom(
                backgroundColor: AppTokens.colorPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Update Available Slots',
                style: TextStyle(fontWeight: AppTokens.fontWeightSemibold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  const _DateChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFEDE7FB) : const Color(0xFFF7F5FB),
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: AppTokens.fontWeightSemibold,
              color: selected
                  ? AppTokens.colorPrimary
                  : AppTokens.colorHomeTitle,
            ),
          ),
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppTokens.colorHomeMuted),
        ),
      ],
    );
  }
}

class _LegendLock extends StatelessWidget {
  const _LegendLock();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.lock, size: 12, color: Color(0xFFB8B2C4)),
        SizedBox(width: 4),
        Text(
          'Booked',
          style: TextStyle(fontSize: 12, color: AppTokens.colorHomeMuted),
        ),
      ],
    );
  }
}

class _SlotTile extends StatelessWidget {
  const _SlotTile({
    required this.slot,
    required this.selected,
    required this.onTap,
  });

  final AvailabilitySlot slot;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final booked = slot.kind == SlotKind.booked;
    final closed = slot.kind == SlotKind.closed;
    final Color background;
    final Color foreground;
    if (booked) {
      background = const Color(0xFF1C1826);
      foreground = Colors.white;
    } else if (closed) {
      background = const Color(0xFFEDEAF2);
      foreground = const Color(0xFF9A93A8);
    } else if (selected) {
      background = AppTokens.colorPrimary;
      foreground = Colors.white;
    } else {
      background = const Color(0xFFFBF9FE);
      foreground = AppTokens.colorHomeTitle;
    }

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        key: ValueKey('slot-${slot.id}'),
        onTap: booked || closed ? null : onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: booked
                  ? const Color(0xFF1C1826)
                  : closed
                  ? const Color(0xFFE3DEEC)
                  : selected
                  ? AppTokens.colorPrimary
                  : const Color(0xFFE8E2F2),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            children: [
              if (slot.kind == SlotKind.available && !selected)
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: const BoxDecoration(
                    color: AppTokens.colorHomeSuccessRing,
                    shape: BoxShape.circle,
                  ),
                ),
              if (booked)
                const Padding(
                  padding: EdgeInsets.only(right: 6),
                  child: Icon(Icons.lock, size: 14, color: Colors.white),
                ),
              Expanded(
                child: Text(
                  slot.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: AppTokens.fontWeightSemibold,
                    color: foreground,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WeeklyCard extends StatelessWidget {
  const _WeeklyCard({required this.enabled, required this.onToggle});

  final Map<String, bool> enabled;
  final void Function(String day, bool value) onToggle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 12, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFEAE4F4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Weekly Recurring Slots',
            style: TextStyle(
              fontSize: 16,
              fontWeight: AppTokens.fontWeightBold,
              color: AppTokens.colorHomeTitle,
            ),
          ),
          const SizedBox(height: 8),
          for (final day in AvailabilityPlaceholders.weeklyDays)
            _WeeklyDayRow(
              day: day,
              enabled: enabled[day.day] ?? true,
              onChanged: (value) => onToggle(day.day, value),
            ),
        ],
      ),
    );
  }
}

class _WeeklyDayRow extends StatelessWidget {
  const _WeeklyDayRow({
    required this.day,
    required this.enabled,
    required this.onChanged,
  });

  final WeeklyDayPlaceholder day;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  Color get _badgeColor {
    switch (day.badgeKind) {
      case DayBadgeKind.active:
        return const Color(0xFFE6F8EF);
      case DayBadgeKind.opu:
        return const Color(0xFFEDE7FB);
      case DayBadgeKind.morning:
        return const Color(0xFFEEEAF3);
    }
  }

  Color get _badgeText {
    switch (day.badgeKind) {
      case DayBadgeKind.active:
        return AppTokens.colorHomeLab;
      case DayBadgeKind.opu:
        return AppTokens.colorPrimary;
      case DayBadgeKind.morning:
        return AppTokens.colorHomeMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      day.day,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: AppTokens.fontWeightSemibold,
                        color: enabled
                            ? AppTokens.colorHomeTitle
                            : AppTokens.colorHomeMuted,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: _badgeColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        day.badge,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: AppTokens.fontWeightSemibold,
                          color: _badgeText,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${day.hours}   ${day.slot}',
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTokens.colorHomeMuted,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            key: ValueKey('week-${day.day}'),
            value: enabled,
            onChanged: onChanged,
            activeTrackColor: AppTokens.colorPrimary,
            activeThumbColor: Colors.white,
          ),
        ],
      ),
    );
  }
}

class _SafeguardsCard extends StatelessWidget {
  const _SafeguardsCard({
    required this.bufferMins,
    required this.maxPatients,
    required this.minAdvanceHours,
    required this.onBuffer,
    required this.onMax,
    required this.onAdvance,
  });

  final int bufferMins;
  final int maxPatients;
  final int minAdvanceHours;
  final VoidCallback onBuffer;
  final VoidCallback onMax;
  final VoidCallback onAdvance;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFEAE4F4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Slot Rules & Buffers',
            style: TextStyle(
              fontSize: 16,
              fontWeight: AppTokens.fontWeightBold,
              color: AppTokens.colorHomeTitle,
            ),
          ),
          const SizedBox(height: 12),
          _RuleRow(
            icon: Icons.timer_outlined,
            title: 'Auto-buffer Between Patients',
            subtitle: 'Cool-down / chart review',
            value: '$bufferMins Mins',
            onTap: onBuffer,
          ),
          _RuleRow(
            icon: Icons.groups_outlined,
            title: 'Max Capacity per OPD',
            subtitle: 'Patients seen in one session',
            value: '$maxPatients Patients',
            onTap: onMax,
          ),
          _RuleRow(
            icon: Icons.schedule_outlined,
            title: 'Min Advance Booking',
            subtitle: 'Lead time before a slot opens',
            value: '$minAdvanceHours Hours',
            onTap: onAdvance,
          ),
        ],
      ),
    );
  }
}

class _RuleRow extends StatelessWidget {
  const _RuleRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF7F5FB),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFEDE7FB),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppTokens.colorPrimary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: AppTokens.fontWeightSemibold,
                      color: AppTokens.colorHomeTitle,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTokens.colorHomeMuted,
                    ),
                  ),
                ],
              ),
            ),
            InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE4DFF0)),
                ),
                child: Text(
                  value,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: AppTokens.fontWeightSemibold,
                    color: AppTokens.colorHomeTitle,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
