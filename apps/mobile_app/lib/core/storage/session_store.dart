import 'package:smrkomed_doctor_app/core/storage/secure_store.dart';

class SessionTokens {
  const SessionTokens({required this.accessToken, this.cookieName});

  /// Auth.js encrypted session JWT (cookie value).
  final String accessToken;

  /// Cookie name Auth.js used as JWT salt. Forwarded to the API as Cookie.
  final String? cookieName;
}

abstract class SessionStore {
  Future<void> save(SessionTokens tokens, {bool persist = true});
  Future<SessionTokens?> read();
  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore(this._store);

  final SecureStore _store;
  String? _memoryToken;
  String? _memoryCookieName;

  @override
  Future<void> save(SessionTokens tokens, {bool persist = true}) async {
    _memoryToken = tokens.accessToken;
    _memoryCookieName = tokens.cookieName;
    if (persist) {
      await _store.write(
        key: SecureStoreKeys.sessionToken,
        value: tokens.accessToken,
      );
      if (tokens.cookieName != null && tokens.cookieName!.isNotEmpty) {
        await _store.write(
          key: SecureStoreKeys.sessionCookieName,
          value: tokens.cookieName!,
        );
      }
    } else {
      await _store.delete(SecureStoreKeys.sessionToken);
      await _store.delete(SecureStoreKeys.sessionCookieName);
    }
  }

  @override
  Future<SessionTokens?> read() async {
    final memory = _memoryToken;
    if (memory != null && memory.isNotEmpty) {
      return SessionTokens(accessToken: memory, cookieName: _memoryCookieName);
    }
    final token = await _store.read(SecureStoreKeys.sessionToken);
    if (token == null || token.isEmpty) return null;
    _memoryToken = token;
    _memoryCookieName = await _store.read(SecureStoreKeys.sessionCookieName);
    return SessionTokens(accessToken: token, cookieName: _memoryCookieName);
  }

  @override
  Future<void> clear() async {
    _memoryToken = null;
    _memoryCookieName = null;
    await _store.delete(SecureStoreKeys.sessionToken);
    await _store.delete(SecureStoreKeys.sessionCookieName);
  }
}
