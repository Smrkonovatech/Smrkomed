/**
 * NHA Ayushman Bharat Digital Mission (ABDM)
 * Healthcare Professionals Registry (HPR) Types & DTOs
 *
 * Conforms to NHA HPR API Specifications:
 * - Update Professional Document API
 * - Fetch Healthcare Professional Details API
 * - Registration in Healthcare Professional Registry (HPR) via APIs
 * - Update Professional API
 * - Update Email Address in HPR via APIs
 */

export const HPR_CATEGORY_CODES = {
  DOCTOR: 1,
  NURSE: 2,
} as const;

export type HprCategoryCode = (typeof HPR_CATEGORY_CODES)[keyof typeof HPR_CATEGORY_CODES];

export const HPR_SUBCATEGORY_CODES = {
  // Doctor subcategories
  MODERN_MEDICINE: 1,
  DENTISTRY: 2,
  HOMOEOPATHY: 3,
  AYURVEDA: 4,
  UNANI: 5,
  SIDDHA: 6,
  SOWA_RIGPA: 7,
  // Nurse subcategories
  REGISTERED_AUXILIARY_NURSE_MIDWIFE: 8,
  REGISTERED_NURSE: 9,
  REGISTERED_NURSE_AND_REGISTERED_MIDWIFE: 10,
  REGISTERED_LADY_HEALTH_VISITOR: 11,
} as const;

export const HPR_ROLES = {
  HEALTHCARE_PROFESSIONAL: 1,
  FACILITY_MANAGER: 2,
  HEALTHCARE_PROFESSIONAL_AND_FACILITY_MANAGER: 3,
} as const;

export const HPR_WORK_STATUS = {
  PRIVATE: 0,
  GOVERNMENT_ONLY: 1,
  BOTH: 2,
} as const;

export const HPR_DOCUMENT_TYPES = [
  "profilePhoto",
  "degreeCertificate",
  "registrationCertificate",
  "proofOfWorkCertificate",
  "proofOfNameChangeRegCertificate",
  "proofOfNameChangeQualCertificate",
] as const;

export type HprDocumentType = (typeof HPR_DOCUMENT_TYPES)[number];

export const HPR_ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "pdf",
  "jpeg",
  "png",
  "jpg",
] as const;

export const HPR_MAX_FILE_SIZES = {
  profilePhoto: 1 * 1024 * 1024, // 1 MB
  otherDocuments: 5 * 1024 * 1024, // 5 MB
} as const;

// ─── 1. Authentication / Login Types ──────────────────────────────────────────

export interface HprPasswordLoginRequest {
  idType?: string | undefined; // "hpr_id"
  domainName?: string | undefined; // "@hpr.abdm"
  hprId: string;
  password: string;
}

export interface HprTokenResponse {
  token: string;
  expiresIn?: number | undefined;
  refreshToken?: string | null | undefined;
  refreshExpiresIn?: number | null | undefined;
  tokenType?: string | undefined;
}

export interface HprMobileOtpSendRequest {
  mobile: string;
}

export interface HprMobileOtpSendResponse {
  txnId: string;
  mobileNumber?: string | null | undefined;
}

export interface HprMobileOtpVerifyRequest {
  otp: string; // RSA/PKCS1 encrypted
  txnId: string;
  mobile?: string | undefined;
}

export interface HprMobileLinkedHpIdDTO {
  hprIdNumber: string;
  name: string;
  hprId: string;
}

export interface HprMobileOtpVerifyResponse {
  txnId: string;
  mobileLinkedHpIdDTO: HprMobileLinkedHpIdDTO[];
}

export interface HprUserAuthorizedTokenRequest {
  hpId: string;
  txnId: string;
}

export interface HprAadhaarOtpInitRequest {
  idType?: string | undefined; // "hpr_id"
  domainName?: string | undefined; // "@hpr.abdm"
  authMethod?: string | undefined; // "AADHAAR OTP"
  hprId: string;
}

export interface HprAadhaarOtpInitResponse {
  txnId?: string | undefined;
  transactionId?: string | undefined;
  mobileNumber?: string | null | undefined;
}

export interface HprAadhaarOtpConfirmRequest {
  otp: string;
  txnId: string;
}

// ─── 2. Registration Types ───────────────────────────────────────────────────

export interface HprAadhaarGenerateOtpRequest {
  aadhaar: string; // RSA/PKCS1 encrypted
}

export interface HprAadhaarGenerateOtpResponse {
  txnId: string;
  mobileNumber?: string | null | undefined;
}

export interface HprAadhaarVerifyOtpRequest {
  domainName?: string | undefined; // "@hpr.abdm"
  idType?: string | undefined; // "hpr_id"
  otp: string; // RSA/PKCS1 encrypted
  restrictions?: string | undefined;
  txnId: string;
}

export interface HprAadhaarVerifyOtpResponse {
  txnId: string;
  mobileNumber?: string | null | undefined;
}

export interface HprCheckHpIdAccountExistRequest {
  txnId: string;
}

export interface HprCheckHpIdAccountExistResponse {
  token?: string | undefined;
  hprIdNumber?: string | undefined;
  categoryId?: number | undefined;
  subCategoryId?: number | undefined;
  txnId?: string | undefined;
  name?: string | undefined;
  gender?: string | undefined;
  yearOfBirth?: string | undefined;
  monthOfBirth?: string | undefined;
  dayOfBirth?: string | undefined;
  firstName?: string | undefined;
  middleName?: string | undefined;
  lastName?: string | undefined;
  stateCode?: string | undefined;
  districtCode?: string | undefined;
  stateName?: string | undefined;
  districtName?: string | undefined;
  address?: string | undefined;
  pincode?: string | undefined;
  profilePhoto?: string | undefined;
  mobile?: string | undefined;
  hprId?: string | undefined;
  new?: boolean | undefined;
}

export interface HprDemographicAuthViaMobileRequest {
  txnId: string;
  mobileNumber: string; // RSA/PKCS1 encrypted
}

export interface HprDemographicAuthViaMobileResponse {
  verified: boolean;
  errorCode?: string | null | undefined;
  reason?: string | null | undefined;
  uidaiToken?: string | null | undefined;
}

export interface HprGenerateMobileOtpRequest {
  mobile: string;
  txnId: string;
}

export interface HprVerifyMobileOtpRequest {
  otp: string; // RSA/PKCS1 encrypted
  txnId: string;
}

export interface HprHpidSuggestionRequest {
  txnId: string;
}

export interface HprCreateHprIdRequest {
  txnId: string;
  email: string; // encrypted
  idType?: string | undefined; // "hpr_id"
  domainName?: string | undefined; // "@hpr.abdm"
  firstName: string;
  middleName?: string | undefined;
  lastName?: string | undefined;
  password: string; // encrypted
  profilePhoto?: string | undefined;
  sourceType?: string | undefined; // "AADHAAR"
  hpCategoryCode: number; // 1 (Doctor), 2 (Nurse)
  hpSubCategoryCode: number;
  clientId?: string | undefined;
  stateCode?: string | undefined;
  districtCode?: string | undefined;
  council?: boolean | undefined;
  role: number; // 1, 2, or 3
}

export interface HprCreateHprIdResponse {
  token: string;
  hprIdNumber: string;
  name?: string | undefined;
  gender?: string | undefined;
  yearOfBirth?: string | undefined;
  monthOfBirth?: string | undefined;
  dayOfBirth?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  middleName?: string | undefined;
  stateCode?: string | undefined;
  districtCode?: string | undefined;
  stateName?: string | undefined;
  districtName?: string | undefined;
  email?: string | null | undefined;
  kycPhoto?: string | undefined;
  mobile?: string | undefined;
  categoryId?: number | undefined;
  subCategoryId?: number | undefined;
  authMethods?: string[] | undefined;
  new?: boolean | undefined;
  categories?: Record<string, unknown> | undefined;
  hprId?: string | undefined;
}

// ─── 3. Facility Management (Search) Types ────────────────────────────────────

export interface HprFacilitySearchRequest {
  ownershipCode?: string | undefined;
  subDistrictLGDCode?: string | undefined;
  pincode?: string | undefined;
  facilityName?: string | undefined;
  facilityId?: string | undefined;
  page?: string | number | undefined;
  resultsPerPage?: string | number | undefined;
  stateLGDCode?: string | undefined;
  districtLGDCode?: string | undefined;
}

export interface HprFacilityItem {
  facilityId: string;
  facilityName: string;
  facilityType?: string | undefined;
  facilityStatus?: string | undefined;
  ownership?: string | undefined;
  ownershipCode?: string | undefined;
  systemOfMedicine?: string | undefined;
  systemOfMedicineCode?: string | undefined;
  stateName?: string | undefined;
  stateLGDCode?: string | undefined;
  districtName?: string | undefined;
  districtLGDCode?: string | undefined;
  subDistrictName?: string | undefined;
  subDistrictLGDCode?: string | undefined;
  address?: string | undefined;
  pincode?: string | undefined;
  latitude?: string | undefined;
  longitude?: string | undefined;
  facilityTypeCode?: string | undefined;
}

export interface HprFacilitySearchResponse {
  facilities: HprFacilityItem[];
  message: string;
  totalFacilities: number;
  numberOfPages: number;
}

// ─── 4. Professional Registration & Details Types ─────────────────────────────

export interface HprAttachment {
  fileType: string;
  data: string; // base64 encoded string
}

export interface HprQualification {
  nameOfDegreeOrDiplomaObtained: number | string;
  country: string;
  state: string;
  college: number | string;
  university: number | string;
  yearOfAwardingDegreeDiploma: string;
  monthOfAwardingDegreeDiploma?: string | undefined;
  degreeCertificate?: HprAttachment | string | undefined;
  isNameDifferentInCertificate?: string | boolean | number | undefined;
  proofOfNameChangeCertificate?: HprAttachment | string | undefined;
}

export interface HprRegistrationRecord {
  registeredWithCouncil: number | string;
  registrationNumber: string;
  registrationDate: string;
  registrationCertificate?: HprAttachment | string | undefined;
  isPermanentOrRenewable?: "Permanent" | "Renewable" | undefined;
  renewableDueDate?: string | undefined;
  categoryId?: number | string | undefined;
  isNameDifferentInCertificate?: string | boolean | number | undefined;
  proofOfNameChangeCertificate?: HprAttachment | string | undefined;
  qualifications?: HprQualification[] | undefined;
}

export interface HprFacilityDeclarationData {
  facilityId?: string | undefined;
  facilityName?: string | undefined;
  facilityAddress?: string | undefined;
  facilityPincode?: string | undefined;
  state?: string | undefined;
  district?: string | undefined;
  facilityType?: string | undefined;
  facilityDepartment?: string | undefined;
  facilityDesignation?: string | undefined;
  ministry?: {
    ministry: string;
  } | undefined;
}

export interface HprCurrentWorkDetails {
  currentlyWorking: string | number; // "1" | "0"
  purposeOfWork: string; // "Practice", "Administrative", "Teaching"
  chooseWorkStatus: string | number; // "0" (private), "1" (government), "2" (both)
  reasonForNotWorking?: string | undefined;
  certificateAttachment?: HprAttachment | string | undefined;
  facilityDeclarationData?: HprFacilityDeclarationData | undefined;
}

export interface HprPractitionerPayload {
  healthProfessionalType: "doctor" | "nurse";
  apiClientId?: string | undefined;
  profilePhoto?: string | undefined;
  officialMobileCode?: string | undefined;
  officialMobile?: string | undefined;
  officialMobileStatus?: string | number | undefined;
  officialEmail?: string | undefined;
  officialEmailStatus?: string | number | undefined;
  visibleProfilePicture?: string | number | undefined;
  profileVisibleToPublic?: string | number | undefined;
  personalInformation: {
    salutation: number | string;
    firstName: string;
    middleName?: string | undefined;
    lastName?: string | undefined;
    nationality: string;
    fatherName?: string | undefined;
    motherName?: string | undefined;
    spouseName?: string | undefined;
    gender: string;
    dateOfBirth: string;
    placeOfBirthState?: string | undefined;
    district?: string | undefined;
    subDistrict?: string | undefined;
    city?: string | undefined;
    languagesSpoken: string;
    category?: string | undefined;
  };
  addressAsPerKYC?: string | undefined;
  communicationAddress: {
    isCommunicationAddressAsPerKYC: string | boolean | number;
    address?: string | undefined;
    name?: string | undefined;
    country?: string | undefined;
    state?: string | undefined;
    district?: string | undefined;
    subDistrict?: string | undefined;
    city?: string | undefined;
    pincode?: string | undefined;
  };
  contactInformation?: {
    publicMobileNumber?: string | undefined;
    publicMobileNumberCode?: string | undefined;
    publicMobileNumberStatus?: string | number | undefined;
    landLineNumber?: string | undefined;
    landLineNumberCode?: string | undefined;
    publicEmail?: string | undefined;
    publicEmailStatus?: string | number | undefined;
  } | undefined;
  registrationAcademic: {
    category: number;
    registrationData: HprRegistrationRecord[];
  };
  specialities?: unknown;
  currentWorkDetails: HprCurrentWorkDetails;
}

export interface HprRegisterProfessionalRequest {
  hprToken: string;
  practitioner: HprPractitionerPayload;
}

export interface HprUpdateProfessionalRequest {
  hprToken: string;
  practitioner: HprPractitionerPayload;
}

export interface HprRegisterProfessionalResponse {
  headers?: Record<string, unknown> | undefined;
  body: {
    referenceNumber: string;
    status: string | boolean;
    message: string;
    error: string | null;
    hprId: string;
  };
  statusCode: string;
  statusCodeValue: number;
}

export interface HprFetchProfessionalInfoRequest {
  practitioner: {
    id: string; // HPR ID e.g. "71-****-****-7516"
    name?: string | undefined;
    contactNumber?: string | undefined;
    state?: string | undefined;
    registrationNumber?: string | undefined;
  };
}

export interface HprProfessionalDetail {
  identifier?: number | string | undefined;
  hpr_id: string;
  application_status: string;
  is_council_verified?: string | undefined;
  is_work_verified?: string | undefined;
  active: string | boolean;
  name: string;
  gender: string;
  salutation: string;
  hpr_category: string;
  email?: string | undefined;
  mobileNumber?: string | undefined;
  communicationLanguage?: string | undefined;
  remarks?: string | undefined;
  registrations?: Array<{
    identifier?: number | string | undefined;
    category?: string | undefined;
    isRenewable?: string | undefined;
    dueDate?: string | undefined;
    councilName?: string | undefined;
    registeredAt?: string | undefined;
    registrationNumber?: string | undefined;
    registrationDate?: string | undefined;
    NUIDnumber?: string | undefined;
    NUIDvalidtill?: string | undefined;
  }> | undefined;
  qualifications?: Array<{
    identifier?: number | string | undefined;
    courseName?: string | undefined;
    collegeName?: string | undefined;
    universityName?: string | undefined;
    qualificationYear?: string | undefined;
    qualificationMonth?: string | undefined;
  }> | undefined;
  communication_address?: {
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    cityCode?: string | undefined;
    state?: string | undefined;
    stateCode?: string | undefined;
    district?: string | undefined;
    districtCode?: string | undefined;
    pincode?: string | undefined;
  } | undefined;
  workDetails?: {
    current_working_status?: string | undefined;
    nature_of_work?: string | undefined;
    choose_work_type?: string | undefined;
    [key: string]: unknown;
  } | undefined;
  kycVerified?: string | boolean | undefined;
}

export interface HprFetchProfessionalInfoResponse {
  practitioners: HprProfessionalDetail[][];
  Message: string;
}

// ─── 5. Document Management Types ─────────────────────────────────────────────

export interface HprFetchDocumentsListRequest {
  hprid: string;
}

export interface HprDocumentItem {
  id: number;
  data: string; // base64 string
  systemOfMedicide?: string | null | undefined;
  courseName?: string | null | undefined;
  qualificationYear?: string | null | undefined;
}

export interface HprFetchDocumentsListResponse {
  documentList: {
    profileDetails?: {
      profilePhoto?: HprDocumentItem | undefined;
      proofOfWorkCertificate?: HprDocumentItem | undefined;
    } | undefined;
    registrationDetails?: Array<{
      registrationCertificate?: HprDocumentItem | undefined;
      proofOfNameChangeRegCertificate?: HprDocumentItem | undefined;
    }> | undefined;
    qualificationDetails?: Array<{
      degreeCertificate?: HprDocumentItem | undefined;
      proofOfNameChangeQualCertificate?: HprDocumentItem | undefined;
    }> | undefined;
    qualification?: {
      degreeCertificate?: HprDocumentItem | null | undefined;
      proofOfNameChangeQualCertificate?: HprDocumentItem | null | undefined;
    } | undefined;
  };
  Message: string;
}

export interface HprUploadDocumentItem {
  document_id: number;
  document_type: HprDocumentType;
  fileType: string;
  data: string; // base64 string
}

export interface HprUploadDocumentRequest {
  hpr_token: string;
  document: HprUploadDocumentItem[];
}

export interface HprUploadDocumentResponse {
  [documentType: string]: {
    status: string; // "pass"
    msg: string;
  };
}

// ─── 6. Email Verification Types ──────────────────────────────────────────────

export interface HprGenerateEmailOtpRequest {
  hpr_token: string;
  emailAddress: string;
  otp_type?: string | undefined; // "official"
}

export interface HprGenerateEmailOtpResponse {
  msg: string; // "Mail sent successfully"
  status: string; // "success"
  otpLimitExp?: string | null | undefined;
  expTime?: string | null | undefined;
}

export interface HprResendEmailOtpRequest {
  hpr_token: string;
  emailAddress: string;
  otp_type?: string | undefined; // "official"
}

export interface HprResendEmailOtpResponse {
  emailAddress: string;
  otp_type: string;
}

export interface HprVerifyEmailOtpRequest {
  hpr_token: string;
  hpr_id: string;
  officialEmail: string;
  emailOtp: number;
}

export interface HprVerifyEmailOtpResponse {
  status: string; // "pass"
  msg: string; // "Email Verified"
}

// ─── 7. Update Mobile via API Types ───────────────────────────────────────────

export interface HprGenerateUpdateMobileOtpRequest {
  hpr_token: string;
  officialMobile: string; // encrypted
}

export interface HprGenerateUpdateMobileOtpResponse {
  status: string; // "success"
  txnId: string;
}

export interface HprResendUpdateMobileOtpRequest {
  hpr_token: string;
  officialMobile: string; // encrypted
}

export interface HprResendUpdateMobileOtpResponse {
  status: string; // "success"
  txnId: string;
}

export interface HprVerifyUpdateMobileOtpRequest {
  hpr_token: string;
  txnId: string;
  otp: string; // encrypted
}

export interface HprVerifyUpdateMobileOtpResponse {
  status: string; // "success"
  msg: string; // "Success"
}

// ─── 8. Account, Profile & ID Card Types ──────────────────────────────────────

export interface HprLogoutResponse {
  message: string;
}

export interface HprIdCardResponse {
  pdf: string; // base64 encoded PDF
}

export interface HprAccountInformationResponse {
  hprIdNumber: string;
  hprId: string;
  mobile: string;
  firstName?: string | undefined;
  middleName?: string | null | undefined;
  lastName?: string | undefined;
  name: string;
  yearOfBirth?: string | undefined;
  dayOfBirth?: string | undefined;
  monthOfBirth?: string | undefined;
  gender?: string | undefined;
  email?: string | null | undefined;
  profilePhoto?: string | undefined;
  stateCode?: string | undefined;
  districtCode?: string | undefined;
  subDistrictCode?: string | null | undefined;
  villageCode?: string | null | undefined;
  townCode?: string | null | undefined;
  wardCode?: string | null | undefined;
  pincode?: string | undefined;
  address?: string | undefined;
  kycPhoto?: string | undefined;
  stateName?: string | undefined;
  districtName?: string | undefined;
  subdistrictName?: string | null | undefined;
  villageName?: string | undefined;
  townName?: string | undefined;
  wardName?: string | null | undefined;
  authMethods?: string[] | undefined;
  kycVerified?: boolean | undefined;
  verificationType?: string | null | undefined;
  verificationStatus?: string | undefined;
  categoryId?: number | undefined;
  categoryName?: string | undefined;
  categorySubId?: number | undefined;
  categorySubName?: string | undefined;
  emailVerified?: boolean | undefined;
  categories?: unknown;
  new?: boolean | undefined;
}

// ─── 9. Password Management & Recovery Types ──────────────────────────────────

export interface HprRecoverPasswordSendMobileOtpRequest {
  hprId: string;
}

export interface HprRecoverPasswordSendMobileOtpResponse {
  txnId: string;
  msg: string;
  otp: number;
  mobileNumber: string;
}

export interface HprRecoverPasswordVerifyMobileOtpRequest {
  txnId: string;
  otp: string; // encrypted
}

export interface HprRecoverPasswordVerifyMobileOtpResponse {
  verified: boolean;
  txnId: string;
}

export interface HprResetPasswordRequest {
  txnId: string;
  newPassword: string; // encrypted
}

export interface HprResetPasswordResponse {
  message: string;
}

export interface HprRecoverPasswordByAadhaarRequest {
  hprId: string;
}

export interface HprRecoverPasswordByAadhaarResponse {
  txnId: string;
  mobileNumber: string;
  msg: string;
  verified: boolean;
}

export interface HprRecoverPasswordConfirmByAadhaarRequest {
  txnId: string;
  otp: string; // encrypted
}

export interface HprRecoverPasswordConfirmByAadhaarResponse {
  verified: boolean;
  txnId: string;
}

export interface HprChangePasswordByPasswordRequest {
  oldPassword: string; // encrypted
  newPassword: string; // encrypted
}

export interface HprChangePasswordByPasswordResponse {
  message: string;
}

// ─── 10. Forgot HPR ID Types ──────────────────────────────────────────────────

export interface HprForgotIdAadhaarGenerateOtpRequest {
  aadhaar: string; // encrypted
  iagree: boolean;
}

export interface HprForgotIdAadhaarGenerateOtpResponse {
  txnId: string;
  mobileNumber: string;
  msg?: string | null | undefined;
  verified: boolean;
}

export interface HprForgotIdAadhaarVerifyOtpRequest {
  otp: string; // encrypted
  txnId: string;
}

export interface HprForgotIdAadhaarVerifyOtpResponse {
  hprId: string;
  hprIdNumber: string;
  token?: string | null | undefined;
}

export interface HprForgotIdMobileGenerateOtpRequest {
  mobileNumber: string; // encrypted
}

export interface HprForgotIdMobileGenerateOtpResponse {
  txnId: string;
  msg: string;
  otp: number;
  mobileNumber: string;
}

export interface HprForgotIdMobileVerifyOtpRequest {
  otp: string; // encrypted
  txnId: string;
  firstName: string;
  middleName?: string | undefined;
  lastName?: string | undefined;
  yearOfBirth: string;
  monthOfBirth: string;
  dayOfBirth: string;
  gender: string;
}

export interface HprForgotIdMobileVerifyOtpResponse {
  hprId: string;
  hprIdNumber: string;
  token?: string | null | undefined;
}

// ─── 11. Search HPRID API Types ───────────────────────────────────────────────

export interface HprSearchRecord {
  hprIdNumber: string;
  name: string;
  authMethods: string[];
  hprId: string;
  categoryId: string | number;
  subCategoryId: string | number;
}

// ─── 12. HPR Master Data API Types ────────────────────────────────────────────

export interface HprSystemOfMedicineItem {
  id: number;
  medicalSystem: string;
  code: string;
  position: number;
  excludeStates: string | null;
  hprType: string;
}

export interface HprMedicalCouncilItem {
  id: number;
  name: string;
  stateId: string | number;
  systemOfMedicineId: number;
  position: number;
}

export interface HprLanguageItem {
  id: number;
  name: string;
  culture: string;
  status: boolean;
  createdAt?: string | undefined;
  modifiedAt?: string | undefined;
}

export interface HprUniversityItem {
  id: number;
  name: string;
  status: boolean;
  visibleStatus: boolean;
  collegeId: number;
  collegeName?: string | null | undefined;
  deleted: boolean;
  college?: unknown;
}

export interface HprCollegeItem {
  id: number;
  name: string;
  status: boolean;
  visibleStatus: boolean;
  createdAt?: string | null | undefined;
  systemOfMedicineId?: number | null | undefined;
  stateId?: number | null | undefined;
  courseId?: number | null | undefined;
  stateName?: string | undefined;
  systemOfMedicineName?: string | null | undefined;
  deleted: boolean;
}

export interface HprCourseItem {
  id: number;
  name: string;
  systemOfMedicineId: number;
  visibleStatus: boolean;
  status: boolean;
  sortOrder: boolean;
  courseCategory: string | null;
  systemOfMedicine: string | null;
  hprType: string;
  qualificationCount: number;
  international: boolean;
  createdBy?: string | null | undefined;
  acronym?: string | null | undefined;
  priority: string;
}

export interface HprCountryItem {
  id: number;
  alpha_2_code: string;
  alpha_3_code: string;
  enShortName: string;
  nationality: string;
}

export interface HprStateItem {
  id: number;
  name: string;
  isoCode: string;
  status: boolean;
  countryId: number;
  visibleStatus: boolean;
  isSystemOfMedicine: boolean;
  position: number | null;
  councilLabel: string | null;
}

export interface HprDistrictItem {
  id: number;
  stateId: number;
  districtName: string;
  isoCode: string;
  status: boolean;
}

export interface HprSubDistrictItem {
  id: number;
  districtCode: number;
  subDistrictName: string;
  isoCode: string;
  status: boolean;
}

export interface HprAffiliatedBoardItem {
  id: number;
  name: string;
  status: boolean;
  visibleStatus: boolean;
  stateId: number | null;
  courseId: number | null;
  nationalBoard: boolean;
  councilBoard: boolean;
}

export interface HprNurseCouncilItem {
  id: number;
  name: string;
  status: boolean;
  visibleStatus: boolean;
  position: number;
  stateId: number;
}

export interface HprMinistryItem {
  ministry: string;
}

export interface HprCategoryMasterItem {
  code: number;
  name: string;
  subCategories: Array<{
    code: string | number;
    name: string;
  }>;
}

export interface HprSubCategoryMasterItem {
  code: string | number;
  name: string;
}

// ─── 13. Health Facility Registry (HFR) Types ─────────────────────────────────

export interface HfrBasicFacilityInfoRequest {
  trackingId?: string | undefined;
  facilityInformation: {
    facilityName: string;
    facilityAddressDetails: {
      country: string;
      stateLGDCode: string;
      districtLGDCode: string;
      subDistrictLGDCode: string;
      facilityRegion?: string | undefined;
      villageCityTownLGDCode?: string | undefined;
      addressLine1: string;
      addressLine2?: string | undefined;
      pincode: string;
      latitude: string;
      longitude: string;
    };
    facilityContactInformation: {
      facilityEmailId?: string | undefined;
      facilityContactNumber?: string | undefined;
      websiteLink?: string | undefined;
      facilityLandlineNumber?: string | undefined;
      facilityStdCode?: string | undefined;
    };
    ownershipCode: string;
    ownershipSubTypeCode: string;
    ownershipSubTypeCode2?: string | undefined;
    typeOfServiceCode?: string | undefined;
    specialityTypeCode?: string | undefined;
    systemOfMedicineCode: string;
    facilityTypeCode: string;
    facilitySubType?: string | undefined;
    facilityOperationalStatus: string;
    facilityUploads?: {
      facilityBuildingPhoto?: { name?: string | undefined; value?: string | undefined } | undefined;
      facilityBoardPhoto?: { name?: string | undefined; value?: string | undefined } | undefined;
    } | undefined;
    facilityAddressProof?: Array<{
      addressProofType?: string | undefined;
      addressProofAttachment?: { name?: string | undefined; value?: string | undefined } | undefined;
    }> | undefined;
    timingsOfFacility?: Array<{
      workingDays: string;
      openingHours: string;
    }> | undefined;
    abdmCompliantSoftware?: Array<{
      existingSoftwares?: string[] | undefined;
      anyOther?: string | undefined;
    }> | undefined;
  };
}

export interface HfrBasicFacilityInfoResponse {
  trackingId: string;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrAdditionalInfoRequest {
  trackingId: string;
  generalInformation: {
    hasDialysisCenter?: string | undefined;
    hasPharmacy?: string | undefined;
    hasBloodBank?: string | undefined;
    hasCathLab?: string | undefined;
    hasDiagnosticLab?: string | undefined;
    hasImagingCenter?: string | undefined;
    servicesByImagingCenter?: Array<{ service: string; count: number }> | undefined;
  };
  linkedProgramIds?: {
    nhrrId?: string | undefined;
    nin?: string | undefined;
    abpmjayId?: string | undefined;
    rohiniId?: string | undefined;
    echsId?: string | undefined;
    cghsId?: string | undefined;
    ceaRegistration?: string | undefined;
    stateInsuranceSchemeId?: string | undefined;
  } | undefined;
}

export interface HfrAdditionalInfoResponse {
  trackingId: string;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrDetailedInfoRequest {
  trackingId?: string | undefined;
  specialities?: Array<{
    systemOfMedicineCode: string;
    isSpecializationAvalaible: string;
    specialities?: string[] | undefined;
  }> | undefined;
  medicalInfrastructure?: Record<string, unknown> | undefined;
  pharmacyDetails?: {
    isJanAushadhiKendra?: string | undefined;
    janAushadhiKendraId?: string | undefined;
    drugLicenseNumber?: string | undefined;
    pharmacyGstinNumber?: string | undefined;
    pharmacistRegistrationNumber?: string | undefined;
  } | undefined;
  bloodBankDetails?: Record<string, unknown> | undefined;
  imagingServices?: Array<{ service: string; count: number }> | undefined;
  diagnosticServices?: string[] | undefined;
}

export interface HfrDetailedInfoResponse {
  trackingId: string;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrSubmitFacilityRequest {
  trackingId: string;
  sourceOfInformation?: string | undefined;
  sourceUniqueID?: string | undefined;
}

export interface HfrSubmitFacilityResponse {
  facilityId: string | null;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrMultipleHrpRequest {
  facilityId: string;
  facilityName: string;
  HRP: Array<{
    bridgeId: string;
    hipName: string;
    type: string;
    active: boolean | string;
  }>;
}

export interface HfrMultipleHrpResponseItem {
  servicesLinked?: {
    id: string;
    name: string;
    types: string[];
    active: boolean;
  } | undefined;
  error?: {
    code: string;
    message: string;
  } | undefined;
}

export interface HfrSendOtpToContactRequest {
  facilityId: string;
}

export interface HfrSendOtpToContactResponse {
  facilityId: string | null;
  status: string;
  message: string;
  transactionId?: string | null | undefined;
  errorStatus?: unknown;
}

export interface HfrValidateOtpRequest {
  facilityId: string;
  sourceId: string;
  otp: string;
  source: string;
  transactionId: string;
}

export interface HfrValidateOtpResponse {
  facilityId: string;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrFacilityContactDetailsRequest {
  facilityId: string;
}

export interface HfrFacilityContactDetailsResponse {
  facility: {
    facilityId: string;
    facilityName: string;
    contactName: string;
    contactMobile: string;
    contactEmail: string;
    hprid: string;
  } | null;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrUwinFetchDetailsRequest {
  facilityId: string;
  source: string;
  sourceId: string;
}

export interface HfrUwinFetchDetailsResponse {
  facility: unknown;
  otherInformation?: unknown;
  status: string;
  message: string;
  errorStatus?: unknown;
}

export interface HfrUwinValidateOtpRequest {
  facilityId: string;
  sourceId: string;
  otp: string;
  source: string;
  transactionId: string;
}

export interface HfrUwinValidateOtpResponse {
  facilityId: string;
  status: string;
  message: string;
  otherInformation?: unknown;
}

export interface HfrDeduplicateFacilityRequest {
  name: string;
  address?: string | undefined;
  district: string;
  subDistrict: string;
  village?: string | undefined;
  geolocation?: string | undefined;
  facilityId?: string | undefined;
}

export interface HfrDeduplicateFacilityItem {
  facility_name: string;
  alternate_id: string;
  sub_district: string;
  district: string;
  state: string;
  distances: string;
}

export type HfrSearchFacilityRequest = HprFacilitySearchRequest;
export type HfrSearchFacilityResponse = HprFacilitySearchResponse;
export type HfrFacilityItem = HprFacilityItem;

export interface HfrMasterTypeItem {
  type: string;
  desc: string;
}

export interface HfrMasterTypesResponse {
  masterTypes: HfrMasterTypeItem[];
}

export interface HfrMasterDataItem {
  code: string;
  value: string;
}

export interface HfrMasterDataResponse {
  type: string;
  data: HfrMasterDataItem[];
}

export interface HfrLgdStateItem {
  code: string;
  name: string;
  districts: Array<{
    code: string;
    name: string;
  }>;
}

export interface HfrLgdDistrictItem {
  code: string;
  name: string;
}

export interface HfrLgdSubDistrictItem {
  code: string;
  name: string;
}

export interface HfrFacilityTypeItem {
  code: string;
  value: string;
}

export interface HfrFacilityTypeResponse {
  type: string;
  data: HfrFacilityTypeItem[];
}

export interface HfrOwnerSubtypeItem {
  code: string;
  value: string;
}

export interface HfrOwnerSubtypesResponse {
  type: string;
  data: HfrOwnerSubtypeItem[];
}

export interface HfrSpecialityItem {
  code: string;
  value: string;
}

export interface HfrSpecialitiesResponse {
  type: string;
  data: HfrSpecialityItem[];
}

export interface HfrFacilitySubtypeItem {
  code: string;
  value: string;
}

export interface HfrFacilitySubtypeResponse {
  type: string;
  data: HfrFacilitySubtypeItem[];
}
