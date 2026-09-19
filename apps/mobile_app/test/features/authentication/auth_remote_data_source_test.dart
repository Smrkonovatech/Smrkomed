import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smrkomed_doctor_app/core/config/app_config.dart';
import 'package:smrkomed_doctor_app/core/constants/api_paths.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';
import 'package:smrkomed_doctor_app/core/logging/app_logger.dart';
import 'package:smrkomed_doctor_app/core/network/api_client.dart';
import 'package:smrkomed_doctor_app/core/storage/secure_store.dart';
import 'package:smrkomed_doctor_app/core/storage/session_store.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_js_cookies.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_js_http_client.dart';
import 'package:smrkomed_doctor_app/features/authentication/data/auth_remote_data_source.dart';

void main() {
  bool handleDemoSetup(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    if (!options.path.contains('/api/demo/setup')) return false;
    handler.resolve(
      Response<dynamic>(
        requestOptions: options,
        statusCode: 200,
        data: '{"success":true}',
      ),
    );
    return true;
  }

  test('combines chunked Auth.js session cookies', () {
    final jar = AuthJsCookieJar();
    jar.addFromSetCookie(
      '__Secure-authjs.session-token.0=aaa; Path=/; HttpOnly',
    );
    jar.addFromSetCookie('__Secure-authjs.session-token.1=bbb; Path=/; Secure');
    expect(jar.sessionToken(), 'aaabbb');
    expect(jar.sessionCookie()?.name, '__Secure-authjs.session-token');
  });

  test('reads csrf token from cookie when JSON body is missing', () {
    final jar = AuthJsCookieJar();
    jar.addFromSetCookie('authjs.csrf-token=csrf-value%7Chash; Path=/');
    expect(jar.csrfTokenFromCookie(), 'csrf-value');
  });

  test('Auth.js 302 HTML login still extracts the session cookie', () async {
    const config = AppConfig(
      environment: AppEnvironment.production,
      apiBaseUrl: 'https://example-api.test',
      webAuthBaseUrl: 'https://example-web.test',
      deepLinkScheme: 'smrkomed',
    );
    final webDio = Dio(
      BaseOptions(
        baseUrl: config.webAuthOrigin,
        responseType: ResponseType.plain,
        followRedirects: false,
        validateStatus: (_) => true,
      ),
    );
    webDio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (handleDemoSetup(options, handler)) return;
          if (options.path.contains(WebAuthPaths.csrf)) {
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: '{"csrfToken":"csrf-token"}',
                headers: Headers.fromMap({
                  'set-cookie': ['authjs.csrf-token=csrf-token|hash; Path=/'],
                }),
              ),
            );
            return;
          }
          if (options.path.contains(WebAuthPaths.credentialsCallback)) {
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                statusCode: 302,
                data: '<html>redirect</html>',
                headers: Headers.fromMap({
                  'location': ['https://example-web.test/home'],
                  'set-cookie': [
                    '__Secure-authjs.session-token=session.jwt.value; Path=/; HttpOnly; Secure',
                  ],
                }),
              ),
            );
            return;
          }
          handler.reject(
            DioException(
              requestOptions: options,
              message: 'unexpected path ${options.path}',
            ),
          );
        },
      ),
    );

    final remote = AuthRemoteDataSource(
      config: config,
      apiClient: ApiClient(
        config: config,
        sessionStore: SecureSessionStore(InMemorySecureStore()),
        logger: const AppLogger(enableDebug: false),
        dio: Dio(),
      ),
      logger: const AppLogger(enableDebug: false),
      webDio: webDio,
    );

    final token = await remote.loginAndReadSessionToken(
      email: 'ananya@abcfertility.demo',
      password: 'Demo@12345',
    );
    expect(token.value, 'session.jwt.value');
    expect(token.name, '__Secure-authjs.session-token');
  });

  test(
    'decoded JSON Map csrf body is used when Set-Cookie is hidden',
    () async {
      const config = AppConfig(
        environment: AppEnvironment.production,
        apiBaseUrl: 'https://example-api.test',
        webAuthBaseUrl: 'https://example-web.test',
        deepLinkScheme: 'smrkomed',
      );
      final webDio = Dio(
        BaseOptions(baseUrl: config.webAuthOrigin, validateStatus: (_) => true),
      );
      webDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (handleDemoSetup(options, handler)) return;
            if (options.path.contains(WebAuthPaths.csrf)) {
              handler.resolve(
                Response<dynamic>(
                  requestOptions: options,
                  statusCode: 200,
                  data: {'csrfToken': 'csrf-from-map'},
                ),
              );
              return;
            }
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: {'url': 'https://example-web.test/home'},
                headers: Headers.fromMap({
                  'set-cookie': [
                    'authjs.session-token=session.from.map; Path=/; HttpOnly',
                  ],
                }),
              ),
            );
          },
        ),
      );
      final remote = AuthRemoteDataSource(
        config: config,
        apiClient: ApiClient(
          config: config,
          sessionStore: SecureSessionStore(InMemorySecureStore()),
          logger: const AppLogger(enableDebug: false),
          dio: Dio(),
        ),
        logger: const AppLogger(enableDebug: false),
        webDio: webDio,
      );
      final token = await remote.loginAndReadSessionToken(
        email: 'ananya@abcfertility.demo',
        password: 'Demo@12345',
      );
      expect(token.value, 'session.from.map');
      expect(token.name, 'authjs.session-token');
    },
  );

  test('CredentialsSignin is mapped to invalid email or password', () async {
    const config = AppConfig(
      environment: AppEnvironment.production,
      apiBaseUrl: 'https://example-api.test',
      webAuthBaseUrl: 'https://example-web.test',
      deepLinkScheme: 'smrkomed',
    );
    final webDio = Dio(
      BaseOptions(baseUrl: config.webAuthOrigin, validateStatus: (_) => true),
    );
    webDio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (handleDemoSetup(options, handler)) return;
          if (options.path.contains(WebAuthPaths.csrf)) {
            handler.resolve(
              Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: '{"csrfToken":"csrf-token"}',
              ),
            );
            return;
          }
          handler.resolve(
            Response<dynamic>(
              requestOptions: options,
              statusCode: 200,
              data:
                  '{"url":"https://example-web.test/login?error=CredentialsSignin"}',
            ),
          );
        },
      ),
    );

    final remote = AuthRemoteDataSource(
      config: config,
      apiClient: ApiClient(
        config: config,
        sessionStore: SecureSessionStore(InMemorySecureStore()),
        logger: const AppLogger(enableDebug: false),
        dio: Dio(),
      ),
      logger: const AppLogger(enableDebug: false),
      webDio: webDio,
    );

    expect(
      () => remote.loginAndReadSessionToken(
        email: 'ananya@abcfertility.demo',
        password: 'wrong',
      ),
      throwsA(
        isA<AppException>().having(
          (error) => error.message,
          'message',
          'Invalid email or password.',
        ),
      ),
    );
  });

  test('unreachable Auth.js maps to a sign-in service error', () async {
    const config = AppConfig(
      environment: AppEnvironment.production,
      apiBaseUrl: AppConfig.documentedProductionApiBaseUrl,
      webAuthBaseUrl: AppConfig.documentedProductionWebAuthBaseUrl,
      deepLinkScheme: 'smrkomed',
    );
    final webDio = Dio(
      BaseOptions(baseUrl: config.webAuthOrigin, validateStatus: (_) => true),
    );
    webDio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException.connectionError(
              requestOptions: options,
              reason: 'Connection refused',
            ),
          );
        },
      ),
    );
    final remote = AuthRemoteDataSource(
      config: config,
      apiClient: ApiClient(
        config: config,
        sessionStore: SecureSessionStore(InMemorySecureStore()),
        logger: const AppLogger(enableDebug: false),
        dio: Dio(),
      ),
      logger: const AppLogger(enableDebug: false),
      webDio: webDio,
    );

    expect(
      () => remote.loginAndReadSessionToken(
        email: 'ananya@abcfertility.demo',
        password: 'Demo@12345',
      ),
      throwsA(
        isA<AppException>().having(
          (error) => error.message,
          'message',
          'Unable to reach sign-in service',
        ),
      ),
    );
  });

  test('TLS handshake failure is a sign-in reachability error', () async {
    const config = AppConfig(
      environment: AppEnvironment.production,
      apiBaseUrl: AppConfig.documentedProductionApiBaseUrl,
      webAuthBaseUrl: AppConfig.documentedProductionWebAuthBaseUrl,
      deepLinkScheme: 'smrkomed',
    );
    final webDio = Dio(
      BaseOptions(baseUrl: config.webAuthOrigin, validateStatus: (_) => true),
    );
    webDio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.unknown,
              error: const HandshakeException(
                'Connection terminated during handshake',
              ),
              message:
                  'The connection errored: Connection terminated during handshake',
            ),
          );
        },
      ),
    );
    final remote = AuthRemoteDataSource(
      config: config,
      apiClient: ApiClient(
        config: config,
        sessionStore: SecureSessionStore(InMemorySecureStore()),
        logger: const AppLogger(enableDebug: false),
        dio: Dio(),
      ),
      logger: const AppLogger(enableDebug: false),
      webDio: webDio,
    );
    expect(
      () => remote.loginAndReadSessionToken(
        email: 'ananya@abcfertility.demo',
        password: 'Demo@12345',
      ),
      throwsA(
        isA<AppException>().having(
          (error) => error.message,
          'message',
          'Unable to reach sign-in service',
        ),
      ),
    );
  });

  test('retries credentials once after timeout when demo setup hung', () async {
    const config = AppConfig(
      environment: AppEnvironment.production,
      apiBaseUrl: 'https://example-api.test',
      webAuthBaseUrl: 'https://example-web.test',
      deepLinkScheme: 'smrkomed',
    );
    final transport = _ScriptedWebTransport(
      credentialResults: [
        TimeoutException('credentials'),
        const AuthHttpExchange(
          statusCode: 302,
          data: '<html>redirect</html>',
          setCookie: [
            '__Secure-authjs.session-token=session.after.retry; Path=/; HttpOnly; Secure',
          ],
          location: 'https://example-web.test/home',
        ),
      ],
    );
    final remote = AuthRemoteDataSource(
      config: config,
      apiClient: ApiClient(
        config: config,
        sessionStore: SecureSessionStore(InMemorySecureStore()),
        logger: const AppLogger(enableDebug: false),
        dio: Dio(),
      ),
      logger: const AppLogger(enableDebug: false),
      transport: transport,
    );

    final token = await remote.loginAndReadSessionToken(
      email: 'ananya@abcfertility.demo',
      password: 'Demo@12345',
    );
    expect(token.value, 'session.after.retry');
    expect(transport.credentialPosts, 2);
  });
}

class _ScriptedWebTransport implements AuthWebTransport {
  _ScriptedWebTransport({required this.credentialResults});

  final List<Object> credentialResults;
  var credentialPosts = 0;

  @override
  Future<AuthHttpExchange> get(
    String path, {
    bool followRedirects = true,
    Duration? timeout,
  }) async {
    return const AuthHttpExchange(
      statusCode: 200,
      data: '{"csrfToken":"csrf-token"}',
      setCookie: ['authjs.csrf-token=csrf-token|hash; Path=/'],
    );
  }

  @override
  Future<AuthHttpExchange> postForm(
    String path, {
    required Map<String, String> fields,
    String? cookieHeader,
    bool followRedirects = false,
    Duration? timeout,
  }) async {
    if (path.contains('/api/demo/setup')) {
      throw TimeoutException('demo setup');
    }
    final result = credentialResults[credentialPosts++];
    if (result is AuthHttpExchange) return result;
    Error.throwWithStackTrace(result, StackTrace.current);
  }
}
