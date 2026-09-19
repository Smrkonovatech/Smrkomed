import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smrkomed_doctor_app/core/constants/brand_assets.dart';
import 'package:smrkomed_doctor_app/core/routing/app_routes.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/authentication/domain/login_validators.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/auth_controller.dart';
import 'package:smrkomed_doctor_app/features/authentication/presentation/widgets/login_text_field.dart';
import 'package:smrkomed_doctor_app/l10n/generated/app_localizations.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  var _remember = false;
  var _obscurePassword = true;
  var _submitted = false;
  String? _emailError;
  String? _passwordError;

  @override
  void initState() {
    super.initState();
    _emailFocus.addListener(() => setState(() {}));
    _passwordFocus.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _restoreRememberedEmail(),
    );
  }

  Future<void> _restoreRememberedEmail() async {
    final pref = await ref
        .read(authControllerProvider.notifier)
        .loadRememberPreference();
    if (!mounted) return;
    setState(() {
      _remember = pref.remember;
      if (pref.email != null && pref.email!.isNotEmpty) {
        _email.text = pref.email!;
      }
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  bool get _fieldsFilled =>
      _email.text.trim().isNotEmpty && _password.text.isNotEmpty;

  void _revalidate() {
    if (!_submitted) return;
    setState(() {
      _emailError = LoginValidators.email(_email.text);
      _passwordError = LoginValidators.password(_password.text);
    });
  }

  Future<void> _submit() async {
    setState(() {
      _submitted = true;
      _emailError = LoginValidators.email(_email.text);
      _passwordError = LoginValidators.password(_password.text);
    });
    if (_emailError != null || _passwordError != null) return;
    await ref
        .read(authControllerProvider.notifier)
        .login(
          email: _email.text,
          password: _password.text,
          rememberForThirtyDays: _remember,
        );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final size = MediaQuery.sizeOf(context);
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final scaler = MediaQuery.textScalerOf(context).clamp(maxScaleFactor: 1.3);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: AppTokens.colorSurface,
        resizeToAvoidBottomInset: true,
        body: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: scaler),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: EdgeInsets.only(bottom: bottomInset),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Column(
                    children: [
                      _HeroHeader(
                        width: size.width,
                        height: size.height * AppTokens.loginHeroHeightFactor,
                        l10n: l10n,
                      ),
                      Transform.translate(
                        offset: const Offset(0, -AppTokens.space24),
                        child: _LoginCard(
                          l10n: l10n,
                          email: _email,
                          password: _password,
                          emailFocus: _emailFocus,
                          passwordFocus: _passwordFocus,
                          emailError: _emailError,
                          passwordError: _passwordError,
                          obscurePassword: _obscurePassword,
                          remember: _remember,
                          busy: auth.busy,
                          errorMessage: auth.errorMessage,
                          canSubmit: _fieldsFilled,
                          onEmailChanged: (_) {
                            setState(() {});
                            _revalidate();
                          },
                          onPasswordChanged: (_) {
                            setState(() {});
                            _revalidate();
                          },
                          onToggleObscure: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
                          onToggleRemember: (value) =>
                              setState(() => _remember = value),
                          onForgotPassword: () =>
                              context.push(AppRoutes.forgotPassword),
                          onSubmit: _submit,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _HeroHeader extends StatelessWidget {
  const _HeroHeader({
    required this.width,
    required this.height,
    required this.l10n,
  });

  final double width;
  final double height;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return SizedBox(
      width: width,
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppTokens.colorLoginGradientTop,
                  AppTokens.colorLoginGradientMid,
                  AppTokens.colorLoginGradientBottom,
                ],
              ),
            ),
          ),
          Positioned(
            top: top + AppTokens.space48 + AppTokens.space24,
            left: 0,
            right: 0,
            bottom: 0,
            child: Image.asset(
              BrandAssets.loginHeroDoctor,
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
              filterQuality: FilterQuality.high,
              semanticLabel: l10n.loginHeroSemantic,
            ),
          ),
          Positioned(
            top: top + AppTokens.space12,
            left: AppTokens.space24,
            right: AppTokens.space24,
            child: Column(
              children: [
                Text(
                  l10n.welcomeBack,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: AppTokens.fontSizeXl,
                    fontWeight: AppTokens.fontWeightBold,
                    color: AppTokens.colorLoginTitle,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: AppTokens.space8),
                Text(
                  l10n.loginTagline,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: AppTokens.fontSizeSm,
                    fontWeight: AppTokens.fontWeightRegular,
                    color: AppTokens.colorLoginSubtitle,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginCard extends StatelessWidget {
  const _LoginCard({
    required this.l10n,
    required this.email,
    required this.password,
    required this.emailFocus,
    required this.passwordFocus,
    required this.emailError,
    required this.passwordError,
    required this.obscurePassword,
    required this.remember,
    required this.busy,
    required this.errorMessage,
    required this.canSubmit,
    required this.onEmailChanged,
    required this.onPasswordChanged,
    required this.onToggleObscure,
    required this.onToggleRemember,
    required this.onForgotPassword,
    required this.onSubmit,
  });

  final AppLocalizations l10n;
  final TextEditingController email;
  final TextEditingController password;
  final FocusNode emailFocus;
  final FocusNode passwordFocus;
  final String? emailError;
  final String? passwordError;
  final bool obscurePassword;
  final bool remember;
  final bool busy;
  final String? errorMessage;
  final bool canSubmit;
  final ValueChanged<String> onEmailChanged;
  final ValueChanged<String> onPasswordChanged;
  final VoidCallback onToggleObscure;
  final ValueChanged<bool> onToggleRemember;
  final VoidCallback onForgotPassword;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppTokens.colorSurface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppTokens.radiusLoginCard),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppTokens.loginHorizontalInset,
        AppTokens.space24,
        AppTokens.loginHorizontalInset,
        AppTokens.space32,
      ),
      child: AutofillGroup(
        child: Column(
          children: [
            Semantics(
              label: l10n.appTitle,
              image: true,
              child: Image.asset(
                BrandAssets.loginWordmark,
                height: AppTokens.loginWordmarkHeight,
                filterQuality: FilterQuality.high,
              ),
            ),
            const SizedBox(height: AppTokens.space24),
            LoginTextField(
              controller: email,
              focusNode: emailFocus,
              hintText: l10n.emailHint,
              semanticLabel: l10n.emailLabel,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [
                AutofillHints.username,
                AutofillHints.email,
              ],
              textInputAction: TextInputAction.next,
              errorText: emailError,
              onChanged: onEmailChanged,
            ),
            const SizedBox(height: AppTokens.space16),
            LoginTextField(
              controller: password,
              focusNode: passwordFocus,
              hintText: l10n.passwordHint,
              semanticLabel: l10n.passwordLabel,
              obscureText: obscurePassword,
              autofillHints: const [AutofillHints.password],
              textInputAction: TextInputAction.done,
              errorText: passwordError,
              onChanged: onPasswordChanged,
              onSubmitted: (_) => onSubmit(),
              suffix: IconButton(
                onPressed: onToggleObscure,
                tooltip: obscurePassword
                    ? l10n.showPassword
                    : l10n.hidePassword,
                icon: Icon(
                  obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: AppTokens.iconMd,
                  color: AppTokens.colorMuted,
                ),
              ),
            ),
            const SizedBox(height: AppTokens.space16),
            Row(
              children: [
                SizedBox(
                  width: AppTokens.minTouchTarget,
                  height: AppTokens.minTouchTarget,
                  child: Checkbox(
                    value: remember,
                    onChanged: (value) => onToggleRemember(value ?? false),
                    side: const BorderSide(
                      color: AppTokens.colorCheckboxBorder,
                    ),
                    activeColor: AppTokens.colorLoginBrandPurple,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => onToggleRemember(!remember),
                    child: Text(
                      l10n.rememberForThirtyDays,
                      style: const TextStyle(
                        fontSize: AppTokens.fontSizeSm,
                        color: AppTokens.colorOnSurface,
                      ),
                    ),
                  ),
                ),
                TextButton(
                  onPressed: onForgotPassword,
                  style: TextButton.styleFrom(
                    foregroundColor: AppTokens.colorLoginBrandPurple,
                    minimumSize: const Size(
                      AppTokens.minTouchTarget,
                      AppTokens.minTouchTarget,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTokens.space8,
                    ),
                  ),
                  child: Text(
                    l10n.forgotPasswordAction,
                    style: const TextStyle(
                      fontSize: AppTokens.fontSizeSm,
                      fontWeight: AppTokens.fontWeightSemibold,
                      color: AppTokens.colorLoginBrandPurple,
                    ),
                  ),
                ),
              ],
            ),
            if (errorMessage != null) ...[
              const SizedBox(height: AppTokens.space8),
              Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppTokens.colorError,
                  fontSize: AppTokens.fontSizeSm,
                ),
              ),
            ],
            const SizedBox(height: AppTokens.space12),
            SizedBox(
              width: double.infinity,
              height: AppTokens.loginButtonHeight,
              child: Semantics(
                button: true,
                label: l10n.loginAction,
                child: ElevatedButton(
                  onPressed: busy ? () {} : onSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTokens.colorLoginBrandPurple,
                    foregroundColor: AppTokens.colorOnPrimary,
                    disabledBackgroundColor: AppTokens.colorLoginBrandPurple
                        .withValues(alpha: 0.45),
                    disabledForegroundColor: AppTokens.colorOnPrimary,
                    elevation: AppTokens.elevationNone,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(
                        AppTokens.radiusLoginButton,
                      ),
                    ),
                  ),
                  child: busy
                      ? const SizedBox(
                          width: AppTokens.iconMd,
                          height: AppTokens.iconMd,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTokens.colorOnPrimary,
                          ),
                        )
                      : Text(
                          l10n.loginAction,
                          style: const TextStyle(
                            fontSize: AppTokens.fontSizeMd,
                            fontWeight: AppTokens.fontWeightSemibold,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
