export type Vitals = {
  id: string;
  date: string;
  bp: string;
  hr: string;
  spo2: string;
  temp: string;
  weight: string;
  recordedBy: string;
  source?: string;
};

export type LabResult = {
  parameter: string;
  result: string;
  unit: string;
  range: string;
  flag: "Normal" | "High" | "Low" | "Critical" | "Abnormal" | "Not Evaluated";
};

export type LabOrder = {
  id: string;
  testName: string;
  category: "Pathology" | "Fertility Lab" | "Semen Analysis" | "IVF / Embryology" | "Blood / Pathology";
  sampleId: string;
  sampleType?: string;
  collectedAt: string;
  priority: "Routine" | "Urgent" | "Stat";
  technician: string;
  status: "Ordered" | "Sample Pending" | "Collected" | "Processing" | "Result Ready" | "Verified" | "Doctor Reviewed" | "Cancelled";
  results?: LabResult[];
  reviewedByDoctor?: boolean;
};

export type UltrasoundScan = {
  id: string;
  date: string;
  type: string;
  doctor: string;
  machine: string;
  cycleDay: number;
  rightOvary: string[];
  leftOvary: string[];
  endometrium: string;
  findings: string;
  status: "Scheduled" | "In Progress" | "Report Pending" | "Report Ready" | "Reviewed";
};

export type SemenAnalysis = {
  id: string;
  sampleId: string;
  date: string;
  technician: string;
  volume: string;
  appearance: string;
  liquefaction: string;
  viscosity: string;
  ph: string;
  concentration: string;
  totalCount: string;
  motility: string;
  progMotility: string;
  morphology: string;
  status: "Received" | "Processing" | "Result Ready" | "Verified" | "Doctor Reviewed";
};

export type Embryo = {
  id: string;
  day: number;
  status: "Under Review" | "Assessed" | "Selected" | "Cryopreserved" | "Transferred" | "Discarded";
  grade: string;
  notes: string;
};

export type IvfCase = {
  id: string;
  cycleId: string;
  opuDate: string;
  embryologist: string;
  oocytesRetrieved: number;
  oocytesMature: number;
  spermProcessed: boolean;
  fertilisationStatus: "Pending" | "In Progress" | "Completed";
  fertilisedCount: number;
  embryos: Embryo[];
  status: "Received" | "Processing" | "In Progress" | "Ready" | "Assessed" | "Stored" | "Transferred";
};

export type TimelineEvent = {
  id: string;
  time: string;
  text: string;
  role: string;
  source?: string;
};

export type ClinicalPatient = {
  id: string;
  name: string;
  mrn: string;
  age: number;
  doctor: string;
  visit: string;
  activeCycle?: string;
  vitalsHistory: Vitals[];
  labOrders: LabOrder[];
  ultrasounds: UltrasoundScan[];
  semenAnalyses: SemenAnalysis[];
  ivfCases: IvfCase[];
  timeline: TimelineEvent[];
};

export const CLINICAL_DEMO_DATA: ClinicalPatient[] = [
  {
    id: "pat_c1",
    name: "Ananya Sharma",
    mrn: "10452",
    age: 32,
    doctor: "Dr. Shreya",
    visit: "IVF Cycle Day 12",
    activeCycle: "IVF Cycle #01",
    vitalsHistory: [
      {
        id: "v1",
        date: "17 Sep • 10:30 AM",
        bp: "120/78",
        hr: "74",
        spo2: "99%",
        temp: "36.6°C",
        weight: "61.4 kg",
        recordedBy: "Nurse Priya",
        source: "Digital BP Monitor"
      }
    ],
    labOrders: [
      {
        id: "lab1",
        testName: "Hormone Panel (E2, LH, P4)",
        category: "Fertility Lab",
        sampleId: "LAB-10452-01",
        sampleType: "Serum",
        collectedAt: "18 Sep • 09:28 AM",
        priority: "Urgent",
        technician: "Asha",
        status: "Result Ready",
        reviewedByDoctor: false,
        results: [
          { parameter: "Estradiol (E2)", result: "1840", unit: "pg/mL", range: "Depends on cycle", flag: "High" },
          { parameter: "Luteinizing Hormone", result: "1.2", unit: "mIU/mL", range: "< 10.0", flag: "Normal" },
          { parameter: "Progesterone", result: "0.8", unit: "ng/mL", range: "< 1.5", flag: "Normal" }
        ]
      },
      {
        id: "lab_blood1",
        testName: "CBC (Complete Blood Count)",
        category: "Blood / Pathology",
        sampleId: "BLD-10452-001",
        sampleType: "Whole Blood",
        collectedAt: "18 Sep • 09:28 AM",
        priority: "Routine",
        technician: "Asha",
        status: "Verified",
        reviewedByDoctor: false,
        results: [
          { parameter: "Hemoglobin", result: "12.4", unit: "g/dL", range: "12.0 - 15.5", flag: "Normal" },
          { parameter: "WBC", result: "7200", unit: "/µL", range: "4500 - 11000", flag: "Normal" },
          { parameter: "Platelets", result: "240000", unit: "/µL", range: "150000 - 450000", flag: "Normal" },
          { parameter: "RBC", result: "4.5", unit: "million/µL", range: "4.1 - 5.1", flag: "Normal" }
        ]
      },
      {
        id: "lab_blood2",
        testName: "AMH (Anti-Müllerian Hormone)",
        category: "Blood / Pathology",
        sampleId: "BLD-10452-002",
        sampleType: "Serum",
        collectedAt: "13 Sep • 08:30 AM",
        priority: "Routine",
        technician: "Asha",
        status: "Doctor Reviewed",
        reviewedByDoctor: true,
        results: [
          { parameter: "AMH", result: "2.1", unit: "ng/mL", range: "1.0 - 4.0", flag: "Normal" }
        ]
      }
    ],
    ultrasounds: [
      {
        id: "usg1",
        date: "18 Sep • 10:04 AM",
        type: "Follicular Monitoring",
        doctor: "Dr. Shreya",
        machine: "Ultrasound Room 1",
        cycleDay: 12,
        rightOvary: ["18mm", "16mm", "15mm", "12mm"],
        leftOvary: ["19mm", "17mm", "16mm", "14mm", "11mm"],
        endometrium: "9.2 mm (Triple Line)",
        findings: "Good ovarian response. Ready for trigger.",
        status: "Report Ready"
      }
    ],
    semenAnalyses: [],
    ivfCases: [
      {
        id: "ivf1",
        cycleId: "IVF Cycle #01",
        opuDate: "19 Sep",
        embryologist: "Sarah V.",
        oocytesRetrieved: 9,
        oocytesMature: 7,
        spermProcessed: true,
        fertilisationStatus: "Completed",
        fertilisedCount: 6,
        status: "In Progress",
        embryos: [
          { id: "EMB-01", day: 3, status: "Assessed", grade: "8A", notes: "Good progression" },
          { id: "EMB-02", day: 3, status: "Assessed", grade: "7B", notes: "Slight fragmentation" },
          { id: "EMB-03", day: 3, status: "Assessed", grade: "8A", notes: "Excellent" }
        ]
      }
    ],
    timeline: [
      { id: "t1", time: "17 Sep 10:30", text: "Vitals recorded", role: "Nurse", source: "Device" },
      { id: "t2", time: "18 Sep 09:28", text: "Blood sample collected", role: "Lab Tech" },
      { id: "t3", time: "18 Sep 10:04", text: "Follicular scan completed", role: "Diag Tech", source: "Ultrasound System" }
    ]
  },
  {
    id: "pat_c2",
    name: "Rahul Mehta",
    mrn: "10461",
    age: 35,
    doctor: "Dr. Verma",
    visit: "Semen Analysis",
    activeCycle: "Diagnostic",
    vitalsHistory: [],
    labOrders: [
      {
        id: "lab2",
        testName: "Semen Analysis",
        category: "Semen Analysis",
        sampleId: "SEM-10461-01",
        sampleType: "Semen",
        collectedAt: "18 Sep • 08:15 AM",
        priority: "Routine",
        technician: "Ravi",
        status: "Verified",
        reviewedByDoctor: true,
        results: []
      },
      {
        id: "lab_blood3",
        testName: "Hormone Panel (Male)",
        category: "Blood / Pathology",
        sampleId: "BLD-10461-002",
        sampleType: "Serum",
        collectedAt: "18 Sep • 09:15 AM",
        priority: "Urgent",
        technician: "Priya",
        status: "Result Ready",
        reviewedByDoctor: false,
        results: [
          { parameter: "Testosterone (Total)", result: "340", unit: "ng/dL", range: "300 - 1000", flag: "Normal" },
          { parameter: "FSH", result: "5.2", unit: "mIU/mL", range: "1.5 - 12.4", flag: "Normal" },
          { parameter: "LH", result: "6.1", unit: "mIU/mL", range: "1.7 - 8.6", flag: "Normal" }
        ]
      }
    ],
    ultrasounds: [],
    semenAnalyses: [
      {
        id: "sa1",
        sampleId: "SEM-10461-01",
        date: "18 Sep • 08:15 AM",
        technician: "Ravi",
        volume: "2.8",
        appearance: "Normal",
        liquefaction: "20 min",
        viscosity: "Normal",
        ph: "7.4",
        concentration: "34",
        totalCount: "95",
        motility: "62",
        progMotility: "45",
        morphology: "4",
        status: "Verified"
      }
    ],
    ivfCases: [],
    timeline: [
      { id: "t3", time: "18 Sep 08:15", text: "Semen sample collected", role: "Lab Tech" },
      { id: "t4", time: "18 Sep 09:10", text: "Semen analysis verified", role: "Lab Tech" },
      { id: "t5", time: "18 Sep 09:15", text: "Doctor reviewed result", role: "Doctor" }
    ]
  }
];

export const CONNECTED_DEVICES = [
  { id: "dev1", name: "Digital BP Monitor", type: "Vitals Devices", manufacturer: "Omron", connection: "Bluetooth / BLE", status: "CONNECTED", lastSync: "Today • 10:42 AM", location: "Triage Room 1" },
  { id: "dev2", name: "Pulse Oximeter", type: "Vitals Devices", manufacturer: "Masimo", connection: "Bluetooth / BLE", status: "CONNECTED", lastSync: "Today • 09:15 AM", location: "Triage Room 1" },
  { id: "dev3", name: "Hormone Analyzer", type: "Laboratory Analysers", manufacturer: "Roche", connection: "HL7", status: "PLANNED", lastSync: "-", location: "Main Lab" },
  { id: "dev4", name: "Hematology Analyzer", type: "Laboratory Analysers", manufacturer: "Sysmex", connection: "HL7", status: "CONNECTED", lastSync: "Today • 11:05 AM", location: "Main Lab" },
  { id: "dev5", name: "Ultrasound System", type: "Imaging Devices", manufacturer: "GE Voluson", connection: "DICOM / API", status: "DEMO CONNECTED", lastSync: "Today • 10:04 AM", location: "USG Room 1" },
  { id: "dev6", name: "Semen Analyzer", type: "Fertility Lab Devices", manufacturer: "SCA", connection: "API", status: "PLANNED", lastSync: "-", location: "Andrology Lab" }
];
