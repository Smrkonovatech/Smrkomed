import type { CarePlanType, CareTaskPriority } from "@prisma/client";

export type SeedTaskDef = {
  title: string;
  description: string;
  taskType: string;
  ownerRole: "PATIENT" | "DOCTOR" | "CARE_COORDINATOR" | "PHARMACIST" | "STAFF";
  priority: CareTaskPriority;
  triggerEvent?: string;
  dueTimingDays: number;
  dueTimingHours?: number;
  communicationConfig?: {
    whatsapp?: {
      enabled: boolean;
      templateName: string;
      variables: string[];
    };
  };
  reminderConfig?: {
    remindAtHours?: number;
    channel?: string;
  };
  escalationConfig?: {
    escalateAfterHours?: number;
    escalateTo?: "DOCTOR" | "COORDINATOR" | "CLINICAL";
    escalationType?: string;
  };
  completionCondition?: {
    type: "PATIENT_CONFIRMATION" | "DOCTOR_REVIEW" | "REPORT_UPLOADED" | "APPOINTMENT_COMPLETED" | "STAFF_VERIFICATION";
  };
  requiredAction?: string;
};

export type SeedStageDef = {
  name: string;
  description: string;
  stageType: string;
  completionStrategy: string;
  config?: Record<string, unknown>;
  tasks: SeedTaskDef[];
};

export type SeedTemplateDef = {
  name: string;
  description: string;
  specialty: string;
  type: CarePlanType;
  version: number;
  isSystem: boolean;
  config?: Record<string, unknown>;
  stages: SeedStageDef[];
};

export const IVF_STANDARD_JOURNEY: SeedTemplateDef = {
  name: "IVF — Standard Journey",
  description: "Comprehensive 16-stage IVF care journey coordinating clinical decisions, coordinator exception handling, and patient task completion.",
  specialty: "FERTILITY",
  type: "IVF",
  version: 1,
  isSystem: true,
  config: {
    branches: [
      {
        stageIndex: 10,
        name: "Transfer Strategy Branch",
        options: ["FRESH_TRANSFER", "FREEZE_ALL_FET"],
      },
      {
        stageIndex: 13,
        name: "Pregnancy Outcome Branch",
        options: ["PREGNANCY_CONFIRMED", "UNSUCCESSFUL_CYCLE"],
      },
    ],
  },
  stages: [
    {
      name: "Fertility Consultation",
      description: "Initial clinical consultation, fertility history review, baseline orders, and care registration.",
      stageType: "CONSULTATION",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Complete fertility consultation",
          description: "Doctor conducts comprehensive fertility assessment and clinical history taking.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "RECORD_CONSULTATION_NOTE",
        },
        {
          title: "Complete patient/couple onboarding",
          description: "Coordinator verifies contact info, IDs, and ensures portal access.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
          requiredAction: "VERIFY_REGISTRATION",
        },
        {
          title: "Complete couple health profile",
          description: "Patient fills intake questionnaires and medical background in the portal.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "NORMAL",
          dueTimingDays: 1,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "patient_welcome_onboarding",
              variables: ["patient_name", "clinic_name", "portal_link"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 48, escalateTo: "COORDINATOR", escalationType: "NO_RESPONSE" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "COMPLETE_INTAKE",
        },
        {
          title: "Order initial fertility workup investigations",
          description: "Doctor selects required hormonal, infectious, and semen tests for the couple.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "NORMAL",
          dueTimingDays: 1,
          completionCondition: { type: "DOCTOR_REVIEW" },
        },
      ],
    },
    {
      name: "Investigation / Workup",
      description: "Blood tests, hormonal panels, pelvic ultrasound, semen analysis, and diagnostic review.",
      stageType: "INVESTIGATION",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Hormonal & infectious blood investigation",
          description: "Patient completes fasting blood panel (AMH, FSH, LH, Estradiol, TSH, Prolactin, Viral markers).",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 2,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "lab_investigation_reminder",
              variables: ["patient_name", "test_names", "lab_timings", "clinic_contact"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 48, escalateTo: "COORDINATOR", escalationType: "MISSING_REPORT" },
          completionCondition: { type: "REPORT_UPLOADED" },
          requiredAction: "UPLOAD_LAB_REPORT",
        },
        {
          title: "Semen analysis and culture",
          description: "Male partner provides semen sample for count, motility, morphology, and culture assessment.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "NORMAL",
          dueTimingDays: 3,
          completionCondition: { type: "REPORT_UPLOADED" },
          requiredAction: "UPLOAD_SEMEN_REPORT",
        },
        {
          title: "Pelvic ultrasound / antral follicle count",
          description: "Diagnostic scan to assess ovarian reserve, AFC, and uterine cavity architecture.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "DOCTOR",
          priority: "NORMAL",
          dueTimingDays: 4,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
        {
          title: "Clinical review of workup reports",
          description: "Doctor reviews all uploaded test findings and approves couple readiness for IVF protocol planning.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "HIGH",
          dueTimingDays: 5,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "APPROVE_WORKUP",
        },
      ],
    },
    {
      name: "IVF Treatment Planning & Consent",
      description: "Doctor defines patient-specific stimulation protocol; coordinator collects informed consent.",
      stageType: "PLANNING_AND_CONSENT",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Approve IVF treatment protocol and medication plan",
          description: "Doctor specifies clinical protocol (Antagonist / Agonist), starting gonadotropin dosages, and monitoring schedule.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "APPROVE_PROTOCOL",
        },
        {
          title: "Collect signed IVF informed consent",
          description: "Coordinator reviews ICMR/ART guidelines, retrieval/fertilization risks, and collects digital or physical signatures.",
          taskType: "DOCUMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 1,
          completionCondition: { type: "STAFF_VERIFICATION" },
          requiredAction: "VERIFY_CONSENT",
        },
        {
          title: "Patient review and consent signing",
          description: "Couple reviews treatment roadmap, medication schedules, and signs informed consent documents.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 1,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "consent_signing_request",
              variables: ["patient_name", "consent_name", "doctor_name"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 48, escalateTo: "COORDINATOR", escalationType: "NO_RESPONSE" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
        },
      ],
    },
    {
      name: "Cycle Preparation",
      description: "Cycle Day 1 notification, baseline scan, estradiol assessment, and medication dispension.",
      stageType: "CYCLE_PREPARATION",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Cycle Day 1 confirmation",
          description: "Patient notifies clinic on the first day of menses to schedule baseline evaluation.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 0,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "cycle_day1_checkin",
              variables: ["patient_name", "clinic_contact"],
            },
          },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "CONFIRM_DAY_1",
        },
        {
          title: "Baseline scan appointment",
          description: "Transvaginal scan on Day 2/3 of cycle to verify quiescent ovaries and thin endometrium.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 2,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
        {
          title: "Verify stimulation medication availability",
          description: "Coordinator or pharmacy confirms patient has gonadotropins, pen devices, and reconstitution supplies.",
          taskType: "PHARMACY_TASK",
          ownerRole: "PHARMACIST",
          priority: "HIGH",
          dueTimingDays: 2,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Doctor baseline review & stimulation clearance",
          description: "Doctor verifies baseline scan and estradiol levels to greenlight Day 2/3 stimulation initiation.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 2,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "STIMULATION_CLEARANCE",
        },
      ],
    },
    {
      name: "Ovarian Stimulation",
      description: "Daily gonadotropin injections, adherence tracking, and patient check-in.",
      stageType: "STIMULATION",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Stimulation injection acknowledgement",
          description: "Daily scheduled gonadotropin injection (dose, route, and time specified by doctor prescription).",
          taskType: "MEDICATION_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 1,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "medication_reminder",
              variables: ["patient_name", "medication_name", "dose", "scheduled_time", "doctor_name"],
            },
          },
          reminderConfig: { remindAtHours: 1, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 2, escalateTo: "COORDINATOR", escalationType: "TASK_OVERDUE" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "CONFIRM_MEDICATION",
        },
        {
          title: "Medication tolerability and supply check",
          description: "Coordinator follow-up to ensure injection administration without side effects or supply shortages.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 3,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },
    {
      name: "Follicular Monitoring",
      description: "Serial transvaginal follicular tracking, serum estradiol monitoring, and protocol adjustments.",
      stageType: "MONITORING",
      completionStrategy: "DOCTOR_APPROVAL_REQUIRED",
      config: { repeatable: true },
      tasks: [
        {
          title: "Follicular monitoring ultrasound scan",
          description: "Serial sonography to measure lead follicle diameters (mm) and endometrial thickness.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
        {
          title: "Upload follicular monitoring report",
          description: "Document follicle mapping and endometrial triple-line pattern.",
          taskType: "REPORT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "REPORT_UPLOADED" },
          requiredAction: "UPLOAD_SCAN_REPORT",
        },
        {
          title: "Doctor review of monitoring results",
          description: "Doctor evaluates follicle cohort growth. Decides whether to continue stimulation, repeat scan, or trigger.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "TRIGGER_OR_REPEAT_DECISION",
        },
      ],
    },
    {
      name: "Trigger",
      description: "Critical final oocyte maturation injection (hCG / GnRH agonist) with exact timing.",
      stageType: "TRIGGER",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      config: { criticalMilestone: true },
      tasks: [
        {
          title: "Doctor prescribes trigger injection & exact hour",
          description: "Doctor specifies trigger drug, dose, and exact administration time (typically 34–36 hours prior to retrieval).",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "PRESCRIBE_TRIGGER",
        },
        {
          title: "Urgent trigger timing confirmation with patient",
          description: "Coordinator contacts couple to reinforce strict adherence to the prescribed trigger minute.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Trigger injection administration & time verification",
          description: "Patient administers trigger injection and confirms the exact minute taken.",
          taskType: "MEDICATION_TASK",
          ownerRole: "PATIENT",
          priority: "CLINICAL",
          dueTimingDays: 0,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "trigger_injection_urgent",
              variables: ["patient_name", "medication_name", "exact_time", "retrieval_date", "clinic_emergency_number"],
            },
          },
          reminderConfig: { remindAtHours: 1, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 1, escalateTo: "DOCTOR", escalationType: "CLINICAL" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "CONFIRM_TRIGGER_MINUTE",
        },
      ],
    },
    {
      name: "Egg Retrieval",
      description: "Transvaginal ovum pickup procedure under conscious sedation / anesthesia.",
      stageType: "RETRIEVAL",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Pre-procedure admission & fasting check",
          description: "Staff verifies fasting (NPO) status, vital signs, and procedural consent on morning of OPU.",
          taskType: "STAFF_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Perform egg retrieval procedure",
          description: "Doctor aspirates follicular fluid under ultrasound guidance and records oocyte recovery.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "RECORD_OPU_NOTES",
        },
        {
          title: "Embryology handoff & semen sample collection",
          description: "Folicular aspirates delivered to IVF lab; partner sample prepared for insemination.",
          taskType: "STAFF_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },
    {
      name: "Fertilization / Embryology",
      description: "Insemination / ICSI and Day 1 fertilization assessment.",
      stageType: "EMBRYOLOGY",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Record oocyte count and maturity",
          description: "Embryology records total oocytes retrieved and MII / MI / GV distribution.",
          taskType: "REPORT_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Day 1 fertilization check (2PN assessment)",
          description: "Assessment of pronuclei at 16–18 hours post-insemination/ICSI.",
          taskType: "REPORT_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 1,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Doctor review of fertilization report",
          description: "Doctor reviews normal 2PN count and confirms extended culture plan.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "NORMAL",
          dueTimingDays: 1,
          completionCondition: { type: "DOCTOR_REVIEW" },
        },
      ],
    },
    {
      name: "Embryo Development",
      description: "Day 3 cleavage and Day 5/6 blastocyst culture and grading.",
      stageType: "DEVELOPMENT",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Record blastocyst development and grading",
          description: "Gardner criteria grading (expansion, ICM, TE) on Day 5 and Day 6.",
          taskType: "REPORT_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 5,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Doctor assessment of blastocyst cohort",
          description: "Doctor reviews top-grade embryos available for transfer or cryopreservation.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 5,
          completionCondition: { type: "DOCTOR_REVIEW" },
        },
      ],
    },
    {
      name: "Fresh Transfer OR Freeze-All",
      description: "Conditional clinical branch point: fresh embryo transfer or total cryopreservation.",
      stageType: "BRANCH_POINT",
      completionStrategy: "DOCTOR_APPROVAL_REQUIRED",
      config: {
        isBranchPoint: true,
        branchVariable: "transferStrategy",
        options: [
          { key: "FRESH_TRANSFER", label: "Fresh Embryo Transfer", nextStage: "Embryo Transfer / FET" },
          { key: "FREEZE_ALL_FET", label: "Freeze-All Protocol (FET in subsequent cycle)", nextStage: "Embryo Transfer / FET" },
        ],
      },
      tasks: [
        {
          title: "Doctor clinical transfer strategy decision",
          description: "Doctor evaluates OHSS risk, progesterone elevation, and endometrium to select Fresh Transfer or Freeze-All.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "SELECT_TRANSFER_BRANCH",
        },
        {
          title: "Execute cryopreservation workflow if Freeze-All chosen",
          description: "Cryo straw documentation, tank storage location, and vitrification log if freezing all embryos.",
          taskType: "STAFF_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },
    {
      name: "Embryo Transfer / FET",
      description: "Ultrasound-guided embryo transfer procedure and catheter verification.",
      stageType: "TRANSFER",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Schedule embryo transfer appointment",
          description: "Coordinator books procedure suite, coordinates bladder filling instructions, and confirms attendance.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
        {
          title: "Pre-transfer bladder prep and instructions",
          description: "Patient drinks prescribed water 45 minutes prior to scan-guided transfer.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "NORMAL",
          dueTimingDays: 0,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "transfer_day_instructions",
              variables: ["patient_name", "transfer_time", "clinic_address", "doctor_name"],
            },
          },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
        },
        {
          title: "Perform embryo transfer procedure",
          description: "Doctor transfers selected embryo(s) into uterine cavity under abdominal ultrasound visualization.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "RECORD_TRANSFER_NOTES",
        },
      ],
    },
    {
      name: "Luteal Support / Waiting Period",
      description: "Post-transfer progesterone support, rest guidelines, and two-week wait check-in.",
      stageType: "LUTEAL_SUPPORT",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Luteal support medication adherence",
          description: "Daily progesterone administration (vaginal pessary, oral, or IM as prescribed by doctor).",
          taskType: "MEDICATION_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 1,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "luteal_support_reminder",
              variables: ["patient_name", "medication_name", "doctor_name"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "CONFIRM_LUTEAL_MEDICATION",
        },
        {
          title: "Mid-luteal patient wellness check-in",
          description: "Coordinator contacts couple to address questions, alleviate two-week wait anxiety, and confirm Beta-hCG date.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 7,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },
    {
      name: "Beta-hCG / Pregnancy Test",
      description: "Quantitative serum Beta-hCG test, report review, and initial pregnancy outcome evaluation.",
      stageType: "PREGNANCY_TEST",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Serum Beta-hCG blood test",
          description: "Quantitative serum Beta-hCG test drawn on Day 14 post-embryo transfer.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 14,
          communicationConfig: {
            whatsapp: {
              enabled: true,
              templateName: "betahcg_test_reminder",
              variables: ["patient_name", "test_date", "clinic_contact"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          completionCondition: { type: "REPORT_UPLOADED" },
          requiredAction: "UPLOAD_BETAHCG_REPORT",
        },
        {
          title: "Doctor clinical review of Beta-hCG level",
          description: "Doctor reviews Beta-hCG value (mIU/mL). Note: AI does NOT independently interpret pregnancy tests.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 14,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "REVIEW_PREGNANCY_TEST",
        },
      ],
    },
    {
      name: "Pregnancy Confirmation / Follow-up",
      description: "Repeat Beta-hCG doubling check, early viability ultrasound at 6–7 weeks gestation.",
      stageType: "PREGNANCY_FOLLOW_UP",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Viability scan appointment (6–7 weeks)",
          description: "Transvaginal scan to confirm intrauterine gestational sac, yolk sac, and fetal cardiac activity.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 28,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
        {
          title: "Doctor documentation of viability scan",
          description: "Doctor documents fetal heart rate and crown-rump length (CRL).",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 28,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "RECORD_VIABILITY_NOTES",
        },
      ],
    },
    {
      name: "Outcome / Closure",
      description: "Final journey outcome documentation, antenatal care transition or follow-up consultation.",
      stageType: "OUTCOME_CLOSURE",
      completionStrategy: "DOCTOR_APPROVAL_REQUIRED",
      tasks: [
        {
          title: "Doctor records cycle outcome and care disposition",
          description: "Doctor formally registers treatment outcome (Clinical Pregnancy Confirmed / Transition to OB-GYN / Negative outcome / Review consult scheduled).",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "RECORD_FINAL_OUTCOME",
        },
        {
          title: "Complete care plan closure or transition",
          description: "Coordinator completes discharge paperwork, schedules review consult if needed, or transitions to maternity.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 1,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },
  ],
};

export const IVF_FREEZE_ALL_PROTOCOL: SeedTemplateDef = {
  name: "IVF — Freeze-All Protocol",
  description: "Specialized protocol optimized for high responders, PCOS patients, or pre-implantation genetic testing (PGT-A) with elective cryopreservation.",
  specialty: "FERTILITY",
  type: "IVF",
  version: 1,
  isSystem: true,
  stages: IVF_STANDARD_JOURNEY.stages.slice(0, 11),
};

export const IVF_BASIC_JOURNEY: SeedTemplateDef = {
  name: "IVF — Basic Journey",
  description: "Standard 8-stage streamlined IVF pathway for routine straightforward cycles.",
  specialty: "FERTILITY",
  type: "IVF",
  version: 1,
  isSystem: true,
  stages: [
    IVF_STANDARD_JOURNEY.stages[0]!,
    IVF_STANDARD_JOURNEY.stages[1]!,
    IVF_STANDARD_JOURNEY.stages[2]!,
    IVF_STANDARD_JOURNEY.stages[4]!,
    IVF_STANDARD_JOURNEY.stages[6]!,
    IVF_STANDARD_JOURNEY.stages[7]!,
    IVF_STANDARD_JOURNEY.stages[11]!,
    IVF_STANDARD_JOURNEY.stages[13]!,
  ],
};
