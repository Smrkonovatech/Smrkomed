import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/core/theme/app_typography.dart';

abstract final class AppTheme {
  static ThemeData light() {
    final colorScheme = const ColorScheme.light(
      primary: AppTokens.colorPrimary,
      onPrimary: AppTokens.colorOnPrimary,
      secondary: AppTokens.colorSecondary,
      onSecondary: AppTokens.colorOnSecondary,
      surface: AppTokens.colorSurface,
      onSurface: AppTokens.colorOnSurface,
      error: AppTokens.colorError,
      onError: AppTokens.colorOnError,
    );

    final textTheme = AppTypography.textTheme();
    final radius = BorderRadius.circular(AppTokens.radiusMd);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppTokens.colorBackground,
      textTheme: textTheme,
      visualDensity: VisualDensity.standard,
      appBarTheme: const AppBarTheme(
        elevation: AppTokens.elevationNone,
        centerTitle: false,
        backgroundColor: AppTokens.colorSurface,
        foregroundColor: AppTokens.colorOnSurface,
        toolbarHeight: AppTokens.appBarHeight,
      ),
      cardTheme: CardThemeData(
        color: AppTokens.colorSurface,
        elevation: AppTokens.elevationSm,
        shape: RoundedRectangleBorder(borderRadius: radius),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(
            AppTokens.minTouchTarget,
            AppTokens.buttonHeight,
          ),
          backgroundColor: AppTokens.colorPrimary,
          foregroundColor: AppTokens.colorOnPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(
            AppTokens.minTouchTarget,
            AppTokens.buttonHeight,
          ),
          foregroundColor: AppTokens.colorPrimary,
          side: const BorderSide(
            color: AppTokens.colorPrimary,
            width: AppTokens.borderHairline,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.colorSurface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppTokens.space16,
          vertical: AppTokens.space12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          borderSide: const BorderSide(color: AppTokens.colorBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          borderSide: const BorderSide(color: AppTokens.colorBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          borderSide: const BorderSide(
            color: AppTokens.colorPrimary,
            width: AppTokens.borderStrong,
          ),
        ),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusLg),
        ),
        backgroundColor: AppTokens.colorSurface,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppTokens.colorSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppTokens.radiusLg),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppTokens.colorBackground,
        selectedColor: AppTokens.colorPrimary.withValues(alpha: 0.12),
        labelStyle: textTheme.labelSmall,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusFull),
        ),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        height: AppTokens.bottomNavHeight,
        backgroundColor: AppTokens.colorSurface,
        indicatorColor: Color(0x1A866BE3),
      ),
    );
  }
}
