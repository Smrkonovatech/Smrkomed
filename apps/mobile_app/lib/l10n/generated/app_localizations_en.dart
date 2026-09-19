// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'SMRKoMed Doctor';

  @override
  String get splashByline => 'By Smrkonova';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get loginSubtitle => 'Use your authorized doctor account.';

  @override
  String get welcomeBack => 'Welcome Back!';

  @override
  String get loginTagline => 'Focus on care. We’ll organize the rest.';

  @override
  String get emailHint => 'Enter your email';

  @override
  String get passwordHint => 'Enter your password';

  @override
  String get loginAction => 'Login';

  @override
  String get rememberForThirtyDays => 'Remember for 30 days';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get loginHeroSemantic => 'Doctor';

  @override
  String get emailLabel => 'Email';

  @override
  String get passwordLabel => 'Password';

  @override
  String get signInAction => 'Sign in';

  @override
  String get forgotPasswordAction => 'Forgot password';

  @override
  String get forgotPasswordTitle => 'Forgot password';

  @override
  String get forgotPasswordUnavailable =>
      'Password reset is not available from this app yet. Ask your clinic administrator to reset access from the web application.';

  @override
  String get logoutAction => 'Sign out';

  @override
  String get biometricUnlockTitle => 'Unlock';

  @override
  String get biometricUnlockMessage => 'Confirm it is you to continue.';

  @override
  String get usePasswordInstead => 'Use password instead';

  @override
  String get sessionExpired => 'Your session expired. Please sign in again.';

  @override
  String get unauthorizedRole =>
      'This app is only for authorized doctor accounts.';

  @override
  String get networkUnavailable => 'You appear to be offline.';

  @override
  String get requestTimeout => 'The request took too long. Try again.';

  @override
  String get serverFailure => 'Something went wrong. Please try again.';

  @override
  String get unknownFailure => 'An unexpected error occurred.';

  @override
  String get forbidden => 'You do not have access to this action.';

  @override
  String get validationError => 'Please check the highlighted fields.';

  @override
  String get emptyTitle => 'Nothing here yet';

  @override
  String get emptyBody =>
      'This screen will be implemented from the approved designs.';

  @override
  String get retryAction => 'Try again';

  @override
  String get cancelAction => 'Cancel';

  @override
  String get confirmAction => 'Confirm';

  @override
  String get loadingLabel => 'Loading';

  @override
  String get navHome => 'Home';

  @override
  String get navSchedule => 'Schedule';

  @override
  String get navPatients => 'Patients';

  @override
  String get navReports => 'Reports';

  @override
  String get navInbox => 'Inbox';

  @override
  String get navNotifications => 'Notifications';

  @override
  String get navMore => 'More';

  @override
  String get navProfile => 'Profile';

  @override
  String get navSettings => 'Settings';

  @override
  String get navAvailability => 'Availability';

  @override
  String get foundationPlaceholder =>
      'Foundation placeholder. Final UI will follow approved Figma.';
}
