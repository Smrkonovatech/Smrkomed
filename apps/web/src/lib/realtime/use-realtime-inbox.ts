"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api/client";

export type RealtimeStatus = "connected" | "reconnecting" | "disconnected";

export type RealtimeMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: string;
  content: string;
  messageType: string;
  createdAt: string;
  status: string;
  label?: string;
};

export type RealtimeConversationPatch = {
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

export type RealtimeMessageCreatedPayload = {
  eventId: string;
  type: "MESSAGE_CREATED";
  clinicId: string;
  conversationId: string;
  message: RealtimeMessage;
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

export type RealtimeMessageStatusPayload = {
  eventId: string;
  type: "MESSAGE_STATUS_UPDATED";
  clinicId: string;
  conversationId?: string;
  messageId?: string;
  providerMessageId?: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
};

export type RealtimeConversationUpdatedPayload = {
  eventId: string;
  type: "CONVERSATION_UPDATED";
  clinicId: string;
  conversationId: string;
  patch: RealtimeConversationPatch;
};

export type RealtimeTypingPayload = {
  eventId: string;
  type: "TYPING_STARTED" | "TYPING_STOPPED";
  clinicId: string;
  conversationId: string;
  userId: string;
  userName: string;
};

type UseRealtimeInboxOptions = {
  onMessageCreated?: (payload: RealtimeMessageCreatedPayload) => void;
  onMessageStatusUpdated?: (payload: RealtimeMessageStatusPayload) => void;
  onConversationUpdated?: (payload: RealtimeConversationUpdatedPayload) => void;
  onTyping?: (payload: RealtimeTypingPayload) => void;
  onReconnected?: () => void;
  enabled?: boolean;
};

export function useRealtimeInbox(options: UseRealtimeInboxOptions = {}) {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastEventIdRef = useRef<string | null>(null);
  const wasDisconnectedRef = useRef(false);

  // Typing debounce tracker
  const typingStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const afterParam = lastEventIdRef.current ? `?after=${encodeURIComponent(lastEventIdRef.current)}` : "";
    const url = `/api/v1/realtime/events${afterParam}`;

    try {
      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
        if (wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          optionsRef.current.onReconnected?.();
        }
      };

      es.addEventListener("CONNECTION_STATUS", (e) => {
        setStatus("connected");
      });

      es.addEventListener("heartbeat", (e) => {
        setLastHeartbeat(new Date());
        setStatus("connected");
      });

      es.addEventListener("MESSAGE_CREATED", (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const data = JSON.parse(e.data) as RealtimeMessageCreatedPayload;
          optionsRef.current.onMessageCreated?.(data);
        } catch {
          // ignore parse error
        }
      });

      es.addEventListener("MESSAGE_STATUS_UPDATED", (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const data = JSON.parse(e.data) as RealtimeMessageStatusPayload;
          optionsRef.current.onMessageStatusUpdated?.(data);
        } catch {
          // ignore parse error
        }
      });

      es.addEventListener("CONVERSATION_UPDATED", (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const data = JSON.parse(e.data) as RealtimeConversationUpdatedPayload;
          optionsRef.current.onConversationUpdated?.(data);
        } catch {
          // ignore parse error
        }
      });

      es.addEventListener("TYPING_STARTED", (e) => {
        try {
          const data = JSON.parse(e.data) as RealtimeTypingPayload;
          optionsRef.current.onTyping?.(data);
        } catch {
          // ignore parse error
        }
      });

      es.addEventListener("TYPING_STOPPED", (e) => {
        try {
          const data = JSON.parse(e.data) as RealtimeTypingPayload;
          optionsRef.current.onTyping?.(data);
        } catch {
          // ignore parse error
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        wasDisconnectedRef.current = true;
        setStatus("reconnecting");

        // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
        reconnectAttemptsRef.current = attempts + 1;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setStatus("reconnecting");
    }
  }, []);

  useEffect(() => {
    if (options.enabled === false) {
      setStatus("disconnected");
      return;
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
    };
  }, [connect, options.enabled]);

  // Emitter: notify server when this staff member is typing in a conversation
  const notifyTyping = useCallback((conversationId: string) => {
    if (!conversationId) return;

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      void apiPost(`/api/v1/whatsapp-automation/inbox/${conversationId}/typing`, { typing: true }).catch(() => {});
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      void apiPost(`/api/v1/whatsapp-automation/inbox/${conversationId}/typing`, { typing: false }).catch(() => {});
    }, 1500);
  }, []);

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    lastHeartbeat,
    notifyTyping,
  };
}
