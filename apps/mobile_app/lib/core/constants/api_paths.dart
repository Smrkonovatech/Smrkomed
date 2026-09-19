/// Confirmed paths from `apps/api` and `apps/web`. Do not invent new routes here.
abstract final class ApiPaths {
  static const health = '/health';
  static const usersMe = '/users/me';
  static const usersStaff = '/users/staff';
  static const clinicsCurrent = '/clinics/current';
  static const organizationsCurrent = '/organizations/current';
  static const patients = '/patients';
  static const couples = '/couples';
  static const appointments = '/appointments';
  static const documents = '/documents';
  static const carePlans = '/care-plans';
  static const careTasks = '/care-tasks';
  static const careLoop = '/care-loop';
  static const careLoopAnalytics = '/care-loop/analytics';
  static const careLoopExceptions = '/care-loop/exceptions';
  static const activity = '/activity';
  static const analyticsSummary = '/analytics/summary';
  static const whatsappInbox = '/whatsapp-automation/inbox';
  static const realtimeEvents = '/realtime/events';
}

/// Auth.js routes hosted by `apps/web`, not the Hono API.
abstract final class WebAuthPaths {
  static const csrf = '/api/auth/csrf';
  static const credentialsCallback = '/api/auth/callback/credentials';
  static const credentialsSignIn = '/api/auth/signin/credentials';
  static const session = '/api/auth/session';
  static const signOut = '/api/auth/signout';
  static const me = '/api/auth/me';
}

/// Web-only AI/voice routes. Not mounted on Hono `/api/v1`.
abstract final class WebAiPaths {
  static const chat = '/api/ai/chat';
  static const action = '/api/ai/action';
  static const transcribe = '/api/voice/transcribe';
  static const summarize = '/api/voice/summarize';
  static const notes = '/api/voice/notes';
}
