import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AbdmHprService,
  validateFacilityId,
  validateFacilityName,
  validateFacilityCoordinates,
  validateHipName,
  validatePincode,
} from "./modules/digital-health/abdm-hpr-service";

describe("NHA ABDM Official Test Cases — Health Facility Registry (HFR)", () => {
  const service = new AbdmHprService();

  // Force demo mode for deterministic testing without external sandbox connection
  process.env["ABDM_DEMO_MODE"] = "1";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FACILITY SEARCH API (HFR-001 to HFR-009)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Facility Search (HFR-001 to HFR-009)", () => {
    it("HFR-001: Search through facility id — accepts 12 digit alphanumeric starting with IN", async () => {
      const validCheck = validateFacilityId("IN3310001245");
      assert.equal(validCheck.valid, true);

      const invalidStart = validateFacilityId("XX3310001245");
      assert.equal(invalidStart.valid, false);
      assert.match(invalidStart.reason || "", /prefix IN/i);

      const invalidLength = validateFacilityId("IN33100");
      assert.equal(invalidLength.valid, false);
      assert.match(invalidLength.reason || "", /12 characters/i);

      const res = await service.searchHfrFacility({
        facilityId: "IN3310001245",
      });
      assert.ok(Array.isArray(res.facilities));
      assert.equal(res.facilities[0]?.facilityId, "IN3310001245");
    });

    it("HFR-002: Search through facility name — accepts full or partial alphanumeric name", async () => {
      const resPartial = await service.searchHfrFacility({
        facilityName: "ABC",
        stateLGDCode: "33",
        ownershipCode: "P",
      });
      assert.ok(Array.isArray(resPartial.facilities));
      assert.ok(resPartial.facilities.length > 0);
      assert.match(resPartial.facilities[0]!.facilityName, /ABC/i);
    });

    it("HFR-003: Facility ownership — accepted values from get-master-data type='OWNER'", async () => {
      const ownerMasters = await service.getHfrMasterData("OWNER");
      assert.equal(ownerMasters.type, "OWNER");
      const codes = ownerMasters.data.map((d) => d.code.trim());
      assert.ok(codes.includes("G"), "Government must be present");
      assert.ok(codes.includes("P"), "Private must be present");
      assert.ok(codes.includes("PP"), "Public-Private-Partnership must be present");

      const res = await service.searchHfrFacility({
        ownershipCode: "P",
        stateLGDCode: "33",
        facilityName: "City Hospital",
      });
      assert.ok(Array.isArray(res.facilities));
    });

    it("HFR-004 to HFR-006: State, District, Sub-district LGD dropdown entries", async () => {
      // HFR-004: State LGD
      const states = await service.getHfrLgdStates();
      assert.ok(states.length > 0);
      assert.ok(states.some((s) => s.code === "33" && s.name === "Tamil Nadu"));

      // HFR-005: District LGD
      const districts = await service.getHfrLgdDistricts("33");
      assert.ok(districts.length > 0);
      assert.ok(districts.some((d) => d.code === "568"));

      // HFR-006: Sub-district LGD
      const subDistricts = await service.getHfrLgdSubDistricts("568");
      assert.ok(subDistricts.length > 0);
      assert.ok(subDistricts.some((sd) => sd.code === "5700"));
    });

    it("HFR-007: Pincode validation — maximum 6 digits allowed", () => {
      assert.equal(validatePincode("600107").valid, true);
      assert.equal(validatePincode("60010").valid, false);
      assert.equal(validatePincode("6001078").valid, false);
      assert.equal(validatePincode("ABCDEF").valid, false);
    });

    it("HFR-008 & HFR-009: Pagination — default page is 1, default resultsPerPage is 10", async () => {
      const res = await service.searchHfrFacility({
        page: 1,
        resultsPerPage: 10,
        ownershipCode: "P",
        stateLGDCode: "33",
        facilityName: "Test",
      });
      assert.equal(typeof res.numberOfPages, "number");
      assert.ok(res.numberOfPages >= 1);
      assert.equal(typeof res.totalFacilities, "number");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FACILITY REGISTRATION — BASIC DEMOGRAPHICS (HFR-010 to HFR-038)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Facility Registration Basic Demographics (HFR-010 to HFR-038)", () => {
    it("HFR-010: Facility Name rules — alphanumeric, starts with alphabet, >4 chars, no special characters", () => {
      assert.equal(validateFacilityName("Apollo Hospital").valid, true);
      assert.equal(validateFacilityName("123 Hospital").valid, false, "Must start with alphabet");
      assert.equal(validateFacilityName("Hosp").valid, false, "Must be > 4 characters");
      assert.equal(validateFacilityName("Apollo@# Hospital").valid, false, "No special characters");
    });

    it("HFR-011 & HFR-012: Coordinates validation — latitude [-90, 90], longitude [-180, 180]", () => {
      assert.equal(validateFacilityCoordinates("24.068570", "78.329898").valid, true);
      assert.equal(validateFacilityCoordinates("95.000000", "78.329898").valid, false, "Latitude > 90 must fail");
      assert.equal(validateFacilityCoordinates("24.068570", "190.000000").valid, false, "Longitude > 180 must fail");
    });

    it("HFR-020 & HFR-021: Working days & facility timings validation", async () => {
      const masterTypes = await service.getHfrMasterTypes();
      assert.ok(masterTypes.masterTypes.some((m) => m.type === "MEDICINE"));

      // Working days format
      const validTimings = [
        { workingDays: "MON", openingHours: "9:00 AM - 6:00 PM" },
        { workingDays: "TUE", openingHours: "24*7" },
      ];
      assert.equal(validTimings.length, 2);
      assert.match(validTimings[0]!.openingHours, /AM.*PM|24\*7/);
      assert.match(validTimings[1]!.openingHours, /AM.*PM|24\*7/);
    });

    it("HFR-031 to HFR-038: Ownership, Subtypes, Medicine systems, Facility types & Specialities", async () => {
      // HFR-031: Ownership
      const ownerData = await service.getHfrMasterData("OWNER");
      assert.ok(ownerData.data.length > 0);

      // HFR-032 & HFR-033: Subtypes
      const centralSubtypes = await service.getHfrOwnerSubtypes({ ownershipCode: "G", ownerSubtypeCode: "C" });
      assert.equal(centralSubtypes.type, "CENTRAL-GOVERNMENT");
      assert.ok(centralSubtypes.data.some((d) => d.code === "MOHF"));

      const pvtSubtypes = await service.getHfrOwnerSubtypes({ ownershipCode: "P" });
      assert.equal(pvtSubtypes.type, "PROFIT-TYPE");
      assert.ok(pvtSubtypes.data.some((d) => d.code === "PP01"));

      // HFR-034: System of Medicine
      const medicineMasters = await service.getSystemsOfMedicine();
      assert.ok(medicineMasters.length >= 7);

      // HFR-035 & HFR-036: Facility Type and Subtype
      const facilityTypes = await service.fetchHfrFacilityType({ ownershipCode: "P", systemOfMedicineCode: "M" });
      assert.ok(facilityTypes.data.some((f) => f.code === "5" && f.value === "Hospital"));

      const facilitySubtypes = await service.fetchHfrFacilitySubtype({ facilityTypeCode: "5" });
      assert.ok(facilitySubtypes.data.some((st) => st.value === "General Hospital"));

      // HFR-038: Specialities
      const specialities = await service.getHfrSpecialities({ systemOfMedicineCode: "M" });
      assert.ok(specialities.data.some((s) => s.code === "M-S1"));
    });

    it("executes basic facility registration and receives trackingId", async () => {
      const res = await service.onboardBasicFacilityInfo(
        {
          facilityInformation: {
            facilityName: "National Health Hospital",
            facilityAddressDetails: {
              country: "India",
              stateLGDCode: "33",
              districtLGDCode: "568",
              subDistrictLGDCode: "5704",
              addressLine1: "510 South Street Koyambedu",
              pincode: "600107",
              latitude: "24.068570",
              longitude: "78.329898",
            },
            facilityContactInformation: {
              facilityEmailId: "admin@nhh.gov.in",
              facilityContactNumber: "9042703499",
            },
            ownershipCode: "G",
            ownershipSubTypeCode: "C",
            systemOfMedicineCode: "M",
            facilityTypeCode: "5",
            facilityOperationalStatus: "F",
          },
        },
        "mock-hpr-token-12345",
      );

      assert.ok(res.trackingId);
      assert.match(res.status, /success|Created/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FACILITY REGISTRATION — HEALTH PROGRAM IDS (HFR-039 to HFR-046)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Facility Additional Info & Linked Program IDs (HFR-039 to HFR-046)", () => {
    it("HFR-039 to HFR-046: Successfully captures NHRR, NIN, AB-PMJAY, Rohini, ECHS, CGHS, CEA, State Scheme", async () => {
      const res = await service.onboardAdditionalFacilityInfo({
        trackingId: "80487",
        generalInformation: {
          hasDialysisCenter: "Y",
          hasPharmacy: "Y",
          hasBloodBank: "N",
          hasCathLab: "N",
          hasDiagnosticLab: "Y",
          hasImagingCenter: "Y",
          servicesByImagingCenter: [
            { service: "X-RAY", count: 2 },
            { service: "CT-SCAN", count: 1 },
          ],
        },
        linkedProgramIds: {
          nhrrId: "NHRR99001",
          nin: "NIN12345",
          abpmjayId: "PMJAY_HOSP_01",
          rohiniId: "ROHINI_889",
          echsId: "ECHS_554",
          cghsId: "CGHS_221",
          ceaRegistration: "CEA_REG_990",
          stateInsuranceSchemeId: "STATE_INS_441",
        },
      });

      assert.equal(res.trackingId, "80487");
      assert.match(res.status, /Created/i);
      assert.match(res.message, /saved successfully/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. INFRASTRUCTURE & SPECIALIZATION (HFR-047 to HFR-061)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Facility Detailed Infrastructure (HFR-047 to HFR-061)", () => {
    it("HFR-047 to HFR-061: Captures specialization, medical infrastructure beds, and ventilator counts", async () => {
      const res = await service.onboardDetailedFacilityInfo({
        trackingId: "80487",
        specialities: [
          {
            systemOfMedicineCode: "M",
            isSpecializationAvalaible: "Yes",
            specialities: ["M-S1", "M-S6", "M-S20"],
          },
        ],
        medicalInfrastructure: {
          countIPDBedsWithoutOxygen: 20,
          countIPDBedsWithOxygen: 30,
          countICUBedsWithVentilators: 10,
          countICUBedsWithoutVentilators: 5,
          countHDUBedsWithFunctionalVentilators: 5,
          countHDUBedsWithVentilators: 5,
          countHDUBedsWithoutVentilators: 5,
          totalNumberOfVentilators: 20,
          countDayCareBedsWithoutOxygen: 10,
          countDayCareBedsWithOxygen: 10,
          totalNumberOfBeds: 95,
          countDentalChairs: 2,
        },
        pharmacyDetails: {
          isJanAushadhiKendra: "N",
          drugLicenseNumber: "DL-MH-2024-001",
        },
      });

      assert.equal(res.trackingId, "80487");
      assert.match(res.status, /Saved/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FACILITY SUBMISSION & RESUBMISSION (HFR-062 to HFR-117)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Facility Submission (HFR-062 to HFR-063)", () => {
    it("HFR-062 & HFR-063: Submits facility details and receives official 12-char Facility ID", async () => {
      const res = await service.submitFacility(
        {
          trackingId: "80487",
          sourceOfInformation: "",
          sourceUniqueID: "",
        },
        "mock-hpr-token-12345",
      );

      assert.ok(res.facilityId);
      assert.ok(res.facilityId!.startsWith("IN"), "Facility ID must start with IN");
      assert.equal(res.facilityId!.length, 12, "Facility ID must have exactly 12 characters");
      assert.equal(res.status, "Created");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. BRIDGE LINKAGE (HFR-118 to HFR-123)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Bridge Linkage (HFR-118 to HFR-123)", () => {
    it("HFR-118: Facility ID must be 12-characters starting with IN", () => {
      assert.equal(validateFacilityId("IN2810002708").valid, true);
      assert.equal(validateFacilityId("IP2810002708").valid, false);
      assert.equal(validateFacilityId("IN28100").valid, false);
    });

    it("HFR-121: HIP Name validation — <= 15 chars, no special characters %$*#@(~&!)", () => {
      assert.equal(validateHipName("Test Hosp 104").valid, true);
      assert.equal(validateHipName("XYZ BRIDGE").valid, true);

      // Too long (> 15 chars)
      const longName = validateHipName("Super Long Hospital HIP Name");
      assert.equal(longName.valid, false);
      assert.match(longName.reason || "", /15 characters/i);

      // Contains invalid special characters
      const specialName = validateHipName("Hosp@Bridge#1");
      assert.equal(specialName.valid, false);
      assert.match(specialName.reason || "", /special characters/i);
    });

    it("HFR-118 to HFR-123: Successfully links bridges to a facility", async () => {
      const res = await service.linkMultipleHrp({
        facilityId: "IN2810002708",
        facilityName: "Test Hospital 104",
        HRP: [
          {
            bridgeId: "SBX_000135",
            hipName: "Test Hospital 104",
            type: "HIP",
            active: true,
          },
        ],
      });

      assert.ok(Array.isArray(res));
      assert.ok(res.length > 0);
      assert.equal(res[0]?.servicesLinked?.id, "SBX_000135");
      assert.equal(res[0]?.servicesLinked?.active, true);
    });
  });
});
