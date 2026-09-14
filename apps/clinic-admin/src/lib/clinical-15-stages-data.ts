import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  HeartHandshake,
  MessageCircle,
  Microscope,
  PhoneCall,
  Sparkles,
  Stethoscope,
  TestTube2,
  UserCheck,
  Video,
} from "lucide-react";

export type MediaItem =
  | {
      type: "doctor_cards";
      doctors: Array<{
        name: string;
        role: string;
        experience: string;
        specialty?: string;
        cycles?: string;
      }>;
    }
  | {
      type: "selected_doctor";
      doctor: {
        name: string;
        role: string;
        experience: string;
        cycles: string;
        specialties: string;
      };
    }
  | {
      type: "payment_card";
      amount: string;
      label: string;
      breakdown?: string;
    }
  | {
      type: "pdf";
      title: string;
      date?: string;
      pages?: string;
    }
  | {
      type: "video";
      title: string;
      duration: string;
    }
  | {
      type: "consents";
      forms: Array<{ name: string; status: string }>;
    }
  | {
      type: "checklist";
      completed: number;
      total: number;
      items: string[];
    }
  | {
      type: "embryo_stats";
      retrieved: number;
      fertilized: number;
      developing: string;
    }
  | {
      type: "lab_center";
      name: string;
      location: string;
      hours: string;
    };

export type WhatsAppStepDialogue = {
  id: string;
  stepTitle: string;
  sender: "bot" | "patient";
  time: string;
  text: string;
  media?: MediaItem;
  buttons?: Array<{ id: string; label: string; actionReply?: string }>;
};

export type ClinicalStageSpec = {
  stepNumber: number;
  shortCode: string;
  title: string;
  subtitle: string;
  goal: string;
  badge: string;
  colorScheme: {
    primary: string;
    badgeBg: string;
    border: string;
    accent: string;
  };

  // Column 1: Triggers & Objectives
  triggers: Array<{ icon: string; text: string }>;
  objectives: string[];
  dataCollected: string[];
  keyIntegrations: string[];

  // Column 2: WhatsApp Interactive Flow
  whatsappFlow: WhatsAppStepDialogue[];

  // Column 3: AI Calling Flow
  aiCallingFlow: {
    triggerCondition: string;
    agentPersona: {
      name: string;
      role: string;
      avatar: string;
      languages: string[];
    };
    scripts: {
      en: string;
      hi: string;
      te: string;
    };
    patientVoiceResponses: string[];
    aiDecisionAndAction: string[];
    callSummaryLogged: {
      outcomeTags: string[];
      systemUpdates: string[];
    };
  };

  // Column 4: System Actions & Operational Control
  systemActions: string[];
  followUpReminders: Array<{ timing: string; action: string }>;
  expectedOutcomes: string[];
  exceptions: Array<{
    scenario: string;
    resolution: string;
    simulateKey?: string;
  }>;
};

export const CLINICAL_15_STAGES: ClinicalStageSpec[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: LEAD / APPOINTMENT (image 1.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 1,
    shortCode: "01",
    title: "Step 1 – Lead / Appointment",
    subtitle: "From First Enquiry to Confirmed Appointment – via WhatsApp or Call",
    goal: "Capture enquiry, register patient, book appointment, confirm, send reminders and ensure attendance.",
    badge: "Enquiry & Booking",
    colorScheme: {
      primary: "text-blue-600",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
      border: "border-blue-500",
      accent: "bg-blue-500",
    },
    triggers: [
      { icon: "MessageSquare", text: "Patient sends a message 'Hi / I want an appointment'" },
      { icon: "PhoneCall", text: "Patient requests a call" },
      { icon: "Globe", text: "Website form submission" },
      { icon: "Megaphone", text: "Ad campaign (Click to WhatsApp)" },
      { icon: "UserPlus", text: "Staff creates lead manually in CRM" },
      { icon: "MessagesSquare", text: "Existing patient messages clinic helpline" },
    ],
    objectives: [
      "Understand patient need and fertility history",
      "Collect basic details and KYC requirements",
      "Identify new or existing patient in HMS",
      "Show and help choose appropriate fertility doctor",
      "Check real-time doctor slot availability",
      "Book appointment slot with instant hold",
      "Confirm consultation fee payment (₹1,000)",
      "Send immediate confirmation and calendar reminders",
      "Ensure high patient show-up rate",
    ],
    dataCollected: [
      "Patient full name",
      "Mobile number (WhatsApp)",
      "Partner name & mobile (optional)",
      "Email address",
      "City / Location",
      "Preferred appointment date & slot",
      "Reason for visit / primary concern",
      "Consent for communication & digital records",
    ],
    keyIntegrations: [
      "Doctor Calendar & Slot Engine",
      "HIS / EMR (Existing patient lookup)",
      "Payment Gateway (Razorpay / Cashfree ₹1,000 hold)",
      "WhatsApp Cloud API (Meta Interactive Messages)",
      "CRM / Lead Management Pipeline",
    ],
    whatsappFlow: [
      {
        id: "w1_1",
        stepTitle: "1. Welcome & Identify Need",
        sender: "bot",
        time: "10:00 AM",
        text: "👋 Hi! Welcome to SmrkoMed.\nHow can I help you today?",
        buttons: [
          { id: "book_appt", label: "📅 Book Appointment", actionReply: "I want to book an appointment" },
          { id: "ask_question", label: "❓ Ask a Question", actionReply: "I have a question about fertility" },
          { id: "talk_team", label: "💬 Talk to a Team Member", actionReply: "Please connect me to coordinator" },
        ],
      },
      {
        id: "w1_2",
        stepTitle: "2. Choose Mode",
        sender: "bot",
        time: "10:00 AM",
        text: "Would you like to continue booking your appointment here on WhatsApp or would you prefer a call from our AI assistant?",
        buttons: [
          { id: "mode_whatsapp", label: "💬 Continue on WhatsApp", actionReply: "Continue on WhatsApp" },
          { id: "mode_call", label: "📞 Get a Call", actionReply: "Please have AI call me" },
        ],
      },
      {
        id: "w1_3",
        stepTitle: "3. New or Existing Patient",
        sender: "bot",
        time: "10:01 AM",
        text: "Are you an existing patient with us?",
        buttons: [
          { id: "existing_yes", label: "Yes, I am", actionReply: "Yes, I am an existing patient" },
          { id: "existing_no", label: "No, I am new", actionReply: "No, I am new here" },
        ],
      },
      {
        id: "w1_4",
        stepTitle: "4. Collect Basic Details (If New)",
        sender: "bot",
        time: "10:02 AM",
        text: "Great! Please share a few details to register you:\n\n👤 Your name:\n📱 Mobile number:\n👤 Partner name (optional):\n📱 Partner mobile (optional):\n📍 City / Location:",
      },
      {
        id: "w1_5",
        stepTitle: "5. Show Doctor Options",
        sender: "bot",
        time: "10:03 AM",
        text: "Here are our fertility specialists. Please choose a doctor:",
        media: {
          type: "doctor_cards",
          doctors: [
            { name: "Dr. Aditi Sharma", role: "Fertility Specialist", experience: "12+ years experience" },
            { name: "Dr. Rohit Mehta", role: "IVF Specialist", experience: "15+ years experience" },
            { name: "Dr. Neha Kapoor", role: "Reproductive Endocrinologist", experience: "10+ years experience" },
          ],
        },
        buttons: [
          { id: "doc_aditi", label: "Dr. Aditi Sharma", actionReply: "Selected Dr. Aditi Sharma" },
          { id: "doc_rohit", label: "Dr. Rohit Mehta", actionReply: "Selected Dr. Rohit Mehta" },
          { id: "doc_neha", label: "Dr. Neha Kapoor", actionReply: "Selected Dr. Neha Kapoor" },
        ],
      },
      {
        id: "w1_6",
        stepTitle: "6. Doctor Details (After Selection)",
        sender: "bot",
        time: "10:03 AM",
        text: "Doctor Profile Summary:",
        media: {
          type: "selected_doctor",
          doctor: {
            name: "Dr. Aditi Sharma",
            role: "Fertility Specialist",
            experience: "12+ years experience",
            cycles: "5000+ IVF cycles",
            specialties: "IVF, IUI, PCOS, Recurrent Implantation Failure",
          },
        },
        buttons: [
          { id: "see_slots", label: "🗓️ See Available Slots", actionReply: "Show available slots" },
          { id: "choose_another", label: "🔄 Choose Another Doctor", actionReply: "Show other doctors" },
        ],
      },
      {
        id: "w1_7",
        stepTitle: "7. Select Date & Payment",
        sender: "bot",
        time: "10:04 AM",
        text: "Please select a date and pay ₹1,000 consultation fee to confirm your appointment.",
        media: {
          type: "payment_card",
          amount: "₹1,000",
          label: "Initial Consultation Booking Fee",
          breakdown: "Consultation + Ultrascreen review included",
        },
        buttons: [
          { id: "pay_now", label: "💳 Pay ₹1,000", actionReply: "Proceed to pay ₹1,000" },
          { id: "show_slots", label: "📅 Show Available Slots", actionReply: "Change slot" },
        ],
      },
      {
        id: "w1_8",
        stepTitle: "11. Confirmation",
        sender: "bot",
        time: "10:07 AM",
        text: "✅ *Your appointment is confirmed!*\n\nWe look forward to seeing you.\nA confirmation has been sent to your WhatsApp and email.",
        buttons: [
          { id: "add_calendar", label: "📅 Add to Calendar", actionReply: "Added to calendar" },
          { id: "get_directions", label: "📍 Get Directions", actionReply: "Clinic location map" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient selects 'Get a Call' or leaves form uncompleted",
      agentPersona: {
        name: "Smrko Assistant",
        role: "Appointment Concierge",
        avatar: "🤖",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling to help you book your appointment. May I know your name and preferred timing?",
        hi: "नमस्ते, मैं SmrkoMed से बोल रहा हूँ। आपका डॉक्टर अप्वाइंटमेंट बुक करने में सहायता के लिए कॉल किया है। क्या मैं आपका शुभ नाम जान सकता हूँ?",
        te: "నమస్కారం, నేను SmrkoMed నుండి మాట్లాడుతున్నాను. మీ డాక్టర్ అపాయింట్‌మెంట్ బుకింగ్ కోసం కాల్ చేసాము. మీ పేరు మరియు అనుకూలమైన సమయం తెలుపగలరా?",
      },
      patientVoiceResponses: [
        "Patient gives name & preferred date",
        "Patient asks doctor fees or specialization",
        "Patient requests coordinator callback",
      ],
      aiDecisionAndAction: [
        "AI checks real-time calendar and locks slot",
        "AI sends payment link via WhatsApp SMS instantly",
        "AI creates patient record in EMR",
      ],
      callSummaryLogged: {
        outcomeTags: ["SLOT_HELD", "PAYMENT_LINK_SENT", "NEW_PATIENT_REGISTERED"],
        systemUpdates: ["Slot locked for 15 mins", "Lead status set to QUALIFIED"],
      },
    },
    systemActions: [
      "Check if patient exists in HMS/CRM",
      "Create new patient record (if new)",
      "Check real-time doctor availability",
      "Hold slot temporarily (15 mins)",
      "Create appointment in calendar",
      "Generate Razorpay/Cashfree payment link",
      "Update appointment status to CONFIRMED",
      "Send confirmation message (WhatsApp + Email)",
      "Create reminder tasks in queue",
      "Notify front-desk staff",
    ],
    followUpReminders: [
      { timing: "Immediately", action: "Appointment confirmation card with map" },
      { timing: "24 hours before", action: "Reminder with clinic checklist & timing" },
      { timing: "2 hours before", action: "Final reminder & live location navigation" },
      { timing: "If no confirmation", action: "Follow-up WhatsApp message & AI call" },
      { timing: "After appointment", action: "Feedback request & prescription sync" },
    ],
    expectedOutcomes: [
      "Higher conversion from enquiries to appointments",
      "Fewer missed appointments & no-shows",
      "Better patient onboarding experience",
      "Accurate patient data in EMR",
      "Automated calendar management",
    ],
    exceptions: [
      { scenario: "No response from patient", resolution: "Auto follow-up in 2h -> AI call -> Staff task", simulateKey: "NO_RESPONSE" },
      { scenario: "Patient asks complex questions", resolution: "AI answers from clinical KB or routes to care coordinator", simulateKey: "KB_QUERY" },
      { scenario: "No suitable slots found", resolution: "Offer next available date or priority waitlist", simulateKey: "SLOT_CONFLICT" },
      { scenario: "Payment failed", resolution: "Auto retry link sent via WhatsApp -> Alert coordinator", simulateKey: "PAYMENT_FAILED" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: INITIAL CONSULTATION (image 2.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 2,
    shortCode: "02",
    title: "Step 2 – Initial Consultation",
    subtitle: "Meet the doctor, share history, discuss options and create the care plan",
    goal: "Complete the initial fertility consultation, understand the patient's history, review reports, create the next plan (investigations or direct IVF).",
    badge: "Doctor Consultation",
    colorScheme: {
      primary: "text-indigo-600",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      border: "border-indigo-500",
      accent: "bg-indigo-500",
    },
    triggers: [
      { icon: "CalendarCheck", text: "Patient appointment is scheduled" },
      { icon: "UserCheck", text: "Patient checks in at clinic reception" },
      { icon: "CheckSquare", text: "Patient confirms appointment via WhatsApp" },
      { icon: "Users", text: "Walk-in couple is registered" },
      { icon: "CalendarRange", text: "Rescheduled appointment reaches consult date" },
      { icon: "Video", text: "Teleconsultation video room initialized" },
    ],
    objectives: [
      "Collect detailed medical and fertility history",
      "Review previous diagnostic reports and scans",
      "Understand couple's personal fertility goals",
      "Conduct clinical pelvic examination and initial scan",
      "Doctor recommends next steps (workup vs direct IVF)",
      "Create personalized care plan and tasks in SmrkoMed",
      "Ensure couple feels supported, informed, and confident",
    ],
    dataCollected: [
      "Medical history (Female & Partner)",
      "Previous fertility treatments & IUI/IVF history",
      "Menstrual & reproductive history",
      "Lifestyle details (BMI, smoking, stress, diet)",
      "Previous lab reports (AMH, semen analysis, TSH)",
      "Allergies & chronic medical conditions",
      "Consent for treatment planning & communications",
    ],
    keyIntegrations: [
      "Calendar (Appointment check-in)",
      "HIS / EMR (Patient clinical record)",
      "Documents & Reports module (OCR & PDF storage)",
      "CRM (Lead to patient conversion)",
      "WhatsApp Communication Engine",
    ],
    whatsappFlow: [
      {
        id: "w2_1",
        stepTitle: "1. Appointment Reminder (24 hours before)",
        sender: "bot",
        time: "10:00 AM",
        text: "👋 Hi Priya,\nThis is a reminder for your fertility consultation tomorrow at 10:00 AM with Dr. Aditi Sharma at Nova IVF Centre.\nPlease confirm if you will be attending.",
        buttons: [
          { id: "confirm_yes", label: "✅ Yes, I'll come", actionReply: "Yes, I will attend" },
          { id: "reschedule", label: "📅 Need to Reschedule", actionReply: "Please reschedule my visit" },
        ],
      },
      {
        id: "w2_2",
        stepTitle: "2. Day of Appointment – Check-in Reminder",
        sender: "bot",
        time: "8:00 AM",
        text: "Hi Priya,\nYour appointment with Dr. Aditi Sharma is today at 10:00 AM. Please reach 10 minutes early. Let us know if you need any help finding the clinic.",
        buttons: [
          { id: "on_way", label: "🚗 I'm on my way", actionReply: "I'm on my way" },
          { id: "directions", label: "📍 Call for directions", actionReply: "Need directions to clinic" },
        ],
      },
      {
        id: "w2_3",
        stepTitle: "3. Pre-Consultation Information",
        sender: "bot",
        time: "8:30 AM",
        text: "To help the doctor understand your case better, please fill this short form before your consultation.",
        buttons: [
          { id: "fill_form", label: "📝 Fill Pre-Consultation Form", actionReply: "Opening medical form" },
        ],
      },
      {
        id: "w2_4",
        stepTitle: "4. Upload Previous Reports (if any)",
        sender: "bot",
        time: "8:35 AM",
        text: "If you have any previous reports (blood tests, scans, etc.), you can upload them here. This will help the doctor.",
        buttons: [
          { id: "upload_rep", label: "📤 Upload Reports", actionReply: "Uploading reports" },
        ],
      },
      {
        id: "w2_5",
        stepTitle: "5. Post-Consultation Summary",
        sender: "bot",
        time: "11:30 AM",
        text: "Thank you for meeting with Dr. Aditi Sharma today.\nHere is a summary of your consultation:\n\nKey Discussion Points:\n• Reviewed medical and fertility history\n• Discussed your concerns and goals\n• Reviewed available options\n\nNext Steps:\n• Complete recommended investigations\n• Upload reports once done\n• Schedule follow-up consultation",
        buttons: [
          { id: "view_plan", label: "📄 View Your Plan", actionReply: "Opening treatment plan" },
        ],
      },
      {
        id: "w2_6",
        stepTitle: "6. Education & Support",
        sender: "bot",
        time: "11:35 AM",
        text: "We have shared some helpful resources to help you understand the next steps:\n\n📑 Understanding Fertility Tests\n▶️ Lifestyle Tips for Fertility\n❓ Common Questions (FAQ)",
      },
      {
        id: "w2_7",
        stepTitle: "7. Any Questions?",
        sender: "bot",
        time: "11:36 AM",
        text: "Do you have any questions from today's consultation? You can type here or choose an option below.",
        buttons: [
          { id: "ask_doc", label: "❓ Ask a Question", actionReply: "I have a question for the doctor" },
          { id: "talk_nurse", label: "💬 Talk to a Team Member", actionReply: "Connect me to nurse" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient doesn't confirm 24h WhatsApp reminder",
      agentPersona: {
        name: "Smrko Care AI",
        role: "Consultation Coordinator",
        avatar: "👩‍⚕️",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling on behalf of Nova IVF Centre. This is a reminder for your consultation with Dr. Aditi Sharma today at 10:00 AM. Will you be attending?",
        hi: "नमस्ते, मैं SmrkoMed से कॉल कर रही हूँ। आज सुबह 10:00 बजे डॉ. अदिति शर्मा के साथ आपकी कंसल्टेशन का रिमाइंडर है। क्या आप आ रहे हैं?",
        te: "నమస్కారం, SmrkoMed నుండి డాక్టర్ అదితి శర్మ గారితో ఈ రోజు ఉదయం 10:00 గంటల కన్సల్టేషన్ గురించి కాల్ చేస్తున్నాము. మీరు హాజరవుతున్నారా?",
      },
      patientVoiceResponses: [
        "Press 1 – Yes, I will attend",
        "Press 2 – Need to reschedule",
        "Press 3 – Talk to team member",
      ],
      aiDecisionAndAction: [
        "AI confirms appointment and shares clinic navigation",
        "If reschedule requested, opens live doctor slots",
        "Logs call recording and summary to EMR timeline",
      ],
      callSummaryLogged: {
        outcomeTags: ["CONSULT_CONFIRMED", "CLINIC_DIRECTIONS_SENT"],
        systemUpdates: ["Check-in status: CONFIRMED_ATTENDANCE"],
      },
    },
    systemActions: [
      "Update appointment status to ARRIVED/IN_CONSULT",
      "Send pre-consultation form link via WhatsApp",
      "Store uploaded past reports in patient record",
      "Prepare doctor's clinical dashboard with patient context",
      "Create tasks based on doctor's clinical plan",
      "Send post-consultation summary card",
      "Update patient stage to 'Fertility Workup'",
      "Notify care coordinator for follow-up tracking",
    ],
    followUpReminders: [
      { timing: "Immediately", action: "Post-consultation summary card" },
      { timing: "1 day later", action: "Reminder to complete investigations" },
      { timing: "3 days later", action: "Follow-up on pending diagnostic reports" },
      { timing: "7 days later", action: "Check if couple has any questions" },
      { timing: "As per plan", action: "Next appointment booking prompt" },
    ],
    expectedOutcomes: [
      "Patient attends consultation on time",
      "Complete medical history documented in EMR",
      "Doctor creates diagnostic or treatment orders",
      "Couple understands clinical roadmap clearly",
      "Seamless progression to Investigation stage",
    ],
    exceptions: [
      { scenario: "Patient doesn't confirm", resolution: "Auto reminder -> AI voice call -> Coordinator ping", simulateKey: "NO_CONFIRM" },
      { scenario: "Patient reschedules", resolution: "Update calendar -> Auto-send new confirmation", simulateKey: "RESCHEDULE" },
      { scenario: "Patient doesn't upload past reports", resolution: "Gentle reminder -> Offer in-clinic scanning", simulateKey: "REPORTS_PENDING" },
      { scenario: "Urgent medical question", resolution: "AI triages and escalates to duty doctor immediately", simulateKey: "URGENT_QUERY" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: FERTILITY WORKUP / INVESTIGATION (image 3.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 3,
    shortCode: "03",
    title: "Step 3 – Fertility Investigation / Workup",
    subtitle: "Complete required tests, upload reports and get them reviewed – with continuous support.",
    goal: "Ensure all doctor-recommended investigations are completed, reports are collected, reviewed and patient is ready for treatment planning.",
    badge: "Diagnostic Workup",
    colorScheme: {
      primary: "text-teal-600",
      badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
      border: "border-teal-500",
      accent: "bg-teal-500",
    },
    triggers: [
      { icon: "FilePlus", text: "Doctor creates investigation orders list" },
      { icon: "MessageCircle", text: "Patient receives investigation plan on WhatsApp" },
      { icon: "Clock", text: "Individual test schedule reminders trigger" },
      { icon: "UploadCloud", text: "Patient uploads diagnostic report photo/PDF" },
      { icon: "FileCheck", text: "Report received automatically from LIS integration" },
      { icon: "AlertCircle", text: "Report pending beyond scheduled due date" },
    ],
    objectives: [
      "Ensure all recommended fertility tests are completed",
      "Guide patient with clear fasting & timing instructions",
      "Collect and organize reports in structured EMR",
      "Track pending investigations with automated nudges",
      "Notify doctor for timely clinical review",
      "Identify abnormal markers early (AMH, semen DFI, TSH)",
      "Transition patient to IVF Decision stage smoothly",
    ],
    dataCollected: [
      "List of investigations ordered (AMH, FSH, LH, Semen, USG)",
      "Test due dates and cycle day timing (Day 2-5)",
      "Preferred lab location (partner lab vs home collection)",
      "Report files (PDF / image scans)",
      "Report upload timestamps",
      "Abnormal flags (low AMH, oligozoospermia, thyroid)",
      "Doctor review notes & sign-off",
    ],
    keyIntegrations: [
      "Laboratory Information System (LIS) integration",
      "HIS / EMR test orders module",
      "WhatsApp file receiver & OCR ingestion",
      "Payment gateway for diagnostic packages",
      "Document management system",
    ],
    whatsappFlow: [
      {
        id: "w3_1",
        stepTitle: "1. Investigation Plan Shared",
        sender: "bot",
        time: "10:05 AM",
        text: "👋 Hi Priya,\nBased on your consultation with Dr. Aditi Sharma, the following investigations have been recommended:\n\n✅ Blood tests (Day 2–5)\n✅ Hormonal profile (AMH, FSH, LH, etc.)\n✅ Ultrasound (TVS)\n✅ Semen analysis (for your partner)\n✅ Infectious disease screening\n\nYou can view the full list and instructions below.",
        buttons: [
          { id: "view_test_details", label: "📋 View Test Details", actionReply: "View test details" },
          { id: "ask_test_q", label: "❓ Ask a Question", actionReply: "Question about tests" },
        ],
      },
      {
        id: "w3_2",
        stepTitle: "2. Test Instructions",
        sender: "bot",
        time: "10:06 AM",
        text: "Blood Test Instructions:\n• Please do the test between Day 2–5 of your menstrual cycle.\n• Fasting for 8–10 hours (water allowed).\n• Visit our partner lab or any NABL accredited lab.\n• Share the report here once completed.",
        buttons: [
          { id: "find_lab", label: "📍 Find Nearest Lab", actionReply: "Find nearest lab" },
          { id: "will_do", label: "👍 I'll do it", actionReply: "Understood, I will get it done" },
        ],
      },
      {
        id: "w3_3",
        stepTitle: "3. Individual Test Reminder",
        sender: "bot",
        time: "10:00 AM",
        text: "Hi Priya,\nThis is a reminder that your AMH blood test is due in 2 days (12 Sep 2026).",
        buttons: [
          { id: "book_lab_appt", label: "📅 Book Lab Appointment", actionReply: "Book lab appointment" },
          { id: "mark_done", label: "✅ Mark as Done", actionReply: "I completed the test" },
        ],
      },
      {
        id: "w3_4",
        stepTitle: "4. Lab Appointment (Optional)",
        sender: "bot",
        time: "10:02 AM",
        text: "Would you like to book a lab appointment at our partner centre?",
        media: {
          type: "lab_center",
          name: "Nova Diagnostics",
          location: "Indiranagar, Bangalore",
          hours: "Mon – Sat, 8:00 AM – 5:00 PM",
        },
        buttons: [
          { id: "book_partner_lab", label: "🏥 Book Appointment", actionReply: "Book at Nova Diagnostics" },
        ],
      },
      {
        id: "w3_5",
        stepTitle: "5. Report Upload",
        sender: "bot",
        time: "12:15 PM",
        text: "Please upload your AMH test report. You can take a photo or send a PDF.",
        buttons: [
          { id: "upload_action", label: "📎 Upload Report", actionReply: "Uploading AMH report" },
        ],
      },
      {
        id: "w3_6",
        stepTitle: "6. Report Received Confirmation",
        sender: "bot",
        time: "12:16 PM",
        text: "✅ We have received your AMH test report. Our team will review it and update you soon.",
      },
      {
        id: "w3_7",
        stepTitle: "7. Pending Report Follow-up",
        sender: "bot",
        time: "3:00 PM",
        text: "Hi Priya,\nWe're still waiting for your Ultrasound report. Please upload it when available or let us know if you need any assistance.",
        buttons: [
          { id: "upload_usg", label: "📎 Upload Report", actionReply: "Uploading ultrasound" },
          { id: "need_help_rep", label: "❓ Need Help", actionReply: "I need help with this test" },
        ],
      },
      {
        id: "w3_8",
        stepTitle: "8. All Tests Completed",
        sender: "bot",
        time: "3:20 PM",
        text: "Great! 🎉 You have completed all recommended investigations. Our doctor will review the reports and we will update you regarding the next step.",
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Report is overdue by >3 days or patient requests call",
      agentPersona: {
        name: "Smrko Diagnostics AI",
        role: "Investigation Coordinator",
        avatar: "🔬",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hi Priya, this is SmrkoMed calling. This is a friendly reminder that your ultrasound scan is pending. Have you been able to schedule it? If you need any help, I can assist you or connect you with our care coordinator.",
        hi: "नमस्ते प्रिया जी, मैं SmrkoMed से बोल रही हूँ। आपका अल्ट्रासाउंड स्कैन अभी पेंडिंग है। क्या आप इसे शेड्यूल कर पाई हैं? यदि कोई सहायता चाहिए तो मैं आपकी मदद कर सकती हूँ।",
        te: "నమస్కారం ప్రియ గారు, SmrkoMed నుండి కాల్ చేస్తున్నాము. మీ అల్ట్రాసౌండ్ స్కాన్ ఇంకా పెండింగ్‌లో ఉంది. మీకు ఏమైనా సహాయం కావాలా?",
      },
      patientVoiceResponses: [
        "Patient confirms completion date",
        "Patient asks for home blood sample collection",
        "Patient has questions regarding fasting",
      ],
      aiDecisionAndAction: [
        "AI books home collection slot or nearest lab",
        "AI updates task due date in database",
        "AI creates reminder 24h prior to sample collection",
      ],
      callSummaryLogged: {
        outcomeTags: ["HOME_COLLECTION_BOOKED", "LAB_NUDGE_DELIVERED"],
        systemUpdates: ["Workup status updated: 3 of 4 completed"],
      },
    },
    systemActions: [
      "Create investigation tasks from doctor order list",
      "Send WhatsApp instruction templates with fasting rules",
      "Track due dates and trigger automated nudges",
      "Store uploaded reports into patient EMR vault",
      "Notify doctor dashboard for review when report arrives",
      "Flag abnormal values (e.g. AMH < 1.0 ng/mL)",
      "Trigger IVF Decision milestone once all reports reviewed",
    ],
    followUpReminders: [
      { timing: "1 day before due", action: "Upcoming test preparation instructions" },
      { timing: "On due date", action: "Check-in if test was completed" },
      { timing: "2 days after", action: "Follow-up message for pending report upload" },
      { timing: "5 days after", action: "Automated AI reminder call" },
      { timing: "After report upload", action: "Confirmation & doctor review notification" },
    ],
    expectedOutcomes: [
      "Higher and faster completion rate of investigations",
      "Fewer missing or misplaced test reports",
      "Timely clinical review by fertility specialist",
      "Reduced manual follow-ups by nursing staff",
      "Accurate baseline data ready for treatment protocol",
    ],
    exceptions: [
      { scenario: "Patient doesn't respond to reminders", resolution: "WhatsApp follow-up -> AI voice call -> Coordinator callback", simulateKey: "NO_RESP_LAB" },
      { scenario: "Patient uploads incorrect document", resolution: "OCR flags invalid doc -> Bot prompts for correct report", simulateKey: "WRONG_DOC" },
      { scenario: "Abnormal / critical lab result", resolution: "System flags red banner -> Immediate doctor notification", simulateKey: "CRITICAL_RESULT" },
      { scenario: "Lab delay / report not ready", resolution: "Coordinator follows up directly with partner diagnostic lab", simulateKey: "LAB_DELAY" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: IVF DECISION MILESTONE (image 4.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 4,
    shortCode: "04",
    title: "Step 4 – IVF Decision",
    subtitle: "Review investigation results, discuss options and decide the next step together.",
    goal: "Doctor reviews all investigation results, discusses treatment options and decides whether to proceed with IVF or an alternative path.",
    badge: "Clinical Decision",
    colorScheme: {
      primary: "text-purple-600",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
      border: "border-purple-500",
      accent: "bg-purple-500",
    },
    triggers: [
      { icon: "FileCheck2", text: "All required investigation reports are received" },
      { icon: "CheckCircle", text: "Doctor marks investigations as reviewed" },
      { icon: "Calendar", text: "Doctor schedules 'Results Discussion' appointment" },
      { icon: "MessageSquare", text: "Patient asks about next steps on WhatsApp" },
      { icon: "Flag", text: "System flags patient as ready for clinical decision" },
    ],
    objectives: [
      "Review all investigation reports comprehensively",
      "Assess whether IVF is appropriate vs IUI or natural",
      "Discuss treatment options openly with couple",
      "Explain success rates, protocol types, and timelines",
      "Ensure patient/couple understanding and emotional comfort",
      "Document clinical decision in SmrkoMed EMR",
      "Transition couple to Treatment Planning stage",
    ],
    dataCollected: [
      "Complete investigation reports compiled",
      "Consultation discussion notes",
      "Patient age, AMH, antral follicle count (AFC), semen parameters",
      "Previous fertility cycle history",
      "Doctor's final clinical recommendation (IVF vs IUI)",
      "Selected protocol type (Antagonist vs Long Agonist)",
    ],
    keyIntegrations: [
      "HIS / EMR (Clinical notes & staging)",
      "Document management (Consultation summary PDF)",
      "WhatsApp (Automated decision card dispatch)",
      "Calendar (Results discussion booking)",
      "CRM (Pipeline stage advancement)",
    ],
    whatsappFlow: [
      {
        id: "w4_1",
        stepTitle: "1. Notify Reports Ready for Review",
        sender: "bot",
        time: "10:00 AM",
        text: "👋 Hi Priya,\nWe have received all your test reports. Our doctor is reviewing them and we will update you soon. You can also book a follow-up consultation to discuss the results.",
        buttons: [
          { id: "book_disc", label: "📅 Book Appointment", actionReply: "Book results discussion" },
          { id: "talk_coord", label: "💬 Talk to Team", actionReply: "Connect with coordinator" },
        ],
      },
      {
        id: "w4_2",
        stepTitle: "2. Appointment Confirmation (Results Discussion)",
        sender: "bot",
        time: "10:02 AM",
        text: "Your appointment with Dr. Aditi Sharma is confirmed for:\n\n📅 15 Sep 2026, 11:00 AM\n📍 Nova IVF Centre, Indiranagar\n\nPlease let us know if you need to reschedule.",
        buttons: [
          { id: "add_cal_disc", label: "📅 Add to Calendar", actionReply: "Added to calendar" },
          { id: "resched_disc", label: "🔄 Reschedule", actionReply: "Reschedule discussion" },
        ],
      },
      {
        id: "w4_3",
        stepTitle: "3. Pre-Appointment Reminder (24 hours before)",
        sender: "bot",
        time: "10:00 AM",
        text: "Hi Priya,\nYour results discussion appointment is tomorrow at 11:00 AM. Please carry any additional reports if available.",
        buttons: [
          { id: "confirm_disc", label: "✅ I'll be there", actionReply: "I will attend tomorrow" },
          { id: "need_resched_disc", label: "❌ Need to Reschedule", actionReply: "Need to reschedule" },
        ],
      },
      {
        id: "w4_4",
        stepTitle: "4. Post-Consultation Summary",
        sender: "bot",
        time: "12:30 PM",
        text: "Thank you for meeting with Dr. Aditi Sharma today. Here is a summary of your consultation.",
        media: {
          type: "pdf",
          title: "Consultation Summary — 15 Sep 2026",
          pages: "2 pages PDF",
        },
        buttons: [
          { id: "view_summary_pdf", label: "📄 View Summary", actionReply: "Opening summary PDF" },
          { id: "ask_q_disc", label: "❓ Ask a Question", actionReply: "Question about decision" },
        ],
      },
      {
        id: "w4_5",
        stepTitle: "5. Doctor's Decision Communication",
        sender: "bot",
        time: "12:32 PM",
        text: "Based on your reports and discussion, Dr. Aditi Sharma has recommended:\n\n✅ *IVF treatment (Antagonist Protocol)*\n\nWe will now move to the treatment planning stage. Our care team will guide you through the next steps including consent, financial discussion and cycle preparation.",
        buttons: [
          { id: "view_next_steps", label: "👉 View Next Steps", actionReply: "View next steps" },
          { id: "talk_coord_plan", label: "📞 Talk to Coordinator", actionReply: "Speak with coordinator" },
        ],
      },
      {
        id: "w4_6",
        stepTitle: "Alternative Scenario – If IVF is Not the Decision",
        sender: "bot",
        time: "12:32 PM",
        text: "Based on your reports, Dr. Aditi Sharma has recommended starting with *IUI*.\nWe have shared the details with you. Please let us know if you would like to discuss this further.",
        buttons: [
          { id: "learn_iui", label: "📘 Learn About IUI", actionReply: "Learn about IUI" },
          { id: "talk_doc_alt", label: "💬 Talk to Doctor", actionReply: "Discuss IUI with doctor" },
        ],
      },
      {
        id: "w4_7",
        stepTitle: "6. Patient Questions (Anytime)",
        sender: "bot",
        time: "12:35 PM",
        text: "You can ask me any questions about your treatment options, success rates or next steps.\n\nExamples:\n• What are the costs?\n• How many cycles are usually needed?\n• What are the success rates?\n• Can you explain the process again?",
        buttons: [
          { id: "ask_faq_disc", label: "❓ Ask a Question", actionReply: "I have a question on success rates" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient requests callback or decision consultation complete",
      agentPersona: {
        name: "Smrko Care Specialist",
        role: "Treatment Advisor",
        avatar: "🩺",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hi Priya, this is SmrkoMed calling. Your doctor has reviewed your reports and recommended IVF. I'm calling to explain the next steps and see if you have any questions. Would you like me to go over the process or connect you with our care coordinator?",
        hi: "नमस्ते प्रिया जी, SmrkoMed से कॉल कर रहे हैं। डॉक्टर ने आपकी रिपोर्ट्स देखकर IVF की सलाह दी है। क्या आपके मन में कोई सवाल हैं जिनका मैं जवाब दे सकूँ?",
        te: "నమస్కారం ప్రియ గారు, మీ డాక్టర్ మీ రిపోర్టులను సమీక్షించి IVF సిఫార్సు చేసారు. తదుపరి దశల గురించి చర్చించడానికి మేము కాల్ చేసాము.",
      },
      patientVoiceResponses: [
        "Patient asks for package details & costs",
        "Patient asks about cycle duration & work leave",
        "Patient requests second opinion or coordinator discussion",
      ],
      aiDecisionAndAction: [
        "AI explains IVF protocol and duration (4-6 weeks)",
        "AI sends financial counsellor booking link",
        "AI logs conversation transcript into EMR",
      ],
      callSummaryLogged: {
        outcomeTags: ["DECISION_ACCEPTED", "PLANNING_PACK_SENT"],
        systemUpdates: ["Care plan stage set to 05. Treatment Planning"],
      },
    },
    systemActions: [
      "Update patient clinical status to 'IVF Decision Made'",
      "Link all diagnostic reports to treatment plan",
      "Generate consultation summary PDF document",
      "Create Treatment Planning stage tasks in queue",
      "If alternative (IUI/defer), branch journey automatically",
      "Notify financial counsellor and care coordinator",
      "Update CRM analytics with conversion milestone",
    ],
    followUpReminders: [
      { timing: "1 day after review", action: "Reminder if discussion not scheduled" },
      { timing: "24 hours before", action: "Discussion appointment reminder" },
      { timing: "Post-consultation", action: "Summary PDF & Decision card sent" },
      { timing: "2 days after", action: "Check if couple has questions about IVF" },
      { timing: "5 days after", action: "Follow-up if treatment planning not started" },
    ],
    expectedOutcomes: [
      "All investigations reviewed by doctor",
      "Clear, informed treatment decision made together",
      "Couple understands rationale and expected outcomes",
      "Zero drop-off between workup and cycle initiation",
      "Timely handoff to Treatment Planning & Consent",
    ],
    exceptions: [
      { scenario: "Couple misses discussion appointment", resolution: "Auto-reschedule prompt -> AI phone call -> Nurse contact", simulateKey: "MISS_DISC" },
      { scenario: "Couple requests second opinion", resolution: "Schedule senior consultant review in system", simulateKey: "SECOND_OPIN" },
      { scenario: "Couple needs time to decide", resolution: "Set 7-day gentle nurturing reminder sequence", simulateKey: "NEED_TIME" },
      { scenario: "Patient chooses IUI / alternative", resolution: "Branch patient journey to IUI Care Loop automatically", simulateKey: "CHOOSE_IUI" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: TREATMENT PLANNING & CONSENT (image 5.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 5,
    shortCode: "05",
    title: "Step 5 – Treatment Planning & Consent",
    subtitle: "Finalize the IVF plan, complete consents, understand the journey and get ready for the cycle.",
    goal: "Ensure the patient understands and agrees to the treatment plan, completes all required consents, documentation and payments, and is ready to start the cycle.",
    badge: "Consent & Financials",
    colorScheme: {
      primary: "text-rose-600",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      border: "border-rose-500",
      accent: "bg-rose-500",
    },
    triggers: [
      { icon: "CheckCircle2", text: "Doctor decides to proceed with IVF" },
      { icon: "FileText", text: "Investigation results reviewed and signed off" },
      { icon: "FolderPlus", text: "IVF plan created in SmrkoMed system" },
      { icon: "FileSignature", text: "Consent & financial counselling required" },
      { icon: "UserCheck", text: "Patient marked as 'Ready for Planning'" },
      { icon: "Play", text: "Coordinator initiates planning process" },
    ],
    objectives: [
      "Explain the treatment plan and timeline clearly",
      "Share package inclusions, exclusions, and fee schedule",
      "Complete 4 legally compliant digital consents (IVF, Anesthesia, Embryo, Data)",
      "Provide medication list and pharmacy delivery options",
      "Discuss payment schedule and collect initial advance",
      "Ensure patient is emotionally and logistically prepared",
      "Get final couple confirmation to initiate cycle",
    ],
    dataCollected: [
      "Final treatment plan (Antagonist protocol)",
      "4 signed e-consent forms (IP address & timestamp verified)",
      "Selected package (Standard IVF-ICSI ₹1,75,000)",
      "Payment receipt for advance (₹50,000)",
      "Preferred pharmacy / home medication delivery address",
      "Emergency contact details",
      "Planned cycle start date (Day 2 of next menses)",
    ],
    keyIntegrations: [
      "Document Management & E-Signature engine",
      "Payment Gateway (Razorpay/Cashfree installment links)",
      "WhatsApp Communication API",
      "CRM & Patient Journey tracking",
      "Pharmacy dispensing & delivery module",
    ],
    whatsappFlow: [
      {
        id: "w5_1",
        stepTitle: "1. Share Treatment Plan Summary",
        sender: "bot",
        time: "10:05 AM",
        text: "👋 Hi Priya,\nBased on your reports, Dr. Aditi Sharma has recommended IVF for you.\nHere is a summary of your treatment plan:\n\n🏥 Treatment: IVF (ICSI)\n📋 Protocol: Antagonist Protocol\n⏳ Estimated Duration: 4–6 weeks\n👉 Next Step: Review plan & complete consents",
        buttons: [
          { id: "view_detailed_plan", label: "📋 View Detailed Plan", actionReply: "View detailed plan" },
        ],
      },
      {
        id: "w5_2",
        stepTitle: "2. Share Package Details",
        sender: "bot",
        time: "10:07 AM",
        text: "Here are the package details for your IVF treatment at Nova IVF Centre.",
        media: {
          type: "payment_card",
          amount: "₹1,75,000",
          label: "Complete IVF-ICSI Cycle Package",
          breakdown: "Includes stimulation monitoring, OPU, ICSI, Day 5 blastocyst culture & first transfer",
        },
        buttons: [
          { id: "view_inc", label: "Inclusions", actionReply: "View package inclusions" },
          { id: "view_exc", label: "Exclusions", actionReply: "View package exclusions" },
          { id: "dl_pkg_pdf", label: "📥 Download Package PDF", actionReply: "Download package PDF" },
        ],
      },
      {
        id: "w5_3",
        stepTitle: "3. Consent Forms",
        sender: "bot",
        time: "10:10 AM",
        text: "Please review and complete the following consent forms to proceed:",
        media: {
          type: "consents",
          forms: [
            { name: "IVF Treatment Consent", status: "Pending Signature" },
            { name: "Anesthesia Consent", status: "Pending Signature" },
            { name: "Embryology Lab Consent", status: "Pending Signature" },
            { name: "Data & Communication Consent", status: "Pending Signature" },
          ],
        },
        buttons: [
          { id: "sign_ivf", label: "✍️ Review & Sign Consents", actionReply: "Sign consent forms" },
        ],
      },
      {
        id: "w5_4",
        stepTitle: "4. Financial Counselling & Payment",
        sender: "bot",
        time: "10:15 AM",
        text: "Your total package cost is ₹1,75,000 (As discussed with our counsellor).",
        buttons: [
          { id: "view_pay_sched", label: "💳 View Payment Schedule", actionReply: "View payment schedule" },
          { id: "pay_adv", label: "💳 Pay Advance (₹50,000)", actionReply: "Pay advance of 50000" },
        ],
      },
      {
        id: "w5_5",
        stepTitle: "5. Medication Plan (Initial)",
        sender: "bot",
        time: "10:18 AM",
        text: "Your doctor has prescribed the initial medications for cycle preparation. Our pharmacy team will guide you.",
        buttons: [
          { id: "view_meds", label: "💊 View Medication List", actionReply: "View medication list" },
          { id: "req_home_del", label: "📦 Request Home Delivery", actionReply: "Request home delivery" },
        ],
      },
      {
        id: "w5_6",
        stepTitle: "6. Confirm Readiness",
        sender: "bot",
        time: "10:20 AM",
        text: "Have you completed the consents and advance payment? Are you ready to plan your cycle start date?",
        buttons: [
          { id: "ready_yes", label: "✅ Yes, I'm ready", actionReply: "Yes, I am ready" },
          { id: "ready_q", label: "❓ I have questions", actionReply: "I have some questions" },
          { id: "ready_coord", label: "📞 Talk to my coordinator", actionReply: "Connect to coordinator" },
        ],
      },
      {
        id: "w5_7",
        stepTitle: "7. Next Steps",
        sender: "bot",
        time: "10:21 PM",
        text: "Thank you! Our team will now coordinate with you for cycle preparation and share your tentative start date soon.\nWe are with you at every step. 💙",
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Consent pending >24h or patient clicks 'Talk to Coordinator'",
      agentPersona: {
        name: "Smrko Care Advisor",
        role: "Financial & Planning Counselor",
        avatar: "📋",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Nova IVF Centre. I understand you have some questions about your treatment plan. Would you like to discuss the package, consents or next steps?",
        hi: "नमस्ते, मैं Nova IVF Centre की तरफ से SmrkoMed से बात कर रही हूँ। आपके ट्रीटमेंट प्लान और कंसेंट के बारे में बात करने के लिए कॉल किया है। क्या आप पैकेज या पेमेंट्स पर चर्चा करना चाहते हैं?",
        te: "నమస్కారం, Nova IVF Centre తరఫున SmrkoMed నుండి మాట్లాడుతున్నాను. మీ ట్రీట్‌మెంట్ ప్యాకేజీ మరియు సమ్మతి ఫారాల గురించి ఏమైనా సందేహాలు ఉన్నాయా?",
      },
      patientVoiceResponses: [
        "Patient asks for EMI options or insurance coverage",
        "Patient requests help with digital signature",
        "Patient confirms advance payment completed",
      ],
      aiDecisionAndAction: [
        "AI explains EMI breakdown (0% interest options)",
        "AI resends SMS e-sign link with OTP authentication",
        "Updates system to 'Consents Signed'",
      ],
      callSummaryLogged: {
        outcomeTags: ["ADVANCE_PAID", "CONSENTS_COMPLETED"],
        systemUpdates: ["Patient status: Cycle Preparation Ready"],
      },
    },
    systemActions: [
      "Create treatment plan record with Antagonist protocol",
      "Generate and track 4 legally binding e-consent forms",
      "Create Razorpay advance payment link (₹50,000)",
      "Update payment status from webhook confirmation",
      "Dispatch medication order to clinic pharmacy",
      "Create Cycle Preparation checklist in patient profile",
      "Log all communications & audit trail for compliance",
    ],
    followUpReminders: [
      { timing: "Immediately", action: "Send plan summary & consent links" },
      { timing: "1 day later", action: "Reminder if consent not signed" },
      { timing: "2 days later", action: "Advance payment reminder" },
      { timing: "3 days later", action: "Follow-up for open clinical questions" },
      { timing: "As per plan", action: "Confirmation of cycle start date" },
    ],
    expectedOutcomes: [
      "Patient clearly understands treatment protocol & costs",
      "All 4 legally required consents executed digitally",
      "Advance payment received smoothly",
      "Medications ordered and received before Day 1",
      "Zero administrative delays entering stimulation",
    ],
    exceptions: [
      { scenario: "Patient doesn't open consent link", resolution: "SMS reminder with direct link -> Coordinator assistance call", simulateKey: "CONSENT_DELAY" },
      { scenario: "Payment transaction failure", resolution: "Send alternate gateway link -> Front-desk UPI option", simulateKey: "PAY_FAIL" },
      { scenario: "Patient questions protocol", resolution: "Schedule 10-min doctor video call for reassurance", simulateKey: "DOC_CONSULT" },
      { scenario: "Consent declined or delayed", resolution: "Mark on hold -> Notify lead doctor and coordinator", simulateKey: "DECLINE_HOLD" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: CYCLE PREPARATION (image 6.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 6,
    shortCode: "06",
    title: "Step 6 – Cycle Preparation",
    subtitle: "Complete all pre-cycle requirements, prepare for stimulation and get ready for the treatment cycle.",
    goal: "Ensure the patient is medically, emotionally and logistically ready to start the stimulation cycle.",
    badge: "Pre-Cycle Readiness",
    colorScheme: {
      primary: "text-emerald-600",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      border: "border-emerald-500",
      accent: "bg-emerald-500",
    },
    triggers: [
      { icon: "CheckCheck", text: "Treatment plan and protocol approved" },
      { icon: "FileCheck", text: "All 4 consent forms completed and verified" },
      { icon: "CreditCard", text: "Advance payment received" },
      { icon: "UserCheck", text: "Doctor marks patient as 'Cycle Preparation'" },
      { icon: "Calendar", text: "Expected cycle start date planned with menses" },
      { icon: "ListChecks", text: "System checks pending tasks & creates checklist" },
    ],
    objectives: [
      "Complete all pre-cycle medical and administrative tasks",
      "Ensure all stimulation medications and supplies are delivered",
      "Provide injection training video & technique guidance",
      "Schedule baseline ultrasound scan (Day 2/3) and blood tests",
      "Confirm partner semen requirements (fresh vs frozen backup)",
      "Finalize pre-anesthesia clearance for future OPU",
      "Ensure patient is confident, calm, and prepared to start",
    ],
    dataCollected: [
      "Cycle start date (Day 2 of menses)",
      "Baseline scan appointment booking",
      "Baseline hormone results (E2, P4, LH)",
      "Medication delivery confirmation",
      "Partner semen status & backup consent",
      "Anesthesia pre-screening questionnaire",
      "Checklist completion percentage (e.g. 4 of 6)",
    ],
    keyIntegrations: [
      "Calendar (Baseline scan scheduling)",
      "HIS / EMR (Clinical records & test orders)",
      "Pharmacy (Medication order & dispatch tracking)",
      "Payment gateway (Pending balances)",
      "WhatsApp (Education video delivery)",
    ],
    whatsappFlow: [
      {
        id: "w6_1",
        stepTitle: "1. Welcome to Cycle Preparation",
        sender: "bot",
        time: "10:05 AM",
        text: "👋 Hi Priya,\nYou are now in the Cycle Preparation stage! 🎉\nIn this stage we will complete a few important steps before starting your IVF treatment cycle.\n\nHere's what we will cover:\n✅ Baseline scan & blood tests\n✅ Medication planning & delivery\n✅ Injection training\n✅ Partner requirements\n✅ Pre-anesthesia check (for OPU)\n✅ Final confirmation from your doctor",
        buttons: [
          { id: "view_checklist", label: "📋 View My Checklist", actionReply: "View my checklist" },
        ],
      },
      {
        id: "w6_2",
        stepTitle: "2. Task Reminder",
        sender: "bot",
        time: "10:06 AM",
        text: "Your baseline blood test is scheduled on 12 Sep 2026 at 8:30 AM at Nova Diagnostics.\nPlease fast for 8–10 hours. You can view the details here.",
        buttons: [
          { id: "view_base_appt", label: "📅 View Appointment", actionReply: "View appointment details" },
          { id: "add_base_cal", label: "📅 Add to Calendar", actionReply: "Added to calendar" },
        ],
      },
      {
        id: "w6_3",
        stepTitle: "3. Medication Ready",
        sender: "bot",
        time: "10:08 AM",
        text: "Your cycle medications have been approved by Dr. Aditi Sharma.\nYou can order from our partner pharmacy or request home delivery.",
        buttons: [
          { id: "order_meds_now", label: "💊 Order Now", actionReply: "Order medications now" },
          { id: "req_med_deliv", label: "📦 Request Delivery", actionReply: "Request delivery to home" },
        ],
      },
      {
        id: "w6_4",
        stepTitle: "4. Injection Education",
        sender: "bot",
        time: "10:12 AM",
        text: "Watch this short video to learn how to use the injections safely. If you have any questions, you can ask our care team.",
        media: {
          type: "video",
          title: "Subcutaneous Injection Technique Guide",
          duration: "2 min video",
        },
        buttons: [
          { id: "watch_inj_vid", label: "▶️ Watch Video", actionReply: "Playing injection video" },
          { id: "ask_inj_q", label: "❓ Ask a Question", actionReply: "Question on injections" },
          { id: "book_nurse_training", label: "👩‍⚕️ Book Training Session", actionReply: "Book in-clinic nurse training" },
        ],
      },
      {
        id: "w6_5",
        stepTitle: "5. Partner Requirements",
        sender: "bot",
        time: "10:14 AM",
        text: "Your partner's semen analysis is required before starting the cycle.\nWould you like to book an appointment or know more about sample collection?",
        buttons: [
          { id: "book_partner_semen", label: "📅 Book Appointment", actionReply: "Book semen analysis" },
          { id: "semen_instructions", label: "📋 View Instructions", actionReply: "View semen test rules" },
        ],
      },
      {
        id: "w6_6",
        stepTitle: "6. Checklist Progress",
        sender: "bot",
        time: "10:15 AM",
        text: "You are doing great! 4 of 6 tasks completed (67%).",
        media: {
          type: "checklist",
          completed: 4,
          total: 6,
          items: [
            "Baseline Scan & Bloods (Booked)",
            "Medications Delivered (Done)",
            "Injection Training (Watched)",
            "Partner Semen Checked (Done)",
            "Pre-Anesthesia Form (Pending)",
            "Doctor Final Clearance (Pending)",
          ],
        },
        buttons: [
          { id: "view_pending_tasks", label: "📋 View Pending Tasks", actionReply: "Show pending tasks" },
          { id: "talk_care_team", label: "💬 Talk to Care Team", actionReply: "Connect to care team" },
        ],
      },
      {
        id: "w6_7",
        stepTitle: "7. Ready to Start",
        sender: "bot",
        time: "10:20 AM",
        text: "✅ All required pre-cycle tasks are completed!\nOur team will review and confirm your cycle start date. You will receive a confirmation soon.",
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Baseline test missed or injection anxiety expressed",
      agentPersona: {
        name: "Nurse Priya AI",
        role: "Clinical Prep Specialist",
        avatar: "👩‍⚕️",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. We see that your baseline test is pending. Do you need any help with booking or have any questions about starting your injections?",
        hi: "नमस्ते, मैं SmrkoMed से बोल रही हूँ। आपका बेसलाइन टेस्ट अभी बाकी है। क्या आपको इंजेक्शन या क्लिनिक विज़िट के बारे में कोई मदद चाहिए?",
        te: "నమస్కారం ప్రియ గారు, మీ బేస్‌లైన్ టెస్ట్ మరియు ఇంజెక్షన్ ట్రైనింగ్ గురించి సహాయం చేయడానికి కాల్ చేసాము. మీకు ఏమైనా సందేహాలు ఉన్నాయా?",
      },
      patientVoiceResponses: [
        "Patient asks for in-clinic nurse injection training",
        "Patient confirms menses Day 1 started today",
        "Patient reports pharmacy delivery received",
      ],
      aiDecisionAndAction: [
        "AI books in-person injection demo with clinic nurse",
        "AI logs Menses Day 1 and schedules baseline scan for Day 2",
        "Notifies attending doctor that cycle is starting",
      ],
      callSummaryLogged: {
        outcomeTags: ["CYCLE_DAY_1_LOGGED", "NURSE_DEMO_BOOKED"],
        systemUpdates: ["Stimulation start date set to Day 2"],
      },
    },
    systemActions: [
      "Create pre-cycle checklist from approved treatment plan",
      "Schedule baseline scan and Day 2 hormonal panel",
      "Generate medication dispatch to partner pharmacy",
      "Send injection training educational video & PDF",
      "Track partner semen sample readiness & freezing status",
      "Capture pre-anesthesia risk evaluation for OPU",
      "Trigger Ovarian Stimulation stage when doctor clears scan",
    ],
    followUpReminders: [
      { timing: "Immediately", action: "Welcome message & interactive checklist" },
      { timing: "1 day later", action: "Reminder for pending appointments" },
      { timing: "2 days later", action: "Follow-up if medication delivery pending" },
      { timing: "3 days later", action: "AI call if checklist stalled" },
      { timing: "On Menses Day 1", action: "Schedule urgent baseline scan for Day 2" },
    ],
    expectedOutcomes: [
      "All pre-cycle clinical checklists completed",
      "Medications safely in patient's refrigerator",
      "Couple confident with subcutaneous injection technique",
      "Partner semen requirements confirmed",
      "Smooth, anxiety-free start to ovarian stimulation",
    ],
    exceptions: [
      { scenario: "Patient misses baseline scan", resolution: "Reschedule within 24-48 hours window -> Notify doctor", simulateKey: "MISS_SCAN" },
      { scenario: "Medications out of stock", resolution: "Auto-notify partner pharmacy -> Deliver alternative brand", simulateKey: "MED_STOCK" },
      { scenario: "Severe injection anxiety", resolution: "Arrange daily home nurse injection visits", simulateKey: "INJ_ANXIETY" },
      { scenario: "Partner unable to provide fresh sample", resolution: "Schedule cryopreservation visit before OPU", simulateKey: "PARTNER_SAMPLE" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: OVARIAN STIMULATION (image 7.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 7,
    shortCode: "07",
    title: "Step 7 – Ovarian Stimulation",
    subtitle: "Medication starts, regular monitoring begins – we stay with the patient every step of the way.",
    goal: "Ensure the patient follows the stimulation medication plan, attends monitoring appointments, and is safe, informed and supported throughout.",
    badge: "Daily Stimulation",
    colorScheme: {
      primary: "text-amber-600",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      border: "border-amber-500",
      accent: "bg-amber-500",
    },
    triggers: [
      { icon: "PlayCircle", text: "Doctor activates stimulation plan following clear scan" },
      { icon: "Pill", text: "Medication plan created (drug, dose, timing: e.g. FSH 225 IU)" },
      { icon: "CalendarCheck", text: "First injection date confirmed (Cycle Day 2)" },
      { icon: "CheckCircle", text: "Baseline scan and blood hormone results cleared" },
      { icon: "UserCheck", text: "Patient and partner enrolled in daily reminder engine" },
      { icon: "Clock", text: "Daily 8:00 PM dose reminder triggers" },
    ],
    objectives: [
      "Ensure patient takes daily injections on time without missing",
      "Reinforce proper subcutaneous injection technique & site rotation",
      "Track daily dose adherence through instant button confirmations",
      "Schedule and remind for follicular monitoring ultrasounds",
      "Identify and triage early side effects (bloating, headache, OHSS)",
      "Provide empathetic emotional support and answer questions",
      "Keep fertility specialist informed of adherence and symptoms",
    ],
    dataCollected: [
      "Daily medication dose taken (e.g. Rec-FSH 225 IU)",
      "Exact injection timestamp",
      "Patient confirmation status (Taken / Will take / Missed)",
      "Reported side effects (Bloating, headache, nausea, none)",
      "Upcoming follicle monitoring appointment dates",
      "Dose adjustments ordered by doctor",
    ],
    keyIntegrations: [
      "Pharmacy (Medication refill requests)",
      "Calendar (Follicle monitoring ultrasound appointments)",
      "HIS / EMR (Daily adherence log & scan records)",
      "WhatsApp Cloud API (Automated daily 8 PM nudges)",
      "Clinical escalation engine (Duty doctor alerts)",
    ],
    whatsappFlow: [
      {
        id: "w7_1",
        stepTitle: "1. Stimulation Start Notification",
        sender: "bot",
        time: "8:00 AM",
        text: "👋 Hi Priya,\nYour ovarian stimulation starts today! 🌸\nYou will be taking the following medication:\n\n• FSH 225 IU – at 8:00 PM\n• Antagonist – as advised (from Day 6)\n\nWe've attached your medication plan and a short video on how to take injections. You can always message us if you have any questions. 💙",
        buttons: [
          { id: "view_stim_plan", label: "📋 View Plan", actionReply: "View stimulation plan" },
          { id: "watch_stim_vid", label: "▶️ Watch Video", actionReply: "Watch injection video" },
          { id: "ask_stim_q", label: "❓ Ask a Question", actionReply: "Question on medication" },
        ],
      },
      {
        id: "w7_2",
        stepTitle: "2. Daily Medication Reminder",
        sender: "bot",
        time: "8:00 PM",
        text: "Hi Priya,\nIt's time for your FSH injection (Day 1).\nPlease take 225 IU at 8:00 PM.\nHave you taken your injection?",
        buttons: [
          { id: "taken_now", label: "✅ Taken", actionReply: "careloop_taken" },
          { id: "will_take_soon", label: "⏰ Will take soon", actionReply: "Will take in 15 mins" },
          { id: "need_help_stim", label: "❓ Need Help", actionReply: "Need help taking injection" },
        ],
      },
      {
        id: "w7_3",
        stepTitle: "3. Confirmation Received",
        sender: "bot",
        time: "8:02 PM",
        text: "Great! ✅\nYour Day 1 injection is marked as completed. Keep going!\nWe're here if you need anything.",
      },
      {
        id: "w7_4",
        stepTitle: "4. Missed / No Response (9:00 PM)",
        sender: "bot",
        time: "9:00 PM",
        text: "We noticed you haven't confirmed your injection for today.\nHave you taken it, or do you need help?",
        buttons: [
          { id: "taken_now_late", label: "✅ Taken now", actionReply: "careloop_taken" },
          { id: "need_help_late", label: "❓ Need help", actionReply: "I need help with dose" },
          { id: "talk_nurse_late", label: "💬 Talk to a Nurse", actionReply: "Connect to duty nurse" },
        ],
      },
      {
        id: "w7_5",
        stepTitle: "5. AI Follow-up (If still no response)",
        sender: "bot",
        time: "9:30 PM",
        text: "Hello, this is SmrkoMed.\nWe just wanted to check if you were able to take your medication. It's important for your treatment. Would you like me to connect you with a nurse?",
        buttons: [
          { id: "call_me_now", label: "📞 Yes, call me", actionReply: "Please call me now" },
          { id: "taken_confirmed", label: "✅ I've taken it", actionReply: "careloop_taken" },
        ],
      },
      {
        id: "w7_6",
        stepTitle: "6. Side Effect Check-in (Periodic)",
        sender: "bot",
        time: "8:00 PM",
        text: "Hi Priya,\nHow are you feeling today?\nAny of the following?\n• Bloating\n• Headache\n• Nausea\n• None of the above",
        buttons: [
          { id: "symp_none", label: "😊 None of the above", actionReply: "No side effects" },
          { id: "symp_bloat", label: "🤒 Mild Bloating", actionReply: "careloop_symptoms" },
          { id: "symp_headache", label: "🤕 Headache", actionReply: "careloop_symptoms" },
        ],
      },
      {
        id: "w7_7",
        stepTitle: "7. Education & Motivation",
        sender: "bot",
        time: "Day 3, 10:00 AM",
        text: "You're doing great! Here's a quick tip on rotating injection sites to avoid discomfort.",
        buttons: [
          { id: "watch_site_tip", label: "▶️ Watch Video", actionReply: "Watch rotating sites tip" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "No confirmation by 9:30 PM (90 mins overdue) or side effects reported",
      agentPersona: {
        name: "Smrko Clinical Voice AI",
        role: "Adherence Nurse",
        avatar: "💉",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. I'm here to help with your medication and answer any questions. Are you able to take your injection today, or do you need assistance?",
        hi: "नमस्ते, मैं SmrkoMed से बोल रही हूँ। आपकी आज की इंजेक्शन का समय हो चुका है। क्या आपने आज की डोज़ ले ली है या किसी मदद की आवश्यकता है?",
        te: "నమస్కారం ప్రియ గారు, SmrkoMed నుండి ఇంజెక్షన్ రిమైండర్ కోసం కాల్ చేసాము. ఈ రోజు ఇంజెక్షన్ తీసుకున్నారా? మీకు ఏమైనా సహాయం కావాలా?",
      },
      patientVoiceResponses: [
        "Patient confirms medication taken just now",
        "Patient reports injection fear or pain at site",
        "Patient reports severe pelvic fullness / bloating",
      ],
      aiDecisionAndAction: [
        "If taken, logs confirmation timestamp in database",
        "If pain/fear, provides gentle coaching on icing technique",
        "If severe bloating, alerts attending doctor immediately for OHSS risk",
      ],
      callSummaryLogged: {
        outcomeTags: ["DOSE_CONFIRMED_VIA_VOICE", "NO_OHSS_RISK"],
        systemUpdates: ["Day 1 dose marked complete at 9:34 PM"],
      },
    },
    systemActions: [
      "Create daily medication tasks for each stimulation day",
      "Send automated WhatsApp reminders at configured time (8 PM)",
      "Track patient button responses and calculate adherence score",
      "Detect clinical keywords (pain, bloating, vomiting)",
      "Trigger AI call if no response within 90 minutes",
      "Notify doctor if 2 consecutive doses missed",
      "Adjust medication schedule instantly if doctor changes dose",
      "Schedule upcoming follicular scans on Day 6, 8, 10",
    ],
    followUpReminders: [
      { timing: "Daily at 8:00 PM", action: "Medication reminder with one-tap confirmation" },
      { timing: "If no response (2 hrs)", action: "Urgent follow-up WhatsApp reminder" },
      { timing: "If still no response", action: "AI voice call -> Staff duty nurse alert" },
      { timing: "Every 2-3 days", action: "Side effect check-in survey" },
      { timing: "Before scan days", action: "Follicular monitoring scan reminder" },
    ],
    expectedOutcomes: [
      "98%+ on-time medication adherence",
      "Early detection of side effects and prevention of OHSS",
      "Zero missed stimulation injections",
      "Patient feels continuously accompanied and supported",
      "Doctor has live visibility into cycle compliance",
    ],
    exceptions: [
      { scenario: "Patient misses dose completely", resolution: "Immediate AI voice call -> Doctor instructions on catch-up dose", simulateKey: "MISSED_DOSE" },
      { scenario: "Severe pain or nausea reported", resolution: "Emergency nurse alert -> Clinic helpline patched through", simulateKey: "SEVERE_SYMP" },
      { scenario: "Patient unsure about dose measurement", resolution: "Send video demo -> Offer video call with nurse", simulateKey: "DOSE_UNSURE" },
      { scenario: "Pharmacy running low on cartridges", resolution: "Automated replenishment alert 48 hours in advance", simulateKey: "REFILL_NEEDED" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: FOLLICULAR MONITORING (image 8.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 8,
    shortCode: "08",
    title: "Step 8 – Follicular Monitoring",
    subtitle: "Regular scans and blood tests to track your response – timely updates and guidance at every step.",
    goal: "Ensure the patient attends all monitoring appointments, completes required tests, receives results, and the doctor reviews them to decide next steps (continue, adjust dose, or trigger).",
    badge: "Follicle Scans",
    colorScheme: {
      primary: "text-pink-600",
      badgeBg: "bg-pink-50 text-pink-700 border-pink-200",
      border: "border-pink-500",
      accent: "bg-pink-500",
    },
    triggers: [
      { icon: "Calendar", text: "Monitoring schedule created by doctor (Day 6, 8, 10)" },
      { icon: "Send", text: "Scan or blood test appointment booked" },
      { icon: "FileEdit", text: "Doctor updates medication plan or adjusts dose" },
      { icon: "PlusCircle", text: "New monitoring date added based on follicle growth" },
      { icon: "Clock", text: "Patient due for scan/blood test tomorrow" },
      { icon: "FileText", text: "Lab results received (E2, P4 levels)" },
    ],
    objectives: [
      "Ensure patient attends all scheduled ultrasound scans & blood tests",
      "Provide clear pre-scan instructions (comfortable bladder, no fasting)",
      "Collect and attach scan reports & follicle tracking charts to EMR",
      "Notify doctor promptly for review and dose adjustment",
      "Communicate updated doses and next scan date to patient",
      "Track follicle growth kinetics (18-20 mm targets)",
      "Detect ovarian hyperstimulation (OHSS) risk or poor response",
    ],
    dataCollected: [
      "Monitoring scan date, time, and clinic branch",
      "Ultrasound report with follicle counts per ovary (Right & Left)",
      "Follicle measurements (e.g. 14mm, 16mm, 18mm)",
      "Endometrial thickness (e.g. 9.2mm trilaminar)",
      "Serum Estradiol (E2) and Progesterone (P4) values",
      "Doctor's revised dose orders (e.g. add Cetrorelix 0.25mg)",
      "Next scan date or Trigger scheduling decision",
    ],
    keyIntegrations: [
      "Calendar (Scan room appointments)",
      "Ultrasound Machine / PACS reporting system",
      "LIS (Serum Estradiol & Progesterone feeds)",
      "WhatsApp Cloud API (Scan instructions & PDF delivery)",
      "HIS / EMR (Folliculometry chart)",
    ],
    whatsappFlow: [
      {
        id: "w8_1",
        stepTitle: "1. Upcoming Monitoring Appointment",
        sender: "bot",
        time: "10:00 AM",
        text: "👋 Hi Priya,\nYour IVF monitoring ultrasound is scheduled for tomorrow, 14 Sep 2026 at 9:30 AM at Nova IVF Centre.\nPlease confirm if you will be able to attend.",
        buttons: [
          { id: "scan_confirm", label: "✅ Yes, I'll be there", actionReply: "Yes, I will attend" },
          { id: "scan_resched", label: "🔄 Need to Reschedule", actionReply: "Need to reschedule scan" },
          { id: "scan_q", label: "❓ Ask a Question", actionReply: "Question about scan" },
        ],
      },
      {
        id: "w8_2",
        stepTitle: "2. Pre-Appointment Instructions",
        sender: "bot",
        time: "10:01 AM",
        text: "A quick reminder for your scan tomorrow:\n• No need to fast\n• Please come with a comfortably full bladder\n• Arrive 15 minutes early\n• Carry your ID and previous reports\n• If you are also due for a blood test, our lab is on the 2nd floor.\n\nSee you tomorrow! 💙",
        buttons: [
          { id: "view_scan_pdf", label: "📄 View Instructions (PDF)", actionReply: "Opening instructions PDF" },
        ],
      },
      {
        id: "w8_3",
        stepTitle: "3. Day of Appointment Reminder",
        sender: "bot",
        time: "8:00 AM",
        text: "Hi Priya,\nYour scan appointment is today at 9:30 AM. We look forward to seeing you.\nReply if you need help or directions.",
        buttons: [
          { id: "scan_dir", label: "📍 Get Directions", actionReply: "Opening clinic map" },
          { id: "call_clinic_scan", label: "📞 Call Clinic", actionReply: "Calling clinic desk" },
        ],
      },
      {
        id: "w8_4",
        stepTitle: "4. Post-Appointment Confirmation",
        sender: "bot",
        time: "12:15 PM",
        text: "Hi Priya,\nThank you for attending your scan today. Your blood test has also been completed. We will notify you once the results are available.",
      },
      {
        id: "w8_5",
        stepTitle: "5. Report Ready Notification",
        sender: "bot",
        time: "2:30 PM",
        text: "Hi Priya,\nYour scan report and blood test results are now available. Our doctor will review them shortly and we will get back to you with the next steps.",
        media: {
          type: "pdf",
          title: "Follicular Monitoring Report — Day 8",
          pages: "Follicles: R: 6 (14-16mm), L: 5 (13-15mm) | Endometrium: 8.5mm",
        },
        buttons: [
          { id: "dl_scan_rep", label: "📄 View Report (PDF)", actionReply: "Opening scan report" },
        ],
      },
      {
        id: "w8_6",
        stepTitle: "6. Next Steps from Doctor",
        sender: "bot",
        time: "4:45 PM",
        text: "Hi Priya,\nDr. Aditi Sharma has reviewed your results. You will continue the same medication dose.\nYour next monitoring scan is scheduled on 16 Sep 2026 at 9:00 AM.",
        buttons: [
          { id: "add_next_scan_cal", label: "📅 Add to Calendar", actionReply: "Added to calendar" },
          { id: "ask_next_scan_q", label: "❓ Ask a Question", actionReply: "Question on follicle growth" },
        ],
      },
      {
        id: "w8_7",
        stepTitle: "7. Ongoing Support",
        sender: "bot",
        time: "4:46 PM",
        text: "If you have any questions, experience any symptoms (bloating, pain, etc.), or need assistance with your medication, we are here to help.",
        buttons: [
          { id: "talk_nurse_scan", label: "💬 Talk to a Nurse", actionReply: "Connect to nurse" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient misses monitoring appointment or doesn't confirm 24h reminder",
      agentPersona: {
        name: "Smrko Scheduling AI",
        role: "Monitoring Coordinator",
        avatar: "🔬",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. We noticed you missed your monitoring scan today. It's important for your treatment. Please press 1 to reschedule, 2 to speak to our care team, or stay on the line.",
        hi: "नमस्ते, मैं SmrkoMed से बोल रही हूँ। आज आपका फॉलिकल स्कैन मिस हो गया है। ट्रीटमेंट के लिए यह स्कैन बहुत महत्वपूर्ण है। रीशेड्यूल करने के लिए 1 दबाएं या बात करने के लिए 2 दबाएं।",
        te: "నమస్కారం ప్రియ గారు, ఈ రోజు మీ మానిటరింగ్ స్కాన్ మిస్ అయ్యింది. ఇది చాలా ముఖ్యమైనది. రీషెడ్యూల్ చేయడానికి 1 నొక్కండి.",
      },
      patientVoiceResponses: [
        "Patient reschedules for afternoon or next morning",
        "Patient reports delay due to traffic/work",
        "Patient reports severe abdominal heaviness",
      ],
      aiDecisionAndAction: [
        "AI books emergency evening slot before medication window",
        "Notifies sonologist and coordinator of updated time",
        "If illness/pain reported, connects directly to doctor",
      ],
      callSummaryLogged: {
        outcomeTags: ["SCAN_RESCHEDULED_SAME_DAY", "SONOLOGIST_NOTIFIED"],
        systemUpdates: ["Monitoring appointment updated to 4:00 PM"],
      },
    },
    systemActions: [
      "Create monitoring appointments from protocol template",
      "Send WhatsApp reminders with PDF preparation guides",
      "Fetch E2/P4 blood results automatically from LIS",
      "Store ultrasound scan report & follicle graph in EMR",
      "Notify doctor dashboard when reports are ready",
      "Calculate follicle growth velocity",
      "Update daily medication orders based on doctor sign-off",
      "Flag Trigger readiness when lead follicles reach 18-20 mm",
    ],
    followUpReminders: [
      { timing: "3 days before", action: "Advance appointment reminder" },
      { timing: "1 day before", action: "Bladder & timing preparation instructions" },
      { timing: "Day of appointment", action: "Check-in reminder with clinic map" },
      { timing: "If missed (within 2h)", action: "Urgent AI call to reschedule same day" },
      { timing: "After scan", action: "Results notification & doctor's updated instructions" },
    ],
    expectedOutcomes: [
      "High scan attendance rate (>95%)",
      "Timely clinical decisions on dose titration",
      "Zero cases of unmonitored hyperstimulation",
      "Accurate timing for Trigger injection",
      "Patient feels fully informed and guided",
    ],
    exceptions: [
      { scenario: "Patient misses scan appointment", resolution: "AI call within 2 hours -> Reschedule same day before 5 PM", simulateKey: "SCAN_MISS" },
      { scenario: "Lab blood results delayed", resolution: "Alert lab supervisor -> Track with priority flag", simulateKey: "LAB_DELAY_E2" },
      { scenario: "Abnormal Estradiol surge (OHSS risk)", resolution: "Doctor alert -> Switch trigger to GnRH agonist (freeze-all)", simulateKey: "OHSS_SURGE" },
      { scenario: "Slow follicle response", resolution: "Doctor reviews dose adjustment (e.g. increase FSH to 300 IU)", simulateKey: "SLOW_GROWTH" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 9: TRIGGER INJECTION (image 9.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 9,
    shortCode: "09",
    title: "Step 9 – Trigger",
    subtitle: "Detect the right moment, initiate the next step, and keep the journey on track.",
    goal: "Identify the right time for the trigger injection, ensure the patient takes it correctly, and confirm readiness for egg retrieval (OPU).",
    badge: "CRITICAL TIMING",
    colorScheme: {
      primary: "text-red-600",
      badgeBg: "bg-red-50 text-red-700 border-red-200",
      border: "border-red-500",
      accent: "bg-red-500",
    },
    triggers: [
      { icon: "Target", text: "Doctor decides trigger based on scan & hormone levels (Lead follicles 18-20mm)" },
      { icon: "ClockAlert", text: "Trigger plan and EXACT injection time locked in system (e.g. 9:00 PM)" },
      { icon: "Send", text: "Patient receives high-priority trigger instructions" },
      { icon: "BellRing", text: "T-24h, T-2h, and T-30m countdown reminders schedule" },
      { icon: "CheckCircle", text: "Patient confirms injection taken with exact timestamp" },
      { icon: "AlertTriangle", text: "CRITICAL ALERT: No confirmation within 30 minutes of scheduled time" },
    ],
    objectives: [
      "Ensure trigger injection is taken at the EXACT designated minute",
      "Provide step-by-step visual instructions and injection video",
      "Confirm patient has the trigger medication in hand beforehand",
      "Detect and manage missed, delayed, or improper doses immediately",
      "Lock OPU (Egg Retrieval) timing exactly 36 hours post-trigger",
      "Prepare patient for pre-OPU fasting and OT admission",
    ],
    dataCollected: [
      "Trigger date and exact scheduled time (e.g. 15 Sep, 9:00 PM sharp)",
      "Medication type & dose (e.g. hCG 10,000 IU vs Decapeptyl 0.2mg Dual Trigger)",
      "Patient injection confirmation timestamp",
      "Reported symptoms or difficulties during injection",
      "OPU schedule (locked for exactly 36h later: 17 Sep, 9:00 AM)",
    ],
    keyIntegrations: [
      "WhatsApp High-Priority Notification Engine",
      "Calendar (OPU Operation Theatre schedule lock)",
      "HIS / EMR (Treatment timeline updates)",
      "Pharmacy (Cold-chain trigger delivery verification)",
      "Sarvam / Retell AI Calling (Instant voice outreach if missed)",
    ],
    whatsappFlow: [
      {
        id: "w9_1",
        stepTitle: "1. Trigger Plan Notification",
        sender: "bot",
        time: "10:00 AM",
        text: "👋 Hi Priya,\nYour doctor has advised a trigger injection today to help with the final maturation of your eggs.\n\n• Injection: hCG 5000 IU / 10,000 IU\n• Time: Tonight at 9:00 PM SHARP\n\nWe've attached a step-by-step guide and a short video. Please follow the instructions carefully.",
        buttons: [
          { id: "view_trig_inst", label: "📋 View Instructions", actionReply: "View trigger instructions" },
          { id: "watch_trig_vid", label: "▶️ Watch Video", actionReply: "Watch trigger video" },
          { id: "ask_trig_q", label: "❓ Ask a Question", actionReply: "Question on trigger injection" },
        ],
      },
      {
        id: "w9_2",
        stepTitle: "2. Pre-Injection Reminder (8:00 PM)",
        sender: "bot",
        time: "8:00 PM",
        text: "⏰ Hi Priya,\nThis is a reminder to take your trigger injection (hCG 5000 IU) today at 9:00 PM.\nPlease prepare your injection kit and follow the instructions.",
        buttons: [
          { id: "trig_ready", label: "✅ I'm ready", actionReply: "I'm ready with medication" },
          { id: "trig_help", label: "❓ Need Help", actionReply: "Need help with injection" },
        ],
      },
      {
        id: "w9_3",
        stepTitle: "3. Post-Injection Confirmation (9:30 PM)",
        sender: "bot",
        time: "9:30 PM",
        text: "Hi Priya,\nHave you taken your trigger injection?\nPlease confirm below.",
        buttons: [
          { id: "trig_taken_yes", label: "✅ Yes, I've taken it", actionReply: "careloop_trigger_done" },
          { id: "trig_not_yet", label: "⏰ Not yet", actionReply: "Not yet taken" },
        ],
      },
      {
        id: "w9_4",
        stepTitle: "4. If Confirmed (9:32 PM)",
        sender: "bot",
        time: "9:32 PM",
        text: "Thank you! ✅\nYour trigger injection has been recorded at 9:32 PM.\n\nYour OPU (egg retrieval) is scheduled in 36 hours.\nWe'll keep you updated.",
        buttons: [
          { id: "view_opu_det", label: "🏥 View OPU Details", actionReply: "View OPU schedule" },
          { id: "talk_nurse_trig", label: "💬 Talk to a Nurse", actionReply: "Connect to nurse" },
        ],
      },
      {
        id: "w9_5",
        stepTitle: "5. If Not Confirmed (Auto Follow-up at 9:45 PM)",
        sender: "bot",
        time: "9:45 PM",
        text: "Hi Priya,\nWe haven't received confirmation yet. Have you taken your trigger injection?\nIt's important to take it on time for the best results.",
        buttons: [
          { id: "trig_late_yes", label: "✅ Yes, I've taken it", actionReply: "careloop_trigger_done" },
          { id: "trig_late_help", label: "❓ I need help", actionReply: "Emergency assistance with trigger" },
        ],
      },
      {
        id: "w9_6",
        stepTitle: "6. If Still No Response (10:00 PM - CRITICAL)",
        sender: "bot",
        time: "10:00 PM",
        text: "🚨 We're unable to confirm your trigger injection.\nOur care team will call you shortly to assist. Please keep your phone nearby.",
        buttons: [
          { id: "talk_nurse_now", label: "📞 Talk to a Nurse Now", actionReply: "Patching emergency nurse call" },
        ],
      },
      {
        id: "w9_7",
        stepTitle: "7. Final Confirmation",
        sender: "bot",
        time: "10:05 PM",
        text: "You're all set! 🎉\nYour trigger has been taken and your OPU is scheduled.\nOur team is with you every step.",
        buttons: [
          { id: "view_next_opu", label: "👉 View Next Steps", actionReply: "View next steps" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "CRITICAL: No WhatsApp confirmation within 30 mins of scheduled trigger time",
      agentPersona: {
        name: "Emergency Care AI",
        role: "Urgent Trigger Coordinator",
        avatar: "🚨",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling urgently for Priya. We noticed we haven't received confirmation for your trigger injection. Have you taken the injection? If you need any help, please press 1 to speak with our care team right now.",
        hi: "नमस्ते, यह SmrkoMed से अति आवश्यक कॉल है। आपकी ट्रिगर इंजेक्शन का कन्फर्मेशन अभी तक नहीं मिला है। क्या आपने इंजेक्शन ले लिया है? तुरंत बात करने के लिए 1 दबाएं।",
        te: "నమస్కారం ప్రియ గారు, ఇది SmrkoMed నుండి అత్యవసర కాల్. మీ ట్రిగ్గర్ ఇంజెక్షన్ సమయం దాటింది. మీరు ఇంజెక్షన్ తీసుకున్నారా? వెంటనే నర్స్‌తో మాట్లాడటానికి 1 నొక్కండి.",
      },
      patientVoiceResponses: [
        "Patient confirms injection taken at 9:15 PM",
        "Patient took wrong dose or had needle leak",
        "Patient fell asleep or forgot injection",
      ],
      aiDecisionAndAction: [
        "AI records exact minute injection was taken",
        "If delayed by >30 mins, automatically reschedules OPU OT time by same duration",
        "Immediately connects duty embryologist and doctor",
      ],
      callSummaryLogged: {
        outcomeTags: ["TRIGGER_TAKEN_CONFIRMED", "OPU_TIME_LOCKED"],
        systemUpdates: ["OPU locked: Exactly 36 hours later at 9:00 AM"],
      },
    },
    systemActions: [
      "Record trigger medication, dose, and planned time (down to the minute)",
      "Send high-priority WhatsApp alerts with prominent action buttons",
      "Track patient confirmation in real-time with countdown timers",
      "Trigger automated AI voice call if unconfirmed after 30 minutes",
      "Lock Operation Theatre (OT) and anesthesia schedule for OPU at T+36h",
      "Notify doctor & embryology lab of confirmed trigger execution",
      "Generate pre-OPU fasting checklist (NPO past midnight)",
    ],
    followUpReminders: [
      { timing: "24 hours before", action: "Trigger injection date & medicine check" },
      { timing: "2 hours before", action: "Prepare injection kit and alcohol swabs" },
      { timing: "30 minutes before", action: "Final countdown reminder" },
      { timing: "If no response (30m)", action: "CRITICAL AI voice call + Duty nurse outreach" },
      { timing: "Next day morning", action: "OPU preparation (strict fasting instructions)" },
    ],
    expectedOutcomes: [
      "100% on-time trigger injection compliance",
      "Zero cycle cancellations due to timing errors",
      "Optimal oocyte maturation and retrieval yields",
      "Clear coordination between patient, doctor, and OT",
      "Patient feels fully reassured and prepared for procedure",
    ],
    exceptions: [
      { scenario: "Patient forgot or took injection late", resolution: "Immediately calculate delay -> Reschedule OPU OT time by exact delay", simulateKey: "DELAYED_TRIGGER" },
      { scenario: "Incorrect dose or medication leak", resolution: "Emergency doctor consult -> Immediate booster injection order", simulateKey: "DOSE_ERROR" },
      { scenario: "Severe acute pain post-injection", resolution: "Connect duty doctor -> Arrange emergency clinic evaluation", simulateKey: "ACUTE_PAIN" },
      { scenario: "Injection cold-chain compromised", resolution: "Urgent dispatch of replacement trigger vial via express delivery", simulateKey: "COLD_CHAIN_FAIL" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 10: OPU (EGG RETRIEVAL) (image 11.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 10,
    shortCode: "10",
    title: "Step 10 – OPU (Oocyte Pick-Up)",
    subtitle: "Support a smooth and safe egg retrieval procedure with coordinated care, clear instructions, and real-time updates.",
    goal: "Ensure a safe, well-coordinated egg retrieval (OPU) procedure with minimal stress and maximum communication for the patient and care team.",
    badge: "Egg Retrieval Procedure",
    colorScheme: {
      primary: "text-cyan-600",
      badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-200",
      border: "border-cyan-500",
      accent: "bg-cyan-500",
    },
    triggers: [
      { icon: "ClockCheck", text: "Trigger confirmed and OPU scheduled (T+36 hours)" },
      { icon: "AlertCircle", text: "Patient informed of strict fasting instructions" },
      { icon: "FileCheck", text: "Pre-OP checklist completed (consents, payments, medical clearance)" },
      { icon: "UserCheck", text: "Patient checks in on the day of procedure (8:15 AM)" },
      { icon: "Activity", text: "Nurse marks patient as 'Arrived & Prepped in Pre-OP'" },
      { icon: "CheckCircle", text: "Doctor confirms readiness for egg retrieval" },
    ],
    objectives: [
      "Ensure patient is properly prepped (fasting, consents, anxiety relief)",
      "Coordinate seamlessly between patient, nurse, doctor, and embryologist",
      "Provide real-time updates to partner waiting in lounge",
      "Perform safe oocyte aspiration under light anesthesia",
      "Capture procedure details and exact oocyte count (e.g. 12 retrieved)",
      "Ensure attentive post-OP care, recovery, and discharge instructions",
      "Explain next steps (fertilization/ICSI updates tomorrow)",
    ],
    dataCollected: [
      "Arrival time at clinic (8:15 AM)",
      "Vital signs (BP, pulse, oxygen, temperature)",
      "Anesthesia details and clearance",
      "Number of follicles aspirated",
      "Number of oocytes retrieved (e.g. 12 oocytes)",
      "Procedure notes & recovery room status",
      "Discharge time and post-procedure medication list",
    ],
    keyIntegrations: [
      "HIS / EMR (OT procedure notes & anesthesia log)",
      "OT Management system",
      "Embryology Lab Incubator Log",
      "WhatsApp Cloud API (Real-time partner updates)",
      "Document management (Discharge summary)",
    ],
    whatsappFlow: [
      {
        id: "w10_1",
        stepTitle: "1. Pre-Procedure Reminder (Day Before)",
        sender: "bot",
        time: "6:00 PM",
        text: "👋 Hi Priya,\nYour egg retrieval (OPU) is scheduled tomorrow at 9:00 AM.\n\nPlease remember:\n• Do not eat or drink after midnight (strict fasting)\n• Take only the advised medications\n• Arrive 30 minutes early (8:30 AM)\n• Come with your partner (if applicable)\n\nWe're with you! 💙",
        buttons: [
          { id: "view_opu_inst", label: "📋 View Instructions", actionReply: "View OPU instructions" },
          { id: "ask_opu_q", label: "❓ Ask a Question", actionReply: "Question about procedure" },
        ],
      },
      {
        id: "w10_2",
        stepTitle: "2. Day of Procedure – Check-in",
        sender: "bot",
        time: "8:20 AM",
        text: "Hi Priya,\nWelcome to Nova IVF Centre!\nYou have checked in for your OPU at 8:15 AM. Our team will guide you through the next steps. You'll be updated shortly.",
        buttons: [
          { id: "view_proc_flow", label: "📋 View Process Flow", actionReply: "View process flow" },
          { id: "talk_nurse_preop", label: "💬 Talk to a Nurse", actionReply: "Connect to pre-OP nurse" },
        ],
      },
      {
        id: "w10_3",
        stepTitle: "3. Pre-Procedure Confirmation",
        sender: "bot",
        time: "8:50 AM",
        text: "Hi Priya,\nYour pre-procedure preparation is complete. The doctor will meet you shortly before the procedure.",
        buttons: [
          { id: "opu_ready_yes", label: "✅ I'm ready", actionReply: "careloop_opu_ready" },
          { id: "opu_need_help", label: "❓ Need help", actionReply: "I have a concern" },
        ],
      },
      {
        id: "w10_4",
        stepTitle: "4. Procedure in Progress",
        sender: "bot",
        time: "9:15 AM",
        text: "Hi Priya & Rahul,\nYour egg retrieval procedure has started at 9:15 AM. Our team is with you and everything is going as planned.\nWe'll update you once the procedure is completed.",
      },
      {
        id: "w10_5",
        stepTitle: "5. Procedure Completed",
        sender: "bot",
        time: "10:05 AM",
        text: "Hi Priya,\nYour egg retrieval is now complete! 🎉\n\nWe have retrieved *12 oocytes*.\nYou are now resting in the recovery room for observation.",
        buttons: [
          { id: "view_opu_summary", label: "📄 View Summary", actionReply: "Opening retrieval summary" },
        ],
      },
      {
        id: "w10_6",
        stepTitle: "6. Recovery & Discharge",
        sender: "bot",
        time: "11:30 AM",
        text: "Hi Priya,\nYour recovery is going well. You may be discharged in about 1 hour.\nPlease follow the post-procedure care instructions. Avoid strenuous activity today.",
        buttons: [
          { id: "post_op_guide", label: "📄 Post-OP Care Guide", actionReply: "Opening post-OP care guide" },
          { id: "call_nurse_recov", label: "📞 Call Nurse", actionReply: "Call recovery nurse" },
        ],
      },
      {
        id: "w10_7",
        stepTitle: "7. What's Next?",
        sender: "bot",
        time: "11:45 AM",
        text: "Hi Priya,\nYour oocytes are now with our embryology team for fertilization (ICSI).\nWe'll share the fertilization update tomorrow. Rest well! 🌸",
        buttons: [
          { id: "know_next_steps", label: "👉 Know What Happens Next", actionReply: "View next steps" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient expresses pre-OP anxiety or requests nurse call",
      agentPersona: {
        name: "Nurse Sarah AI",
        role: "Surgical Care Specialist",
        avatar: "🏥",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. I understand you have questions about your egg retrieval procedure. Would you like me to explain what to expect, or connect you with your nurse or doctor?",
        hi: "नमस्ते, मैं SmrkoMed से बोल रही हूँ। आपकी एग रिट्रीवल प्रक्रिया के बारे में आपके सवालों का जवाब देने के लिए कॉल किया है। क्या आप प्रक्रिया के बारे में जानना चाहती हैं?",
        te: "నమస్కారం ప్రియ గారు, మీ ఎగ్ రిట్రీవల్ ప్రొసీజర్ గురించి వివరాలు అందించడానికి కాల్ చేసాము. మీకు ఏమైనా భయం లేదా ఆందోళన ఉందా?",
      },
      patientVoiceResponses: [
        "Patient asks about pain levels during procedure",
        "Patient asks how long anesthesia lasts",
        "Patient asks when partner should give semen sample",
      ],
      aiDecisionAndAction: [
        "AI reassures patient (procedure is painless under mild sedation)",
        "AI explains partner semen collection timing (simultaneous with OPU)",
        "Logs patient comfort status in OT check-in dashboard",
      ],
      callSummaryLogged: {
        outcomeTags: ["PRE_OP_REASSURED", "FASTING_CONFIRMED"],
        systemUpdates: ["Patient arrived in Pre-OP at 8:15 AM"],
      },
    },
    systemActions: [
      "Update patient status to 'OPU In Progress' in EMR",
      "Notify OT, anesthesia, and embryology nursing teams",
      "Capture procedure outcome (12 oocytes retrieved)",
      "Generate partner semen collection order in andrology lab",
      "Create post-OP care task and discharge checklist",
      "Schedule Step 11: Fertilization Update for Day 1 morning",
      "Send post-procedure care PDF via WhatsApp",
    ],
    followUpReminders: [
      { timing: "Day before (6 PM)", action: "Fasting & timing reminder" },
      { timing: "Day of procedure", action: "Reception check-in & OT room guidance" },
      { timing: "Immediately post-OP", action: "Egg count notification to couple & family" },
      { timing: "Same day evening", action: "Post-OP comfort check-in" },
      { timing: "Day 1 morning", action: "Fertilization report dispatch" },
    ],
    expectedOutcomes: [
      "Safe, painless procedure with no complications",
      "Patient feels supported and calm throughout",
      "Accurate oocyte yield captured directly in embryology log",
      "Partner kept continuously informed during procedure",
      "Smooth discharge with clear recovery instructions",
    ],
    exceptions: [
      { scenario: "Patient broke fasting (consumed water/food)", resolution: "Notify anesthesiologist -> Delay procedure by required fasting hours", simulateKey: "FASTING_BROKEN" },
      { scenario: "Low oocyte yield (fewer than expected)", resolution: "Doctor counseling -> Gentle supportive communication", simulateKey: "LOW_EGGS" },
      { scenario: "Moderate post-OP pelvic pain or nausea", resolution: "Recovery nurse administers prescribed antiemetic/analgesic", simulateKey: "POSTOP_PAIN" },
      { scenario: "Partner sample delay", resolution: "Andrology team activates backup frozen sperm sample if pre-consented", simulateKey: "SEMEN_BACKUP" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 11: EMBRYOLOGY & FERTILIZATION (image 10.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 11,
    shortCode: "11",
    title: "Step 11 – Embryology",
    subtitle: "Track embryo development, share updates with patients, and plan the next steps with complete transparency.",
    goal: "Provide real-time, accurate, and easy-to-understand embryo development updates, ensuring patient confidence and informed decision-making.",
    badge: "Embryo Lab Updates",
    colorScheme: {
      primary: "text-violet-600",
      badgeBg: "bg-violet-50 text-violet-700 border-violet-200",
      border: "border-violet-500",
      accent: "bg-violet-500",
    },
    triggers: [
      { icon: "Microscope", text: "Embryology lab updates embryo development stage" },
      { icon: "Camera", text: "Embryo grading and time-lapse images available" },
      { icon: "CheckCircle", text: "Doctor marks embryos for fresh transfer or freeze" },
      { icon: "MessageSquare", text: "Patient requests daily embryo status update" },
      { icon: "Sparkles", text: "System detects key milestones (Day 1 fertilization, Day 3 cleavage, Day 5 blastocyst)" },
      { icon: "Users", text: "Partner/guardian added for updates" },
    ],
    objectives: [
      "Keep couple transparently informed about embryo development",
      "Share clear, easy-to-understand reports with blastocyst images",
      "Educate patient on Gardner embryo grading (e.g. 4AA, 4AB) in plain language",
      "Enable informed doctor-patient discussion on Fresh vs Freeze-All transfer",
      "Reduce anxiety during the 5-day culture period",
      "Maintain strict security and confidentiality of sensitive lab data",
    ],
    dataCollected: [
      "Embryo development stage (Day 1, 2, 3, 5)",
      "Fertilization rate (e.g. 9 of 12 fertilized via ICSI)",
      "Embryo grading breakdown (e.g. 2 x Grade A, 3 x Grade B)",
      "Number of viable blastocysts formed",
      "Vitrification/Freezing details (straw IDs, liquid nitrogen tank)",
      "Transfer strategy (Fresh transfer vs Freeze-All FET)",
    ],
    keyIntegrations: [
      "Embryology Lab Information System (ELIS)",
      "Time-lapse incubator image storage (AI embryo grading)",
      "WhatsApp Cloud API (Media & report cards)",
      "Patient Portal (Secure HD embryo photo viewing)",
      "Calendar (Transfer scheduling)",
    ],
    whatsappFlow: [
      {
        id: "w11_1",
        stepTitle: "1. Embryology Update Notification",
        sender: "bot",
        time: "9:00 AM",
        text: "👋 Hi Priya,\nGreat news! Your embryos are developing well. Here's an update from our embryology lab (Day 3):\n\n• 5 embryos are developing\n• Grading: 2 x Grade A, 3 x Grade B\n\nWe've attached images and a short guide to understand embryo grading.",
        media: {
          type: "embryo_stats",
          retrieved: 12,
          fertilized: 9,
          developing: "5 high-grade embryos developing on Day 3",
        },
        buttons: [
          { id: "view_emb_imgs", label: "🖼️ View Images", actionReply: "Opening embryo images" },
          { id: "learn_grading", label: "📘 Learn About Grading", actionReply: "Learn about grading" },
          { id: "ask_emb_q", label: "❓ Ask a Question", actionReply: "Question about embryos" },
        ],
      },
      {
        id: "w11_2",
        stepTitle: "2. Educational Support",
        sender: "bot",
        time: "9:05 AM",
        text: "Hi Priya,\nHere's a short video explaining embryo grades and what they mean for your journey.",
        media: {
          type: "video",
          title: "Understanding Embryo Grading in IVF",
          duration: "2 min video",
        },
        buttons: [
          { id: "watch_emb_vid", label: "▶️ Watch Video", actionReply: "Playing embryo grading video" },
          { id: "ask_emb_q2", label: "❓ Ask a Question", actionReply: "Question on blastocyst quality" },
        ],
      },
      {
        id: "w11_3",
        stepTitle: "3. Patient Acknowledgement",
        sender: "patient",
        time: "9:12 AM",
        text: "Thank you for the update. The images look good. Can you please let me know what happens next?",
        buttons: [
          { id: "talk_doc_emb", label: "💬 Talk to My Doctor", actionReply: "Schedule doctor discussion" },
          { id: "next_steps_emb", label: "👉 Next Steps Info", actionReply: "Next steps info" },
        ],
      },
      {
        id: "w11_4",
        stepTitle: "4. Doctor's Review & Recommendation",
        sender: "bot",
        time: "9:45 AM",
        text: "Hi Priya,\nYour embryos are progressing well. Based on the current development, we recommend:\n\n• 1–2 embryos for fresh transfer (Day 5)\n• Remaining good quality embryos can be frozen for future use\n\nLet's discuss your options.",
        buttons: [
          { id: "book_emb_disc", label: "📅 Book Discussion", actionReply: "Book transfer discussion" },
          { id: "view_full_rep", label: "📄 View Full Report", actionReply: "Opening full embryology report" },
        ],
      },
      {
        id: "w11_5",
        stepTitle: "5. Partner Update (Optional)",
        sender: "bot",
        time: "9:50 AM",
        text: "Hi Rahul,\nHere's the latest embryo update for Priya's cycle. You can view the report and images here.",
        buttons: [
          { id: "partner_view_emb", label: "📄 View Embryo Report", actionReply: "Rahul viewing report" },
        ],
      },
      {
        id: "w11_6",
        stepTitle: "6. Decision Confirmation",
        sender: "bot",
        time: "10:05 AM",
        text: "Hi Priya,\nYour decision for fresh transfer on Day 5 has been noted. We'll keep you updated on the exact date and time.",
        buttons: [
          { id: "view_transfer_sched", label: "📅 View Schedule", actionReply: "Opening transfer schedule" },
        ],
      },
      {
        id: "w11_7",
        stepTitle: "7. Continued Support",
        sender: "bot",
        time: "10:06 AM",
        text: "We're here for you! If you have any questions about embryo grading, freezing, or the next steps, just reply here or call us.",
        buttons: [
          { id: "talk_nurse_emb", label: "💬 Talk to a Nurse", actionReply: "Connect to nurse" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient asks questions about blastocyst grading or freeze-all strategy",
      agentPersona: {
        name: "Dr. Elena AI",
        role: "Senior Embryology Counselor",
        avatar: "🔬",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. We see you've received your embryology update. Do you have any questions about the embryo grading or the next steps?",
        hi: "नमस्ते, मैं SmrkoMed से बात कर रही हूँ। आपके भ्रूण (Embryo) विकास की रिपोर्ट आपको मिल गई होगी। क्या आप ग्रेडिंग या फ्रीजिंग के बारे में बात करना चाहती हैं?",
        te: "నమస్కారం ప్రియ గారు, మీ ఎంబ్రియో రిపోర్ట్ అందింది. గ్రేడింగ్ లేదా ఫ్రీజింగ్ గురించి మీకు ఏమైనా ప్రశ్నలు ఉన్నాయా?",
      },
      patientVoiceResponses: [
        "Patient asks difference between Grade A and B",
        "Patient asks how many embryos will be transferred",
        "Patient asks cost of embryo freezing",
      ],
      aiDecisionAndAction: [
        "AI explains blastocyst morphology in simple reassuring words",
        "AI explains single vs double embryo transfer policy (SET)",
        "Schedules call with senior embryologist if requested",
      ],
      callSummaryLogged: {
        outcomeTags: ["EMBRYOLOGY_COUNSELED", "TRANSFER_STRATEGY_SET"],
        systemUpdates: ["Strategy: Day 5 Fresh Transfer + 3 Embryos Cryopreserved"],
      },
    },
    systemActions: [
      "Sync embryo data from lab system (grade, stage, photos)",
      "Generate patient-friendly graphic report",
      "Send WhatsApp notification with media attachments",
      "Create cryopreservation consent & billing invoice for frozen embryos",
      "Schedule Embryo Transfer (Step 12) on Day 5 at 10:00 AM",
      "Update EMR timeline with vitrification straw identifiers",
    ],
    followUpReminders: [
      { timing: "Day 1 (24h post-OPU)", action: "Fertilization rate update" },
      { timing: "Day 3 morning", action: "Cleavage stage grading update" },
      { timing: "Day 5 morning", action: "Blastocyst formation & transfer confirmation" },
      { timing: "If freezing", action: "Send cryopreservation certificate & receipt" },
      { timing: "Day before transfer", action: "Transfer preparation guidelines" },
    ],
    expectedOutcomes: [
      "Couple feels informed, involved, and confident",
      "Complete clarity on embryo quality without clinical jargon",
      "Timely decision on fresh transfer vs freeze-all",
      "Legally compliant cryopreservation records",
      "Smooth transition to transfer day",
    ],
    exceptions: [
      { scenario: "No viable blastocysts formed", resolution: "Immediate priority alert -> In-person compassionate doctor consultation", simulateKey: "NO_BLASTOCYSTS" },
      { scenario: "Patient confused about grading", resolution: "AI sends video explainer -> Arranges 5-min embryologist call", simulateKey: "GRADING_CONFUSED" },
      { scenario: "Uterine lining sub-optimal for fresh transfer", resolution: "Doctor switches to Freeze-All FET -> Update journey roadmap", simulateKey: "FREEZE_ALL_SWITCH" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 12: EMBRYO TRANSFER / FET (image 12.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 12,
    shortCode: "12",
    title: "Step 12 – Transfer / FET",
    subtitle: "Coordinate and support the embryo transfer (fresh or frozen), ensure patient readiness, and continue care seamlessly.",
    goal: "Ensure a well-coordinated, comfortable and informed embryo transfer experience, with clear instructions and continued support afterwards.",
    badge: "Embryo Transfer",
    colorScheme: {
      primary: "text-purple-600",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
      border: "border-purple-500",
      accent: "bg-purple-500",
    },
    triggers: [
      { icon: "Sparkles", text: "Embryos ready for transfer (fresh blastocyst or thawed FET)" },
      { icon: "Calendar", text: "Doctor schedules transfer date and time (10:00 AM)" },
      { icon: "Send", text: "Patient receives transfer preparation instructions" },
      { icon: "CheckCircle", text: "Lab confirms embryo thaw and survival (FET)" },
      { icon: "UserCheck", text: "Patient confirms attendance and bladder preparation" },
      { icon: "Clock", text: "Reminder sent 1 day before and on procedure morning" },
    ],
    objectives: [
      "Ensure patient is well prepared (full bladder, relaxed, on-time)",
      "Provide clear pre-transfer instructions (no perfumes, comfortable clothes)",
      "Coordinate seamlessly between doctor, embryology lab, and nurse",
      "Confirm patient arrival and ultrasound guidance readiness",
      "Support patient with gentle reassurance during catheter insertion",
      "Share transfer complete summary and post-transfer care guidelines",
      "Maintain clear communication and smooth transition to 2-week wait",
    ],
    dataCollected: [
      "Transfer date & scheduled time",
      "Type of transfer (Fresh vs Frozen FET)",
      "Number and grade of embryos transferred (e.g. 1 Grade-4AA blastocyst)",
      "Endometrial thickness on day of transfer (e.g. 10.1mm)",
      "Procedure notes (easy catheter passage, ultrasound image)",
      "Luteal phase medications prescribed (Progesterone, Aspirin)",
    ],
    keyIntegrations: [
      "EMR / LIS (Transfer record & catheter details)",
      "Embryo thaw & loading log",
      "Calendar (Procedure OT room)",
      "WhatsApp Cloud API (Preparation guides & post-transfer care)",
      "Pharmacy (Luteal support prescription delivery)",
    ],
    whatsappFlow: [
      {
        id: "w12_1",
        stepTitle: "1. Transfer Reminder (Day Before)",
        sender: "bot",
        time: "6:00 PM",
        text: "👋 Hi Priya,\nYour embryo transfer is scheduled tomorrow at 10:00 AM.\n\nPlease remember:\n• Take your prescribed medications\n• Arrive 30 minutes early (9:30 AM)\n• Come with a comfortably full bladder\n• Bring a valid ID\n\nWe're with you! 💙",
        buttons: [
          { id: "view_transfer_inst", label: "📋 View Instructions", actionReply: "View transfer instructions" },
          { id: "watch_transfer_vid", label: "▶️ Watch Video", actionReply: "Watch transfer video" },
          { id: "ask_transfer_q", label: "❓ Ask a Question", actionReply: "Question on transfer" },
        ],
      },
      {
        id: "w12_2",
        stepTitle: "2. Day of Transfer – Check-in",
        sender: "bot",
        time: "9:10 AM",
        text: "Hi Priya,\nWelcome to Nova IVF Centre!\nPlease reply once you have arrived at the clinic. Our team will guide you from here.",
        buttons: [
          { id: "arrived_transfer", label: "📍 I've arrived", actionReply: "careloop_arrived" },
          { id: "need_help_arrived", label: "❓ Need help", actionReply: "Need help finding clinic" },
        ],
      },
      {
        id: "w12_3",
        stepTitle: "3. Pre-Procedure Confirmation",
        sender: "bot",
        time: "9:40 AM",
        text: "Hi Priya,\nYou are now in the preparation room. Your doctor will meet you shortly before the transfer. Do you have any questions before we begin?",
        buttons: [
          { id: "ask_q_pretrans", label: "❓ Ask a Question", actionReply: "Question before transfer" },
          { id: "trans_ready_yes", label: "✅ I'm ready", actionReply: "I'm ready for transfer" },
        ],
      },
      {
        id: "w12_4",
        stepTitle: "4. Transfer Completed",
        sender: "bot",
        time: "10:30 AM",
        text: "Hi Priya,\nYour embryo transfer has been completed successfully! 🎉\nNow it's time to rest and take care.\nWe'll share detailed post-transfer instructions with you shortly.",
        buttons: [
          { id: "view_trans_summary", label: "📄 View Transfer Summary", actionReply: "Opening transfer summary" },
        ],
      },
      {
        id: "w12_5",
        stepTitle: "5. Post-Transfer Care Instructions",
        sender: "bot",
        time: "10:45 AM",
        text: "Hi Priya,\nHere are your post-transfer care instructions:\n• Rest for the rest of the day\n• Avoid strenuous activity\n• Continue prescribed medications\n• Report any unusual symptoms (e.g., pain, bleeding)",
        media: {
          type: "pdf",
          title: "Post-Transfer Care Guide (PDF)",
          pages: "Dos and Don'ts for the Two-Week Wait",
        },
        buttons: [
          { id: "dl_post_trans_pdf", label: "📄 View PDF", actionReply: "Opening care guide" },
          { id: "ask_post_trans_q", label: "❓ Ask a Question", actionReply: "Question on post-transfer rest" },
        ],
      },
      {
        id: "w12_6",
        stepTitle: "6. Emotional Support Check-in",
        sender: "bot",
        time: "6:00 PM",
        text: "Hi Priya,\nHow are you feeling after the procedure?\nRemember, it's normal to feel a mix of emotions. If you need to talk, we're here for you. 🌸",
        buttons: [
          { id: "feeling_okay_trans", label: "❤️ I'm okay", actionReply: "I am feeling good and resting" },
          { id: "talk_nurse_posttrans", label: "💬 Talk to a Nurse", actionReply: "Connect with nurse" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient reports pain/bleeding or expresses high anxiety on transfer day",
      agentPersona: {
        name: "Nurse Maria AI",
        role: "Transfer Recovery Coordinator",
        avatar: "🌸",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. We see you recently had your embryo transfer. How are you feeling today? Do you have any questions or concerns we can help you with?",
        hi: "नमस्ते, मैं SmrkoMed से बोल रही हूँ। आपका एम्ब्रियो ट्रांसफर सफलतापूर्वक पूरा हो गया है। आप कैसा महसूस कर रही हैं? क्या आपको कोई परेशानी या सवाल है?",
        te: "నమస్కారం ప్రియ గారు, మీ ఎంబ్రియో ట్రాన్స్‌ఫర్ విజయవంతంగా పూర్తయింది. మీరు ఎలా ఉన్నారు? ఏమైనా సందేహాలు ఉన్నాయా?",
      },
      patientVoiceResponses: [
        "Patient asks if bed rest is mandatory",
        "Patient reports mild cramping or spotting",
        "Patient asks about progesterone timing",
      ],
      aiDecisionAndAction: [
        "AI reassures patient (strict bed rest is not required; normal light activity is safe)",
        "AI explains mild cramping is common after catheter insertion",
        "Confirms next appointment: Beta-hCG blood test on Day 14",
      ],
      callSummaryLogged: {
        outcomeTags: ["POST_TRANSFER_REASSURED", "LUTEAL_SUPPORT_CONFIRMED"],
        systemUpdates: ["Transfer completed: 1 Blastocyst 4AA transferred"],
      },
    },
    systemActions: [
      "Update patient status to 'Transfer Completed' in EMR",
      "Log procedure details (date, time, embryo number, grade, catheter)",
      "Send post-transfer instructions PDF via WhatsApp",
      "Schedule Step 14: Pregnancy Test (Beta-hCG) exactly 14 days later",
      "Activate Step 13: 2-Week Wait check-in schedule",
      "Notify attending fertility specialist and nurse team",
      "Update pharmacy orders for ongoing luteal progesterone support",
    ],
    followUpReminders: [
      { timing: "Day before transfer", action: "Bladder prep & reminder" },
      { timing: "Day of transfer", action: "Arrival check-in & post-procedure instructions" },
      { timing: "Same day evening", action: "Emotional check-in & rest encouragement" },
      { timing: "Day 1 post-transfer", action: "Check-in on symptoms & medications" },
      { timing: "Day 14", action: "Beta-hCG pregnancy blood test appointment" },
    ],
    expectedOutcomes: [
      "Smooth, comfortable embryo transfer procedure",
      "High patient adherence to luteal phase progesterone",
      "Early reassurance against two-week wait anxiety",
      "Clear understanding of symptoms vs emergency flags",
      "Care team and patient fully aligned for pregnancy test",
    ],
    exceptions: [
      { scenario: "Patient bladder empty at check-in", resolution: "Nurse provides water & waits 30 mins for optimal acoustic window", simulateKey: "BLADDER_EMPTY" },
      { scenario: "Embryo thaw failure (very rare)", resolution: "Lab thaws backup straw with pre-approval -> Notify doctor immediately", simulateKey: "THAW_FAILURE" },
      { scenario: "Acute post-transfer pelvic pain", resolution: "Duty doctor evaluates -> Rule out infection/cramping -> Prescribe antispasmodic", simulateKey: "POST_TRANS_PAIN" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 13: POST-TRANSFER SUPPORT (2-WEEK WAIT) (image 13.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 13,
    shortCode: "13",
    title: "Step 13 – Post-Transfer (Two-Week Wait)",
    subtitle: "Provide the right support after embryo transfer, monitor early signs, and guide the patient towards the pregnancy test with care.",
    goal: "Ensure proper post-transfer care, timely communication, and emotional support, leading up to the pregnancy test with care.",
    badge: "2-Week Wait Support",
    colorScheme: {
      primary: "text-fuchsia-600",
      badgeBg: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
      border: "border-fuchsia-500",
      accent: "bg-fuchsia-500",
    },
    triggers: [
      { icon: "HeartHandshake", text: "Embryo transfer marked as completed in system" },
      { icon: "Play", text: "Post-transfer care plan automatically activated" },
      { icon: "FileText", text: "Patient receives post-transfer instructions & medication plan" },
      { icon: "Clock", text: "Scheduled reminders for rest, medications (progesterone), and lifestyle" },
      { icon: "MessageSquare", text: "Patient asks questions anytime via WhatsApp" },
      { icon: "Edit3", text: "Nurse / doctor adds personalized notes or advice" },
    ],
    objectives: [
      "Ensure patient follows post-transfer medication instructions (Progesterone)",
      "Provide timely medication and lifestyle reminders throughout the 14 days",
      "Answer patient questions and reduce two-week wait anxiety",
      "Monitor for early symptoms (spotting, cramping) and triage red flags",
      "Prepare patient for the upcoming Beta-hCG pregnancy test",
      "Maintain continuous emotional support and reassurance",
    ],
    dataCollected: [
      "Transfer date and days post-transfer (DPO / DPT)",
      "Embryo transfer type (Fresh Day 5 vs Frozen FET)",
      "Medications prescribed (Luteal support: progesterone, aspirin)",
      "Patient-reported symptoms (bloating, spotting, cramping, fatigue)",
      "Lifestyle adherence (rest, hydration, avoiding heavy lifting)",
      "Scheduled Beta-hCG blood test date",
    ],
    keyIntegrations: [
      "EMR / LIS (Transfer details & medication timeline)",
      "Prescription management (Refills for progesterone)",
      "WhatsApp Cloud API (Periodic check-ins & symptom triage)",
      "Calendar (Beta-hCG lab appointment)",
      "Content library (Anxiety reduction & wellness articles)",
    ],
    whatsappFlow: [
      {
        id: "w13_1",
        stepTitle: "1. Post-Transfer Confirmation",
        sender: "bot",
        time: "11:45 AM",
        text: "👋 Hi Priya,\nYour embryo transfer was completed today at 11:30 AM. 💙\nYou are now in the next important phase. Please follow the care instructions shared below.",
        buttons: [
          { id: "view_care_inst", label: "📄 View Care Instructions (PDF)", actionReply: "Opening post-transfer care guide" },
          { id: "ask_care_q", label: "❓ Ask a Question", actionReply: "Question on care" },
        ],
      },
      {
        id: "w13_2",
        stepTitle: "2. Day 1 Reminder (Rest & Medication)",
        sender: "bot",
        time: "8:30 AM",
        text: "Hi Priya,\nThis is a gentle reminder to take your prescribed medications and get adequate rest today.\nRemember: Light activities are okay, but avoid strenuous exercise.",
        buttons: [
          { id: "meds_taken_day1", label: "✅ I've taken my medication", actionReply: "careloop_taken" },
          { id: "need_help_day1", label: "❓ Need help", actionReply: "Need help with medication" },
        ],
      },
      {
        id: "w13_3",
        stepTitle: "3. Day 3 Check-in",
        sender: "bot",
        time: "9:00 AM",
        text: "Hi Priya,\nHow are you feeling today? Any symptoms like bloating, mild cramps or spotting are common at this stage.\nWe're here for you. 💙",
        buttons: [
          { id: "feeling_fine_d3", label: "😊 I'm feeling fine", actionReply: "Feeling fine" },
          { id: "have_concern_d3", label: "🤒 I have a concern", actionReply: "careloop_symptoms" },
        ],
      },
      {
        id: "w13_4",
        stepTitle: "4. Patient Question (Example: Spotting)",
        sender: "patient",
        time: "11:20 AM",
        text: "Hi, I've noticed mild spotting. Is this normal after transfer?",
      },
      {
        id: "w13_5",
        stepTitle: "Bot Clinical Response",
        sender: "bot",
        time: "11:25 AM",
        text: "That can be normal, Priya. Mild spotting may occur due to hormonal changes or implantation. Please monitor it and let us know if it increases or is accompanied by pain.\nWe're here for you. 💙",
      },
      {
        id: "w13_6",
        stepTitle: "5. Day 5 Support Message",
        sender: "bot",
        time: "9:00 AM",
        text: "Hi Priya,\nYou're doing great! Keep taking your medications and avoid stress.\nHere's a short article on what to expect after embryo transfer.",
        buttons: [
          { id: "read_article_tww", label: "📖 Read Article", actionReply: "Reading wellness article" },
          { id: "ask_q_d5", label: "❓ Ask a Question", actionReply: "Question about symptoms" },
        ],
      },
      {
        id: "w13_7",
        stepTitle: "6. Pre-Pregnancy Test Reminder (Day 12)",
        sender: "bot",
        time: "9:00 AM",
        text: "Hi Priya,\nYour pregnancy test is scheduled in 2 days (Day 14). Please continue your medications and follow the instructions.\nTry to stay positive — we're with you! 💙",
        buttons: [
          { id: "view_test_inst_d12", label: "📋 View Test Instructions", actionReply: "View pregnancy test guide" },
          { id: "talk_nurse_d12", label: "💬 Talk to a Nurse", actionReply: "Connect to nurse" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient reports concerning symptoms (heavy bleeding, acute pain, or missed doses)",
      agentPersona: {
        name: "Dr. Ananya AI",
        role: "Luteal Phase Clinical Specialist",
        avatar: "🌸",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. We noticed you reported some symptoms. How are you feeling today? I can answer common questions or connect you with your nurse or doctor if needed.",
        hi: "नमस्ते, मैं SmrkoMed से बात कर रही हूँ। आपने कुछ लक्षणों की जानकारी दी है। आप अभी कैसा महसूस कर रही हैं? क्या आपको डॉक्टर या नर्स से बात करनी है?",
        te: "నమస్కారం ప్రియ గారు, మీ లక్షణాల గురించి వాట్సాప్‌లో చూసాము. మీకు సహాయం చేయడానికి మరియు డాక్టర్‌తో మాట్లాడించడానికి మేము కాల్ చేసాము.",
      },
      patientVoiceResponses: [
        "Patient reports mild brown spotting (implantation sign)",
        "Patient asks if they can do urine pregnancy test early",
        "Patient reports sharp abdominal pain",
      ],
      aiDecisionAndAction: [
        "AI reassures on mild brown spotting vs bright red bleeding",
        "Strongly counsels against home urine tests before Day 14 (avoids false trigger hCG reading)",
        "If sharp pain/heavy bleeding, alerts duty doctor immediately for urgent in-person scan",
      ],
      callSummaryLogged: {
        outcomeTags: ["TWW_SYMPTOMS_TRIAGED", "COUNSELED_ON_EARLY_TESTING"],
        systemUpdates: ["Patient reassured; instructed to continue Progesterone"],
      },
    },
    systemActions: [
      "Activate post-transfer care plan automatically",
      "Send scheduled WhatsApp check-in reminders (Day 1, 3, 5, 7, 10, 12)",
      "Track daily progesterone medication adherence",
      "Capture and log patient queries and symptoms in EMR",
      "Notify doctor / nurse for red-flag symptoms (heavy bleeding, fever)",
      "Deliver evidence-based educational articles based on cycle day",
      "Confirm Day 14 Beta-hCG appointment in laboratory queue",
    ],
    followUpReminders: [
      { timing: "Day 1", action: "Medication + rest reminder" },
      { timing: "Day 3", action: "Symptom check-in & reassurance" },
      { timing: "Day 5", action: "Lifestyle and emotional support" },
      { timing: "Day 7", action: "Mid-luteal medication check" },
      { timing: "Day 10", action: "Preparation for pregnancy test" },
      { timing: "Day 14", action: "Pregnancy test blood draw reminder" },
    ],
    expectedOutcomes: [
      "Patient feels supported and cared for during the anxious 2-week wait",
      "100% adherence to luteal phase support medications",
      "Early identification and medical management of complications",
      "Reduced panic and anxiety over normal post-transfer symptoms",
      "Smooth, prepared progression to the pregnancy test milestone",
    ],
    exceptions: [
      { scenario: "Severe bleeding or acute pain reported", resolution: "Emergency alert -> Direct phone call -> Immediate ultrasound evaluation", simulateKey: "ACUTE_BLEED" },
      { scenario: "Patient stops medication prematurely", resolution: "Urgent nurse counseling -> Reinforce critical role of progesterone", simulateKey: "STOP_MEDS" },
      { scenario: "Patient did early home urine test with faint line", resolution: "Counsel patient to wait for definitive Beta-hCG blood test on Day 14", simulateKey: "EARLY_TEST" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 14: PREGNANCY TEST (BETA-HCG) (image 14.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 14,
    shortCode: "14",
    title: "Step 14 – Pregnancy Test",
    subtitle: "Guide the patient through the pregnancy test (beta hCG), ensure timely testing, share results, and plan the next steps with care.",
    goal: "Ensure the pregnancy test is completed at the right time, results are communicated promptly, and the patient receives clear guidance for the next steps.",
    badge: "Beta-hCG Milestone",
    colorScheme: {
      primary: "text-emerald-600",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      border: "border-emerald-500",
      accent: "bg-emerald-500",
    },
    triggers: [
      { icon: "Calendar", text: "Pregnancy test scheduled (Day 14 after embryo transfer)" },
      { icon: "Clock", text: "Automatic reminder based on transfer date" },
      { icon: "MessageSquare", text: "Patient requests test information or home blood collection" },
      { icon: "CheckCircle", text: "Lab appointment confirmed for blood draw" },
      { icon: "UploadCloud", text: "Patient uploads Beta-hCG lab report" },
      { icon: "UserCheck", text: "Doctor/nurse initiates clinical review of result" },
    ],
    objectives: [
      "Ensure serum Beta-hCG blood test is done at the right time (Day 14)",
      "Provide clear pre-test instructions (no fasting necessary)",
      "Capture and share quantitative Beta-hCG test results promptly",
      "Reduce patient anxiety with empathetic and sensitive communication",
      "Enable timely doctor consultation for next steps (positive vs negative)",
      "Maintain emotional support regardless of the outcome",
    ],
    dataCollected: [
      "Scheduled test date (Day 14 post-transfer)",
      "Test type (Serum Beta-hCG quantitative)",
      "Test result numerical value (e.g. 256 mIU/mL)",
      "Interpretation: Positive (>50), Borderline (10-50), Negative (<5)",
      "Report upload timestamp & document image/PDF",
      "Doctor's next step orders (Repeat test in 48h vs Scan booking)",
    ],
    keyIntegrations: [
      "LIS / Diagnostic Lab (Direct automated Beta-hCG result feed)",
      "HIS / EMR (Clinical record & pregnancy staging)",
      "WhatsApp Cloud API (Automated results card dispatch)",
      "Doctor Calendar (Follow-up call/visit booking)",
      "CRM (Cycle outcome milestone tracking)",
    ],
    whatsappFlow: [
      {
        id: "w14_1",
        stepTitle: "1. Pregnancy Test Reminder (Scheduled)",
        sender: "bot",
        time: "8:00 PM (Day 13)",
        text: "Hi Priya,\nYour pregnancy test (beta hCG) is scheduled for tomorrow (Day 14 after transfer).\n\nPlease remember:\n• Do the blood test in the morning\n• No need to fast (unless advised)\n• Use the same lab or share the report here\n\nWe're with you! 💙",
        buttons: [
          { id: "view_test_inst_d14", label: "📋 View Instructions", actionReply: "View test instructions" },
          { id: "ask_test_q_d14", label: "❓ Ask a Question", actionReply: "Question on blood test" },
        ],
      },
      {
        id: "w14_2",
        stepTitle: "2. Day of Test – Check-in",
        sender: "bot",
        time: "10:00 AM",
        text: "Hi Priya,\nJust a quick check-in. Have you taken your pregnancy test today?\nLet us know once it's done. You can upload the report here.",
        buttons: [
          { id: "test_done_yes", label: "✅ I've done the test", actionReply: "I completed the blood test" },
          { id: "upload_rep_d14", label: "📎 Upload Report", actionReply: "careloop_upload" },
        ],
      },
      {
        id: "w14_3",
        stepTitle: "3. Report Received Confirmation",
        sender: "bot",
        time: "11:15 AM",
        text: "Thank you, Priya!\nWe've received your test report. Our team will review it and get back to you shortly.",
        buttons: [
          { id: "view_uploaded_rep_d14", label: "📄 View Uploaded Report", actionReply: "Opening uploaded report" },
        ],
      },
      {
        id: "w14_4",
        stepTitle: "4. Result Shared (by Care Team / AI)",
        sender: "bot",
        time: "12:30 PM",
        text: "Hi Priya,\nYour beta hCG result is *256 mIU/mL*.\n\n🎉 *This is a positive result!* 🌟\n\nOur doctor will review the results and guide you on the next steps. We'll reach out shortly.",
        buttons: [
          { id: "learn_meaning_d14", label: "📘 Learn What This Means", actionReply: "Learn what this means" },
        ],
      },
      {
        id: "w14_5",
        stepTitle: "5. Doctor Follow-up (Human / AI)",
        sender: "bot",
        time: "1:00 PM",
        text: "Hi Priya,\nYour doctor would like to discuss your results and next steps.\nWould you like to schedule a call or clinic visit?",
        buttons: [
          { id: "sched_call_d14", label: "📅 Schedule a Call", actionReply: "Schedule doctor call" },
          { id: "talk_nurse_d14", label: "💬 Talk to a Nurse", actionReply: "Connect with nurse" },
        ],
      },
      {
        id: "w14_6",
        stepTitle: "6. Next Steps Guidance",
        sender: "bot",
        time: "1:15 PM",
        text: "Congratulations again! 💙\nYour doctor has recommended:\n• Continue prescribed medications\n• Repeat beta hCG in 48 hours\n• Schedule an early ultrasound in 2 weeks\n\nWe'll keep you updated and support you at every step.",
        buttons: [
          { id: "view_plan_d14", label: "📋 View Plan", actionReply: "View next plan" },
          { id: "set_remind_d14", label: "⏰ Set Reminders", actionReply: "Set reminders" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Report uploaded or patient requests discussion of Beta-hCG values",
      agentPersona: {
        name: "Dr. Aditi Care AI",
        role: "Fertility Outcome Specialist",
        avatar: "🌟",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. I see you've taken your pregnancy test. Do you have any questions about your results or next steps? I can also connect you with your nurse or doctor if needed.",
        hi: "नमस्ते, मैं SmrkoMed से बोल रही हूँ। आपका प्रेग्नेंसी टेस्ट का रिज़ल्ट आ गया है। इस बारे में डॉक्टर से बात करने या आगे के स्टेप्स समझने में क्या मैं आपकी सहायता करूँ?",
        te: "నమస్కారం ప్రియ గారు, మీ ప్రెగ్నెన్సీ టెస్ట్ రిపోర్ట్ వచ్చింది. డాక్టర్‌తో మాట్లాడటానికి లేదా తదుపరి వివరాల కోసం మేము కాల్ చేసాము.",
      },
      patientVoiceResponses: [
        "Patient asks what 256 mIU/mL means (healthy initial level)",
        "Patient asks if medication should be changed",
        "Patient asks when first pregnancy ultrasound will be done",
      ],
      aiDecisionAndAction: [
        "AI congratulates warmly and explains hCG doubling concept",
        "Emphasizes continuing all luteal progesterone support without stopping",
        "Schedules repeat Beta-hCG in 48h and early viability ultrasound at 6 weeks",
      ],
      callSummaryLogged: {
        outcomeTags: ["BETA_HCG_POSITIVE", "REPEAT_TEST_SCHEDULED"],
        systemUpdates: ["Patient outcome set to: PREGNANT (Clinical Confirmation)"],
      },
    },
    systemActions: [
      "Send automated Day 14 reminder based on transfer date",
      "Provide pre-test instructions (no fasting required)",
      "Capture and store lab report in EMR",
      "Update patient timeline and display result value (256 mIU/mL)",
      "Flag positive, negative, or borderline results for doctor",
      "Notify doctor and care team immediately",
      "Schedule repeat Beta-hCG in 48 hours",
      "Set next milestones (Repeat test, 6-week viability scan)",
    ],
    followUpReminders: [
      { timing: "Day 13 evening", action: "Pregnancy test preparation reminder" },
      { timing: "Day 14 morning", action: "Check-in: Blood test completed?" },
      { timing: "After report upload", action: "Confirmation & clinical review" },
      { timing: "Within 2 hours", action: "Doctor result sharing & guidance" },
      { timing: "48 hours later", action: "Repeat Beta-hCG test reminder" },
    ],
    expectedOutcomes: [
      "Timely and accurate pregnancy test completion",
      "Immediate, compassionate communication of results",
      "Reduced patient anxiety through continuous hand-holding",
      "Medications correctly managed without accidental stoppage",
      "Seamless transition to Step 15: Outcome & Antenatal Care",
    ],
    exceptions: [
      { scenario: "Patient misses Day 14 test", resolution: "Send follow-up reminder -> AI call -> Offer home collection", simulateKey: "TEST_MISSED" },
      { scenario: "Borderline Beta-hCG (e.g. 25 mIU/mL)", resolution: "Doctor review -> Counsel on repeat test in 48h to evaluate doubling", simulateKey: "BORDERLINE_HCG" },
      { scenario: "Negative result (<5 mIU/mL)", resolution: "Compassionate counselor outreach -> Schedule doctor review for next cycle", simulateKey: "NEGATIVE_RESULT" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 15: OUTCOME & CLINICAL TRANSITION (image 15.png)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    stepNumber: 15,
    shortCode: "15",
    title: "Step 15 – Outcome",
    subtitle: "Measure success, celebrate new beginnings, and keep the journey going with long-term care and support.",
    goal: "Confirm the outcome, communicate with care and clarity, and transition the patient to ongoing support for a healthy pregnancy and beyond.",
    badge: "Outcome & Antenatal Care",
    colorScheme: {
      primary: "text-teal-600",
      badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
      border: "border-teal-500",
      accent: "bg-teal-500",
    },
    triggers: [
      { icon: "Award", text: "Pregnancy test result confirmed (positive or negative)" },
      { icon: "FileCheck", text: "Lab updates final confirmed Beta-hCG in system" },
      { icon: "UserCheck", text: "Doctor reviews and signs off clinical outcome" },
      { icon: "Clock", text: "Patient awaits final consultation & transition plan" },
      { icon: "Heart", text: "Emotional support needed regardless of outcome" },
    ],
    objectives: [
      "Communicate results promptly, sensitively, and transparently",
      "Provide clear next steps based on outcome (positive vs negative)",
      "Offer dedicated emotional support, counseling, and reassurance",
      "Ensure continued engagement with clinical care team",
      "Update patient journey status in system (Pregnant vs Next Cycle Planning)",
      "Transition patient to long-term antenatal care (ANC) or plan next cycle",
    ],
    dataCollected: [
      "Final pregnancy test outcome (Positive / Negative / Biochemical)",
      "Confirmation date of clinical pregnancy",
      "Doctor's clinical notes and recommendations",
      "Next step plan (Antenatal Care vs Next Cycle Protocol)",
      "Patient emotional feedback and satisfaction survey",
      "Antenatal check-up appointment dates",
    ],
    keyIntegrations: [
      "HIS / EMR (Obstetric transition & pregnancy registry)",
      "Antenatal Care (ANC) scheduling module",
      "WhatsApp Cloud API (Celebration cards & care guides)",
      "Calendar (First obstetric ultrasound booking)",
      "CRM & Patient feedback management",
    ],
    whatsappFlow: [
      {
        id: "w15_1",
        stepTitle: "1. Result Notification (Automated)",
        sender: "bot",
        time: "8:00 AM",
        text: "Hi Priya,\nYour pregnancy test result is now available.\nYour doctor will review the results and share the next steps shortly.\nWe're with you! 💙",
        buttons: [
          { id: "view_res_sec", label: "🔒 View Result (Secure)", actionReply: "Opening secure portal" },
          { id: "talk_nurse_outc", label: "💬 Talk to a Nurse", actionReply: "Connect to nurse" },
        ],
      },
      {
        id: "w15_2",
        stepTitle: "2. Doctor Confirmation (Human)",
        sender: "bot",
        time: "8:30 AM",
        text: "Hi Priya,\nI've reviewed your test result. It's a positive result! Congratulations! 🎉\nI know this is a special moment, and we're so happy for you. Let's discuss the next steps to ensure a healthy pregnancy journey.\nWould you like to schedule a call?",
        buttons: [
          { id: "sched_call_doc_outc", label: "📅 Schedule a Call", actionReply: "Schedule doctor call" },
        ],
      },
      {
        id: "w15_3",
        stepTitle: "3. Educational Support (AI / Automated)",
        sender: "bot",
        time: "8:45 AM",
        text: "Hi Priya,\nHere are some helpful resources on what to expect in the early weeks of pregnancy.",
        media: {
          type: "pdf",
          title: "Your Guide to a Healthy Pregnancy (PDF)",
          pages: "Nutrition, safe activities & early scan roadmap",
        },
        buttons: [
          { id: "dl_anc_guide", label: "📖 View Guide", actionReply: "Opening pregnancy guide" },
          { id: "ask_anc_q", label: "❓ Ask a Question", actionReply: "Question on early pregnancy" },
        ],
      },
      {
        id: "w15_4",
        stepTitle: "4. Follow-up Appointment",
        sender: "bot",
        time: "9:00 AM",
        text: "Hi Priya,\nYour first antenatal check-up is scheduled on:\n\n📅 20th September 2026 at 10:00 AM\n👩‍⚕️ Dr. Meera Sharma (Nova IVF Centre)\n\nPlease confirm if this works for you.",
        buttons: [
          { id: "conf_anc_appt", label: "✅ Confirm", actionReply: "Confirmed appointment" },
          { id: "resched_anc_appt", label: "🔄 Reschedule", actionReply: "Reschedule appointment" },
        ],
      },
      {
        id: "w15_5",
        stepTitle: "5. Ongoing Support",
        sender: "bot",
        time: "9:05 AM",
        text: "We'll be with you throughout your pregnancy journey. You'll receive reminders for check-ups, tests, and important milestones.\nIf you ever have questions or concerns, just reply here or call us. 💙",
        buttons: [
          { id: "view_preg_plan", label: "📋 View Pregnancy Care Plan", actionReply: "Opening pregnancy care plan" },
          { id: "talk_nurse_cont", label: "💬 Talk to a Nurse", actionReply: "Connect to nurse" },
        ],
      },
      {
        id: "w15_6",
        stepTitle: "6. Alternative Flow (If Negative Result)",
        sender: "bot",
        time: "9:10 AM",
        text: "Hi Priya,\nI understand this may not be the result you were hoping for. Please know that you are not alone — we're here to support you. 💙\nWould you like to speak with your doctor to discuss the next steps or explore options for another cycle?",
        buttons: [
          { id: "talk_doc_neg", label: "💬 Talk to Doctor", actionReply: "Talk to doctor" },
          { id: "view_next_neg", label: "👉 View Next Steps", actionReply: "Explore next cycle options" },
        ],
      },
    ],
    aiCallingFlow: {
      triggerCondition: "Patient requests call, needs emotional support, or has early pregnancy questions",
      agentPersona: {
        name: "Nurse Meera AI",
        role: "Obstetric & Wellness Counselor",
        avatar: "🤰",
        languages: ["English", "Hindi", "Telugu"],
      },
      scripts: {
        en: "Hello, this is SmrkoMed calling for Priya. I understand this is an important moment. Do you have any questions about your test result or the next steps? If you'd like, I can connect you with your doctor or our counselling team.",
        hi: "नमस्ते प्रिया जी, मैं SmrkoMed से बात कर रही हूँ। यह आपके लिए एक अत्यंत महत्वपूर्ण पड़ाव है। आपके रिज़ल्ट या आगे की देखभाल को लेकर कोई सवाल हैं तो क्या मैं डॉक्टर या काउंसलर से बात कराऊँ?",
        te: "నమస్కారం ప్రియ గారు, మీ ఫలితం మరియు తదుపరి ప్రెగ్నెన్సీ కేర్ గురించి మాట్లాడటానికి కాల్ చేసాము. మీకు ఏమైనా సందేహాలు ఉన్నాయా?",
      },
      patientVoiceResponses: [
        "Patient asks when morning sickness or symptoms might begin",
        "Patient asks for safe early pregnancy diet advice",
        "If negative, patient seeks compassionate listening and next steps",
      ],
      aiDecisionAndAction: [
        "AI provides warm emotional comfort and evidence-based nutrition tips",
        "Confirms first viability scan date at 6-7 weeks (cardiac activity)",
        "If negative, schedules priority review consultation with primary doctor",
      ],
      callSummaryLogged: {
        outcomeTags: ["OUTCOME_TRANSITION_COMPLETE", "ANC_ENROLLED"],
        systemUpdates: ["Patient status: PREGNANT — Enrolled in Antenatal Care Plan"],
      },
    },
    systemActions: [
      "Update patient status to 'Pregnant' or 'Cycle Unsuccessful' in EMR",
      "Store final lab report in EMR record",
      "Notify doctor, nurse, and care team",
      "Create next step plan (Antenatal Care vs Next Cycle Protocol)",
      "Schedule follow-up appointments (Obstetric Viability Scan)",
      "Send educational content based on outcome",
      "Update CRM with outcome and milestone metrics",
      "Trigger patient satisfaction survey (optional)",
    ],
    followUpReminders: [
      { timing: "Day 0", action: "Result notification" },
      { timing: "Day 1", action: "Doctor consultation & medication adjustments" },
      { timing: "Day 7", action: "First antenatal check-up / Next cycle plan" },
      { timing: "Day 14", action: "Educational content + early pregnancy care tips" },
      { timing: "Monthly", action: "Pregnancy milestones & trimester checks" },
    ],
    expectedOutcomes: [
      "Timely, sensitive communication of results",
      "Patient feels supported, valued, and cared for",
      "Clear next steps and ongoing clinical guidance",
      "Higher long-term patient satisfaction and trust",
      "Seamless transition to healthy antenatal care",
    ],
    exceptions: [
      { scenario: "Lab result delivery delay", resolution: "Notify patient of updated timeline -> Contact lab supervisor", simulateKey: "OUTCOME_DELAY" },
      { scenario: "High patient anxiety post-result", resolution: "Immediate call with senior counselor or IVF specialist", simulateKey: "ANXIETY_CALL" },
      { scenario: "Negative result requires coping support", resolution: "Offer in-person counseling -> Review frozen embryos or next protocol", simulateKey: "COPING_SUPPORT" },
    ],
  },
];
