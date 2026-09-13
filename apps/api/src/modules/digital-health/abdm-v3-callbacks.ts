import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { abdmV3Service } from "./abdm-v3-service";
import type {
  V3CareContextNotifyRequest,
  V3CareContextOnLinkCallback,
  V3ConsentNotifyCallbackPayload,
  V3DataPushPayload,
  V3DiscoverCallbackPayload,
  V3HealthInfoRequestCallbackPayload,
  V3HiuConsentNotifyCallback,
  V3HiuConsentOnFetchCallback,
  V3HiuConsentOnInitCallback,
  V3HiuConsentOnStatusCallback,
  V3HiuDataOnRequestCallback,
  V3LinkConfirmCallbackPayload,
  V3LinkInitCallbackPayload,
  V3LinkTokenOnGenerateCallback,
  V3ProfileShareCallbackPayload,
  V3SmsOnNotifyCallback,
  V3SubscriptionEventNotifyCallback,
  V3SubscriptionNotifyCallback,
  V3SubscriptionOnInitCallback,
} from "./abdm-v3-types";

export const abdmV3CallbackRoutes = new Hono<AppEnv>()
  // ─── 4.3.2 Callback API for Link Token Generation ──────────────────────────
  .post("/hip/token/on-generate-token", async (c) => {
    try {

      const body = (await c.req.json()) as V3LinkTokenOnGenerateCallback;
      await abdmV3Service.handleLinkTokenCallback(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL", error: "INVALID_CALLBACK_BODY" }, 400);
    }
  })

  // ─── 4.3.4 Callback API for Linking Care Context ───────────────────────────
  .post("/link/on_carecontext", async (c) => {
    try {
      const body = (await c.req.json()) as V3CareContextOnLinkCallback;
      await abdmV3Service.handleCareContextOnLinkCallback(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL", error: "INVALID_CALLBACK_BODY" }, 400);
    }
  })

  // ─── 4.3.7 Callback API for Notify Care Context Update ─────────────────────
  .post("/links/context/on-notify", async (c) => {
    try {
      const body = await c.req.json();
      return c.json({ status: "ACK", data: body }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 4.3.9 Callback API for SMS Notification to Patients ───────────────────
  .post("/patients/sms/on-notify", async (c) => {
    try {
      const body = (await c.req.json()) as V3SmsOnNotifyCallback;
      return c.json({ status: "ACK", resp: body.resp }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 5.3.2 HIE-CM Callback to HIP — Discovery ──────────────────────────────
  .post("/hip/patient/care-context/discover", async (c) => {
    try {
      const body = (await c.req.json()) as V3DiscoverCallbackPayload;
      // Process discovery asynchronously
      void abdmV3Service.handlePatientDiscovery(body).catch((err) => {
        console.error("Error processing ABDM patient discovery:", err);
      });
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 5.3.6 HIE-CM Callback on Health Record Link Init ──────────────────────
  .post("/hip/link/care-context/init", async (c) => {
    try {
      const body = (await c.req.json()) as V3LinkInitCallbackPayload;
      void abdmV3Service.handleLinkInit(body).catch((err) => {
        console.error("Error processing ABDM link init:", err);
      });
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 5.3.10 HIE-CM Callback for Health Record Confirmation ─────────────────
  .post("/hip/link/care-context/confirm", async (c) => {
    try {
      const body = (await c.req.json()) as V3LinkConfirmCallbackPayload;
      void abdmV3Service.handleLinkConfirm(body).catch((err) => {
        console.error("Error processing ABDM link confirm:", err);
      });
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 6.3.1 Callback API to HIP when Consent is APPROVED / REVOKED ──────────
  .post("/consent/request/hip/notify", async (c) => {
    try {
      const body = (await c.req.json()) as V3ConsentNotifyCallbackPayload;
      void abdmV3Service.handleConsentNotify(body).catch((err) => {
        console.error("Error processing ABDM consent notification:", err);
      });
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 6.3.3 Data Flow — Health Information Request Callback to HIP ──────────
  .post("/hip/health-information/request", async (c) => {
    try {
      const body = (await c.req.json()) as V3HealthInfoRequestCallbackPayload;
      void abdmV3Service.handleHealthInfoRequest(body).catch((err) => {
        console.error("Error processing ABDM health info request:", err);
      });
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── 7.3.2 Profile Share Callback to HIP ───────────────────────────────────
  .post("/hip/patient/share", async (c) => {
    try {
      const body = (await c.req.json()) as V3ProfileShareCallbackPayload;
      void abdmV3Service.handleProfileShare(body).catch((err) => {
        console.error("Error processing ABDM profile share:", err);
      });
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── MILESTONE 3: HIU CONSENT CALLBACKS (Section 4.0) ──────────────────────
  // 4.3.2 Consent request init - call back (202 Accepted)
  .post("/hiu/consent/request/on-init", async (c) => {
    try {
      const body = (await c.req.json()) as V3HiuConsentOnInitCallback;
      abdmV3Service.handleHiuConsentOnInitCallback(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // 4.3.3 Consent request notify callback (APPROVED/REVOKED/DENIED/EXPIRED) (202 Accepted)
  .post("/hiu/consent/request/notify", async (c) => {
    try {
      const body = (await c.req.json()) as V3HiuConsentNotifyCallback;
      await abdmV3Service.handleHiuConsentNotifyCallback(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // 4.3.6 Consent request on-status (Callback) (200 OK)
  .post("/hiu/consent/request/on-status", async (c) => {
    try {
      const body = (await c.req.json()) as V3HiuConsentOnStatusCallback;
      abdmV3Service.handleHiuConsentOnStatusCallback(body);
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // 4.3.8 Consent request on-fetch (Callback with signed consent artifact) (200 OK)
  .post("/hiu/consent/on-fetch", async (c) => {
    try {
      const body = (await c.req.json()) as V3HiuConsentOnFetchCallback;
      abdmV3Service.handleHiuConsentOnFetchCallback(body);
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── MILESTONE 3: HIU DATA FLOW CALLBACKS (Section 5.0) ────────────────────
  // 5.3.2 Data flow – call back to HIU (200 OK)
  .post("/hiu/health-information/on-request", async (c) => {
    try {
      const body = (await c.req.json()) as V3HiuDataOnRequestCallback;
      abdmV3Service.handleHiuHealthInfoOnRequestCallback(body);
      return c.json({ status: "ACK" }, 200);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // Direct Data Transfer: HIP sends encrypted data directly to HIU dataPushUrl (200 OK)
  .post("/hiu/data/push", async (c) => {
    try {
      const body = (await c.req.json()) as V3DataPushPayload;
      const res = await abdmV3Service.handleHiuDataPush(body);
      return c.json(res, 200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ status: "FAIL", error: msg }, 400);
    }
  })

  // ─── MILESTONE 3: SUBSCRIPTION CALLBACKS (Section 6.0) ─────────────────────
  // 6.3.3 User Subscription request initiate – Call Back (202 Accepted)
  .post("/hiu/hiecm/subscription-requests/on-init", async (c) => {
    try {
      const body = (await c.req.json()) as V3SubscriptionOnInitCallback;
      abdmV3Service.handleSubscriptionOnInit(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // 6.3.5 & 6.3.8 Approve / Deny Subscription – Call back (202 Accepted)
  .post("/hiu/subscription-requests/hiu/notify", async (c) => {
    try {
      const body = (await c.req.json()) as V3SubscriptionNotifyCallback;
      await abdmV3Service.handleSubscriptionNotify(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // 6.3.11 Subscription HIU – notify (linked new record or data available) (202 Accepted)
  .post("/hiu/subscription/notify", async (c) => {
    try {
      const body = (await c.req.json()) as V3SubscriptionEventNotifyCallback;
      await abdmV3Service.handleSubscriptionEventNotify(body);
      return c.json({ status: "ACK" }, 202);
    } catch {
      return c.json({ status: "FAIL" }, 400);
    }
  })

  // ─── User-initiated linking discovery stubs ───────────────────────────────
  .post("/hiu/patient/care-context/on-discover", async (c) => {
    return c.json({ status: "ACK" }, 200);
  })
  .post("/hiu/patient/care-context/on-init", async (c) => {
    return c.json({ status: "ACK" }, 200);
  })
  .post("/hiu/patient/care-context/on-confirm", async (c) => {
    return c.json({ status: "ACK" }, 200);
  })
  .post("/hiu/patient/on-share", async (c) => {
    return c.json({ status: "ACK" }, 200);
  });

