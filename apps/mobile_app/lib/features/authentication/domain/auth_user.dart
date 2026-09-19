import 'package:smrkomed_doctor_app/core/constants/staff_role.dart';
import 'package:smrkomed_doctor_app/core/errors/app_exception.dart';

class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.organizationId,
    required this.organizationName,
    required this.clinicId,
    required this.clinicName,
    required this.role,
    this.phone,
    this.title,
    this.isActive = true,
  });

  final String id;
  final String email;
  final String name;
  final String organizationId;
  final String organizationName;
  final String clinicId;
  final String clinicName;
  final StaffRole role;
  final String? phone;
  final String? title;
  final bool isActive;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final role = StaffRole.tryParse(json['role']?.toString());
    final id = json['id']?.toString() ?? '';
    final organizationId = json['organizationId']?.toString() ?? '';
    final clinicId = json['clinicId']?.toString() ?? '';
    if (role == null ||
        id.isEmpty ||
        organizationId.isEmpty ||
        clinicId.isEmpty) {
      throw AppException.server('Unable to load doctor profile.');
    }
    return AuthUser(
      id: id,
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      organizationId: organizationId,
      organizationName: json['organizationName']?.toString() ?? '',
      clinicId: clinicId,
      clinicName: json['clinicName']?.toString() ?? '',
      role: role,
      phone: json['phone']?.toString(),
      title: json['title']?.toString(),
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toSafeLog() => {
    'userId': id,
    'clinicId': clinicId,
    'organizationId': organizationId,
    'role': role.apiValue,
  };
}
