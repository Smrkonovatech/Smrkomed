import 'package:flutter/material.dart';

/// Temporary tokens until approved Figma values are supplied.
/// Replace numbers here — do not scatter literals in widgets.
abstract final class AppTokens {
  static const colorPrimary = Color(0xFF866BE3);
  static const colorPrimaryHover = Color(0xFF7358D6);
  static const colorOnPrimary = Color(0xFFFFFFFF);
  static const colorSecondary = Color(0xFF2E293E);
  static const colorOnSecondary = Color(0xFFFFFFFF);
  static const colorBackground = Color(0xFFFFFFFF);
  static const colorSurface = Color(0xFFFFFFFF);
  static const colorOnSurface = Color(0xFF1B1F23);
  static const colorMuted = Color(0xFF464748);
  static const colorBorder = Color(0xFFE1E4EA);
  static const colorError = Color(0xFFB42318);
  static const colorOnError = Color(0xFFFFFFFF);
  static const colorSuccess = Color(0xFF067647);
  static const colorWarning = Color(0xFFB54708);
  static const colorInfo = Color(0xFF175CD3);

  /// Measured from the approved Figma splash + login screenshots.
  static const colorSplashBackground = Color(0xFF00AAE9);
  static const colorLoginGradientTop = Color(0xFF01AAE9);
  static const colorLoginGradientMid = Color(0xFF8BD9F5);
  static const colorLoginGradientBottom = Color(0xFFE3F6FE);
  static const colorLoginTitle = Color(0xFFFFFFFF);
  static const colorLoginSubtitle = Color(0xFF464748);
  static const colorLoginBrandPurple = Color(0xFF866BE3);
  static const colorLoginWordmark = Color(0xFF2E293E);
  static const colorLoginFieldBorder = Color(0xFFD0D5DD);
  static const colorLoginFieldHint = Color(0xFF98A2B3);
  static const colorCheckboxBorder = Color(0xFFD0D5DD);

  /// Doctor Home (approved mobile screenshot).
  static const colorHomeBackground = Color(0xFFF4F0FA);
  static const colorHomeCard = Color(0xFFFFFFFF);
  static const colorHomeTitle = Color(0xFF2A2438);
  static const colorHomeMuted = Color(0xFF8A8496);
  static const colorHomeSubtitle = Color(0xFF6B6578);
  static const colorHomeConsultation = Color(0xFF8B5CF6);
  static const colorHomeLab = Color(0xFF10B981);
  static const colorHomeReview = Color(0xFFF59E0B);
  static const colorHomeAttention = Color(0xFFE85D6C);
  static const colorHomeAttentionSoft = Color(0xFFFFE8EA);
  static const colorHomeSuccessRing = Color(0xFF3DCC8A);
  static const colorPrepareDayStart = Color(0xFF9B7EF0);
  static const colorPrepareDayEnd = Color(0xFF6F4FE0);

  static const fontFamily = 'Roboto';

  static const fontSizeXs = 12.0;
  static const fontSizeSm = 14.0;
  static const fontSizeMd = 16.0;
  static const fontSizeLg = 20.0;
  static const fontSizeXl = 24.0;
  static const fontSizeDisplay = 32.0;

  static const fontWeightRegular = FontWeight.w400;
  static const fontWeightMedium = FontWeight.w500;
  static const fontWeightSemibold = FontWeight.w600;
  static const fontWeightBold = FontWeight.w700;

  static const space2 = 2.0;
  static const space4 = 4.0;
  static const space8 = 8.0;
  static const space12 = 12.0;
  static const space16 = 16.0;
  static const space20 = 20.0;
  static const space24 = 24.0;
  static const space32 = 32.0;
  static const space40 = 40.0;
  static const space48 = 48.0;

  static const radiusSm = 8.0;
  static const radiusMd = 12.0;
  static const radiusLg = 16.0;
  static const radiusXl = 32.0;
  static const radiusLoginCard = 36.0;
  static const radiusLoginField = 28.0;
  static const radiusLoginButton = 28.0;
  static const radiusFull = 999.0;

  static const splashLogoWidthFactor = 0.451;
  static const splashFooterWidthFactor = 0.40;
  static const splashFooterBottom = 26.0;
  static const loginHeroHeightFactor = 0.33;
  static const loginCardTopFactor = 0.33;
  static const loginHorizontalInset = 16.0;
  static const loginFieldHeight = 52.0;
  static const loginButtonHeight = 52.0;
  static const loginWordmarkHeight = 36.0;
  static const loginHeroImageHeight = 168.0;

  static const borderHairline = 1.0;
  static const borderStrong = 1.5;

  static const elevationNone = 0.0;
  static const elevationSm = 1.0;
  static const elevationMd = 4.0;
  static const elevationLg = 8.0;

  static const iconSm = 16.0;
  static const iconMd = 20.0;
  static const iconLg = 24.0;
  static const iconXl = 32.0;

  static const minTouchTarget = 48.0;
  static const buttonHeight = 48.0;
  static const inputHeight = 48.0;
  static const appBarHeight = 56.0;
  static const bottomNavHeight = 64.0;

  static const durationFast = Duration(milliseconds: 150);
  static const durationMedium = Duration(milliseconds: 250);
  static const durationSlow = Duration(milliseconds: 400);
  static const splashMinDisplay = Duration(milliseconds: 700);
}
