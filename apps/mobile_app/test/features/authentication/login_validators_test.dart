import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/login_validators.dart';

void main() {
  group('email', () {
    test('rejects empty', () {
      expect(LoginValidators.email(''), isNotNull);
      expect(LoginValidators.email('   '), isNotNull);
    });

    test('rejects invalid', () {
      expect(LoginValidators.email('doctor'), isNotNull);
      expect(LoginValidators.email('not-an-email'), isNotNull);
      expect(LoginValidators.email('missing@domain'), isNotNull);
      expect(LoginValidators.email('@example.com'), isNotNull);
      expect(LoginValidators.email('doctor@'), isNotNull);
      expect(LoginValidators.email('doctor@@example.com'), isNotNull);
    });

    test('accepts production doctor address with .demo TLD', () {
      expect(LoginValidators.email('ananya@abcfertility.demo'), isNull);
    });

    test('accepts representative valid addresses across TLDs', () {
      expect(LoginValidators.email('doctor@example.com'), isNull);
      expect(LoginValidators.email('doctor@example.in'), isNull);
      expect(LoginValidators.email('doctor@example.co'), isNull);
      expect(LoginValidators.email('doctor@example.org'), isNull);
      expect(LoginValidators.email('doctor@example.net'), isNull);
      expect(LoginValidators.email('doctor@example.health'), isNull);
      expect(LoginValidators.email('doctor@clinic.example'), isNull);
    });
  });

  group('password', () {
    test('rejects empty to match backend min length of 1', () {
      expect(LoginValidators.password(''), isNotNull);
    });

    test('accepts any non-empty value', () {
      expect(LoginValidators.password('x'), isNull);
    });
  });
}
