/// Runtime flavor. Values are compile-time `--dart-define=APP_ENV=...`.
enum AppEnvironment {
  development,
  staging,
  production;

  static AppEnvironment parse(String raw) {
    switch (raw.trim().toLowerCase()) {
      case 'staging':
        return AppEnvironment.staging;
      case 'development':
      case 'dev':
        return AppEnvironment.development;
      case 'production':
      case '':
        return AppEnvironment.production;
      default:
        return AppEnvironment.production;
    }
  }

  bool get isProduction => this == AppEnvironment.production;
}

/// Hosts and timeouts. No secrets. Defaults are the documented public production
/// hosts so a physical device works without `--dart-define`. Pass localhost
/// URLs only when you are running `apps/web` and `apps/api` on this machine.
class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.webAuthBaseUrl,
    required this.deepLinkScheme,
    this.defaultClinicId = 'kochi',
    this.connectTimeout = const Duration(seconds: 15),
    this.receiveTimeout = const Duration(seconds: 20),
    this.sendTimeout = const Duration(seconds: 20),
  });

  final AppEnvironment environment;
  final String apiBaseUrl;
  final String webAuthBaseUrl;
  final String deepLinkScheme;
  final String defaultClinicId;
  final Duration connectTimeout;
  final Duration receiveTimeout;
  final Duration sendTimeout;

  /// Hono API lives at `{apiBaseUrl}/api/v1`.
  String get apiV1BaseUrl => '${_trimSlash(apiBaseUrl)}/api/v1';

  String get webAuthOrigin => _trimSlash(webAuthBaseUrl);

  /// Public production hosts already documented in this monorepo. Not secrets.
  ///
  /// Auth.js lives on the Vercel web app. `app.smrkomed.com` currently fails TLS
  /// from some networks (handshake EOF). `www.smrkomed.com` and the Vercel
  /// alias serve the same Auth.js deployment and complete TLS.
  static const documentedProductionApiBaseUrl =
      'https://smrkomed-api-production.up.railway.app';
  static const documentedProductionWebAuthBaseUrl = 'https://www.smrkomed.com';
  static const documentedProductionWebAuthFallbackBaseUrls = [
    'https://www.smrkomed.com',
    'https://smrkomed.vercel.app',
  ];

  /// Hosts to try for Auth.js. Local development stays on the configured origin.
  static List<String> webAuthOrigins(AppConfig config) {
    final primary = _trimSlash(config.webAuthBaseUrl);
    final origins = <String>[primary];
    final isLoopback =
        primary.contains('localhost') || primary.contains('127.0.0.1');
    if (isLoopback || config.environment == AppEnvironment.development) {
      return origins;
    }
    for (final raw in documentedProductionWebAuthFallbackBaseUrls) {
      final origin = _trimSlash(raw);
      if (!origins.contains(origin)) origins.add(origin);
    }
    return origins;
  }

  factory AppConfig.fromEnvironment() {
    const envName = String.fromEnvironment(
      'APP_ENV',
      defaultValue: 'production',
    );
    const api = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    const web = String.fromEnvironment('WEB_AUTH_BASE_URL', defaultValue: '');
    const scheme = String.fromEnvironment(
      'DEEP_LINK_SCHEME',
      defaultValue: 'smrkomed',
    );
    const clinic = String.fromEnvironment(
      'CLINIC_ID',
      defaultValue: 'kochi',
    );
    final environment = AppEnvironment.parse(envName);
    return AppConfig(
      environment: environment,
      apiBaseUrl: api.isEmpty ? _defaultApi(environment) : api,
      webAuthBaseUrl: web.isEmpty ? _defaultWeb(environment) : web,
      deepLinkScheme: scheme.isEmpty ? 'smrkomed' : scheme,
      defaultClinicId: clinic.isEmpty ? 'kochi' : clinic,
    );
  }

  static String _defaultApi(AppEnvironment environment) {
    return switch (environment) {
      AppEnvironment.development => 'http://localhost:4000',
      AppEnvironment.staging => documentedProductionApiBaseUrl,
      AppEnvironment.production => documentedProductionApiBaseUrl,
    };
  }

  static String _defaultWeb(AppEnvironment environment) {
    return switch (environment) {
      AppEnvironment.development => 'http://localhost:3000',
      AppEnvironment.staging => documentedProductionWebAuthBaseUrl,
      AppEnvironment.production => documentedProductionWebAuthBaseUrl,
    };
  }

  static String _trimSlash(String value) {
    if (value.endsWith('/')) {
      return value.substring(0, value.length - 1);
    }
    return value;
  }
}
