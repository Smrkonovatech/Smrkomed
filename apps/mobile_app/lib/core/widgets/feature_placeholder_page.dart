import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/widgets/app_components.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class FeaturePlaceholderPage extends StatelessWidget {
  const FeaturePlaceholderPage({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppTopBar(title: title),
      body: AppEmptyState(title: title, body: l10n.foundationPlaceholder),
    );
  }
}
