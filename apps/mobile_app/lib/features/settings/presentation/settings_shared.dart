import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smrkomed_doctor_app/core/constants/brand_assets.dart';
import 'package:smrkomed_doctor_app/core/theme/app_tokens.dart';
import 'package:smrkomed_doctor_app/features/settings/presentation/local_photo.dart';

/// UI-only placeholders until a later profile API phase.
abstract final class SettingsPlaceholders {
  static const doctorName = 'Dr. Ananya';
  static const specialty = 'Fertility Specialist';
  static const clinic = 'ABC Fertility Clinic';
  static const email = 'ananya@clinic.example';
  static const phone = '+91 90000 00000';
  static const language = 'English (US)';
  static const versionLine = 'SmrkoMed Clinic Portal v2.4.1 (Build 408)';
  static const complianceLine = 'HIPAA & GDPR Compliant Medical Suite';
}

class DoctorAvatar extends ConsumerWidget {
  const DoctorAvatar({
    super.key,
    this.size = 64,
    this.showCamera = false,
    this.showVerified = false,
    this.showOnline = false,
    this.borderColor = Colors.white,
    this.onCamera,
  });

  final double size;
  final bool showCamera;
  final bool showVerified;
  final bool showOnline;
  final Color borderColor;
  final VoidCallback? onCamera;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bytes = ref.watch(localProfilePhotoProvider);
    final avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 3),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A5B3FA0),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
        image: DecorationImage(
          image: bytes != null
              ? MemoryImage(bytes)
              : const AssetImage(BrandAssets.loginHeroDoctor) as ImageProvider,
          fit: BoxFit.cover,
        ),
      ),
    );

    return SizedBox(
      width: size + 8,
      height: size + 8,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(left: 0, top: 0, child: avatar),
          if (showOnline)
            Positioned(
              left: 4,
              bottom: 8,
              child: Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: AppTokens.colorHomeSuccessRing,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
          if (showVerified)
            Positioned(
              left: 2,
              bottom: 6,
              child: Container(
                width: 18,
                height: 18,
                decoration: const BoxDecoration(
                  color: AppTokens.colorPrimary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, size: 12, color: Colors.white),
              ),
            ),
          if (showCamera)
            Positioned(
              right: 0,
              bottom: 0,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onCamera,
                child: Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: AppTokens.colorPrimary,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(
                    Icons.photo_camera_outlined,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

Future<void> showChangePhotoSheet({
  required BuildContext context,
  required WidgetRef ref,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE4DFF0),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Change Profile Photo',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: AppTokens.fontWeightBold,
                  color: AppTokens.colorHomeTitle,
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(
                  Icons.photo_camera_outlined,
                  color: AppTokens.colorPrimary,
                ),
                title: const Text('Take Photo'),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _pick(context, ref, camera: true);
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.photo_library_outlined,
                  color: AppTokens.colorPrimary,
                ),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _pick(context, ref, camera: false);
                },
              ),
              TextButton(
                onPressed: () => Navigator.of(sheetContext).pop(),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      );
    },
  );
}

Future<void> _pick(
  BuildContext context,
  WidgetRef ref, {
  required bool camera,
}) async {
  try {
    final bytes = await pickLocalProfilePhoto(
      ref.read(localPhotoPickerProvider),
      camera: camera,
    );
    if (bytes != null) {
      ref.read(localProfilePhotoProvider.notifier).state = bytes;
    }
  } on PhotoAccessDeniedException catch (error) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(error.message)));
  } catch (_) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Unable to update the profile photo.')),
    );
  }
}

class SettingsSubpage extends StatelessWidget {
  const SettingsSubpage({super.key, required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.colorHomeBackground,
      appBar: AppBar(
        backgroundColor: AppTokens.colorHomeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          color: const Color(0xFF3D2E7C),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Color(0xFF3D2E7C),
            fontWeight: AppTokens.fontWeightBold,
            fontSize: 20,
          ),
        ),
      ),
      body: child,
    );
  }
}
