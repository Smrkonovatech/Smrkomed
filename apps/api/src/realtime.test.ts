import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { realtimeBus } from "./modules/realtime/bus";
import type { RealtimeEvent } from "./modules/realtime/types";
import { createApp } from "./app";

describe("real-time communication module", () => {
  beforeEach(() => {
    realtimeBus.reset();
  });

  it("strictly isolates events between clinics (Clinic A does not receive Clinic B events)", () => {
    const clinicAEvents: RealtimeEvent[] = [];
    const clinicBEvents: RealtimeEvent[] = [];

    const unsubA = realtimeBus.subscribe("clinic_A", (e) => clinicAEvents.push(e));
    const unsubB = realtimeBus.subscribe("clinic_B", (e) => clinicBEvents.push(e));

    // Publish event for clinic A
    realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId: "clinic_A",
      conversationId: "conv_1",
      message: {
        id: "msg_1",
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "Hi Doctor",
        messageType: "text",
        createdAt: new Date().toISOString(),
        status: "DELIVERED",
      },
    });

    // Publish event for clinic B
    realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId: "clinic_B",
      conversationId: "conv_2",
      message: {
        id: "msg_2",
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "Hello from Clinic B",
        messageType: "text",
        createdAt: new Date().toISOString(),
        status: "DELIVERED",
      },
    });

    // Verification: Clinic A received only its own event
    assert.equal(clinicAEvents.length, 1);
    assert.equal(clinicAEvents[0]?.clinicId, "clinic_A");
    assert.equal((clinicAEvents[0] as { conversationId?: string }).conversationId, "conv_1");

    // Verification: Clinic B received only its own event
    assert.equal(clinicBEvents.length, 1);
    assert.equal(clinicBEvents[0]?.clinicId, "clinic_B");
    assert.equal((clinicBEvents[0] as { conversationId?: string }).conversationId, "conv_2");

    unsubA();
    unsubB();
  });

  it("buffers recent events and replays missed events based on afterEventId", () => {
    const e1 = realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId: "clinic_1",
      conversationId: "conv_1",
      message: {
        id: "msg_1",
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "First",
        messageType: "text",
        createdAt: new Date().toISOString(),
        status: "DELIVERED",
      },
    });

    const e2 = realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId: "clinic_1",
      conversationId: "conv_1",
      message: {
        id: "msg_2",
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "Second",
        messageType: "text",
        createdAt: new Date().toISOString(),
        status: "DELIVERED",
      },
    });

    const e3 = realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId: "clinic_1",
      conversationId: "conv_1",
      message: {
        id: "msg_3",
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "Third",
        messageType: "text",
        createdAt: new Date().toISOString(),
        status: "DELIVERED",
      },
    });

    // Replay events missed after e1
    const missedAfterE1 = realtimeBus.getMissedEvents("clinic_1", e1.eventId);
    assert.equal(missedAfterE1.length, 2);
    assert.equal(missedAfterE1[0]?.eventId, e2.eventId);
    assert.equal(missedAfterE1[1]?.eventId, e3.eventId);

    // Replay events missed after e2
    const missedAfterE2 = realtimeBus.getMissedEvents("clinic_1", e2.eventId);
    assert.equal(missedAfterE2.length, 1);
    assert.equal(missedAfterE2[0]?.eventId, e3.eventId);

    // Replay after latest returns empty
    const missedAfterE3 = realtimeBus.getMissedEvents("clinic_1", e3.eventId);
    assert.equal(missedAfterE3.length, 0);
  });

  it("handles staff typing events ephemerally without persisting to ring buffer", () => {
    const received: RealtimeEvent[] = [];
    const unsub = realtimeBus.subscribe("clinic_1", (e) => received.push(e));

    realtimeBus.publish({
      type: "TYPING_STARTED",
      clinicId: "clinic_1",
      conversationId: "conv_1",
      userId: "user_123",
      userName: "Dr. Sharma",
    });

    assert.equal(received.length, 1);
    assert.equal(received[0]?.type, "TYPING_STARTED");

    // Typing should not be stored in historical missed events buffer
    const history = realtimeBus.getMissedEvents("clinic_1", "any_id");
    assert.equal(history.length, 0);

    unsub();
  });

  it("rejects unauthenticated requests to GET /api/v1/realtime/events", async () => {
    const app = createApp();
    const res = await app.request("http://localhost/api/v1/realtime/events", {
      headers: {
        Accept: "text/event-stream",
      },
    });

    // Unauthenticated request must return 401
    assert.equal(res.status, 401);
  });
});
