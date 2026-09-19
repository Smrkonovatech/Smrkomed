import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/constants/staff_role.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_envelope.dart';
import 'package:smrkomed_doctor_app/core/network/safe_http_failure.dart';
import 'package:smrkomed_doctor_app/core/storage/secure_store.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';

void main() {
  test('unprefixed builds default to documented production hosts', () {
    final config = AppConfig.fromEnvironment();
    expect(config.environment, AppEnvironment.production);
    expect(config.apiBaseUrl, AppConfig.documentedProductionApiBaseUrl);
    expect(config.webAuthBaseUrl, AppConfig.documentedProductionWebAuthBaseUrl);
  });

  test('production Auth.js hosts skip the TLS-broken app subdomain', () {
    final config = AppConfig.fromEnvironment();
    expect(
      AppConfig.webAuthOrigins(config),
      containsAll(['https://www.smrkomed.com', 'https://smrkomed.vercel.app']),
    );
    expect(
      AppConfig.webAuthOrigins(config),
      isNot(contains('https://app.smrkomed.com')),
    );
    final forcedBroken = AppConfig(
      environment: AppEnvironment.production,
      apiBaseUrl: AppConfig.documentedProductionApiBaseUrl,
      webAuthBaseUrl: 'https://app.smrkomed.com',
      deepLinkScheme: 'smrkomed',
    );
    expect(
      AppConfig.webAuthOrigins(forcedBroken).first,
      'https://app.smrkomed.com',
    );
    expect(
      AppConfig.webAuthOrigins(forcedBroken),
      containsAll(['https://www.smrkomed.com', 'https://smrkomed.vercel.app']),
    );
    final local = AppConfig(
      environment: AppEnvironment.development,
      apiBaseUrl: 'http://localhost:4000',
      webAuthBaseUrl: 'http://localhost:3000',
      deepLinkScheme: 'smrkomed',
    );
    expect(AppConfig.webAuthOrigins(local), ['http://localhost:3000']);
  });

  test('only DOCTOR role is authorized for the mobile app', () {
    expect(DoctorAccessPolicy.isAuthorizedDoctor(StaffRole.doctor), isTrue);
    expect(
      DoctorAccessPolicy.isAuthorizedDoctor(StaffRole.clinicAdmin),
      isFalse,
    );
    expect(
      DoctorAccessPolicy.isAuthorizedDoctor(StaffRole.careCoordinator),
      isFalse,
    );
    expect(StaffRole.tryParse('DOCTOR'), StaffRole.doctor);
  });

  test('HTTP statuses map to structured errors without leaking internals', () {
    expect(
      AppException.fromHttpStatus(statusCode: 401).kind,
      AppErrorKind.unauthorized,
    );
    expect(
      AppException.fromHttpStatus(statusCode: 403).kind,
      AppErrorKind.forbidden,
    );
    expect(
      AppException.fromHttpStatus(statusCode: 422).kind,
      AppErrorKind.validation,
    );
    expect(
      AppException.fromHttpStatus(statusCode: 500).kind,
      AppErrorKind.serverFailure,
    );
    final connection = mapDioException(
      DioException.connectionError(
        requestOptions: RequestOptions(path: '/api/auth/csrf'),
        reason: 'Connection refused',
      ),
    );
    expect(connection.kind, AppErrorKind.networkUnavailable);
    final handshake = mapDioException(
      DioException(
        requestOptions: RequestOptions(
          path: '/api/auth/csrf',
          baseUrl: 'https://app.smrkomed.com',
        ),
        type: DioExceptionType.unknown,
        error: const HandshakeException(
          'Connection terminated during handshake',
        ),
        message:
            'The connection errored: Connection terminated during handshake',
      ),
    );
    expect(handshake.kind, AppErrorKind.networkUnavailable);
    final failure = SafeHttpFailure.fromDio(
      DioException(
        requestOptions: RequestOptions(
          path: '/api/auth/csrf',
          baseUrl: 'https://app.smrkomed.com',
        ),
        type: DioExceptionType.unknown,
        error: const HandshakeException(
          'Connection terminated during handshake',
        ),
      ),
    );
    expect(failure.isTls, isTrue);
    expect(failure.statusCode, isNull);
    expect(failure.innerType, 'HandshakeException');
    expect(failure.path, '/api/auth/csrf');
    expect(failure.safeError.toLowerCase().contains('password'), isFalse);
    final leaked = AppException.fromHttpStatus(
      statusCode: 500,
      message: 'password hash mismatch token=abc',
    );
    expect(leaked.message.contains('token'), isFalse);
    expect(leaked.message.contains('password'), isFalse);
  });

  test('API envelope parses Hono success and fail bodies', () {
    final ok = ApiEnvelope.parse({
      'success': true,
      'data': {'id': '1'},
    });
    expect(ok.success, isTrue);
    expect((ok.data as Map)['id'], '1');

    final fail = ApiEnvelope.parse({
      'success': false,
      'error': {'code': 'FORBIDDEN', 'message': 'No access', 'requestId': 'r1'},
    });
    expect(fail.success, isFalse);
    expect(fail.errorCode, 'FORBIDDEN');
    expect(fail.requestId, 'r1');
  });

  test('privacy filter redacts tokens and sensitive keys', () {
    final scrubbed = PrivacyLogFilter.scrub({
      'path': '/users/me',
      'token': 'super-secret',
      'authorization': 'Bearer abc',
      'patientName': 'Ada',
    });
    expect(scrubbed['path'], '/users/me');
    expect(scrubbed['token'], '[REDACTED]');
    expect(scrubbed['authorization'], '[REDACTED]');
    expect(scrubbed['patientName'], '[REDACTED]');
  });

  test('in-memory secure store round-trips a session token', () async {
    final store = InMemorySecureStore();
    final sessions = SecureSessionStore(store);
    await sessions.save(
      const SessionTokens(accessToken: 'jwt-value'),
      persist: false,
    );
    expect((await sessions.read())?.accessToken, 'jwt-value');
    expect(await store.read(SecureStoreKeys.sessionToken), isNull);
    await sessions.save(
      const SessionTokens(accessToken: 'jwt-value'),
      persist: true,
    );
    expect(await store.read(SecureStoreKeys.sessionToken), 'jwt-value');
    await sessions.clear();
    expect(await sessions.read(), isNull);
  });
}
