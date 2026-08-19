import type { IntegrationStatus } from "@smrkomed/database";

import { IntegrationError } from "./errors";
import type { ConnectionStatus } from "./types";

const DB_TO_CONNECTION: Record<IntegrationStatus, ConnectionStatus> = {
  DISABLED: "NOT_CONNECTED",
  PENDING: "CONNECTING",
  ACTIVE: "CONNECTED",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  ERROR: "ERROR",
  DISCONNECTED: "DISCONNECTED",
};

const CONNECTION_TO_DB: Record<ConnectionStatus, IntegrationStatus> = {
  NOT_CONNECTED: "DISABLED",
  CONNECTING: "PENDING",
  CONNECTED: "ACTIVE",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  ERROR: "ERROR",
  DISCONNECTED: "DISCONNECTED",
};

const ALLOWED: Record<ConnectionStatus, readonly ConnectionStatus[]> = {
  NOT_CONNECTED: ["CONNECTING"],
  CONNECTING: ["CONNECTED", "ERROR", "NOT_CONNECTED"],
  CONNECTED: ["ACTION_REQUIRED", "ERROR", "DISCONNECTED"],
  ACTION_REQUIRED: ["CONNECTED", "ERROR", "DISCONNECTED", "CONNECTING"],
  ERROR: ["CONNECTING", "DISCONNECTED", "ACTION_REQUIRED"],
  DISCONNECTED: ["CONNECTING"],
};

export function toConnectionStatus(status: IntegrationStatus): ConnectionStatus {
  return DB_TO_CONNECTION[status];
}

export function toIntegrationStatus(status: ConnectionStatus): IntegrationStatus {
  return CONNECTION_TO_DB[status];
}

export function parseConnectionStatusFilter(value: string | undefined): IntegrationStatus | undefined {
  if (!value) return undefined;
  if (value in CONNECTION_TO_DB) return CONNECTION_TO_DB[value as ConnectionStatus];
  if (value in DB_TO_CONNECTION) return value as IntegrationStatus;
  return undefined;
}

export function assertTransition(from: ConnectionStatus, to: ConnectionStatus) {
  if (from === to) return;
  if (!ALLOWED[from].includes(to)) {
    throw new IntegrationError(
      "INVALID_STATE_TRANSITION",
      `Cannot transition integration from ${from} to ${to}.`,
      409,
    );
  }
}

export function canTransition(from: ConnectionStatus, to: ConnectionStatus) {
  return from === to || ALLOWED[from].includes(to);
}
