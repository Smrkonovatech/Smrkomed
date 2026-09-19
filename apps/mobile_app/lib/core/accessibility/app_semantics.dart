import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';

abstract final class AppSemantics {
  static Widget labeled({
    required String label,
    required Widget child,
    bool button = false,
  }) {
    return Semantics(label: label, button: button, child: child);
  }
}

abstract final class AppAccessibility {
  static const minTouchTarget = AppTokens.minTouchTarget;
}
