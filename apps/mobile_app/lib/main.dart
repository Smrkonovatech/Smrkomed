import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/app.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/di/app_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();
  debugPrint(
    'SMRKOMED[INFO] Runtime hosts env=${config.environment.name} '
    'api=${config.apiBaseUrl} web=${config.webAuthOrigin} '
    'auth_diag=v4',
  );
  runApp(
    ProviderScope(
      overrides: createProductionOverrides(config),
      child: const SmrkoMedDoctorApp(),
    ),
  );
}
