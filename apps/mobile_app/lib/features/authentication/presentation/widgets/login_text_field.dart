import 'package:flutter/material.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';

class LoginTextField extends StatelessWidget {
  const LoginTextField({
    super.key,
    required this.controller,
    required this.hintText,
    required this.semanticLabel,
    this.keyboardType,
    this.autofillHints,
    this.obscureText = false,
    this.onChanged,
    this.errorText,
    this.suffix,
    this.focusNode,
    this.textInputAction,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hintText;
  final String semanticLabel;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final bool obscureText;
  final ValueChanged<String>? onChanged;
  final String? errorText;
  final Widget? suffix;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(AppTokens.radiusLoginField);
    return Semantics(
      textField: true,
      label: semanticLabel,
      obscured: obscureText,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        obscureText: obscureText,
        keyboardType: keyboardType,
        autofillHints: autofillHints,
        textInputAction: textInputAction,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        style: const TextStyle(
          fontSize: AppTokens.fontSizeMd,
          fontWeight: AppTokens.fontWeightRegular,
          color: AppTokens.colorOnSurface,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(
            fontSize: AppTokens.fontSizeMd,
            color: AppTokens.colorLoginFieldHint,
          ),
          errorText: errorText,
          suffixIcon: suffix,
          filled: true,
          fillColor: AppTokens.colorSurface,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppTokens.space20,
            vertical: AppTokens.space12,
          ),
          border: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(
              color: AppTokens.colorLoginFieldBorder,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(
              color: AppTokens.colorLoginFieldBorder,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(
              color: AppTokens.colorLoginBrandPurple,
              width: AppTokens.borderStrong,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(color: AppTokens.colorError),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(
              color: AppTokens.colorError,
              width: AppTokens.borderStrong,
            ),
          ),
        ),
      ),
    );
  }
}
