import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { PERMISSIONS } from "@smrkomed/database";

import { requirePermission } from "../../lib/authz";
import type { AppEnv } from "../../types";
import { realtimeBus } from "./bus";

export const realtimeRoutes = new Hono<AppEnv>()
  .get("/events", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const clinicId = tenant.clinicId;

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache, no-transform");
    c.header("Connection", "keep-alive");
    c.header("X-Accel-Buffering", "no");

    return streamSSE(c, async (stream) => {
      let closed = false;
      let unsubscribe: (() => void) | null = null;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };

      stream.onAbort(cleanup);

      try {
        // 1. Write initial connection acknowledgment
        await stream.writeSSE({
          event: "CONNECTION_STATUS",
          data: JSON.stringify({
            type: "CONNECTION_STATUS",
            status: "CONNECTED",
            clinicId,
            timestamp: new Date().toISOString(),
          }),
        });

        // 2. Replay missed events if client specified Last-Event-ID or ?after=
        const after = c.req.header("Last-Event-ID") || c.req.query("after");
        if (after) {
          const missed = realtimeBus.getMissedEvents(clinicId, after);
          for (const evt of missed) {
            await stream.writeSSE({
              id: evt.eventId,
              event: evt.type,
              data: JSON.stringify(evt),
            });
          }
        }

        // 3. Subscribe to real-time events scoped strictly to this clinic
        unsubscribe = realtimeBus.subscribe(clinicId, async (event) => {
          if (closed) return;
          try {
            await stream.writeSSE({
              id: event.eventId,
              event: event.type,
              data: JSON.stringify(event),
            });
          } catch (err) {
            console.error("REALTIME_WRITE_ERROR", {
              eventId: event.eventId,
              clinicId,
              errorName: err instanceof Error ? err.name : "unknown",
            });
            cleanup();
          }
        });

        // 4. Heartbeat keepalive loop every 15s to keep proxy connections alive
        while (!closed) {
          await stream.sleep(15000);
          if (closed) break;
          try {
            await stream.writeSSE({
              event: "heartbeat",
              data: JSON.stringify({ timestamp: new Date().toISOString() }),
            });
          } catch {
            cleanup();
            break;
          }
        }
      } catch (err) {
        console.error("REALTIME_STREAM_ERROR", {
          clinicId,
          errorName: err instanceof Error ? err.name : "unknown",
        });
        cleanup();
      }
    });
  });
