import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/routing/app_router.dart';
import 'package:smrkomed_doctor_app/core/theme/app_theme.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class SmrkoMedDoctorApp extends ConsumerWidget {
  const SmrkoMedDoctorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'SMRKoMed Doctor',
      theme: AppTheme.light(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}
