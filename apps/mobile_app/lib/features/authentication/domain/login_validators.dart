/// Client-side checks only. Server auth remains the source of truth.
abstract final class LoginValidators {
  /// local-part@domain with at least one `.` in the domain.
  /// TLDs are not whitelisted (.com, .in, .demo, .health, etc. are all allowed).
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static String? email(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'Enter your email.';
    if (!_email.hasMatch(trimmed)) return 'Enter a valid email address.';
    return null;
  }

  /// Matches `apps/web` credentials schema: password must be present (min 1).
  static String? password(String value) {
    if (value.isEmpty) return 'Enter your password.';
    return null;
  }
}
