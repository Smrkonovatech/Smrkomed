enum BiometricKind { face, fingerprint, iris, unknown }

class BiometricAvailability {
  const BiometricAvailability({required this.canCheck, required this.kinds});

  final bool canCheck;
  final List<BiometricKind> kinds;

  bool get isSupported => canCheck && kinds.isNotEmpty;
}

abstract class BiometricService {
  Future<BiometricAvailability> availability();

  /// Unlocks a locally stored session. Does not authenticate with the server.
  Future<bool> authenticate({required String localizedReason});
}

class UnsupportedBiometricService implements BiometricService {
  const UnsupportedBiometricService();

  @override
  Future<BiometricAvailability> availability() async {
    return const BiometricAvailability(canCheck: false, kinds: []);
  }

  @override
  Future<bool> authenticate({required String localizedReason}) async => false;
}
