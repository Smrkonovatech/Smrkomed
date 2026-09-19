import 'dart:convert';

/// Parses Auth.js `Set-Cookie` headers without logging values.
/// Supports chunked session cookies (`authjs.session-token.0`, `.1`, …).
class AuthJsCookieJar {
  AuthJsCookieJar();

  final Map<String, String> _cookies = {};

  static const sessionCookieBases = [
    '__Host-authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ];

  static const csrfCookieNames = [
    '__Host-authjs.csrf-token',
    '__Secure-authjs.csrf-token',
    'authjs.csrf-token',
    '__Host-next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    'next-auth.csrf-token',
  ];

  void addFromSetCookieHeaders(Iterable<String>? headers) {
    if (headers == null) return;
    for (final header in headers) {
      addFromSetCookie(header);
    }
  }

  void addFromSetCookie(String header) {
    if (header.isEmpty) return;
    final part = header.split(';').first.trim();
    final eq = part.indexOf('=');
    if (eq <= 0) return;
    final name = part.substring(0, eq).trim();
    final value = part.substring(eq + 1);
    if (name.isEmpty) return;
    _cookies[name] = value;
  }

  String? get cookieHeader {
    if (_cookies.isEmpty) return null;
    return _cookies.entries.map((e) => '${e.key}=${e.value}').join('; ');
  }

  String? csrfTokenFromCookie() {
    for (final name in csrfCookieNames) {
      final raw = _cookies[name];
      if (raw == null || raw.isEmpty) continue;
      final decoded = _decode(raw);
      final pipe = decoded.indexOf('|');
      if (pipe <= 0) continue;
      final token = decoded.substring(0, pipe);
      if (token.isNotEmpty) return token;
    }
    return null;
  }

  AuthJsSessionCookie? sessionCookie() {
    for (final base in sessionCookieBases) {
      final direct = _cookies[base];
      if (direct != null && direct.isNotEmpty) {
        return AuthJsSessionCookie(name: base, value: _decode(direct));
      }
      final chunks = <int, String>{};
      final prefix = '$base.';
      for (final entry in _cookies.entries) {
        if (!entry.key.startsWith(prefix)) continue;
        final index = int.tryParse(entry.key.substring(prefix.length));
        if (index == null) continue;
        chunks[index] = entry.value;
      }
      if (chunks.isEmpty) continue;
      final keys = chunks.keys.toList()..sort();
      final combined = keys.map((key) => _decode(chunks[key]!)).join();
      if (combined.isNotEmpty) {
        return AuthJsSessionCookie(name: base, value: combined);
      }
    }
    return null;
  }

  String? sessionToken() => sessionCookie()?.value;

  static String _decode(String value) {
    try {
      return Uri.decodeComponent(value);
    } catch (_) {
      return value;
    }
  }
}

class AuthJsSessionCookie {
  const AuthJsSessionCookie({required this.name, required this.value});

  final String name;
  final String value;
}

dynamic tryDecodeJson(String? body) {
  if (body == null) return null;
  final trimmed = body.trim();
  if (trimmed.isEmpty) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
  try {
    return jsonDecode(trimmed);
  } catch (_) {
    return null;
  }
}

dynamic asJson(dynamic data) {
  if (data is Map || data is List) return data;
  if (data is String) return tryDecodeJson(data);
  if (data == null) return null;
  return tryDecodeJson(data.toString());
}

String? csrfTokenFromBody(dynamic body) {
  if (body is Map) {
    final raw = body['csrfToken'] ?? body['csrf_token'];
    if (raw == null) return null;
    final token = raw.toString().trim();
    if (token.isNotEmpty) return token;
  }
  return null;
}

bool isCredentialsSignInFailure(
  dynamic body,
  int? statusCode,
  String? location,
) {
  if (statusCode == 401 || statusCode == 403) return true;
  if (location != null &&
      location.toLowerCase().contains('error=credentialssignin')) {
    return true;
  }
  if (body is Map) {
    final error = body['error']?.toString().toLowerCase();
    if (error == 'credentialssignin' || error == 'credentials') return true;
    final url = body['url']?.toString().toLowerCase();
    if (url != null && url.contains('error=credentialssignin')) return true;
  }
  return false;
}
