import 'package:flutter/foundation.dart';

/// Privacy-safe logger. Never pass passwords, tokens, PHI, chat, or report bodies.
class AppLogger {
  const AppLogger({this.enableDebug = kDebugMode});

  final bool enableDebug;

  void debug(String message, {Map<String, Object?> context = const {}}) {
    if (!enableDebug) return;
    _emit('DEBUG', message, context);
  }

  void info(String message, {Map<String, Object?> context = const {}}) {
    _emit('INFO', message, context);
  }

  void warn(String message, {Map<String, Object?> context = const {}}) {
    _emit('WARN', message, context);
  }

  void error(String message, {Map<String, Object?> context = const {}}) {
    _emit('ERROR', message, context);
  }

  void _emit(String level, String message, Map<String, Object?> context) {
    final scrubbed = PrivacyLogFilter.scrub(context);
    final suffix = scrubbed.isEmpty ? '' : ' $scrubbed';
    debugPrint('SMRKOMED[$level] $message$suffix');
  }
}

abstract final class PrivacyLogFilter {
  static const _blockedKeys = {
    'password',
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'cookie',
    'secret',
    'api_key',
    'apikey',
    'auth_secret',
    'session',
    'patient',
    'patientName',
    'medical',
    'diagnosis',
    'report',
    'message',
    'chat',
    'body',
    'email',
    'phone',
  };

  static Map<String, Object?> scrub(Map<String, Object?> input) {
    final out = <String, Object?>{};
    for (final entry in input.entries) {
      final key = entry.key;
      if (_isBlocked(key)) {
        out[key] = '[REDACTED]';
        continue;
      }
      final value = entry.value;
      if (value is String && _looksSensitive(value)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  static bool _isBlocked(String key) {
    final lower = key.toLowerCase();
    return _blockedKeys.any(lower.contains);
  }

  static bool _looksSensitive(String value) {
    if (value.length > 24 &&
        RegExp(r'^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.').hasMatch(value)) {
      return true;
    }
    if (value.toLowerCase().startsWith('bearer ')) return true;
    return false;
  }
}
