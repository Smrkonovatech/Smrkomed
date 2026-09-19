import 'package:local_auth/local_auth.dart';
import 'package:smrkomed_doctor_app/core/security/biometric_service.dart';

class LocalAuthBiometricService implements BiometricService {
  LocalAuthBiometricService({LocalAuthentication? auth})
    : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  @override
  Future<BiometricAvailability> availability() async {
    final canCheck =
        await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
    final types = await _auth.getAvailableBiometrics();
    return BiometricAvailability(
      canCheck: canCheck,
      kinds: types.map(_map).toList(),
    );
  }

  @override
  Future<bool> authenticate({required String localizedReason}) {
    return _auth.authenticate(
      localizedReason: localizedReason,
      options: const AuthenticationOptions(
        biometricOnly: true,
        stickyAuth: true,
        useErrorDialogs: true,
      ),
    );
  }

  BiometricKind _map(BiometricType type) {
    return switch (type) {
      BiometricType.face => BiometricKind.face,
      BiometricType.fingerprint => BiometricKind.fingerprint,
      BiometricType.iris => BiometricKind.iris,
      BiometricType.strong || BiometricType.weak => BiometricKind.unknown,
    };
  }
}
