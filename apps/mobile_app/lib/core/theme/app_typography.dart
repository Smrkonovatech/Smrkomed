import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';

abstract final class AppTypography {
  static TextTheme textTheme() {
    const color = AppTokens.colorOnSurface;
    return const TextTheme(
      displaySmall: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeDisplay,
        fontWeight: AppTokens.fontWeightBold,
        color: color,
        height: 1.2,
      ),
      headlineMedium: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeXl,
        fontWeight: AppTokens.fontWeightSemibold,
        color: color,
        height: 1.25,
      ),
      titleLarge: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeLg,
        fontWeight: AppTokens.fontWeightSemibold,
        color: color,
      ),
      titleMedium: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeMd,
        fontWeight: AppTokens.fontWeightMedium,
        color: color,
      ),
      bodyLarge: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeMd,
        fontWeight: AppTokens.fontWeightRegular,
        color: color,
        height: 1.4,
      ),
      bodyMedium: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeSm,
        fontWeight: AppTokens.fontWeightRegular,
        color: AppTokens.colorMuted,
        height: 1.4,
      ),
      labelLarge: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeMd,
        fontWeight: AppTokens.fontWeightSemibold,
        color: color,
      ),
      labelSmall: TextStyle(
        fontFamily: AppTokens.fontFamily,
        fontSize: AppTokens.fontSizeXs,
        fontWeight: AppTokens.fontWeightMedium,
        color: AppTokens.colorMuted,
      ),
    );
  }
}
