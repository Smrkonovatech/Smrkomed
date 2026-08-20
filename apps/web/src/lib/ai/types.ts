export type AiPageContext = {
  pathname: string;
  coupleSlug?: string;
  coupleId?: string;
  search?: string;
};

export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AiToolName =
  | "getClinicSummary"
  | "getClinicPriorities"
  | "getCouple"
  | "getCoupleSummary"
  | "getPatientJourney"
  | "searchPatients"
  | "getOverdueTasks"
  | "getCoupleTasks"
  | "getTodaysAppointments"
  | "getUpcomingAppointments"
  | "getActivity"
  | "getRecentActivity"
  | "getConsultationNotes"
  | "getCarePlanStatus"
  | "getFollowUpQueue"
  | "getInactivePatients"
  | "getStaff"
  | "getTeamWorkload"
  | "getPrepareMyDay"
  | "getPatientAttentionScore"
  | "getNavigationHelp"
  | "draftPatientMessage"
  | "proposeCreateTask";

export type AiNavigationAction = {
  label: string;
  href: string;
};

export type AiProposedAction = {
  type: "createTask";
  preview: {
    title: string;
    coupleLabel: string;
    dueLabel: string;
    assignedHint?: string;
  };
  payload: {
    coupleId: string;
    title: string;
    category?: string;
    description?: string;
    dueDate?: string;
  };
};

export type AiChatResult = {
  reply: string;
  navigation?: AiNavigationAction[];
  draftMessage?: string;
  proposedAction?: AiProposedAction;
};
