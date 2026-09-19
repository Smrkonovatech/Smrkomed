abstract final class SecureStoreKeys {
  static const sessionToken = 'session_token';
  static const sessionCookieName = 'session_cookie_name';
  static const biometricUnlockEnabled = 'biometric_unlock_enabled';
  static const rememberForThirtyDays = 'remember_for_thirty_days';
  static const rememberedEmail = 'remembered_email';
}

/// Abstraction over iOS Keychain / Android encrypted storage.
abstract class SecureStore {
  Future<void> write({required String key, required String value});
  Future<String?> read(String key);
  Future<void> delete(String key);
  Future<void> deleteAll();
}

class InMemorySecureStore implements SecureStore {
  final Map<String, String> _values = {};

  @override
  Future<void> write({required String key, required String value}) async {
    _values[key] = value;
  }

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _values.clear();
  }
}
