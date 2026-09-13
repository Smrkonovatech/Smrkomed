import { randomUUID } from "node:crypto";
import { getAbdmConfig } from "./abdm-config";
import { abdmV3Client, AbdmV3ClientError } from "./abdm-v3-client";
import {
  HPR_ALLOWED_FILE_TYPES,
  HPR_MAX_FILE_SIZES,
  type HprAadhaarGenerateOtpResponse,
  type HprAadhaarOtpInitResponse,
  type HprAadhaarVerifyOtpResponse,
  type HprAccountInformationResponse,
  type HprChangePasswordByPasswordResponse,
  type HprCheckHpIdAccountExistResponse,
  type HprCreateHprIdRequest,
  type HprCreateHprIdResponse,
  type HprDemographicAuthViaMobileResponse,
  type HprFacilitySearchRequest,
  type HprFacilitySearchResponse,
  type HprFetchDocumentsListResponse,
  type HprFetchProfessionalInfoRequest,
  type HprFetchProfessionalInfoResponse,
  type HprForgotIdAadhaarGenerateOtpResponse,
  type HprForgotIdAadhaarVerifyOtpResponse,
  type HprForgotIdMobileGenerateOtpResponse,
  type HprForgotIdMobileVerifyOtpResponse,
  type HprGenerateEmailOtpResponse,
  type HprGenerateUpdateMobileOtpResponse,
  type HprIdCardResponse,
  type HprLogoutResponse,
  type HprMobileOtpSendResponse,
  type HprMobileOtpVerifyResponse,
  type HprPractitionerPayload,
  type HprRecoverPasswordByAadhaarResponse,
  type HprRecoverPasswordConfirmByAadhaarResponse,
  type HprRecoverPasswordSendMobileOtpResponse,
  type HprRecoverPasswordVerifyMobileOtpResponse,
  type HprRegisterProfessionalResponse,
  type HprResendEmailOtpResponse,
  type HprResendUpdateMobileOtpResponse,
  type HprResetPasswordResponse,
  type HprTokenResponse,
  type HprUploadDocumentItem,
  type HprUploadDocumentResponse,
  type HprVerifyEmailOtpResponse,
  type HprVerifyUpdateMobileOtpResponse,
  type HprSearchRecord,
  type HprSystemOfMedicineItem,
  type HprMedicalCouncilItem,
  type HprLanguageItem,
  type HprUniversityItem,
  type HprCollegeItem,
  type HprCourseItem,
  type HprCountryItem,
  type HprStateItem,
  type HprDistrictItem,
  type HprSubDistrictItem,
  type HprAffiliatedBoardItem,
  type HprNurseCouncilItem,
  type HprMinistryItem,
  type HprCategoryMasterItem,
  type HprSubCategoryMasterItem,
  type HfrBasicFacilityInfoRequest,
  type HfrBasicFacilityInfoResponse,
  type HfrAdditionalInfoRequest,
  type HfrAdditionalInfoResponse,
  type HfrDetailedInfoRequest,
  type HfrDetailedInfoResponse,
  type HfrSubmitFacilityRequest,
  type HfrSubmitFacilityResponse,
  type HfrMultipleHrpRequest,
  type HfrMultipleHrpResponseItem,
  type HfrSendOtpToContactRequest,
  type HfrSendOtpToContactResponse,
  type HfrValidateOtpRequest,
  type HfrValidateOtpResponse,
  type HfrFacilityContactDetailsRequest,
  type HfrFacilityContactDetailsResponse,
  type HfrUwinFetchDetailsRequest,
  type HfrUwinFetchDetailsResponse,
  type HfrUwinValidateOtpRequest,
  type HfrUwinValidateOtpResponse,
  type HfrDeduplicateFacilityRequest,
  type HfrDeduplicateFacilityItem,
  type HfrMasterTypesResponse,
  type HfrMasterDataResponse,
  type HfrLgdStateItem,
  type HfrLgdDistrictItem,
  type HfrLgdSubDistrictItem,
  type HfrFacilityTypeResponse,
  type HfrOwnerSubtypesResponse,
  type HfrSpecialitiesResponse,
  type HfrFacilitySubtypeResponse,
} from "./abdm-hpr-types";

function approximateBase64ByteLength(base64: string): number {
  const clean = base64.replace(/^data:[^;]+;base64,/, "").trim();
  const padding = (clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0);
  return Math.floor((clean.length * 3) / 4) - padding;
}

// ─── NHA HPR Standard Consent Texts ──────────────────────────────────────────

export const NHA_HPR_CONSENT_TEXTS: Record<string, { title: string; body: string }> = {
  en: {
    title: "Standard Consent Language for Aadhaar",
    body: "I, hereby declare that I am voluntarily sharing my Aadhaar Number / Virtual ID and demographic information issued by UIDAI, with National Health Authority (NHA) for the sole purpose of creation of Healthcare Professional ID. I understand that my Healthcare Professional ID can be used and shared for purposes as may be notified by Ayushman Bharat Digital Mission (ABDM) from time to time including provision of healthcare services. Further, I am aware that my personal identifiable information (Name, Address, Age, Date of Birth, Gender and Photograph) may be made available to the entities working in the National Digital Health Ecosystem (NDHE) which inter alia includes stakeholders and entities such as healthcare professional (e.g. doctors), facilities (e.g. hospitals, laboratories) and data fiduciaries (e.g. health programmes), which are registered with or linked to the Ayushman Bharat Digital Mission (ABDM), and various processes there under. I authorize NHA to use my Aadhaar number / Virtual ID for performing Aadhaar based authentication with UIDAI as per the provisions of the Aadhaar (Targeted Delivery of Financial and other Subsidies, Benefits and Services) Act, 2016 for the aforesaid purpose. I understand that UIDAI will share my e-KYC details, or response of “Yes” with NHA upon successful authentication. I consciously choose to use Aadhaar number / Virtual ID for the purpose of availing benefits across the NDHE. I am aware that my personal identifiable information excluding Aadhaar number / VID number can be used and shared for purposes as mentioned above. I reserve the right to revoke the given consent at any point of time as per provisions of Aadhar Act and Regulations and other laws, rules and regulations.",
  },
  hi: {
    title: "आधार के लिए मानक सहमति भाषा",
    body: "इसके द्वारा मैं यह स्पष्ट करता हूँ कि मैं स्वैच्छिक रूप से हेल्थकेयर प्रोफेशनल आईडी बनाने के एकमात्र उद्देश्य के लिए राष्ट्रीय स्वास्थ्य प्राधिकरण (एनएचए) के साथ यूआईडीएआई (UIDAI) द्वारा जारी अपना आधार नंबर/ वर्चुअल आईडी और जनसांख्यिकीय जानकारी साझा कर रहा हूँ। मैं भली भांति जानता हूँ कि मेरी हेल्थकेयर प्रोफेशनल आईडी को आयुष्मान भारत डिजिटल मिशन (एबीडीएम) द्वारा समय-समय पर स्वास्थ्य सेवाओं के प्रावधान सहित अधिसूचित उद्देश्यों के लिए उपयोग और साझा किया जा सकता है। और इसके अलावा, मैं इस बात से भी अवगत हूँ कि मेरी व्यक्तिगत पहचान स्थापित करने योग्य जानकारी (नाम, पता, आयु, जन्म तिथि, लिंग और फोटोग्राफ) राष्ट्रीय डिजिटल स्वास्थ्य इकोसिस्टम (एनडीएचई) में काम करने वाली संस्थाओं को उपलब्ध कराई जा सकती है, जिसमें अन्य बातों के साथ-साथ हितधारक और संस्थाएं शामिल हैं जैसे कि आयुष्मान भारत डिजिटल मिशन (एबीडीएम) के साथ पंजीकृत या उससे जुड़े हुए स्वास्थ्य पेशेवर (जैसे डॉक्टर), सुविधाएं (जैसे अस्पताल, प्रयोगशालाएं) और डेटा प्रत्ययी (data fiduciaries) (जैसे स्वास्थ्य कार्यक्रम) और उसके तहत आने वाली विभिन्न प्रक्रियाएं। मैं उपरोक्त उद्देश्य के लिए आधार (वित्तीय और अन्य सब्सिडी, लाभ और सेवाओं की लक्षित डिलीवरी) अधिनियम, 2016 के प्रावधानों के अनुसार यूआईडीएआई (UIDAI) के साथ आधार आधारित प्रमाणीकरण करने के लिए एनएचए को मेरे आधार नंबर/ वर्चुअल आईडी का उपयोग करने के लिए अधिकृत करता हूँ। मैं जानता हूँ कि यूआईडीएआई (UIDAI) मेरे ई-केवाईसी विवरण या सफल प्रमाणीकरण पर 'हां' की प्रतिक्रिया के बाद एनएचए के साथ साझा करेगा। मैं एनडीएचई में लाभ प्राप्त करने के उद्देश्य से ऐच्छिक रूप से आधार संख्या/ वर्चुअल आईडी का उपयोग करना चुनता हूँ। मुझे ज्ञात है कि आधार संख्या/ वीआईडी संख्या को छोड़कर मेरी व्यक्तिगत पहचान स्थापित करने योग्य जानकारी का उपयोग ऊपर बताए गए उद्देश्यों के लिए किया और साझा किया जा सकता है। मैं आधार अधिनियम और विनियमों और अन्य कानूनों, नियमों और विनियमों के प्रावधानों के अनुसार दी गई सहमति को किसी भी समय रद्द करने का अधिकार सुरक्षित रखता हूँ।",
  },
};

// ─── NHA Validation Rules ───────────────────────────────────────────────────

export function validateHprAlias(alias: string): { valid: boolean; reason?: string } {
  if (!alias || typeof alias !== "string") {
    return { valid: false, reason: "Healthcare Professional ID must be provided." };
  }
  if (alias.length < 4) {
    return { valid: false, reason: "Must contain atleast 4 letters." };
  }
  // Only allow alphabets, numbers, and dot(.)
  if (!/^[A-Za-z0-9.]+$/.test(alias)) {
    return { valid: false, reason: "We allow alphabets and numbers in the Healthcare Professional ID and do not allow special character except dot(.)" };
  }
  return { valid: true };
}

export function validateHprPasswordComplexity(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, reason: "Password must be provided." };
  }
  if (password.length <= 8) {
    return { valid: false, reason: "It should have more than 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Contains a capital letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Contains a Lowercase" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Contains a number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: "contains a special character" };
  }
  return { valid: true };
}

export function validateHprEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email is required." };
  }
  if (/\s/.test(email)) {
    return { valid: false, reason: "absence of spaces" };
  }
  if (!email.includes("@")) {
    return { valid: false, reason: "presence of special character '@'" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: "domain name format" };
  }
  return { valid: true };
}

export function validateFacilityId(facilityId: string): { valid: boolean; reason?: string } {
  if (!facilityId || typeof facilityId !== "string") {
    return { valid: false, reason: "Facility ID is required." };
  }
  if (!facilityId.startsWith("IN")) {
    return { valid: false, reason: "The Facility ID provided is invalid. It must begin with the prefix IN to meet the required format." };
  }
  if (facilityId.length !== 12) {
    return { valid: false, reason: `Facility id is invalid. It must have 12 characters ${facilityId}` };
  }
  if (!/^[A-Za-z0-9]+$/.test(facilityId)) {
    return { valid: false, reason: "Should only accepts the 12 digit alphanumric value." };
  }
  return { valid: true };
}

export function validateHipName(hipName: string): { valid: boolean; reason?: string } {
  if (!hipName || typeof hipName !== "string") {
    return { valid: false, reason: "HIP Name is mandatory" };
  }
  if (hipName.length > 15) {
    return { valid: false, reason: "HIP name can not be mor than 15 characters." };
  }
  // No special character is allowed(%$*#@(~&!)
  if (/[%$*#@(~&!)]/.test(hipName)) {
    return { valid: false, reason: "HIP Name should not have special characters" };
  }
  return { valid: true };
}

export function validateFacilityCoordinates(latitude: string | number, longitude: string | number): { valid: boolean; reason?: string } {
  const latStr = String(latitude).trim();
  const lngStr = String(longitude).trim();
  const latNum = Number(latStr);
  const lngNum = Number(lngStr);

  if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
    return { valid: false, reason: "Real Number ranging from -90.000000 to +90.000000 , with 1-6 decimal places" };
  }
  if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return { valid: false, reason: "Real Number ranging from -180.000000 to +180.000000 with 1-6 decimal places" };
  }
  return { valid: true };
}

export function validateFacilityName(name: string): { valid: boolean; reason?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, reason: "Required FacilityName Field is empty." };
  }
  if (!/^[A-Za-z]/.test(name)) {
    return { valid: false, reason: "Alphanumeric string that starts with an alphabet." };
  }
  if (name.trim().length <= 4) {
    return { valid: false, reason: "It should be more than 4 characters" };
  }
  if (/[^A-Za-z0-9\s]/.test(name)) {
    return { valid: false, reason: "Should not accept special character." };
  }
  return { valid: true };
}

export function validatePincode(pincode: string): { valid: boolean; reason?: string } {
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, reason: "Maximum 6 digits are allowed." };
  }
  return { valid: true };
}

export class AbdmHprService {
  private isDemoMode(): boolean {
    const config = getAbdmConfig();
    return config.demoMode || !config.isConfigured;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION & LOGIN WORKFLOWS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Login via Password API
   * POST /v4/int/api/v1/auth/authPassword
   */
  async loginWithPassword(params: {
    hprId: string;
    password: string;
    domainName?: string | undefined;
  }): Promise<HprTokenResponse> {
    if (!params.hprId || !params.password) {
      throw new AbdmV3ClientError("INVALID_CREDENTIALS", "HPR ID and password are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        token: `mock-hpr-token-${randomUUID()}`,
        expiresIn: Math.floor(Date.now() / 1000) + 1800,
        refreshToken: null,
        refreshExpiresIn: 0,
        tokenType: "bearer",
      };
    }

    return abdmV3Client.loginHprPassword({
      hprId: params.hprId,
      password: params.password,
      domainName: params.domainName ?? "@hpr.abdm",
      idType: "hpr_id",
    });
  }

  /**
   * Login via Mobile OTP - Step 1: Send OTP
   * POST /v4/int/api/v2/auth/loginViaMobileSendOTP
   */
  async sendLoginMobileOtp(mobile: string): Promise<HprMobileOtpSendResponse> {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      throw new AbdmV3ClientError("INVALID_MOBILE", "A valid 10-digit mobile number is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: randomUUID(),
        mobileNumber: `******${cleanMobile.slice(-4)}`,
      };
    }

    return abdmV3Client.loginHprMobileSendOtp({ mobile: cleanMobile });
  }

  /**
   * Login via Mobile OTP - Step 3: Verify OTP (encrypted with RSA/ECB/PKCS1Padding)
   * POST /v4/int/api/v2/auth/loginViaMobileSendOTP
   */
  async verifyLoginMobileOtp(params: {
    otp: string;
    txnId: string;
    mobile?: string | undefined;
  }): Promise<HprMobileOtpVerifyResponse> {
    if (!params.otp || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "OTP and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: params.txnId,
        mobileLinkedHpIdDTO: [
          {
            hprIdNumber: "71-0000-0326-3829",
            name: "Dr. Demo Practitioner",
            hprId: "demo.doctor@hpr.abdm",
          },
        ],
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.loginHprMobileVerifyOtp({
      otp: encryptedOtp,
      txnId: params.txnId,
      mobile: params.mobile,
    });
  }

  /**
   * Login via Mobile OTP - Step 4: Login with HPRID (User Authorized Token)
   * POST /v4/int/api/v2/auth/login/userAuthorizedToken
   */
  async authorizeUserToken(params: {
    hpId: string;
    txnId: string;
  }): Promise<HprTokenResponse> {
    if (!params.hpId || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "HPR ID and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        token: `mock-hpr-auth-token-${randomUUID()}`,
        expiresIn: Math.floor(Date.now() / 1000) + 1800,
        refreshToken: null,
        refreshExpiresIn: null,
      };
    }

    return abdmV3Client.loginHprUserAuthorizedToken({
      hpId: params.hpId,
      txnId: params.txnId,
    });
  }

  /**
   * Login via Aadhaar OTP - Step 1: Send OTP
   * POST /v4/int/api/v1/auth/init
   */
  async initAadhaarLogin(hprId: string): Promise<HprAadhaarOtpInitResponse> {
    if (!hprId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "HPR ID is required.", 400);
    }

    if (this.isDemoMode()) {
      const txnId = randomUUID();
      return {
        txnId,
        transactionId: txnId,
        mobileNumber: "******5860",
      };
    }

    return abdmV3Client.loginHprAadhaarInit({
      hprId,
      authMethod: "AADHAAR OTP",
      domainName: "@hpr.abdm",
      idType: "hpr_id",
    });
  }

  /**
   * Login via Aadhaar OTP - Step 2: Confirm OTP
   * POST /v4/int/api/v1/auth/confirmWithAadhaarOtp
   */
  async confirmAadhaarLogin(params: {
    otp: string;
    txnId: string;
  }): Promise<HprTokenResponse> {
    if (!params.otp || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "OTP and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        token: `mock-hpr-aadhaar-token-${randomUUID()}`,
        expiresIn: Math.floor(Date.now() / 1000) + 1800,
        refreshToken: null,
        refreshExpiresIn: null,
      };
    }

    return abdmV3Client.loginHprAadhaarConfirm({
      otp: params.otp,
      txnId: params.txnId,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REGISTRATION IN HPR (DOCTOR & NURSE)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Step 2: Generate Aadhaar OTP for HPR registration (encrypts 12-digit Aadhaar)
   * POST /v4/int/v2/registration/aadhaar/generateOtp
   */
  async generateAadhaarRegistrationOtp(aadhaarNumber: string): Promise<HprAadhaarGenerateOtpResponse> {
    const clean = aadhaarNumber.replace(/\D/g, "");
    if (clean.length !== 12) {
      throw new AbdmV3ClientError("INVALID_AADHAAR", "Aadhaar number must be exactly 12 digits.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: randomUUID(),
        mobileNumber: "9999999999",
      };
    }

    const encryptedAadhaar = await abdmV3Client.encryptHpr(clean);
    return abdmV3Client.generateHprAadhaarOtp({ aadhaar: encryptedAadhaar });
  }

  /**
   * Step 3: Verify Aadhaar OTP for HPR registration (encrypts OTP)
   * POST /v4/int/v2/registration/aadhaar/verifyOTP
   */
  async verifyAadhaarRegistrationOtp(params: {
    otp: string;
    txnId: string;
  }): Promise<HprAadhaarVerifyOtpResponse> {
    if (!params.otp || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "OTP and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: params.txnId,
        mobileNumber: null,
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.verifyHprAadhaarOtp({
      otp: encryptedOtp,
      txnId: params.txnId,
      domainName: "@hpr.abdm",
      idType: "hpr_id",
    });
  }

  /**
   * Step 4: Check if HPID exists by Aadhaar
   * POST /v4/int/v1/registration/aadhaar/checkHpIdAccountExist
   */
  async checkHpIdAccountExist(txnId: string): Promise<HprCheckHpIdAccountExistResponse> {
    if (!txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Transaction ID is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        token: "",
        hprIdNumber: "",
        categoryId: 0,
        subCategoryId: 0,
        txnId,
        name: "Dr. Demo Candidate",
        gender: "M",
        yearOfBirth: "1990",
        monthOfBirth: "05",
        dayOfBirth: "15",
        firstName: "Demo",
        middleName: "K",
        lastName: "Candidate",
        stateCode: "27",
        districtCode: "490",
        stateName: "Maharashtra",
        districtName: "Pune",
        address: "Flat 101, Medical Enclave, Pune",
        pincode: "411015",
        mobile: "9876543210",
        hprId: "",
        new: true,
      };
    }

    return abdmV3Client.checkHpIdAccountExist({ txnId });
  }

  /**
   * Step 5: Demographic Auth for Mobile (Verifies mobile matches Aadhaar mobile)
   * POST /v4/int/v2/registration/aadhaar/demographicAuthViaMobile
   */
  async demographicAuthViaMobile(params: {
    mobileNumber: string;
    txnId: string;
  }): Promise<HprDemographicAuthViaMobileResponse> {
    if (!params.mobileNumber || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Mobile number and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        verified: true,
        errorCode: null,
        reason: null,
        uidaiToken: null,
      };
    }

    const encryptedMobile = await abdmV3Client.encryptHpr(params.mobileNumber);
    return abdmV3Client.demographicAuthViaMobile({
      mobileNumber: encryptedMobile,
      txnId: params.txnId,
    });
  }

  /**
   * Step 5.1: Generate Mobile OTP if demographic auth failed
   * POST /v4/int/v1/registration/aadhaar/generateMobileOTP
   */
  async generateRegistrationMobileOtp(params: {
    mobile: string;
    txnId: string;
  }): Promise<HprAadhaarGenerateOtpResponse> {
    if (!params.mobile || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Mobile number and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: params.txnId,
        mobileNumber: null,
      };
    }

    return abdmV3Client.generateHprMobileOtp(params);
  }

  /**
   * Step 5.2: Verify Mobile OTP
   * POST /v4/int/v1/registration/aadhaar/verifyMobileOTP
   */
  async verifyRegistrationMobileOtp(params: {
    otp: string;
    txnId: string;
  }): Promise<HprAadhaarVerifyOtpResponse> {
    if (!params.otp || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "OTP and transaction ID are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: params.txnId,
        mobileNumber: null,
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.verifyHprMobileOtp({
      otp: encryptedOtp,
      txnId: params.txnId,
    });
  }

  /**
   * Step 5.3: Get suggested usernames from HPRID
   * POST /v4/int/v1/registration/aadhaar/hpid/suggestion
   */
  async getHprIdSuggestions(txnId: string): Promise<string[]> {
    if (!txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Transaction ID is required.", 400);
    }

    if (this.isDemoMode()) {
      return [
        "dr.demo1990",
        "demo.candidate",
        "candidate.demo1990",
        "demo1990",
        "dr.candidate",
      ];
    }

    return abdmV3Client.getHprIdSuggestions({ txnId });
  }

  /**
   * Step 6: Create HPRID with pre-verified details
   * POST /v4/int/v2/registration/aadhaar/createHprIdWithPreVerified
   */
  async createHprId(params: {
    txnId: string;
    email: string;
    firstName: string;
    middleName?: string | undefined;
    lastName?: string | undefined;
    password: string;
    profilePhoto?: string | undefined;
    hpCategoryCode: number; // 1: Doctor, 2: Nurse
    hpSubCategoryCode: number;
    hprId?: string | undefined;
    clientId?: string | undefined;
    stateCode?: string | undefined;
    districtCode?: string | undefined;
    council?: boolean | undefined;
    role?: number | undefined;
  }): Promise<HprCreateHprIdResponse> {
    if (!params.txnId || !params.email || !params.firstName || !params.password) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Transaction ID, email, firstName, and password are required.", 400);
    }

    if (this.isDemoMode()) {
      const generatedHprIdNumber = `71-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        token: `mock-hpr-created-token-${randomUUID()}`,
        hprIdNumber: generatedHprIdNumber,
        name: `${params.firstName} ${params.lastName ?? ""}`.trim(),
        gender: "M",
        yearOfBirth: "1990",
        monthOfBirth: "05",
        dayOfBirth: "15",
        firstName: params.firstName,
        lastName: params.lastName ?? "",
        middleName: params.middleName ?? "",
        stateCode: params.stateCode ?? "27",
        districtCode: params.districtCode ?? "490",
        stateName: "Maharashtra",
        districtName: "Pune",
        email: params.email,
        kycPhoto: params.profilePhoto ?? "",
        mobile: "9876543210",
        categoryId: params.hpCategoryCode,
        subCategoryId: params.hpSubCategoryCode,
        authMethods: ["PASSWORD", "AADHAAR_OTP", "MOBILE_OTP"],
        new: true,
        categories: {},
        hprId: params.hprId ?? `${params.firstName.toLowerCase()}@hpr.abdm`,
      };
    }

    const encryptedEmail = await abdmV3Client.encryptHpr(params.email);
    const encryptedPassword = await abdmV3Client.encryptHpr(params.password);

    const payload: HprCreateHprIdRequest = {
      txnId: params.txnId,
      email: encryptedEmail,
      idType: "hpr_id",
      domainName: "@hpr.abdm",
      firstName: params.firstName,
      middleName: params.middleName ?? "",
      lastName: params.lastName ?? "",
      password: encryptedPassword,
      profilePhoto: params.profilePhoto ?? "",
      sourceType: "AADHAAR",
      hpCategoryCode: params.hpCategoryCode,
      hpSubCategoryCode: params.hpSubCategoryCode,
      clientId: params.clientId ?? "",
      stateCode: params.stateCode ?? "",
      districtCode: params.districtCode ?? "",
      council: params.council ?? false,
      role: params.role ?? 1,
    };

    return abdmV3Client.createHprIdWithPreVerified(payload);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FACILITY SEARCH (HFR)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Search facilities in HFR
   * POST /v4/int/FacilityManagement/v1.5/facility/search
   */
  async searchFacilities(criteria: HprFacilitySearchRequest): Promise<HprFacilitySearchResponse> {
    if (this.isDemoMode()) {
      return {
        facilities: [
          {
            facilityId: criteria.facilityId || "IN2710000059",
            facilityName: criteria.facilityName || "Apollo Hospital New Delhi",
            facilityType: "Hospital",
            facilityStatus: "Submitted",
            ownership: "PRIVATE",
            ownershipCode: "P",
            systemOfMedicine: "Modern Medicine (Allopathy)",
            systemOfMedicineCode: "M",
            stateName: "Delhi",
            stateLGDCode: "7",
            districtName: "Central Delhi",
            districtLGDCode: "77",
            subDistrictName: "Civil Lines",
            subDistrictLGDCode: "417",
            address: "Barakhamba Road, Connaught Place",
            pincode: "110001",
            latitude: "28.6289",
            longitude: "77.2065",
            facilityTypeCode: "OTH",
          },
        ],
        message: "Request processed successfully",
        totalFacilities: 1,
        numberOfPages: 1,
      };
    }

    return abdmV3Client.searchFacility(criteria);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. REGISTER & UPDATE PROFESSIONAL PROFILE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Register Professional (Doctor or Nurse) in HPR
   * POST /v4/int/apis/v1/doctors/register-professional-new
   */
  async registerProfessional(params: {
    hprToken: string;
    practitioner: HprPractitionerPayload;
  }): Promise<HprRegisterProfessionalResponse> {
    if (!params.hprToken || !params.practitioner) {
      throw new AbdmV3ClientError("INVALID_INPUT", "HPR Token and practitioner details are required.", 400);
    }

    if (!["doctor", "nurse"].includes(params.practitioner.healthProfessionalType)) {
      throw new AbdmV3ClientError(
        "INVALID_PROFESSIONAL_TYPE",
        "healthProfessionalType must be either 'doctor' or 'nurse'.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        headers: {},
        body: {
          referenceNumber: randomUUID(),
          status: "true",
          message: "Congratulations! Your profile has been submitted successfully for verification.",
          error: null,
          hprId: `71-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        },
        statusCode: "OK",
        statusCodeValue: 200,
      };
    }

    return abdmV3Client.registerProfessional(params);
  }

  /**
   * Fetch Healthcare Professional Details API
   * POST /v4/int/apis/v1/doctors/fetch-professional-info
   */
  async fetchProfessionalInfo(
    params: HprFetchProfessionalInfoRequest,
  ): Promise<HprFetchProfessionalInfoResponse> {
    if (!params.practitioner?.id) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Practitioner HPR ID is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        practitioners: [
          [
            {
              identifier: 12345,
              hpr_id: params.practitioner.id,
              application_status: "Pending",
              is_council_verified: "Submitted",
              is_work_verified: "Submitted",
              active: "true",
              name: "Dr. Demo Specialist",
              gender: "Male",
              salutation: "Dr.",
              hpr_category: "doctor",
              email: "doctor.demo@gmail.com",
              mobileNumber: "9876543210",
              communicationLanguage: "English, Hindi",
              registrations: [
                {
                  identifier: 27409,
                  category: "Modern Medicine",
                  isRenewable: "Permanent",
                  dueDate: "",
                  councilName: "Delhi Medical Council",
                  registeredAt: "DELHI",
                  registrationNumber: "REG12032",
                  registrationDate: "2024-12-01",
                  NUIDnumber: "NUID10928",
                  NUIDvalidtill: "2030-12-01",
                },
              ],
              qualifications: [
                {
                  identifier: 13953,
                  courseName: "MBBS",
                  collegeName: "All India Institute of Medical Sciences",
                  universityName: "AIIMS New Delhi",
                  qualificationYear: "2020",
                  qualificationMonth: "March",
                },
              ],
              communication_address: {
                addressLine1: "Medical Staff Quarters",
                addressLine2: "Ansari Nagar",
                city: "New Delhi",
                cityCode: "110",
                state: "DELHI",
                stateCode: "7",
                district: "CENTRAL",
                districtCode: "77",
                pincode: "110029",
              },
              workDetails: {
                current_working_status: "1",
                nature_of_work: "Practice",
                choose_work_type: "Government only",
              },
              kycVerified: "true",
            },
          ],
        ],
        Message: "Data fetched successfully",
      };
    }

    return abdmV3Client.fetchProfessionalInfo(params);
  }

  /**
   * Update Healthcare Professional Details API
   * POST /v4/int/apis/v1/doctors/update-professional-new
   */
  async updateProfessional(params: {
    hprToken: string;
    practitioner: HprPractitionerPayload;
  }): Promise<HprRegisterProfessionalResponse> {
    if (!params.hprToken || !params.practitioner) {
      throw new AbdmV3ClientError("INVALID_INPUT", "HPR Token and practitioner details are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        headers: {},
        body: {
          referenceNumber: randomUUID(),
          status: "true",
          message: "Congratulations! Your profile has been updated successfully.",
          error: null,
          hprId: "71-3563-6824-1029",
        },
        statusCode: "OK",
        statusCodeValue: 200,
      };
    }

    return abdmV3Client.updateProfessional(params);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. DOCUMENT RETRIEVAL & UPLOAD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve Professional Document List API
   * POST /v4/int/apis/v1/doctors/fetch-documents-list
   */
  async fetchDocumentsList(hprid: string): Promise<HprFetchDocumentsListResponse> {
    if (!hprid) {
      throw new AbdmV3ClientError("INVALID_INPUT", "HPR ID is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        documentList: {
          profileDetails: {
            profilePhoto: {
              id: 40169,
              data: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
            },
            proofOfWorkCertificate: {
              id: 40169,
              data: "JVBERi0xLjMKJf////8KOSAwIG9iago...",
            },
          },
          registrationDetails: [
            {
              registrationCertificate: {
                id: 27409,
                systemOfMedicide: null,
                data: "JVBERi0xLjMKJf////8KOSAwIG9iago...",
              },
              proofOfNameChangeRegCertificate: {
                id: 27409,
                systemOfMedicide: null,
                data: "JVBERi0xLjMKJf////8KOSAwIG9iago...",
              },
            },
          ],
          qualificationDetails: [
            {
              degreeCertificate: {
                id: 13953,
                courseName: null,
                qualificationYear: null,
                data: "JVBERi0xLjMKJf////8KOSAwIG9iago...",
              },
              proofOfNameChangeQualCertificate: {
                id: 13953,
                courseName: null,
                qualificationYear: null,
                data: "JVBERi0xLjMKJf////8KOSAwIG9iago...",
              },
            },
          ],
        },
        Message: "Data fetched successfully",
      };
    }

    return abdmV3Client.fetchDocumentsList({ hprid });
  }

  /**
   * Upload Document API
   * POST /v4/int/apis/v1/uploads/upload-document
   */
  async uploadDocuments(params: {
    hpr_token: string;
    document: HprUploadDocumentItem[];
  }): Promise<HprUploadDocumentResponse> {
    if (!params.hpr_token || !Array.isArray(params.document) || params.document.length === 0) {
      throw new AbdmV3ClientError("INVALID_INPUT", "hpr_token and at least one document are required.", 400);
    }

    // Validate size and file type for each document per NHA specifications
    for (const doc of params.document) {
      if (!doc.document_id || !doc.document_type || !doc.fileType || !doc.data) {
        throw new AbdmV3ClientError(
          "INVALID_DOCUMENT_PAYLOAD",
          "Each document requires document_id, document_type, fileType, and data.",
          400,
        );
      }

      const normalizedFileType = doc.fileType.toLowerCase();
      const isAllowedType = HPR_ALLOWED_FILE_TYPES.some((allowed) =>
        normalizedFileType.includes(allowed),
      );
      if (!isAllowedType) {
        throw new AbdmV3ClientError(
          "UNSUPPORTED_FILE_TYPE",
          `File type ${doc.fileType} is not supported. Allowed formats: png, jpeg, jpg, pdf.`,
          400,
        );
      }

      const byteLength = approximateBase64ByteLength(doc.data);
      const maxSize =
        doc.document_type === "profilePhoto"
          ? HPR_MAX_FILE_SIZES.profilePhoto
          : HPR_MAX_FILE_SIZES.otherDocuments;

      if (byteLength > maxSize) {
        const limitMb = doc.document_type === "profilePhoto" ? "1 MB" : "5 MB";
        throw new AbdmV3ClientError(
          "FILE_TOO_LARGE",
          `Document ${doc.document_type} exceeds maximum allowed size of ${limitMb}.`,
          400,
        );
      }
    }

    if (this.isDemoMode()) {
      const result: HprUploadDocumentResponse = {};
      for (const doc of params.document) {
        result[doc.document_type] = {
          status: "pass",
          msg: `${doc.document_type} updated successfully.`,
        };
      }
      return result;
    }

    return abdmV3Client.uploadDocuments(params);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. UPDATE EMAIL ADDRESS WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Step C: Generate Verification Email OTP
   * POST /v4/int/apis/v1/doctors/generate-verification-email
   */
  async generateEmailVerificationOtp(params: {
    hpr_token: string;
    emailAddress: string;
    otp_type?: string | undefined;
  }): Promise<HprGenerateEmailOtpResponse> {
    if (!params.hpr_token || !params.emailAddress) {
      throw new AbdmV3ClientError("INVALID_INPUT", "hpr_token and emailAddress are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        msg: "Mail sent successfully",
        status: "success",
        otpLimitExp: null,
        expTime: null,
      };
    }

    return abdmV3Client.generateVerificationEmail({
      hpr_token: params.hpr_token,
      emailAddress: params.emailAddress,
      otp_type: params.otp_type || "official",
    });
  }

  /**
   * Step D: Re-generate Verification Email OTP
   * POST /v4/int/apis/v1/doctors/resent-verify-email
   */
  async resendEmailVerificationOtp(params: {
    hpr_token: string;
    emailAddress: string;
    otp_type?: string | undefined;
  }): Promise<HprResendEmailOtpResponse> {
    if (!params.hpr_token || !params.emailAddress) {
      throw new AbdmV3ClientError("INVALID_INPUT", "hpr_token and emailAddress are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        emailAddress: params.emailAddress,
        otp_type: params.otp_type || "official",
      };
    }

    return abdmV3Client.resendVerificationEmail({
      hpr_token: params.hpr_token,
      emailAddress: params.emailAddress,
      otp_type: params.otp_type || "official",
    });
  }

  /**
   * Step E: Verify Email OTP
   * POST /v4/int/apis/v1/doctors/verify-email-otp
   */
  async verifyEmailOtp(params: {
    hpr_token: string;
    hpr_id: string;
    officialEmail: string;
    emailOtp: number;
  }): Promise<HprVerifyEmailOtpResponse> {
    if (!params.hpr_token || !params.hpr_id || !params.officialEmail || params.emailOtp === undefined) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "hpr_token, hpr_id, officialEmail, and emailOtp are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        status: "pass",
        msg: "Email Verified",
      };
    }

    return abdmV3Client.verifyEmailOtp({
      hpr_token: params.hpr_token,
      hpr_id: params.hpr_id,
      officialEmail: params.officialEmail,
      emailOtp: params.emailOtp,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. UPDATE MOBILE VIA API WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate Verification Mobile OTP
   * POST /v4/int/apis/v1/doctors/generate-mobile-otp
   */
  async generateUpdateMobileOtp(params: {
    hpr_token: string;
    officialMobile: string;
  }): Promise<HprGenerateUpdateMobileOtpResponse> {
    const cleanMobile = params.officialMobile.replace(/\D/g, "");
    if (!params.hpr_token || cleanMobile.length < 10) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "hpr_token and a valid 10-digit officialMobile are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        status: "success",
        txnId: randomUUID(),
      };
    }

    const encryptedMobile = await abdmV3Client.encryptHpr(cleanMobile);
    return abdmV3Client.generateHprUpdateMobileOtp({
      hpr_token: params.hpr_token,
      officialMobile: encryptedMobile,
    });
  }

  /**
   * Re-generate Verification Mobile OTP
   * POST /v4/int/apis/v1/doctors/regenerate-mobile-otp
   */
  async regenerateUpdateMobileOtp(params: {
    hpr_token: string;
    officialMobile: string;
  }): Promise<HprResendUpdateMobileOtpResponse> {
    const cleanMobile = params.officialMobile.replace(/\D/g, "");
    if (!params.hpr_token || cleanMobile.length < 10) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "hpr_token and a valid 10-digit officialMobile are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        status: "success",
        txnId: randomUUID(),
      };
    }

    const encryptedMobile = await abdmV3Client.encryptHpr(cleanMobile);
    return abdmV3Client.regenerateHprUpdateMobileOtp({
      hpr_token: params.hpr_token,
      officialMobile: encryptedMobile,
    });
  }

  /**
   * Verify Mobile OTP
   * POST /v4/int/apis/v1/doctors/verify-mobile-otp
   */
  async verifyUpdateMobileOtp(params: {
    hpr_token: string;
    txnId: string;
    otp: string;
  }): Promise<HprVerifyUpdateMobileOtpResponse> {
    if (!params.hpr_token || !params.txnId || !params.otp) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "hpr_token, txnId, and otp are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        status: "success",
        msg: "Success",
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.verifyHprUpdateMobileOtp({
      hpr_token: params.hpr_token,
      txnId: params.txnId,
      otp: encryptedOtp,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. LOGOUT, ID CARD & ACCOUNT INFORMATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Logout HPR profile
   * GET /v4/int/v4/auth/logout
   */
  async logout(token: string): Promise<HprLogoutResponse> {
    if (!token) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Authorization token is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        message: "User Profile LoggedOut Successfully!!",
      };
    }

    return abdmV3Client.logoutHpr(token);
  }

  /**
   * Get HPR ID Card PDF (when user is admin verified)
   * GET /v4/int/v1/account/getIdCard
   */
  async getIdCard(token: string): Promise<HprIdCardResponse> {
    if (!token) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Authorization token is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        pdf: "JVBERi0xLjMKJf////8KOSAwIG9iago8PAovVHlwZSAvRXh0R1N0YXRlCi9jYSAxCj4+CmVuZG9iag==",
      };
    }

    return abdmV3Client.getHprIdCard(token);
  }

  /**
   * Get HPR Account / Profile personal information
   * GET /v4/int/v1/account/information
   */
  async getAccountInformation(token: string): Promise<HprAccountInformationResponse> {
    if (!token) {
      throw new AbdmV3ClientError("INVALID_INPUT", "Authorization token is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        hprIdNumber: "71-6347-4142-2778",
        hprId: "kapilku.aswat@hpr.abdm",
        mobile: "9953905860",
        firstName: "Kapil",
        middleName: "Kumar",
        lastName: "Saraswat",
        name: "Kapil Kumar Saraswat",
        yearOfBirth: "1985",
        dayOfBirth: "15",
        monthOfBirth: "06",
        gender: "M",
        email: "kapil.saraswat@gmail.com",
        profilePhoto: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQ...",
        stateCode: "35",
        districtCode: "638",
        subDistrictCode: null,
        villageCode: null,
        townCode: null,
        wardCode: null,
        pincode: "202138",
        address: "MO. MALIPURA WARD 18 KASBA KHAIR",
        kycPhoto: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQ...",
        stateName: "ANDAMAN AND NICOBAR ISLANDS",
        districtName: "South Andaman",
        subdistrictName: null,
        villageName: "Khair",
        townName: "Khair",
        wardName: null,
        authMethods: ["AADHAAR_BIO", "DEMOGRAPHICS", "PASSWORD", "MOBILE_OTP", "AADHAAR_OTP"],
        kycVerified: true,
        verificationType: null,
        verificationStatus: "false",
        categoryId: 1,
        categoryName: "Doctor",
        categorySubId: 1,
        categorySubName: "Modern Medicine",
        emailVerified: true,
        categories: null,
        new: false,
      };
    }

    return abdmV3Client.getHprAccountInformation(token);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. PASSWORD MANAGEMENT & RECOVERY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send Mobile OTP for password recovery
   * POST /v4/int/password/recover/byMobile/sendMobileOTP
   */
  async recoverPasswordSendMobileOtp(hprId: string): Promise<HprRecoverPasswordSendMobileOtpResponse> {
    if (!hprId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "hprId is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: randomUUID(),
        msg: "Please enter OTP sent on your mobile number ******2021",
        otp: 0,
        mobileNumber: "******2021",
      };
    }

    return abdmV3Client.recoverPasswordSendMobileOtp({ hprId });
  }

  /**
   * Verify Mobile OTP for password recovery
   * POST /v4/int/password/recover/byMobile/verifyMobileOTP
   */
  async recoverPasswordVerifyMobileOtp(params: {
    txnId: string;
    otp: string;
  }): Promise<HprRecoverPasswordVerifyMobileOtpResponse> {
    if (!params.txnId || !params.otp) {
      throw new AbdmV3ClientError("INVALID_INPUT", "txnId and otp are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        verified: true,
        txnId: params.txnId,
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.recoverPasswordVerifyMobileOtp({
      txnId: params.txnId,
      otp: encryptedOtp,
    });
  }

  /**
   * Reset password with transaction ID
   * POST /v4/int/password/resetPassword
   */
  async resetPassword(params: {
    txnId: string;
    newPassword: string;
  }): Promise<HprResetPasswordResponse> {
    if (!params.txnId || !params.newPassword) {
      throw new AbdmV3ClientError("INVALID_INPUT", "txnId and newPassword are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        message: "Password has been changed successfully!",
      };
    }

    const encryptedPassword = await abdmV3Client.encryptHpr(params.newPassword);
    return abdmV3Client.resetPassword({
      txnId: params.txnId,
      newPassword: encryptedPassword,
    });
  }

  /**
   * Send Mobile OTP via Aadhaar-linked mobile for password recovery
   * POST /v4/int/password/recover/byAadhaar
   */
  async recoverPasswordByAadhaar(hprId: string): Promise<HprRecoverPasswordByAadhaarResponse> {
    if (!hprId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "hprId is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: randomUUID(),
        mobileNumber: "******8063",
        msg: "",
        verified: false,
      };
    }

    return abdmV3Client.recoverPasswordByAadhaar({ hprId });
  }

  /**
   * Confirm Mobile OTP via Aadhaar-linked mobile
   * POST /v4/int/password/recover/confirmByAadhaar
   */
  async recoverPasswordConfirmByAadhaar(params: {
    txnId: string;
    otp: string;
  }): Promise<HprRecoverPasswordConfirmByAadhaarResponse> {
    if (!params.txnId || !params.otp) {
      throw new AbdmV3ClientError("INVALID_INPUT", "txnId and otp are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        verified: true,
        txnId: params.txnId,
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.recoverPasswordConfirmByAadhaar({
      txnId: params.txnId,
      otp: encryptedOtp,
    });
  }

  /**
   * Change password after login using old password
   * POST /v4/int/password/change/byPassword
   */
  async changePasswordWithOldPassword(params: {
    token: string;
    oldPassword: string;
    newPassword: string;
  }): Promise<HprChangePasswordByPasswordResponse> {
    if (!params.token || !params.oldPassword || !params.newPassword) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "token, oldPassword, and newPassword are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        message: "Password has been changed successfully!",
      };
    }

    const encryptedOld = await abdmV3Client.encryptHpr(params.oldPassword);
    const encryptedNew = await abdmV3Client.encryptHpr(params.newPassword);
    return abdmV3Client.changePasswordByPassword(params.token, {
      oldPassword: encryptedOld,
      newPassword: encryptedNew,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. FORGOT HPR ID WORKFLOWS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Forgot HPR ID via Aadhaar - Step 1: Generate OTP
   * POST /v4/int/v1/forgot/hprId/aadhaar/generateOtp
   */
  async forgotIdAadhaarGenerateOtp(params: {
    aadhaar: string;
    iagree?: boolean | undefined;
  }): Promise<HprForgotIdAadhaarGenerateOtpResponse> {
    const clean = params.aadhaar.replace(/\D/g, "");
    if (clean.length !== 12) {
      throw new AbdmV3ClientError("INVALID_AADHAAR", "Aadhaar number must be exactly 12 digits.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: randomUUID(),
        mobileNumber: "******2021",
        msg: null,
        verified: false,
      };
    }

    const encryptedAadhaar = await abdmV3Client.encryptHpr(clean);
    return abdmV3Client.forgotIdAadhaarGenerateOtp({
      aadhaar: encryptedAadhaar,
      iagree: params.iagree ?? true,
    });
  }

  /**
   * Forgot HPR ID via Aadhaar - Step 2: Verify OTP
   * POST /v4/int/v1/forgot/hprId/aadhaar
   */
  async forgotIdAadhaarVerifyOtp(params: {
    otp: string;
    txnId: string;
  }): Promise<HprForgotIdAadhaarVerifyOtpResponse> {
    if (!params.otp || !params.txnId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "otp and txnId are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        hprId: "amol.hudekar@hpr.abdm",
        hprIdNumber: "71-1234-5678-0212",
        token: `mock-hpr-forgot-token-${randomUUID()}`,
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.forgotIdAadhaarVerifyOtp({
      otp: encryptedOtp,
      txnId: params.txnId,
    });
  }

  /**
   * Forgot HPR ID via Mobile - Step 1: Generate OTP
   * POST /v4/int/v1/forgot/hprId/mobile/generateOtp
   */
  async forgotIdMobileGenerateOtp(mobileNumber: string): Promise<HprForgotIdMobileGenerateOtpResponse> {
    const clean = mobileNumber.replace(/\D/g, "");
    if (clean.length < 10) {
      throw new AbdmV3ClientError("INVALID_MOBILE", "A valid 10-digit mobile number is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        txnId: randomUUID(),
        msg: "Please enter OTP sent on your mobile number ******2021",
        otp: 0,
        mobileNumber: "******2021",
      };
    }

    const encryptedMobile = await abdmV3Client.encryptHpr(clean);
    return abdmV3Client.forgotIdMobileGenerateOtp({ mobileNumber: encryptedMobile });
  }

  /**
   * Forgot HPR ID via Mobile - Step 2: Verify OTP with Demographics
   * POST /v4/int/v1/forgot/hprId/mobile
   */
  async forgotIdMobileVerifyOtp(params: {
    otp: string;
    txnId: string;
    firstName: string;
    middleName?: string | undefined;
    lastName?: string | undefined;
    yearOfBirth: string;
    monthOfBirth: string;
    dayOfBirth: string;
    gender: string;
  }): Promise<HprForgotIdMobileVerifyOtpResponse> {
    if (
      !params.otp ||
      !params.txnId ||
      !params.firstName ||
      !params.yearOfBirth ||
      !params.gender
    ) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "otp, txnId, firstName, yearOfBirth, and gender are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        hprId: `${params.firstName.toLowerCase()}@hpr.abdm`,
        hprIdNumber: "71-1234-5678-0212",
        token: null,
      };
    }

    const encryptedOtp = await abdmV3Client.encryptHpr(params.otp);
    return abdmV3Client.forgotIdMobileVerifyOtp({
      otp: encryptedOtp,
      txnId: params.txnId,
      firstName: params.firstName,
      middleName: params.middleName,
      lastName: params.lastName,
      yearOfBirth: params.yearOfBirth,
      monthOfBirth: params.monthOfBirth,
      dayOfBirth: params.dayOfBirth,
      gender: params.gender,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. SEARCH HPRID DOCUMENT API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if an HPR ID exists
   * GET /v4/int/v1/search/existsByHprId/{hprId}
   */
  async checkHprIdExists(hprId: string): Promise<boolean> {
    if (!hprId || !hprId.trim()) {
      throw new AbdmV3ClientError("INVALID_HPR_ID", "HPR ID is required.", 400);
    }

    if (this.isDemoMode()) {
      return true;
    }

    return abdmV3Client.existsByHprId(hprId);
  }

  /**
   * Search HPR ID details
   * GET /v4/int/v1/search/searchByHprId/{hprId}
   */
  async searchHprId(hprId: string): Promise<HprSearchRecord> {
    if (!hprId || !hprId.trim()) {
      throw new AbdmV3ClientError("INVALID_HPR_ID", "HPR ID is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        hprIdNumber: "71-1227-1234-0212",
        name: "Dr. Amol Hudekar",
        authMethods: [
          "PASSWORD",
          "MOBILE_OTP",
          "AADHAAR_OTP",
          "DEMOGRAPHICS",
          "AADHAAR_BIO",
        ],
        hprId: hprId.includes("@") ? hprId : `${hprId}@hpr.abdm`,
        categoryId: "1",
        subCategoryId: "1",
      };
    }

    return abdmV3Client.searchByHprId(hprId);
  }

  /**
   * Search HPR ID details by mobile number
   * GET /v4/int/v1/search/searchByMobile/{mobile_number}
   */
  async searchHprByMobile(mobileNumber: string): Promise<HprSearchRecord[]> {
    const cleanMobile = mobileNumber.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      throw new AbdmV3ClientError("INVALID_MOBILE", "A valid 10-digit mobile number is required.", 400);
    }

    if (this.isDemoMode()) {
      return [
        {
          hprIdNumber: "71-1227-1234-0212",
          name: "Dr. Amol Hudekar",
          authMethods: [
            "PASSWORD",
            "MOBILE_OTP",
            "AADHAAR_OTP",
            "DEMOGRAPHICS",
            "AADHAAR_BIO",
          ],
          hprId: "amol.hudekar@hpr.abdm",
          categoryId: "1",
          subCategoryId: "1",
        },
      ];
    }

    return abdmV3Client.searchByMobile(cleanMobile);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. MASTER DATA (HPR) VIA APIS
  // ─────────────────────────────────────────────────────────────────────────────

  async getSystemsOfMedicine(): Promise<HprSystemOfMedicineItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 1, medicalSystem: "Modern Medicine", code: "modern_medicine", position: 1, excludeStates: "[\"1\",\"6\",\"104\",\"17\",\"18\",\"26\",\"32\"]", hprType: "doctor" },
        { id: 2, medicalSystem: "Dentistry", code: "dentist", position: 2, excludeStates: "[\"1\",\"17\",\"18\",\"103\",\"32\"]", hprType: "doctor" },
        { id: 3, medicalSystem: "Homeopathy", code: "homeopathy", position: 8, excludeStates: "[\"104\",\"103\"]", hprType: "doctor" },
        { id: 4, medicalSystem: "Ayurveda", code: "ayurveda", position: 4, excludeStates: "[\"104\",\"103\"]", hprType: "doctor" },
        { id: 5, medicalSystem: "Unani", code: "unani", position: 5, excludeStates: "[\"104\",\"103\"]", hprType: "doctor" },
        { id: 6, medicalSystem: "Siddha", code: "siddha", position: 6, excludeStates: "[\"104\",\"103\"]", hprType: "doctor" },
        { id: 7, medicalSystem: "Sowa-Rigpa", code: "sowa_rigpa", position: 7, excludeStates: "[\"104\",\"103\"]", hprType: "doctor" },
        { id: 8, medicalSystem: "Registered Auxiliary Nurse Midwife(RANM)", code: "ranm", position: 8, excludeStates: null, hprType: "nurse" },
        { id: 9, medicalSystem: "registered nurse (RN)", code: "rn", position: 9, excludeStates: null, hprType: "nurse" },
        { id: 10, medicalSystem: "Registered Nurse and Registered Midwife (RN & RM)", code: "rnrm", position: 10, excludeStates: null, hprType: "nurse" },
        { id: 11, medicalSystem: "Registered Lady Health Visitor (RLHV)", code: "rlhv", position: 11, excludeStates: null, hprType: "nurse" },
        { id: 12, medicalSystem: "Registered Pharmacist", code: "rp", position: 12, excludeStates: null, hprType: "nurse" },
        { id: 13, medicalSystem: "Pharmacy", code: "pharma", position: 13, excludeStates: null, hprType: "doctor" },
      ];
    }
    return abdmV3Client.getHprSystemsOfMedicine();
  }

  async getMedicalCouncils(): Promise<HprMedicalCouncilItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 1, name: "Andhra Pradesh Medical Council", stateId: "2", systemOfMedicineId: 1, position: 1 },
        { id: 14, name: "Maharashtra Medical Council", stateId: "20", systemOfMedicineId: 1, position: 16 },
        { id: 23, name: "Tamil Nadu Medical Council", stateId: "30", systemOfMedicineId: 1, position: 23 },
        { id: 29, name: "National Medical Commission (erstwhile Medical Council of India)", stateId: "1025", systemOfMedicineId: 1, position: 0 },
        { id: 30, name: "Dental Council of India", stateId: "104", systemOfMedicineId: 2, position: 30 },
      ];
    }
    return abdmV3Client.getHprMedicalCouncils();
  }

  async getLanguages(languageId?: number | string): Promise<HprLanguageItem | HprLanguageItem[]> {
    if (this.isDemoMode()) {
      const items: HprLanguageItem[] = [
        { id: 1, name: "English", culture: "", status: true, createdAt: "2021-06-22T06:16:20.000+00:00", modifiedAt: "2021-06-22T06:16:20.000+00:00" },
        { id: 2, name: "Hindi", culture: "", status: true, createdAt: "2021-06-22T06:16:20.000+00:00", modifiedAt: "2021-06-22T06:16:20.000+00:00" },
      ];
      if (languageId) {
        return items.find((l) => String(l.id) === String(languageId)) ?? items[0]!;
      }
      return items;
    }
    return abdmV3Client.getHprLanguages(languageId);
  }

  async getUniversities(collegeId?: number | string): Promise<HprUniversityItem[]> {
    if (this.isDemoMode()) {
      return [
        {
          id: 35,
          name: "Gandhi Institute Of Technology And Management Gitam (deemed To Be University), Visakhapatnam",
          status: true,
          visibleStatus: true,
          collegeId: Number(collegeId) || 76,
          collegeName: null,
          deleted: false,
          college: null,
        },
      ];
    }
    return abdmV3Client.getHprUniversities(collegeId);
  }

  async getColleges(stateId: number | string, systemOfMedicine?: string): Promise<HprCollegeItem[]> {
    if (this.isDemoMode()) {
      return [
        {
          id: 330,
          name: "Andaman And Nicobar Islands Institute Of Medical Sciences (aniims)",
          status: true,
          visibleStatus: true,
          createdAt: "2023-08-17T16:58:31.000+00:00",
          systemOfMedicineId: 1,
          stateId: Number(stateId) || 1,
          courseId: null,
          stateName: "Jammu And Kashmir",
          systemOfMedicineName: systemOfMedicine ?? "Modern Medicine",
          deleted: false,
        },
      ];
    }
    return abdmV3Client.getHprColleges(stateId, systemOfMedicine);
  }

  async getCourses(payload?: Record<string, unknown>): Promise<HprCourseItem[]> {
    if (this.isDemoMode()) {
      return [
        {
          id: 4060,
          name: "Mbbs - Bachelor Of Medicine And Bachelor Of Surgery",
          systemOfMedicineId: 1,
          visibleStatus: true,
          status: true,
          sortOrder: true,
          courseCategory: "basic",
          systemOfMedicine: "Modern Medicine",
          hprType: "doctor",
          qualificationCount: 0,
          international: false,
          priority: "true",
        },
        {
          id: 2005,
          name: "Diploma In Basic Medical Sciences (pharmacology)",
          systemOfMedicineId: 1,
          visibleStatus: true,
          status: true,
          sortOrder: true,
          courseCategory: "basic",
          systemOfMedicine: null,
          hprType: "doctor",
          qualificationCount: 0,
          international: false,
          priority: "false",
        },
      ];
    }
    return abdmV3Client.getHprCourses(payload);
  }

  async getCountries(countryId?: number | string): Promise<HprCountryItem | HprCountryItem[]> {
    if (this.isDemoMode()) {
      const items: HprCountryItem[] = [
        { id: 356, alpha_2_code: "IN", alpha_3_code: "IND", enShortName: "India", nationality: "Indian" },
      ];
      if (countryId) {
        return items.find((c) => String(c.id) === String(countryId)) ?? items[0]!;
      }
      return items;
    }
    return abdmV3Client.getHprCountries(countryId);
  }

  async getStates(stateId?: number | string): Promise<HprStateItem | HprStateItem[]> {
    if (this.isDemoMode()) {
      const items: HprStateItem[] = [
        { id: 1, name: "Andaman And Nicobar Islands", isoCode: "35", status: true, countryId: 356, visibleStatus: true, isSystemOfMedicine: false, position: null, councilLabel: null },
        { id: 20, name: "Maharashtra", isoCode: "27", status: true, countryId: 356, visibleStatus: true, isSystemOfMedicine: false, position: null, councilLabel: null },
        { id: 33, name: "Tamil Nadu", isoCode: "33", status: true, countryId: 356, visibleStatus: true, isSystemOfMedicine: false, position: null, councilLabel: null },
      ];
      if (stateId) {
        return items.find((s) => String(s.id) === String(stateId)) ?? items[0]!;
      }
      return items;
    }
    return abdmV3Client.getHprStates(stateId);
  }

  async getDistricts(stateId?: number | string): Promise<HprDistrictItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 1, stateId: Number(stateId) || 1, districtName: "Nicobars", isoCode: "603", status: true },
        { id: 2, stateId: Number(stateId) || 1, districtName: "North And Middle Andaman", isoCode: "632", status: true },
        { id: 568, stateId: 33, districtName: "Chennai", isoCode: "568", status: true },
      ];
    }
    return abdmV3Client.getHprDistricts(stateId);
  }

  async getSubDistricts(districtId?: number | string): Promise<HprSubDistrictItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 1108, districtCode: Number(districtId) || 603, subDistrictName: "Car Nicobar", isoCode: "5916", status: true },
        { id: 2138, districtCode: Number(districtId) || 603, subDistrictName: "Great Nicobar", isoCode: "5918", status: true },
        { id: 5704, districtCode: 568, subDistrictName: "Ambattur", isoCode: "5700", status: true },
      ];
    }
    return abdmV3Client.getHprSubDistricts(districtId);
  }

  async getNurseAffiliatedBoards(boardId?: number | string): Promise<HprAffiliatedBoardItem | HprAffiliatedBoardItem[]> {
    if (this.isDemoMode()) {
      const items: HprAffiliatedBoardItem[] = [
        { id: 1, name: "Central Board Of Secondary Education (CBSE)", status: true, visibleStatus: true, stateId: null, courseId: null, nationalBoard: true, councilBoard: false },
      ];
      if (boardId) {
        return items.find((b) => String(b.id) === String(boardId)) ?? items[0]!;
      }
      return items;
    }
    return abdmV3Client.getHprNurseAffiliatedBoards(boardId);
  }

  async getNurseCouncils(): Promise<HprNurseCouncilItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 1, name: "Andhra Pradesh Nurses Midwives And Health Visitors Council, Vijayawada", status: true, visibleStatus: true, position: 0, stateId: 2 },
        { id: 2, name: "Arunachal Pradesh Nursing Council", status: true, visibleStatus: true, position: 0, stateId: 3 },
      ];
    }
    return abdmV3Client.getHprNurseCouncils();
  }

  async getNurseCollegesByState(stateId: number | string): Promise<HprCollegeItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 21, name: "Dayanand Medical College And Hospital", status: true, visibleStatus: true, createdAt: "2023-08-17T16:58:31.000+00:00", systemOfMedicineId: 1, stateId: Number(stateId) || 27, courseId: null, stateName: "Maharashtra", systemOfMedicineName: null, deleted: false },
      ];
    }
    return abdmV3Client.getHprNurseCollegesByState(stateId);
  }

  async getAffiliatedBoardsByState(stateId: number | string): Promise<HprAffiliatedBoardItem[]> {
    if (this.isDemoMode()) {
      return [
        { id: 38, name: "Maharashtra State Board of Secondary and Higher Secondary Education, Pune", status: true, visibleStatus: true, stateId: Number(stateId) || 20, courseId: null, councilBoard: false, nationalBoard: false },
      ];
    }
    return abdmV3Client.getHprAffiliatedBoardsByState(stateId);
  }

  async getAllMinistry(hprToken?: string): Promise<HprMinistryItem[]> {
    if (this.isDemoMode()) {
      return [
        { ministry: "MinistryMOHF ( Mo Health and Family Welfare )" },
        { ministry: "MinistryMOA ( Mo AYUSH )" },
        { ministry: "MinistryMOR ( Mo Railways )" },
        { ministry: "MinistryMOD ( Mo Defense )" },
      ];
    }
    return abdmV3Client.getHprAllMinistry(hprToken);
  }

  async getHprCategories(role: number = 1): Promise<HprCategoryMasterItem[]> {
    if (this.isDemoMode()) {
      return [
        {
          code: 1,
          name: "Doctor",
          subCategories: [
            { code: "1", name: "Modern Medicine" },
            { code: "2", name: "Dentist" },
            { code: "3", name: "Ayurveda" },
          ],
        },
        {
          code: 2,
          name: "Nurse",
          subCategories: [
            { code: "9", name: "Registered Nurse and Registered Midwife (RN & RM)" },
          ],
        },
        {
          code: 6,
          name: "Pharmacist",
          subCategories: [
            { code: "33", name: "Pharmacy" },
          ],
        },
      ];
    }
    return abdmV3Client.getHprCategories(role);
  }

  async getHprSubCategories(role: number, categoryCode: number | string): Promise<HprSubCategoryMasterItem[]> {
    if (this.isDemoMode()) {
      return [
        { code: "1", name: "Modern Medicine" },
        { code: "2", name: "Dentist" },
        { code: "3", name: "Ayurveda" },
      ];
    }
    return abdmV3Client.getHprSubCategories(role, categoryCode);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. HEALTH FACILITY REGISTRY (HFR) APIS
  // ─────────────────────────────────────────────────────────────────────────────

  async searchHfrFacility(body: HprFacilitySearchRequest): Promise<HprFacilitySearchResponse> {
    if (this.isDemoMode()) {
      return {
        facilities: [
          {
            facilityId: body.facilityId || "IN3310001245",
            facilityName: body.facilityName || "ABC Hospital",
            facilityType: "Dental College",
            facilityStatus: "Submitted",
            ownership: "PRIVATE",
            ownershipCode: body.ownershipCode || "P",
            systemOfMedicine: "Modern Medicine(Allopathy),Dentistry",
            systemOfMedicineCode: "M,D",
            stateName: "Tamil Nadu",
            stateLGDCode: body.stateLGDCode || "33",
            districtName: "Chennai",
            districtLGDCode: "568",
            subDistrictName: "Ambattur",
            subDistrictLGDCode: "5700",
            address: "No 510 south street koyambedu, ",
            pincode: "600107",
            latitude: "27.907283445090215",
            longitude: "78.32989878869023",
            facilityTypeCode: "OTH",
          },
        ],
        message: "Request processed successfully",
        totalFacilities: 1,
        numberOfPages: 1,
      };
    }
    return abdmV3Client.searchFacility(body);
  }

  async onboardBasicFacilityInfo(
    body: HfrBasicFacilityInfoRequest,
    hprToken: string,
  ): Promise<HfrBasicFacilityInfoResponse> {
    if (!body?.facilityInformation?.facilityName) {
      throw new AbdmV3ClientError("INVALID_INPUT", "facilityName is required.", 400);
    }
    if (!hprToken) {
      throw new AbdmV3ClientError("AUTHENTICATION_REQUIRED", "hprToken is required in header x-hprid-auth.", 401);
    }

    if (this.isDemoMode()) {
      return {
        trackingId: body.trackingId || "80487",
        status: "success",
        message: "Facility created successfully. Please save the Facility Id returned.",
        errorStatus: null,
      };
    }

    return abdmV3Client.createBasicFacilityInfo(body, hprToken);
  }

  async onboardAdditionalFacilityInfo(
    body: HfrAdditionalInfoRequest,
  ): Promise<HfrAdditionalInfoResponse> {
    if (!body?.trackingId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "trackingId is required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        trackingId: body.trackingId,
        status: "Created",
        message: "Facility details have been saved successfully. Please provide the next set of data in v1.5/facility/detailed-information API.",
        errorStatus: null,
      };
    }

    return abdmV3Client.createAdditionalFacilityInfo(body);
  }

  async onboardDetailedFacilityInfo(
    body: HfrDetailedInfoRequest,
  ): Promise<HfrDetailedInfoResponse> {
    if (this.isDemoMode()) {
      return {
        trackingId: body.trackingId || "80454",
        status: "Saved",
        message: "Facility details have been saved successfully. Please login at https://nhpr.abdm.gov.in/ and submit your facility details for approval.",
        errorStatus: null,
      };
    }

    return abdmV3Client.createDetailedFacilityInfo(body);
  }

  async submitFacility(
    body: HfrSubmitFacilityRequest,
    hprToken: string,
  ): Promise<HfrSubmitFacilityResponse> {
    if (!body?.trackingId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "trackingId is required.", 400);
    }
    if (!hprToken) {
      throw new AbdmV3ClientError("AUTHENTICATION_REQUIRED", "hprToken is required in header x-hprid-auth.", 401);
    }

    if (this.isDemoMode()) {
      return {
        facilityId: "IN2810002708",
        status: "Created",
        message: "Facility created successfully. Please save the Facility Id returned.",
        errorStatus: null,
      };
    }

    return abdmV3Client.submitFacility(body, hprToken);
  }

  async getHfrMasterTypes(): Promise<HfrMasterTypesResponse> {
    if (this.isDemoMode()) {
      return {
        masterTypes: [
          { type: "MEDICINE", desc: "System Of Medicine" },
          { type: "OWNER", desc: "Ownership Of Facility" },
          { type: "OWNER-SUBTYPE", desc: "Ownership Subtype Of Facility" },
          { type: "FACILITY-TYPE", desc: "Facility Type" },
          { type: "TYPE-SERVICE", desc: "Type of Service" },
          { type: "SPECIALITIES", desc: "Specialities offered with System of medicine" },
          { type: "SPECIALITY-TYPE", desc: "Hospital Speciality Type" },
          { type: "FACILITY-SUB-TYPE", desc: "Facility Sub Type corresponding to Facility Type offered by Facility" },
        ],
      };
    }
    return abdmV3Client.getHfrMasterTypes();
  }

  async getHfrMasterData(type: string): Promise<HfrMasterDataResponse> {
    if (!type || !type.trim()) {
      throw new AbdmV3ClientError("INVALID_INPUT", "type parameter is required.", 400);
    }

    if (this.isDemoMode()) {
      const upperType = type.toUpperCase().trim();
      if (upperType === "OWNER") {
        return {
          type: "OWNER",
          data: [
            { code: "G", value: "Government" },
            { code: "P", value: "Private" },
            { code: "PP", value: "Public-Private-Partnership" },
          ],
        };
      }
      return {
        type: upperType,
        data: [
          { code: "DEF_01", value: `${upperType} Sample 1` },
          { code: "DEF_02", value: `${upperType} Sample 2` },
        ],
      };
    }

    return abdmV3Client.getHfrMasterData(type);
  }

  async getHfrLgdStates(): Promise<HfrLgdStateItem[]> {
    if (this.isDemoMode()) {
      return [
        {
          code: "33",
          name: "Tamil Nadu",
          districts: [
            { code: "568", name: "Chennai" },
            { code: "578", name: "Madurai" },
          ],
        },
        {
          code: "27",
          name: "Maharashtra",
          districts: [
            { code: "499", name: "Washim" },
            { code: "438", name: "Pune" },
          ],
        },
      ];
    }
    return abdmV3Client.getHfrLgdStates();
  }

  async getHfrLgdDistricts(stateCode: string | number): Promise<HfrLgdDistrictItem[]> {
    if (this.isDemoMode()) {
      return [
        { code: "568", name: "Chennai" },
        { code: "578", name: "Madurai" },
        { code: "499", name: "Washim" },
      ];
    }
    return abdmV3Client.getHfrLgdDistricts(stateCode);
  }

  async getHfrLgdSubDistricts(districtCode: string | number): Promise<HfrLgdSubDistrictItem[]> {
    if (this.isDemoMode()) {
      return [
        { code: "5700", name: "Ambattur" },
        { code: "5841", name: "Madurai South" },
        { code: "3997", name: "Karanja" },
      ];
    }
    return abdmV3Client.getHfrLgdSubDistricts(districtCode);
  }

  async fetchHfrFacilityType(params: {
    ownershipCode: string;
    systemOfMedicineCode?: string | undefined;
  }): Promise<HfrFacilityTypeResponse> {
    if (this.isDemoMode()) {
      return {
        type: "FACILITY-TYPE",
        data: [
          { code: "5", value: "Hospital" },
          { code: "4", value: "Clinic/ Dispensary" },
          { code: "10", value: "Diagnostic Laboratory" },
          { code: "11", value: "Pharmacy" },
          { code: "74", value: "Imaging Center" },
        ],
      };
    }
    return abdmV3Client.fetchHfrFacilityType(params);
  }

  async getHfrOwnerSubtypes(params: {
    ownershipCode: string;
    ownerSubtypeCode?: string | undefined;
  }): Promise<HfrOwnerSubtypesResponse> {
    if (this.isDemoMode()) {
      if (params.ownershipCode.toUpperCase() === "G") {
        return {
          type: "CENTRAL-GOVERNMENT",
          data: [
            { code: "MOHF", value: "Mo Health and Family Welfare" },
            { code: "MOA", value: "Mo AYUSH" },
            { code: "MOR", value: "Mo Railways" },
          ],
        };
      }
      return {
        type: "PROFIT-TYPE",
        data: [
          { code: "PP01", value: "Sole Proprietorship" },
          { code: "PP02", value: "Registered companies" },
          { code: "PP03", value: "Limited Liability Partnership" },
          { code: "PP04", value: "Partnership" },
        ],
      };
    }
    return abdmV3Client.getHfrOwnerSubtypes(params);
  }

  async getHfrSpecialities(params: {
    systemOfMedicineCode: string;
  }): Promise<HfrSpecialitiesResponse> {
    if (this.isDemoMode()) {
      return {
        type: "SPECIALITIES",
        data: [
          { code: "M-S1", value: "GeneralMedicine" },
          { code: "M-S6", value: "Cardiology" },
          { code: "M-S20", value: "Obstetrics and Gynecology" },
          { code: "M-S21", value: "Orthopaedics" },
        ],
      };
    }
    return abdmV3Client.getHfrSpecialities(params);
  }

  async fetchHfrFacilitySubtype(params: {
    facilityTypeCode: string;
  }): Promise<HfrFacilitySubtypeResponse> {
    if (this.isDemoMode()) {
      return {
        type: "FACILITY-SUB-TYPE",
        data: [
          { code: "28", value: "General Hospital" },
          { code: "32", value: "Daycare Center" },
          { code: "13", value: "Nursing Home" },
          { code: "29", value: "Any Other" },
        ],
      };
    }
    return abdmV3Client.fetchHfrFacilitySubtype(params);
  }

  async linkMultipleHrp(params: HfrMultipleHrpRequest): Promise<HfrMultipleHrpResponseItem[]> {
    if (!params?.facilityId || !params?.facilityName || !Array.isArray(params?.HRP)) {
      throw new AbdmV3ClientError("INVALID_INPUT", "facilityId, facilityName, and HRP array are required.", 400);
    }

    if (this.isDemoMode()) {
      return [
        {
          servicesLinked: {
            id: params.HRP[0]?.bridgeId || "SBX_000135",
            name: params.facilityName,
            types: [params.HRP[0]?.type || "HIP"],
            active: true,
          },
        },
      ];
    }

    return abdmV3Client.linkMultipleHrp(params);
  }

  async sendFacilityContactOtp(
    facilityId: string,
  ): Promise<HfrSendOtpToContactResponse | HfrSendOtpToContactResponse[]> {
    if (!facilityId || !facilityId.startsWith("IN") || facilityId.length !== 12) {
      throw new AbdmV3ClientError(
        "INVALID_FACILITY_ID",
        "The Facility ID provided is invalid. It must begin with the prefix IN and have 12 characters.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return [
        {
          facilityId,
          status: "Success",
          message: "Otp sent successfully! Please keep transaction id for future reference",
          transactionId: randomUUID(),
          errorStatus: null,
        },
      ];
    }

    return abdmV3Client.sendOtpToContact({ facilityId });
  }

  async validateFacilityContactOtp(
    params: HfrValidateOtpRequest,
  ): Promise<HfrValidateOtpResponse | HfrValidateOtpResponse[]> {
    if (!params.facilityId || !params.otp || !params.source || !params.transactionId) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "facilityId, sourceId, otp, source, and transactionId are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return [
        {
          facilityId: params.facilityId,
          status: "success",
          message: "OTP validated successfully!!! Hospital id linked to HFR",
          errorStatus: null,
        },
      ];
    }

    return abdmV3Client.validateOtp(params);
  }

  async getFacilityContactDetails(
    facilityId: string,
  ): Promise<HfrFacilityContactDetailsResponse> {
    if (!facilityId || !facilityId.startsWith("IN") || facilityId.length !== 12) {
      throw new AbdmV3ClientError(
        "INVALID_FACILITY_ID",
        "The Facility ID provided is invalid. It must begin with the prefix IN and have 12 characters.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        facility: {
          facilityId,
          facilityName: "Ashram Hospital",
          contactName: "Akshay Goraksh Shelke",
          contactMobile: "******8538",
          contactEmail: "she********@gmail.com",
          hprid: "71-2325-3152-8712",
        },
        status: "Success",
        message: "Details found successfully",
        errorStatus: null,
      };
    }

    return abdmV3Client.fetchFacilityContactDetails({ facilityId });
  }

  async getFacilityDetailsForUwin(
    params: HfrUwinFetchDetailsRequest,
  ): Promise<HfrUwinFetchDetailsResponse> {
    if (!params?.facilityId || !params?.source || !params?.sourceId) {
      throw new AbdmV3ClientError("INVALID_INPUT", "facilityId, source, and sourceId are required.", 400);
    }

    if (this.isDemoMode()) {
      return {
        facility: {
          facilityId: params.facilityId,
          facilityName: "Sahyadri Hospital",
          contactName: "Amol Tulshiram Hudekar",
          contactMobile: "******2021",
          contactEmail: "amo*********@ltimindtree.com",
          hprid: "71-3115-2671-2216",
        },
        otherInformation: {
          facilityOwnership: "G",
          ownerSubtype: "C",
          facilityRegion: "U",
          nin: "1234",
          addressLine1: "Tathawade",
          addressLine2: "Pune",
          stateCode: "24",
          districtCode: "438",
          subDistrict: "6512",
          pincode: "382350",
          latitude: "23.068570",
          longitude: "23.068570",
          facilityType: "Hospital",
        },
        status: "Success",
        message: "Details found successfully",
        errorStatus: null,
      };
    }

    return abdmV3Client.fetchDetailsForUwin(params);
  }

  async validateUwinOtp(
    params: HfrUwinValidateOtpRequest,
  ): Promise<HfrUwinValidateOtpResponse> {
    if (!params?.facilityId || !params?.otp || !params?.source || !params?.transactionId) {
      throw new AbdmV3ClientError(
        "INVALID_INPUT",
        "facilityId, sourceId, otp, source, and transactionId are required.",
        400,
      );
    }

    if (this.isDemoMode()) {
      return {
        facilityId: params.facilityId,
        status: "success",
        message: "OTP validated successfully!!! Source id linked to HFR",
        otherInformation: {
          facilityOwnership: "G",
          ownerSubtype: "C",
          facilityRegion: "U",
          nin: "1234",
          addressLine1: "Tathawade",
          addressLine2: "Pune",
          stateCode: "24",
          districtCode: "438",
          subDistrict: "6512",
          pincode: "382350",
          latitude: "23.068570",
          longitude: "23.068570",
          facilityType: "Hospital",
        },
      };
    }

    return abdmV3Client.validateUwinOtp(params);
  }

  async deduplicateFacility(
    params: HfrDeduplicateFacilityRequest,
  ): Promise<HfrDeduplicateFacilityItem[]> {
    if (!params.name || !params.district || !params.subDistrict) {
      throw new AbdmV3ClientError("INVALID_INPUT", "name, district, and subDistrict are required.", 400);
    }

    if (this.isDemoMode()) {
      return [
        {
          facility_name: params.name,
          alternate_id: "IN********93",
          sub_district: params.subDistrict,
          district: params.district,
          state: "Maharashtra",
          distances: "0",
        },
      ];
    }

    return abdmV3Client.deduplicateFacility(params);
  }
}

export const abdmHprService = new AbdmHprService();

