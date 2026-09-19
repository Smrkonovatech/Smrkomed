import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

/// Session-only profile photo. Not uploaded and not persisted remotely.
final localProfilePhotoProvider = StateProvider<Uint8List?>((ref) => null);

abstract class LocalPhotoPicker {
  Future<Uint8List?> takePhoto();
  Future<Uint8List?> pickFromGallery();
}

class ImagePickerLocalPhotoPicker implements LocalPhotoPicker {
  ImagePickerLocalPhotoPicker({ImagePicker? picker})
    : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<Uint8List?> takePhoto() => _pick(ImageSource.camera);

  @override
  Future<Uint8List?> pickFromGallery() => _pick(ImageSource.gallery);

  Future<Uint8List?> _pick(ImageSource source) async {
    final file = await _picker.pickImage(
      source: source,
      maxWidth: 1200,
      imageQuality: 88,
    );
    if (file == null) return null;
    return file.readAsBytes();
  }
}

class PhotoAccessDeniedException implements Exception {
  const PhotoAccessDeniedException(this.message);
  final String message;
}

final localPhotoPickerProvider = Provider<LocalPhotoPicker>((ref) {
  return ImagePickerLocalPhotoPicker();
});

Future<Uint8List?> pickLocalProfilePhoto(
  LocalPhotoPicker picker, {
  required bool camera,
}) async {
  try {
    return camera ? await picker.takePhoto() : await picker.pickFromGallery();
  } on PlatformException catch (error) {
    final code = error.code.toLowerCase();
    final denied =
        code.contains('denied') ||
        code.contains('permission') ||
        code.contains('access');
    if (denied) {
      throw const PhotoAccessDeniedException(
        'Photo access is turned off. You can enable Camera or Photos in Settings, then try again.',
      );
    }
    rethrow;
  }
}
