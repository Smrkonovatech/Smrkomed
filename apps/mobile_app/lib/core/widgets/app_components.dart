import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';

class AppPrimaryButton extends StatelessWidget {
  const AppPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.semanticLabel,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel ?? label,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        child: loading
            ? const SizedBox(
                width: AppTokens.iconMd,
                height: AppTokens.iconMd,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Text(label),
      ),
    );
  }
}

class AppSecondaryButton extends StatelessWidget {
  const AppSecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.semanticLabel,
  });

  final String label;
  final VoidCallback? onPressed;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel ?? label,
      child: OutlinedButton(onPressed: onPressed, child: Text(label)),
    );
  }
}

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.obscureText = false,
    this.keyboardType,
    this.autofillHints,
    this.onChanged,
    this.errorText,
  });

  final String label;
  final TextEditingController? controller;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onChanged;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      onChanged: onChanged,
      decoration: InputDecoration(labelText: label, errorText: errorText),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Card(
      child: Padding(
        padding: const EdgeInsets.all(AppTokens.space16),
        child: child,
      ),
    );
    if (onTap == null) return card;
    return InkWell(onTap: onTap, child: card);
  }
}

class AppStatusBadge extends StatelessWidget {
  const AppStatusBadge({super.key, required this.label, this.color});

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final resolved = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.space8,
        vertical: AppTokens.space4,
      ),
      decoration: BoxDecoration(
        color: resolved.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppTokens.radiusFull),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelSmall?.copyWith(color: resolved),
      ),
    );
  }
}

class AppChip extends StatelessWidget {
  const AppChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool>? onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
    );
  }
}

class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  const AppTopBar({super.key, required this.title, this.actions});

  final String title;
  final List<Widget>? actions;

  @override
  Size get preferredSize => const Size.fromHeight(AppTokens.appBarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(title: Text(title), actions: actions);
  }
}

class AppLoadingIndicator extends StatelessWidget {
  const AppLoadingIndicator({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (label != null) ...[
            const SizedBox(height: AppTokens.space16),
            Text(label!, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}

class AppSkeleton extends StatelessWidget {
  const AppSkeleton({super.key, this.height = 16, this.width});

  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading',
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: AppTokens.colorBorder,
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
        ),
      ),
    );
  }
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    super.key,
    required this.title,
    required this.body,
    this.action,
  });

  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppTokens.space24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTokens.space8),
          Text(
            body,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          if (action != null) ...[
            const SizedBox(height: AppTokens.space24),
            action!,
          ],
        ],
      ),
    );
  }
}

class AppErrorState extends StatelessWidget {
  const AppErrorState({
    super.key,
    required this.message,
    this.onRetry,
    this.retryLabel = 'Try again',
  });

  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    return AppEmptyState(
      title: 'Unable to load',
      body: message,
      action: onRetry == null
          ? null
          : AppPrimaryButton(label: retryLabel, onPressed: onRetry),
    );
  }
}

Future<bool> showAppConfirmDialog({
  required BuildContext context,
  required String title,
  required String body,
  String confirmLabel = 'Confirm',
  String cancelLabel = 'Cancel',
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(cancelLabel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmLabel),
          ),
        ],
      );
    },
  );
  return result ?? false;
}

Future<void> showAppBottomSheet({
  required BuildContext context,
  required Widget child,
}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) =>
        Padding(padding: const EdgeInsets.all(AppTokens.space16), child: child),
  );
}
