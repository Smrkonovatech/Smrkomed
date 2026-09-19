import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/settings_shared.dart';

class SettingsPlaceholderPage extends StatelessWidget {
  const SettingsPlaceholderPage({
    super.key,
    required this.title,
    required this.body,
  });

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return SettingsSubpage(
      title: title,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          body,
          style: const TextStyle(
            fontSize: 15,
            height: 1.45,
            color: AppTokens.colorHomeMuted,
          ),
        ),
      ),
    );
  }
}

class LanguageSettingsPage extends StatelessWidget {
  const LanguageSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SettingsSubpage(
      title: 'Language',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),
            child: ListTile(
              leading: Icon(Icons.check_circle, color: AppTokens.colorPrimary),
              title: const Text(SettingsPlaceholders.language),
              subtitle: const Text('UI placeholder — not saved yet'),
            ),
          ),
        ],
      ),
    );
  }
}
