export type RealtimeEventType =
  | "MESSAGE_CREATED"
  | "MESSAGE_STATUS_UPDATED"
  | "CONVERSATION_UPDATED"
  | "UNREAD_COUNT_UPDATED"
  | "TYPING_STARTED"
  | "TYPING_STOPPED"
  | "CONNECTION_STATUS"
  | "AI_HANDOFF"
  | "CARE_LOOP_ESCALATION";

export type BaseRealtimeEvent = {
  eventId: string;
  type: RealtimeEventType;
  clinicId: string;
  timestamp: string;
};

export type MessageCreatedEvent = BaseRealtimeEvent & {
  type: "MESSAGE_CREATED";
  conversationId: string;
  message: {
    id: string;
    direction: "INBOUND" | "OUTBOUND";
    senderType: string;
    content: string;
    messageType: string;
    createdAt: string;
    status: string;
    label?: string;
  };
  conversation?: {
    id: string;
    status: string;
    unreadCount: number;
    updatedAt: string;
    contactPhone?: string | null;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      initials?: string;
    } | null;
  };
};

export type MessageStatusUpdatedEvent = BaseRealtimeEvent & {
  type: "MESSAGE_STATUS_UPDATED";
  conversationId?: string;
  messageId?: string;
  providerMessageId?: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
};

export type ConversationUpdatedEvent = BaseRealtimeEvent & {
  type: "CONVERSATION_UPDATED";
  conversationId: string;
  patch: {
    status?: string;
    priority?: string;
    assignedStaffId?: string | null;
    assignedStaff?: { id: string; name: string; initials?: string | null; title?: string | null } | null;
    automationPaused?: boolean;
    unreadCount?: number;
    updatedAt?: string;
    lastMessage?: {
      id: string;
      preview: string;
      createdAt: string;
      direction: string;
      senderType: string;
      status: string;
    } | null;
  };
};

export type UnreadCountUpdatedEvent = BaseRealtimeEvent & {
  type: "UNREAD_COUNT_UPDATED";
  conversationId: string;
  unreadCount: number;
};

export type TypingEvent = BaseRealtimeEvent & {
  type: "TYPING_STARTED" | "TYPING_STOPPED";
  conversationId: string;
  userId: string;
  userName: string;
};

export type ConnectionStatusEvent = BaseRealtimeEvent & {
  type: "CONNECTION_STATUS";
  status: "CONNECTED" | "HEARTBEAT" | "RECONNECTED";
};

export type AiHandoffEvent = BaseRealtimeEvent & {
  type: "AI_HANDOFF";
  conversationId: string;
  reason: string;
};

export type CareLoopEscalationEvent = BaseRealtimeEvent & {
  type: "CARE_LOOP_ESCALATION";
  conversationId: string;
  careTaskId?: string;
  reason: string;
};

export type RealtimeEvent =
  | MessageCreatedEvent
  | MessageStatusUpdatedEvent
  | ConversationUpdatedEvent
  | UnreadCountUpdatedEvent
  | TypingEvent
  | ConnectionStatusEvent
  | AiHandoffEvent
  | CareLoopEscalationEvent;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type RealtimeEventInput = DistributiveOmit<RealtimeEvent, "eventId" | "timestamp"> & {
  eventId?: string;
  timestamp?: string;
};

