import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/constants/brand_assets.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/home/domain/home_models.dart';

Color colorForJourney(JourneyKind kind) {
  return switch (kind) {
    JourneyKind.consultation => AppTokens.colorHomeConsultation,
    JourneyKind.lab => AppTokens.colorHomeLab,
    JourneyKind.review => AppTokens.colorHomeReview,
  };
}

String journeyKindLabel(JourneyKind kind) {
  return switch (kind) {
    JourneyKind.consultation => 'Consultation',
    JourneyKind.lab => 'Lab',
    JourneyKind.review => 'Review Needed',
  };
}

/// One full orbit of patient bubbles.
const overviewOrbitDuration = Duration(seconds: 12);

class OverviewCard extends StatefulWidget {
  const OverviewCard({
    super.key,
    required this.dashboard,
    required this.onViewAll,
    this.onRetry,
  });

  final HomeDashboard dashboard;
  final VoidCallback onViewAll;
  final VoidCallback? onRetry;

  @override
  State<OverviewCard> createState() => _OverviewCardState();
}

class _OverviewCardState extends State<OverviewCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _orbit;
  late final ValueNotifier<HomeJourneyPreview?> _selected;
  String? _pinnedId;

  @override
  void initState() {
    super.initState();
    _selected = ValueNotifier<HomeJourneyPreview?>(
      widget.dashboard.journeyPreviews.isEmpty
          ? null
          : widget.dashboard.journeyPreviews.first,
    );
    _orbit = AnimationController(vsync: this, duration: overviewOrbitDuration);
    _orbit.addListener(_syncSelected);
    _orbit.repeat();
  }

  @override
  void didUpdateWidget(OverviewCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    final ids = widget.dashboard.journeyPreviews.map((e) => e.id).toSet();
    if (_pinnedId != null && !ids.contains(_pinnedId)) {
      _pinnedId = null;
    }
    _syncSelected();
  }

  @override
  void dispose() {
    _orbit.removeListener(_syncSelected);
    _orbit.dispose();
    _selected.dispose();
    super.dispose();
  }

  void _syncSelected() {
    final previews = widget.dashboard.journeyPreviews;
    if (previews.isEmpty) {
      if (_selected.value != null) {
        _selected.value = null;
      }
      return;
    }
    if (_pinnedId != null) {
      for (final preview in previews) {
        if (preview.id == _pinnedId) {
          if (_selected.value?.id != preview.id) {
            _selected.value = preview;
          }
          return;
        }
      }
    }
    final next = previews[_leftmostIndex(_orbit.value, previews.length)];
    if (_selected.value?.id != next.id) {
      _selected.value = next;
    }
  }

  void _onSelect(String id) {
    _pinnedId = id;
    _syncSelected();
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = widget.dashboard;
    if (dashboard.couplesError != null && dashboard.analyticsError != null) {
      return _CardShell(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Unable to load journeys.',
                  style: TextStyle(
                    color: AppTokens.colorHomeMuted,
                    fontSize: 14,
                  ),
                ),
              ),
              if (widget.onRetry != null)
                TextButton(
                  onPressed: widget.onRetry,
                  child: const Text('Retry'),
                ),
            ],
          ),
        ),
      );
    }

    return _CardShell(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'OVERVIEW',
              style: TextStyle(
                fontSize: 11,
                fontWeight: AppTokens.fontWeightSemibold,
                letterSpacing: 1.4,
                color: AppTokens.colorHomeMuted,
              ),
            ),
            const SizedBox(height: 4),
            if (dashboard.activeJourneyCount == 0 &&
                dashboard.journeyPreviews.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: Text(
                    'No active journeys',
                    style: TextStyle(color: AppTokens.colorHomeMuted),
                  ),
                ),
              )
            else
              AspectRatio(
                // Native Figma PNG is 348×356; keep that ratio so the ring
                // is never stretched.
                aspectRatio: 348 / 356,
                child: _OrbitStage(
                  animation: _orbit,
                  previews: dashboard.journeyPreviews,
                  activeCount: dashboard.activeJourneyCount,
                  selected: _selected,
                  onViewAll: widget.onViewAll,
                  onSelect: _onSelect,
                ),
              ),
            const SizedBox(height: 4),
            const Divider(height: 24, thickness: 1, color: Color(0xFFE8E4F0)),
            const FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _LegendDot(
                    color: AppTokens.colorHomeConsultation,
                    label: 'Consultation',
                  ),
                  SizedBox(width: 18),
                  _LegendDot(color: AppTokens.colorHomeLab, label: 'Lab'),
                  SizedBox(width: 18),
                  _LegendDot(
                    color: AppTokens.colorHomeReview,
                    label: 'Review Needed',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xF7FFFFFF),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1408122A),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _OrbitStage extends StatelessWidget {
  const _OrbitStage({
    required this.animation,
    required this.previews,
    required this.activeCount,
    required this.selected,
    required this.onViewAll,
    required this.onSelect,
  });

  final Animation<double> animation;
  final List<HomeJourneyPreview> previews;
  final int activeCount;
  final ValueNotifier<HomeJourneyPreview?> selected;
  final VoidCallback onViewAll;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.biggest;
        final shortest = math.min(size.width, size.height);
        // Sit bubbles on the PNG torus band, not on a Flutter-drawn circle.
        final orbitRadius = shortest * 0.34;
        final n = previews.length;
        final bubbleR = (shortest * 0.048).clamp(13.0, 17.0);
        final cx = size.width / 2;
        final cy = size.height / 2;

        return Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: RepaintBoundary(
                  child: Image.asset(
                    BrandAssets.overviewGlowRing,
                    fit: BoxFit.contain,
                    alignment: Alignment.center,
                    filterQuality: FilterQuality.high,
                    isAntiAlias: true,
                    gaplessPlayback: true,
                  ),
                ),
              ),
            ),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$activeCount',
                    style: const TextStyle(
                      fontSize: 48,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      color: AppTokens.colorHomeTitle,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'ACTIVE\nJOURNEYS',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      height: 1.15,
                      letterSpacing: 0.6,
                      fontWeight: AppTokens.fontWeightSemibold,
                      color: AppTokens.colorHomeMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: onViewAll,
                    child: const Text(
                      'View all ↗',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: AppTokens.fontWeightSemibold,
                        color: AppTokens.colorHomeConsultation,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 4,
              top: size.height * 0.36,
              child: ValueListenableBuilder<HomeJourneyPreview?>(
                valueListenable: selected,
                builder: (context, preview, _) {
                  if (preview == null) {
                    return const SizedBox.shrink();
                  }
                  return _SelectedPatientCard(preview: preview);
                },
              ),
            ),
            RepaintBoundary(
              child: AnimatedBuilder(
                animation: animation,
                builder: (context, _) {
                  final t = animation.value;
                  final selectedId = selected.value?.id;
                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      for (var i = 0; i < n; i++)
                        _bubbleAt(
                          previews[i],
                          t,
                          i,
                          n,
                          cx,
                          cy,
                          orbitRadius,
                          bubbleR,
                          selectedId,
                        ),
                    ],
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _bubbleAt(
    HomeJourneyPreview preview,
    double t,
    int index,
    int n,
    double cx,
    double cy,
    double radius,
    double bubbleR,
    String? selectedId,
  ) {
    final angle = t * math.pi * 2 + index * (math.pi * 2 / n) - math.pi / 2;
    final dx = cx + radius * math.cos(angle) - bubbleR;
    final dy = cy + radius * math.sin(angle) - bubbleR;
    return Positioned(
      left: dx,
      top: dy,
      child: GestureDetector(
        onTap: () => onSelect(preview.id),
        child: _InitialsBubble(
          preview: preview,
          radius: bubbleR,
          selected: preview.id == selectedId,
        ),
      ),
    );
  }
}

int _leftmostIndex(double t, int n) {
  var best = 0;
  var bestScore = 99.0;
  for (var i = 0; i < n; i++) {
    final angle = (t * math.pi * 2 + i * (math.pi * 2 / n)) % (math.pi * 2);
    final dist = (angle - math.pi).abs();
    final wrap = math.min(dist, math.pi * 2 - dist);
    if (wrap < bestScore) {
      bestScore = wrap;
      best = i;
    }
  }
  return best;
}

class _InitialsBubble extends StatelessWidget {
  const _InitialsBubble({
    required this.preview,
    required this.radius,
    required this.selected,
  });

  final HomeJourneyPreview preview;
  final double radius;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final color = colorForJourney(preview.kind);
    final letters = preview.initials.length > 2
        ? preview.initials.substring(0, 2)
        : preview.initials;
    return AnimatedScale(
      duration: const Duration(milliseconds: 180),
      scale: selected ? 1.08 : 1,
      child: Container(
        width: radius * 2,
        height: radius * 2,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.35),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          letters,
          style: TextStyle(
            color: Colors.white,
            fontSize: radius * 0.72,
            fontWeight: AppTokens.fontWeightBold,
            height: 1,
          ),
        ),
      ),
    );
  }
}

class _SelectedPatientCard extends StatelessWidget {
  const _SelectedPatientCard({required this.preview});

  final HomeJourneyPreview preview;

  @override
  Widget build(BuildContext context) {
    final color = colorForJourney(preview.kind);
    final letters = preview.initials.length > 2
        ? preview.initials.substring(0, 2)
        : preview.initials;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 148),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xF2FFFFFF),
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A0B1220),
              blurRadius: 16,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 12, 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: color,
                child: Text(
                  letters,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: AppTokens.fontWeightBold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      preview.label ?? 'Patient',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: AppTokens.fontWeightSemibold,
                        color: AppTokens.colorHomeTitle,
                      ),
                    ),
                    Text(
                      preview.detail ?? journeyKindLabel(preview.kind),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppTokens.colorHomeMuted,
                      ),
                    ),
                    if (preview.time != null && preview.time!.isNotEmpty)
                      Text(
                        preview.time!,
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTokens.colorHomeMuted,
                        ),
                      ),
                  ],
                ),
              ),
            ],
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
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF6B6578),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
