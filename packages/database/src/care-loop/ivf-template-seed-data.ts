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
    channel?: string;
    whatsapp?: {
      enabled: boolean;
      templateName: string;
      variables: string[];
      buttons?: string[];
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
    type:
      | "PATIENT_CONFIRMATION"
      | "DOCTOR_REVIEW"
      | "REPORT_UPLOADED"
      | "APPOINTMENT_COMPLETED"
      | "STAFF_VERIFICATION"
      | "GATEWAY_WEBHOOK"
      | "ARRIVAL_CONFIRMATION";
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

/**
 * Standard 14-Stage Clinical IVF Care Loop Flow
 * Dedicated clinical execution engine (untouched appointment booking flow)
 */
export const IVF_CARE_LOOP_FLOW: SeedTemplateDef = {
  name: "IVF — Care Loop Clinical Flow",
  description: "Dedicated 14-stage IVF clinical execution companion from consultation completion through cycle outcome, featuring Next Action computing and strict medical guardrails.",
  specialty: "FERTILITY",
  type: "IVF",
  version: 2,
  isSystem: true,
  config: {
    branches: [
      {
        stageIndex: 2,
        name: "IVF Decision Milestone",
        options: ["IVF_RECOMMENDED", "IUI_RECOMMENDED", "FURTHER_INVESTIGATION", "TREATMENT_DEFERRED", "PATIENT_UNDECIDED"],
      },
      {
        stageIndex: 10,
        name: "Transfer Strategy Branch",
        options: ["FRESH_TRANSFER", "FREEZE_ALL_FET"],
      },
      {
        stageIndex: 13,
        name: "Cycle Outcome Branch",
        options: ["POSITIVE", "UNSUCCESSFUL", "OTHER"],
      },
    ],
  },
  stages: [
    // 1. Initial Consultation
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
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "patient_welcome_onboarding",
              variables: ["patient_name", "clinic_name", "portal_link"],
              buttons: ["View My Tasks", "Talk to Team"],
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

    // 2. Fertility Workup
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
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "lab_investigation_reminder",
              variables: ["patient_name", "test_names", "lab_timings", "clinic_contact"],
              buttons: ["View Appointment", "Upload Report"],
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
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "semen_analysis_instructions",
              variables: ["patient_name", "clinic_contact"],
              buttons: ["Upload Report", "Need Help"],
            },
          },
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

    // 3. IVF Decision Milestone
    {
      name: "IVF Decision",
      description: "Doctor clinical decision milestone evaluating workup results and defining treatment roadmap.",
      stageType: "DECISION_MILESTONE",
      completionStrategy: "DOCTOR_APPROVAL_REQUIRED",
      config: {
        isDecisionMilestone: true,
        options: ["IVF", "IUI", "FURTHER_INVESTIGATION", "TREATMENT_DEFERRED", "PATIENT_UNDECIDED"],
      },
      tasks: [
        {
          title: "Doctor clinical pathway decision",
          description: "Doctor determines whether couple proceeds to IVF, IUI, deferred treatment, or further workup.",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "SELECT_IVF_DECISION",
        },
        {
          title: "Coordinator counseling for undecided patients",
          description: "If patient is undecided, Care Loop stops automated reminders and routes to human coordinator for compassionate conversation.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 1,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },

    // 4. Treatment Planning & Consent
    {
      name: "IVF Treatment Planning & Consent",
      description: "Doctor specifies stimulation protocol; coordinator collects informed consent and validates package financial clearance.",
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
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "consent_signing_request",
              variables: ["patient_name", "consent_name", "doctor_name"],
              buttons: ["Complete Consent", "Talk to Team"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 48, escalateTo: "COORDINATOR", escalationType: "NO_RESPONSE" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
        },
        {
          title: "Package payment verification via payment gateway",
          description: "Financial clearance confirmed via gateway webhook. Patient saying 'I paid' does not mark this task completed.",
          taskType: "PATIENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 2,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "package_payment_link",
              variables: ["patient_name", "amount", "payment_link"],
              buttons: ["Pay Now", "Talk to Team"],
            },
          },
          completionCondition: { type: "GATEWAY_WEBHOOK" },
          requiredAction: "VERIFY_PAYMENT_WEBHOOK",
        },
      ],
    },

    // 5. Cycle Preparation Checklist
    {
      name: "Cycle Preparation",
      description: "Dynamic checklist: Day 1 notification, baseline scan, estradiol assessment, injection education, and medication clearance.",
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
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "cycle_day1_checkin",
              variables: ["patient_name", "clinic_contact"],
              buttons: ["Confirm Day 1", "Need Help"],
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
          title: "Injection education & administration counseling",
          description: "Nurse or coordinator provides in-clinic or video injection training for gonadotropin pens.",
          taskType: "STAFF_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 2,
          completionCondition: { type: "STAFF_VERIFICATION" },
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

    // 6. Ovarian Stimulation - Daily Companion
    {
      name: "Ovarian Stimulation",
      description: "Daily scheduled gonadotropin injections, adherence tracking, patient check-in, and dosage safety guardrails.",
      stageType: "STIMULATION",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Daily stimulation injection confirmation",
          description: "Daily scheduled gonadotropin injection (dose, route, and time specified by doctor prescription).",
          taskType: "MEDICATION_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 1,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "medication_reminder",
              variables: ["patient_name", "medication_name", "dose", "scheduled_time", "doctor_name"],
              buttons: ["I've Taken It", "Need Help"],
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

    // 7. Follicular Monitoring
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
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "scan_appointment_reminder",
              variables: ["patient_name", "scan_date", "scan_time", "doctor_name"],
              buttons: ["View Appointment", "Reschedule"],
            },
          },
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

    // 8. Trigger Injection - Highest Urgency
    {
      name: "Trigger",
      description: "Critical final oocyte maturation injection (hCG / GnRH agonist) with exact timing and stored confirmation minute.",
      stageType: "TRIGGER",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      config: { criticalMilestone: true },
      tasks: [
        {
          title: "Doctor prescribes trigger injection & exact minute",
          description: "Doctor specifies trigger drug, dose, and exact administration time (typically 34–36 hours prior to retrieval).",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "PRESCRIBE_TRIGGER",
        },
        {
          title: "Urgent trigger timing confirmation with couple",
          description: "Coordinator contacts couple to reinforce strict adherence to the prescribed trigger minute.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "CLINICAL",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Trigger injection administration & minute verification",
          description: "Patient administers trigger injection and confirms exact minute taken. Timestamp stored for OPU readiness.",
          taskType: "MEDICATION_TASK",
          ownerRole: "PATIENT",
          priority: "CLINICAL",
          dueTimingDays: 0,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "trigger_injection_urgent",
              variables: ["patient_name", "medication_name", "exact_time", "retrieval_date", "clinic_emergency_number"],
              buttons: ["I've Taken It", "Need Help", "I'm Ready"],
            },
          },
          reminderConfig: { remindAtHours: 1, channel: "WHATSAPP" },
          escalationConfig: { escalateAfterHours: 1, escalateTo: "DOCTOR", escalationType: "CLINICAL" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "CONFIRM_TRIGGER_MINUTE",
        },
      ],
    },

    // 9. OPU / Egg Retrieval
    {
      name: "Egg Retrieval",
      description: "Transvaginal ovum pickup procedure under conscious sedation / anesthesia with arrival check-in.",
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
          title: "Patient arrival check-in at clinic",
          description: "Patient taps [I've Arrived] upon reaching the clinic on day of procedure.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "HIGH",
          dueTimingDays: 0,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "opu_arrival_prompt",
              variables: ["patient_name", "arrival_time", "clinic_address"],
              buttons: ["I've Arrived", "Need Help"],
            },
          },
          completionCondition: { type: "ARRIVAL_CONFIRMATION" },
          requiredAction: "CONFIRM_ARRIVAL",
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
          title: "Embryology handoff & partner semen collection",
          description: "Follicular aspirates delivered to IVF lab; partner sample prepared for insemination.",
          taskType: "STAFF_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },

    // 10. Embryology
    {
      name: "Fertilization / Embryology",
      description: "IVF laboratory execution (kept internal). Patient receives only clinic-approved progress summaries.",
      stageType: "EMBRYOLOGY",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      tasks: [
        {
          title: "Record oocyte count and maturity (Internal Lab)",
          description: "Embryology records total oocytes retrieved and MII / MI / GV distribution.",
          taskType: "REPORT_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Day 1 fertilization check 2PN (Internal Lab)",
          description: "Assessment of pronuclei at 16–18 hours post-insemination/ICSI.",
          taskType: "REPORT_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 1,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Approved patient-facing embryology update",
          description: "Care coordinator dispatches doctor-approved patient update via WhatsApp.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 1,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "embryology_patient_update",
              variables: ["patient_name", "doctor_name"],
              buttons: ["View Update", "Talk to Team"],
            },
          },
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Day 5/6 blastocyst grading (Internal Lab)",
          description: "Gardner criteria grading (expansion, ICM, TE) on Day 5 and Day 6.",
          taskType: "REPORT_TASK",
          ownerRole: "STAFF",
          priority: "HIGH",
          dueTimingDays: 5,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },

    // 11. Embryo Transfer / FET
    {
      name: "Embryo Transfer / FET",
      description: "Branching: Fresh Transfer vs Freeze-All / FET. Ultrasound-guided transfer procedure and arrival check-in.",
      stageType: "TRANSFER",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
      config: {
        isBranchPoint: true,
        branchVariable: "transferStrategy",
        options: [
          { key: "FRESH_TRANSFER", label: "Fresh Embryo Transfer" },
          { key: "FREEZE_ALL_FET", label: "Freeze-All Protocol (FET subsequent cycle)" },
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
          title: "Schedule embryo transfer appointment",
          description: "Coordinator books procedure suite, coordinates bladder filling instructions, and confirms attendance.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
        {
          title: "Transfer day bladder prep and arrival check-in",
          description: "Patient drinks prescribed water 45 min before transfer and taps [I've Arrived] at the clinic.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "NORMAL",
          dueTimingDays: 0,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "transfer_day_instructions",
              variables: ["patient_name", "transfer_time", "clinic_address", "doctor_name"],
              buttons: ["I've Arrived", "View Instructions"],
            },
          },
          completionCondition: { type: "ARRIVAL_CONFIRMATION" },
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

    // 12. Post-Transfer Support
    {
      name: "Post-Transfer Support",
      description: "Continuous 2-week support: luteal progesterone adherence, Day 1 & Day 3 well-being check-ins, and symptom alerts.",
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
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "luteal_support_reminder",
              variables: ["patient_name", "medication_name", "doctor_name"],
              buttons: ["I've Taken It", "Need Help"],
            },
          },
          reminderConfig: { remindAtHours: 24, channel: "WHATSAPP" },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
          requiredAction: "CONFIRM_LUTEAL_MEDICATION",
        },
        {
          title: "Day 1 post-transfer well-being check-in",
          description: "WhatsApp interactive prompt checking in on patient symptoms and comfort.",
          taskType: "PATIENT_TASK",
          ownerRole: "PATIENT",
          priority: "NORMAL",
          dueTimingDays: 1,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "post_transfer_day1_checkin",
              variables: ["patient_name", "clinic_contact"],
              buttons: ["I'm Feeling Fine", "I Have a Concern"],
            },
          },
          completionCondition: { type: "PATIENT_CONFIRMATION" },
        },
        {
          title: "Day 3 post-transfer coordination follow-up",
          description: "Coordinator check-in to answer non-clinical questions and reinforce rest guidelines.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 3,
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
      ],
    },

    // 13. Beta-hCG / Pregnancy Test
    {
      name: "Beta-hCG / Pregnancy Test",
      description: "Quantitative serum Beta-hCG test drawn on Day 14. AI strictly gated from independent announcement.",
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
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "betahcg_test_reminder",
              variables: ["patient_name", "test_date", "clinic_contact"],
              buttons: ["I've Done the Test", "Upload Report"],
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

    // 14. Cycle Outcome
    {
      name: "Outcome / Closure",
      description: "Doctor registers treatment outcome (Positive vs Unsuccessful). Empathetic human routing for negative cycles; never auto-push next cycle.",
      stageType: "OUTCOME_CLOSURE",
      completionStrategy: "DOCTOR_APPROVAL_REQUIRED",
      tasks: [
        {
          title: "Doctor records cycle outcome and care disposition",
          description: "Doctor formally registers treatment outcome (Positive / Unsuccessful / Other).",
          taskType: "DOCTOR_TASK",
          ownerRole: "DOCTOR",
          priority: "HIGH",
          dueTimingDays: 0,
          completionCondition: { type: "DOCTOR_REVIEW" },
          requiredAction: "RECORD_FINAL_OUTCOME",
        },
        {
          title: "Empathetic counselor follow-up if unsuccessful",
          description: "If cycle is unsuccessful, coordinator or counselor schedules human consultation. System strictly blocked from automated cycle re-prompts.",
          taskType: "COORDINATOR_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "NORMAL",
          dueTimingDays: 1,
          communicationConfig: {
            channel: "WHATSAPP",
            whatsapp: {
              enabled: true,
              templateName: "outcome_empathic_followup",
              variables: ["patient_name", "doctor_name"],
              buttons: ["Schedule a Call", "Talk to Care Team"],
            },
          },
          completionCondition: { type: "STAFF_VERIFICATION" },
        },
        {
          title: "Early viability scan appointment if positive",
          description: "Transvaginal scan at 6–7 weeks gestation confirming fetal heart rate and CRL for positive pregnancies.",
          taskType: "APPOINTMENT_TASK",
          ownerRole: "CARE_COORDINATOR",
          priority: "HIGH",
          dueTimingDays: 14,
          completionCondition: { type: "APPOINTMENT_COMPLETED" },
        },
      ],
    },
  ],
};

// Aliases for compatibility with existing tests
export const IVF_STANDARD_JOURNEY: SeedTemplateDef = IVF_CARE_LOOP_FLOW;

export const IVF_FREEZE_ALL_PROTOCOL: SeedTemplateDef = {
  name: "IVF — Freeze-All Protocol",
  description: "Specialized protocol optimized for high responders, PCOS patients, or pre-implantation genetic testing (PGT-A) with elective cryopreservation.",
  specialty: "FERTILITY",
  type: "IVF",
  version: 2,
  isSystem: true,
  stages: IVF_CARE_LOOP_FLOW.stages.slice(0, 11),
};

export const IVF_BASIC_JOURNEY: SeedTemplateDef = {
  name: "IVF — Basic Journey",
  description: "Standard 8-stage streamlined IVF pathway for routine straightforward cycles.",
  specialty: "FERTILITY",
  type: "IVF",
  version: 2,
  isSystem: true,
  stages: [
    IVF_CARE_LOOP_FLOW.stages[0]!,
    IVF_CARE_LOOP_FLOW.stages[1]!,
    IVF_CARE_LOOP_FLOW.stages[2]!,
    IVF_CARE_LOOP_FLOW.stages[4]!,
    IVF_CARE_LOOP_FLOW.stages[5]!,
    IVF_CARE_LOOP_FLOW.stages[6]!,
    IVF_CARE_LOOP_FLOW.stages[10]!,
    IVF_CARE_LOOP_FLOW.stages[12]!,
  ],
};
