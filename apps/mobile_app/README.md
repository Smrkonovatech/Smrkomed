# SMRKoMed Doctor Mobile App

Flutter client for authorized **doctor** accounts at Smrkonova Softech Solutions LLP.

This project lives in the existing SMRKoMed monorepo at `apps/mobile_app`. It consumes the **existing** web Auth.js session and Hono `/api/v1` APIs. It does not host its own backend.

Phase 1 is an engineering foundation: architecture, design tokens, routing, networking, auth session handling, security, tests. Final Figma screens are **not** implemented here.

## Architecture

```text
UI
 → Riverpod controller / notifier
 → Repository
 → Data source
 → Dio API client
 → Existing Railway Hono API (`/api/v1`)
     and Auth.js on the clinic web app (`/api/auth/*`)
```

```text
lib/
  core/           config, errors, network, routing, security, storage, theme, widgets
  features/       authentication + empty feature folders for later phases
  l10n/           English ARB (Hindi/Kannada/Malayalam/Tamil/Telugu later)
  app.dart
  main.dart
```

Presentation, state, domain, and data access are separated. HTTP does not live in widgets.

## State management

**Riverpod** (`flutter_riverpod`) is the only state-management library.

Why: the app will grow across auth, appointments, patients, inbox, care loop, and connectivity. Riverpod gives testable dependency overrides, no `BuildContext` for reads, and a single pattern for controllers and services.

How to use it later:

- `Notifier` / `AsyncNotifier` per feature
- repositories via `Provider`
- override providers in tests
- do not add Bloc, GetX, or `setState` stores for shared app state

## API architecture

Confirmed Hono envelope:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "...", "message": "...", "requestId": "..." } }
```

Authenticated Hono calls send `Authorization: Bearer <Auth.js session JWT>`. The API also accepts cookies `authjs.session-token` / `__Secure-authjs.session-token`. Tenant fields (`userId`, `organizationId`, `clinicId`, `role`) come from the JWT only.

`ApiClient` supports GET, POST, PUT, PATCH, DELETE, timeouts, mapping of 401/403/422/5xx, and **GET-only** retries.

Do not invent endpoints. Confirmed paths live in `lib/core/constants/api_paths.dart`.

## Environment configuration

Never hardcode production hosts in widgets. Never copy backend `.env` secrets into this app. The mobile app must **not** contain `AUTH_SECRET`, database URLs, or API keys.

A physical phone cannot reach `localhost`. Unprefixed `flutter run` / Xcode Run therefore default to production:

| Flavor | Default API | Default web auth |
|--------|-------------|------------------|
| production (default) | `https://smrkomed-api-production.up.railway.app` | `https://www.smrkomed.com` |
| development | `http://localhost:4000` | `http://localhost:3000` |
| staging | same as production | same as production |

Local web/API stack:

```sh
flutter run --dart-define=APP_ENV=development \
  --dart-define=API_BASE_URL=http://localhost:4000 \
  --dart-define=WEB_AUTH_BASE_URL=http://localhost:3000
```

Or copy `config/env.*.json.example` to a gitignored `*.local.json` and pass `--dart-define-from-file=config/env.development.local.json`.

## Authentication architecture

Login is **not** implemented on `apps/api`. Staff sign-in is Auth.js Credentials on `apps/web`:

1. `GET /api/auth/csrf`
2. `POST /api/auth/callback/credentials` (email + password + csrf)
3. Session JWT cookie
4. `GET /api/v1/users/me` with Bearer token
5. Allow only `role === DOCTOR` and `isActive`
6. Store JWT in Keychain / Android encrypted storage

Launch: splash → restore token → `users/me` → doctor check → app, or login.

There is **no refresh-token API**. Session lifetime follows Auth.js JWT (API encoder uses 30 days for test tokens). 401 clears the local session and redirects to login.

Forgot password: **no backend route exists**. The screen explains that reset must be handled by a clinic administrator on web until an API is added.

Biometric unlock confirms the device user; it does not replace server authorization.

## Secure storage

`flutter_secure_storage`: iOS Keychain (`first_unlock_this_device`), Android EncryptedSharedPreferences.

Never store passwords. Never log tokens or clinical data.

## Routing

`go_router` with auth redirects:

Public: splash, login, forgot password  
Authenticated shell: Home, Schedule, Patients, Inbox, More  
Reports is available under More.
Also: Notifications, Profile, Settings, Availability  

Deep-link scheme foundation: `smrkomed://` (iOS URL types + Android intent filter). HTTPS app links are not registered until the production domain is confirmed.

Shell tabs are a structural stand-in until Figma specifies exact bottom navigation.

## Design-system foundation

`lib/core/theme/app_tokens.dart` centralizes color, type, space, radius, elevation, icon sizes, animation durations, and control heights. Values are **temporary** until Figma tokens arrive — change tokens, not screens.

Reusable widgets: primary/secondary buttons, text field, card, badge, chip, app bar, bottom sheet, dialogs, loading, skeleton, empty, error, confirm.

## Testing

```sh
cd apps/mobile_app
flutter analyze
flutter test
```

Integration tests: `integration_test/app_test.dart` (`flutter test integration_test`).

## iOS

- Bundle id: `com.smrkonova.smrkomedDoctorApp`
- Face ID usage string is present (prompted only when biometric unlock runs)
- Keychain via secure storage
- Localhost ATS exception for development HTTP
- Deep link scheme `smrkomed`
- Camera, microphone, photos, and push are **not** requested yet

Open `ios/Runner.xcworkspace` in Xcode. Set a development team before device builds.

## Android

- Application id: `com.smrkonova.smrkomed_doctor_app`
- `minSdk` 24
- `MainActivity` extends `FlutterFragmentActivity` (biometrics)
- `INTERNET` in main manifest; cleartext allowed in **debug** for localhost
- `USE_BIOMETRIC`
- Deep link scheme `smrkomed`
- Camera / mic / notifications runtime permissions are not requested at first launch

Release signing: add a local `android/key.properties` (gitignored) when you are ready to ship.

## Development conventions

- Dart null safety
- Feature folders: `presentation` / `domain` / `data`
- User-visible copy through l10n ARB files
- No secrets in source
- No fake production APIs
- Privacy-safe `AppLogger` only

## Backend dependencies

| Need | Source |
|------|--------|
| Login | `apps/web` Auth.js |
| Session user | `GET /api/v1/users/me` |
| Appointments, patients, documents, care loop, WhatsApp inbox | Hono `/api/v1/...` |
| Realtime inbox | `GET /api/v1/realtime/events` SSE |
| AI / voice | Next.js `/api/ai/*`, `/api/voice/*` (not Hono) |

## Known missing information

- Exact Figma tokens and final navigation chrome
- Confirmed staging/production API and web auth hosts
- Whether Auth.js credentials callback returns a session cookie to a native client in production (needs a live handshake test). If not, the backend will need an explicit mobile token endpoint — **do not invent one in the app**
- Password reset API (does not exist)
- Push notification provider (FCM/APNs) — in-app `/notifications` on web is currently empty UI
- Dedicated doctor-app CORS origin (Hono CORS is origin-based; native clients typically send no Origin)
- Whether `CLINIC_ADMIN` who also practices should be allowed (Phase 1 allows **DOCTOR only**)

## Packages

| Package | Purpose | Why |
|---------|---------|-----|
| flutter_riverpod | State + DI | Single scalable pattern |
| go_router | Routes, guards, deep links | Production navigation |
| dio | HTTP + interceptors | Timeouts, auth header, retries |
| flutter_secure_storage | Keychain / encrypted prefs | Session JWT only |
| local_auth | Biometric unlock | Session unlock, not login |
| connectivity_plus | Online/offline | Later offline-aware UX |
| flutter_localizations | i18n | English now, more languages later |
