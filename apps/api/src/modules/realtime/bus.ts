import crypto from "node:crypto";
import type { RealtimeEvent, RealtimeEventInput } from "./types";

export interface RealtimePublisher {
  publish(event: RealtimeEventInput): RealtimeEvent;
}

export interface RealtimeSubscriber {
  subscribe(clinicId: string, listener: (event: RealtimeEvent) => void): () => void;
  getMissedEvents(clinicId: string, afterEventId: string): RealtimeEvent[];
}

const MAX_HISTORY_PER_CLINIC = 200;

class InMemoryRealtimeBus implements RealtimePublisher, RealtimeSubscriber {
  private subscribersByClinic = new Map<string, Set<(event: RealtimeEvent) => void>>();
  private eventHistoryByClinic = new Map<string, RealtimeEvent[]>();

  publish(input: RealtimeEventInput): RealtimeEvent {
    const event: RealtimeEvent = {
      ...input,
      eventId: input.eventId ?? `evt_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`,
      timestamp: input.timestamp ?? new Date().toISOString(),
    } as RealtimeEvent;

    // Maintain bounded history for missed-event replay
    let history = this.eventHistoryByClinic.get(event.clinicId);
    if (!history) {
      history = [];
      this.eventHistoryByClinic.set(event.clinicId, history);
    }
    // Only buffer durable business events (not heartbeats or typing)
    if (event.type !== "CONNECTION_STATUS" && event.type !== "TYPING_STARTED" && event.type !== "TYPING_STOPPED") {
      history.push(event);
      if (history.length > MAX_HISTORY_PER_CLINIC) {
        history.shift();
      }
    }

    // Safe structured logging
    console.log("REALTIME_EVENT_PUBLISHED", {
      eventId: event.eventId,
      type: event.type,
      clinicId: event.clinicId,
      timestamp: event.timestamp,
    });

    // Dispatch strictly to clinic subscribers
    const listeners = this.subscribersByClinic.get(event.clinicId);
    if (listeners && listeners.size > 0) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (err) {
          console.error("REALTIME_LISTENER_ERROR", {
            eventId: event.eventId,
            clinicId: event.clinicId,
            errorName: err instanceof Error ? err.name : "unknown",
          });
        }
      }
    }

    return event;
  }

  subscribe(clinicId: string, listener: (event: RealtimeEvent) => void): () => void {
    let listeners = this.subscribersByClinic.get(clinicId);
    if (!listeners) {
      listeners = new Set();
      this.subscribersByClinic.set(clinicId, listeners);
    }
    listeners.add(listener);

    console.log("REALTIME_SUBSCRIBER_CONNECTED", {
      clinicId,
      totalClinicSubscribers: listeners.size,
    });

    return () => {
      const current = this.subscribersByClinic.get(clinicId);
      if (current) {
        current.delete(listener);
        if (current.size === 0) {
          this.subscribersByClinic.delete(clinicId);
        }
      }
      console.log("REALTIME_SUBSCRIBER_DISCONNECTED", {
        clinicId,
        remainingClinicSubscribers: current?.size ?? 0,
      });
    };
  }

  getMissedEvents(clinicId: string, afterEventId: string): RealtimeEvent[] {
    if (!afterEventId) return [];
    const history = this.eventHistoryByClinic.get(clinicId);
    if (!history || history.length === 0) return [];

    const index = history.findIndex((e) => e.eventId === afterEventId);
    if (index === -1) {
      // afterEventId not found in recent history (could be older than buffer).
      // Return entire buffer so client can reconcile.
      return [...history];
    }
    return history.slice(index + 1);
  }

  // Helper for tests to reset state
  reset(): void {
    this.subscribersByClinic.clear();
    this.eventHistoryByClinic.clear();
  }
}

export const realtimeBus = new InMemoryRealtimeBus();
