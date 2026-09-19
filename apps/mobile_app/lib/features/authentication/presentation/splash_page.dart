import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/constants/brand_assets.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialize());
  }

  Future<void> _initialize() async {
    await Future.wait<void>([
      Future<void>.delayed(AppTokens.splashMinDisplay),
      ref.read(authControllerProvider.notifier).bootstrap(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final l10n = AppLocalizations.of(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: AppTokens.colorSplashBackground,
      ),
      child: Scaffold(
        backgroundColor: AppTokens.colorSplashBackground,
        body: Stack(
          children: [
            Center(
              child: Semantics(
                label: l10n.appTitle,
                image: true,
                child: Image.asset(
                  BrandAssets.splashLogo,
                  width: size.width * AppTokens.splashLogoWidthFactor,
                  filterQuality: FilterQuality.high,
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: bottomInset > AppTokens.splashFooterBottom
                  ? bottomInset
                  : AppTokens.splashFooterBottom,
              child: Center(
                child: Semantics(
                  label: l10n.splashByline,
                  image: true,
                  child: Image.asset(
                    BrandAssets.splashByline,
                    height: AppTokens.space16,
                    filterQuality: FilterQuality.high,
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
