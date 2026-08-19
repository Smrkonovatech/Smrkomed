import { Hono } from "hono";

import type { AppEnv } from "../../types";
import { adminAuditRoutes } from "./audit-logs";
import { adminClinicRoutes } from "./clinics";
import { adminDashboardRoutes } from "./dashboard";
import { requirePlatformAdmin } from "./guard";
import { adminHealthRoutes } from "./health";
import { adminIntegrationRoutes } from "./integrations";
import { adminIntegrationEventRoutes } from "./events";
import { adminOrganizationRoutes } from "./organizations";
import { adminSubscriptionRoutes } from "./subscriptions";
import { adminUserRoutes } from "./users";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", requirePlatformAdmin);
adminRoutes.route("/", adminDashboardRoutes);
adminRoutes.route("/", adminOrganizationRoutes);
adminRoutes.route("/", adminClinicRoutes);
adminRoutes.route("/", adminUserRoutes);
adminRoutes.route("/", adminSubscriptionRoutes);
adminRoutes.route("/", adminIntegrationRoutes);
adminRoutes.route("/", adminIntegrationEventRoutes);
adminRoutes.route("/", adminAuditRoutes);
adminRoutes.route("/", adminHealthRoutes);
