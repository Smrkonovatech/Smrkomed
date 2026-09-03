import { EventEmitter } from "node:events";
import { Hono } from "hono";
import { prisma } from "@smrkomed/database";
import type { AppEnv } from "../../types";
import { ok } from "../../lib/http";
import type {
  AbdmOnInitCallbackPayload,
  AbdmOnConfirmCallbackPayload,
  AbdmOnFetchModesCallbackPayload,
} from "./abdm-types";

// In-memory reactive event bus for Gateway callbacks
export const abdmEvents = new EventEmitter();
abdmEvents.setMaxListeners(100);

export function mapAbdmErrorToUserMessage(code: number | string | undefined, originalMsg?: string): string {
  const codeStr = String(code || "");
  if (codeStr.includes("1410") || codeStr.includes("1417") || /invalid.*otp/i.test(originalMsg || "")) {
    return "The OTP is incorrect. Please check and try again.";
  }
  if (codeStr.includes("1411") || codeStr.includes("1416") || /expired/i.test(originalMsg || "")) {
    return "This verification session has expired. Please start again.";
  }
  if (codeStr.includes("1423") || /limit.*exceeded/i.test(originalMsg || "")) {
    return "Too many failed attempts. Please try again later.";
  }
  if (codeStr.includes("1510") || /user.*not.*found/i.test(originalMsg || "")) {
    return "No ABHA profile found for the provided identifier.";
  }
  return originalMsg && originalMsg.length < 100
    ? originalMsg
    : "ABDM verification could not be completed. Please try again.";
}

export const abdmCallbackRoutes = new Hono<AppEnv>()
  // ─── Callback: On Fetch Modes ─────────────────────────────────────────────
  .post("/users/auth/on-fetch-modes", async (c) => {
    let body: AbdmOnFetchModesCallbackPayload;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ status: "FAIL", error: "INVALID_JSON" }, 400);
    }

    const origRequestId = body.resp?.requestId;
    if (!origRequestId) {
      return c.json({ status: "FAIL", error: "MISSING_REQUEST_ID" }, 400);
    }

    const tx = await prisma.abdmTransaction.findFirst({
      where: { referenceId: origRequestId },
    });

    if (tx) {
      if (body.error) {
        await prisma.abdmTransaction.update({
          where: { id: tx.id },
          data: {
            status: "FAILED",
            errorCode: String(body.error.code),
            userMessage: mapAbdmErrorToUserMessage(body.error.code, body.error.message),
            completedAt: new Date(),
          },
        });
      } else if (body.auth?.modes) {
        await prisma.abdmTransaction.update({
          where: { id: tx.id },
          data: {
            technicalDetail: JSON.stringify({ modes: body.auth.modes }),
          },
        });
      }
    }

    abdmEvents.emit(`on-fetch-modes:${origRequestId}`, body);
    return ok(c, { status: "ACK" });
  })

  // ─── Callback: On Init (OTP Challenge Issued) ─────────────────────────────
  .post("/users/auth/on-init", async (c) => {
    let body: AbdmOnInitCallbackPayload;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ status: "FAIL", error: "INVALID_JSON" }, 400);
    }

    const origRequestId = body.resp?.requestId;
    if (!origRequestId) {
      return c.json({ status: "FAIL", error: "MISSING_REQUEST_ID" }, 400);
    }

    const tx = await prisma.abdmTransaction.findFirst({
      where: { referenceId: origRequestId },
    });

    if (tx) {
      if (body.error) {
        await prisma.abdmTransaction.update({
          where: { id: tx.id },
          data: {
            status: "FAILED",
            errorCode: String(body.error.code),
            userMessage: mapAbdmErrorToUserMessage(body.error.code, body.error.message),
            completedAt: new Date(),
          },
        });
      } else if (body.auth?.transactionId) {
        // Idempotency: only update if not already processed
        if (tx.status !== "AWAITING_OTP") {
          const hint = body.auth.meta?.hint ? ` (sent to ${body.auth.meta.hint})` : "";
          await prisma.abdmTransaction.update({
            where: { id: tx.id },
            data: {
              status: "AWAITING_OTP",
              userMessage: `OTP sent via ABDM${hint}.`,
              technicalDetail: JSON.stringify({
                gatewayTxId: body.auth.transactionId,
                mode: body.auth.mode,
                hint: body.auth.meta?.hint,
              }),
            },
          });
        }
      }
    }

    abdmEvents.emit(`on-init:${origRequestId}`, body);
    return ok(c, { status: "ACK" });
  })

  // ─── Callback: On Confirm (OTP Verified & Profile Returned) ───────────────
  .post("/users/auth/on-confirm", async (c) => {
    let body: AbdmOnConfirmCallbackPayload;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ status: "FAIL", error: "INVALID_JSON" }, 400);
    }

    const origRequestId = body.resp?.requestId;
    if (!origRequestId) {
      return c.json({ status: "FAIL", error: "MISSING_REQUEST_ID" }, 400);
    }

    const tx = await prisma.abdmTransaction.findFirst({
      where: { referenceId: origRequestId },
    });

    if (tx) {
      if (body.error) {
        await prisma.abdmTransaction.update({
          where: { id: tx.id },
          data: {
            status: "FAILED",
            errorCode: String(body.error.code),
            userMessage: mapAbdmErrorToUserMessage(body.error.code, body.error.message),
            completedAt: new Date(),
          },
        });
      } else if (body.auth?.patient) {
        // Extract official ABHA number from identifiers if present
        const patient = body.auth.patient;
        const abhaIdent = patient.identifiers?.find(
          (i) => i.type === "HEALTH_NUMBER" || i.type === "ABHA",
        );
        const officialAbha = abhaIdent?.value || patient.id;

        await prisma.abdmTransaction.update({
          where: { id: tx.id },
          data: {
            status: "AUTHENTICATED",
            userMessage: "ABDM authentication verified successfully.",
            technicalDetail: JSON.stringify({
              abhaAddress: patient.id,
              name: patient.name,
              gender: patient.gender,
              yearOfBirth: patient.yearOfBirth,
              hasOfficialAbha: Boolean(officialAbha),
            }),
            completedAt: new Date(),
          },
        });
      }
    }

    abdmEvents.emit(`on-confirm:${origRequestId}`, body);
    return ok(c, { status: "ACK" });
  });
