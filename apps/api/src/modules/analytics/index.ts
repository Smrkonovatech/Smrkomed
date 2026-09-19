import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

export const analyticsRoutes = new Hono<AppEnv>()
  // Backward-compatible summary endpoint
  .get("/summary", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };
    const [patients, appointments, carePlans, careTasks, leads] = await Promise.all([
      prisma.patient.count({ where: clinicWhere }),
      prisma.appointment.count({ where: clinicWhere }),
      prisma.carePlan.count({ where: clinicWhere }),
      prisma.careTask.count({ where: clinicWhere }),
      prisma.lead.count({ where: { organizationId: tenant.organizationId } }),
    ]);
    return ok(c, { patients, appointments, carePlans, careTasks, leads });
  })

  // Full unified analytics overview computed strictly from persisted data
  .get("/overview", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };
    const now = new Date();
    const q = c.req.query();
    const dateRange = q["dateRange"];
    const dateFrom = q["dateFrom"];
    const dateTo = q["dateTo"];
    let customDateFilter: { gte?: Date; lte?: Date } | undefined;
    if (dateRange === "7d") {
      customDateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), lte: now };
    } else if (dateRange === "30d") {
      customDateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), lte: now };
    } else if (dateRange === "90d") {
      customDateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), lte: now };
    } else if (dateFrom || dateTo) {
      customDateFilter = {};
      if (dateFrom) customDateFilter.gte = new Date(dateFrom);
      if (dateTo) customDateFilter.lte = new Date(dateTo);
    }
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const apptWhere = customDateFilter ? { ...clinicWhere, createdAt: customDateFilter } : clinicWhere;
    const taskWhere = customDateFilter ? { ...clinicWhere, createdAt: customDateFilter } : clinicWhere;

    // 1. Organization & Core Metrics
    const [
      totalPatients,
      newPatients,
      activePatients,
      totalAppointments,
      completedAppointments,
      noShowAppointments,
      activeTreatments,
      activeJourneys,
      totalTasks,
      completedTasks,
      overdueTasks,
      escalatedTasks,
      tasksWithResponse,
      automationSuccessTasks,
      humanHandoffTasks,
    ] = await Promise.all([
      prisma.patient.count({ where: clinicWhere }),
      prisma.patient.count({ where: { ...clinicWhere, createdAt: customDateFilter?.gte ? customDateFilter : { gte: thirtyDaysAgo } } }),
      prisma.patient.count({ where: { ...clinicWhere, status: "ACTIVE" } }),
      prisma.appointment.count({ where: apptWhere }),
      prisma.appointment.count({ where: { ...apptWhere, status: "COMPLETED" } }),
      prisma.appointment.count({ where: { ...apptWhere, status: "NO_SHOW" } }),
      prisma.treatment.count({ where: { clinicId: tenant.clinicId, status: "ACTIVE" } }),
      prisma.carePlan.count({ where: { ...clinicWhere, status: "ACTIVE" } }),
      prisma.careTask.count({ where: taskWhere }),
      prisma.careTask.count({ where: { ...taskWhere, status: "COMPLETED" } }),
      prisma.careTask.count({
        where: {
          ...taskWhere,
          dueDate: { lt: now },
          status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
        },
      }),
      prisma.careTask.count({
        where: {
          ...taskWhere,
          OR: [{ status: "ESCALATED" }, { priority: "CLINICAL" }, { escalationLevel: { gt: 0 } }],
        },
      }),
      prisma.careTask.count({ where: { ...taskWhere, patientResponse: { not: null } } }),
      prisma.careTask.count({
        where: {
          ...taskWhere,
          automationEnabled: true,
          status: "COMPLETED",
          escalationLevel: 0,
        },
      }),
      prisma.careTask.count({
        where: {
          ...taskWhere,
          OR: [
            { escalationLevel: { gt: 0 } },
            { status: "ESCALATED" },
            { ownerRole: { in: ["STAFF", "CARE_COORDINATOR", "DOCTOR", "NURSE"] } },
          ],
        },
      }),
    ]);

    // Average resolution time (completed tasks)
    const sampleCompletedTasks = await prisma.careTask.findMany({
      where: { ...clinicWhere, status: "COMPLETED", completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
      take: 200,
    });

    let avgResolutionHours = 0;
    if (sampleCompletedTasks.length > 0) {
      const totalDurationMs = sampleCompletedTasks.reduce((acc, t) => {
        const ms = t.completedAt ? t.completedAt.getTime() - t.createdAt.getTime() : 0;
        return acc + Math.max(0, ms);
      }, 0);
      avgResolutionHours = Math.round((totalDurationMs / sampleCompletedTasks.length / (1000 * 60 * 60)) * 10) / 10;
    }

    // Weekly trend (last 7 days)
    const recentTasks = await prisma.careTask.findMany({
      where: { ...clinicWhere, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, completedAt: true, status: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
    const weeklyTrendsMap = new Map<string, { created: number; completed: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = dayNames[d.getDay()] ?? "Sun";
      weeklyTrendsMap.set(key, { created: 0, completed: 0 });
    }

    for (const t of recentTasks) {
      const createdDay = dayNames[t.createdAt.getDay()] ?? "Sun";
      if (weeklyTrendsMap.has(createdDay)) {
        weeklyTrendsMap.get(createdDay)!.created += 1;
      }
      if (t.completedAt && t.status === "COMPLETED") {
        const completedDay = dayNames[t.completedAt.getDay()] ?? "Sun";
        if (weeklyTrendsMap.has(completedDay)) {
          weeklyTrendsMap.get(completedDay)!.completed += 1;
        }
      }
    }

    const weeklyTrends = Array.from(weeklyTrendsMap.entries()).map(([day, counts]) => ({
      day,
      created: counts.created,
      completed: counts.completed,
    }));

    // 2. Patient Engagement
    const [messagesSent, messagesDelivered, messagesRead, patientResponses, noResponseTasks] =
      await Promise.all([
        prisma.message.count({
          where: { conversation: { clinicId: tenant.clinicId }, direction: "OUTBOUND" },
        }),
        prisma.message.count({
          where: {
            conversation: { clinicId: tenant.clinicId },
            direction: "OUTBOUND",
            status: { in: ["DELIVERED", "READ"] },
          },
        }),
        prisma.message.count({
          where: { conversation: { clinicId: tenant.clinicId }, direction: "OUTBOUND", status: "READ" },
        }),
        prisma.message.count({
          where: { conversation: { clinicId: tenant.clinicId }, direction: "INBOUND" },
        }),
        prisma.careTask.count({
          where: {
            ...clinicWhere,
            attempts: { gt: 0 },
            patientResponse: null,
            status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
          },
        }),
      ]);

    const deliveryRate = messagesSent > 0 ? Math.round((messagesDelivered / messagesSent) * 1000) / 10 : 0;
    const readRate = messagesSent > 0 ? Math.round((messagesRead / messagesSent) * 1000) / 10 : 0;
    const responseRate = messagesSent > 0 ? Math.round((patientResponses / messagesSent) * 1000) / 10 : 0;

    // 3. Clinical Operations & Diagnostics
    const diagnosticTasks = await prisma.careTask.findMany({
      where: {
        ...clinicWhere,
        OR: [{ category: "DIAGNOSTICS" }, { taskType: "DIAGNOSTICS" }],
      },
      select: { id: true, metadata: true, status: true },
    });

    let reportsPending = 0;
    let reportsReviewed = 0;
    for (const dt of diagnosticTasks) {
      const meta = (dt.metadata || {}) as any;
      if (meta.doctorReview?.reviewedAt || meta.doctorReview?.action) {
        reportsReviewed++;
      } else if (meta.results?.length || meta.verification?.verifiedAt) {
        reportsPending++;
      }
    }

    const [followUpsCount, dischargeQueueCount] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "Follow", mode: "insensitive" } },
            { type: { contains: "Review", mode: "insensitive" } },
            { type: { contains: "Consultation", mode: "insensitive" } },
          ],
        },
      }),
      prisma.carePlan.count({
        where: {
          ...clinicWhere,
          OR: [{ status: "COMPLETED" }, { currentStageIndex: { gte: 14 } }],
        },
      }),
    ]);

    // 4. Fertility & IVF Workload
    const activeIvfCycles = await prisma.treatment.count({
      where: { clinicId: tenant.clinicId, kind: "IVF", status: "ACTIVE" },
    });

    const activeCarePlans = await prisma.carePlan.findMany({
      where: { ...clinicWhere, status: "ACTIVE" },
      select: { currentStageName: true, currentStageIndex: true, outcome: true },
    });

    const stageCountMap = new Map<string, number>();
    const outcomesCount = { positive: 0, negative: 0, ongoing: 0, total: 0 };

    for (const cp of activeCarePlans) {
      const stage = cp.currentStageName || `Stage ${(cp.currentStageIndex ?? 0) + 1}`;
      stageCountMap.set(stage, (stageCountMap.get(stage) || 0) + 1);

      if (cp.outcome) {
        outcomesCount.total++;
        const outLower = cp.outcome.toLowerCase();
        if (outLower.includes("positive") || outLower.includes("pregnant") || outLower.includes("success")) {
          outcomesCount.positive++;
        } else if (outLower.includes("negative") || outLower.includes("failed")) {
          outcomesCount.negative++;
        } else {
          outcomesCount.ongoing++;
        }
      }
    }

    const journeyStages = Array.from(stageCountMap.entries()).map(([stageName, count]) => ({
      stageName,
      count,
    }));

    const [monitoringWorkload, procedureWorkload, followUpWorkload] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "Scan", mode: "insensitive" } },
            { type: { contains: "Follicular", mode: "insensitive" } },
            { type: { contains: "Monitoring", mode: "insensitive" } },
            { type: { contains: "Ultrasound", mode: "insensitive" } },
          ],
        },
      }),
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "OPU", mode: "insensitive" } },
            { type: { contains: "Pick-up", mode: "insensitive" } },
            { type: { contains: "Transfer", mode: "insensitive" } },
            { type: { contains: "ET", mode: "insensitive" } },
            { type: { contains: "Biopsy", mode: "insensitive" } },
          ],
        },
      }),
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "Pregnancy", mode: "insensitive" } },
            { type: { contains: "Beta", mode: "insensitive" } },
            { type: { contains: "Review", mode: "insensitive" } },
            { type: { contains: "Counselling", mode: "insensitive" } },
          ],
        },
      }),
    ]);

    // 5. Billing & Revenue Analytics
    const invoices = await prisma.billingInvoice.findMany({
      where: { clinicId: tenant.clinicId, status: { not: "CANCELLED" } },
      select: { totalAmount: true, paidAmount: true, source: true, status: true },
    });

    let totalRevenue = 0;
    let totalPayments = 0;
    let treatmentRevenue = 0;
    let pharmacyRevenue = 0;

    for (const inv of invoices) {
      const tot = Number(inv.totalAmount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      totalRevenue += tot;
      totalPayments += paid;
      if (inv.source === "TREATMENT") treatmentRevenue += tot;
      if (inv.source === "PHARMACY") pharmacyRevenue += tot;
    }

    const outstanding = Math.max(0, totalRevenue - totalPayments);
    const collectionRate = totalRevenue > 0 ? Math.round((totalPayments / totalRevenue) * 1000) / 10 : 0;

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;
    const careLoopResponseRate = totalTasks > 0 ? Math.round((tasksWithResponse / totalTasks) * 1000) / 10 : 0;

    // 6. Staff Workload Distribution
    const allClinicTasks = await prisma.careTask.findMany({
      where: clinicWhere,
      select: { ownerRole: true, status: true, priority: true, escalationLevel: true, dueDate: true },
    });
    const roleMap = new Map<string, { role: string; totalTasks: number; completed: number; overdue: number; escalated: number }>();
    for (const t of allClinicTasks) {
      const role = t.ownerRole || "UNASSIGNED";
      if (!roleMap.has(role)) {
        roleMap.set(role, { role, totalTasks: 0, completed: 0, overdue: 0, escalated: 0 });
      }
      const entry = roleMap.get(role)!;
      entry.totalTasks++;
      if (t.status === "COMPLETED") entry.completed++;
      else if (t.dueDate && t.dueDate < now && t.status !== "CANCELLED" && t.status !== "SKIPPED") entry.overdue++;
      if (t.status === "ESCALATED" || t.priority === "CLINICAL" || (t.escalationLevel ?? 0) > 0) entry.escalated++;
    }
    const staffWorkload = Array.from(roleMap.values()).map((r) => ({
      ...r,
      completionRate: r.totalTasks > 0 ? Math.round((r.completed / r.totalTasks) * 1000) / 10 : 0,
      workloadPct: allClinicTasks.length > 0 ? Math.round((r.totalTasks / allClinicTasks.length) * 1000) / 10 : 0,
    }));

    return ok(c, {
      organization: {
        totalPatients,
        newPatients,
        activePatients,
        totalAppointments,
        completedAppointments,
        noShowAppointments,
        activeTreatments,
        activeJourneys: Math.max(activeJourneys, activeTreatments),
        taskCompletionRate,
        escalationsCount: escalatedTasks,
      },
      careLoop: {
        tasksCreated: totalTasks,
        tasksCompleted: completedTasks,
        tasksOverdue: overdueTasks,
        tasksEscalated: escalatedTasks,
        patientResponseRate: careLoopResponseRate,
        automationSuccessCount: automationSuccessTasks,
        humanHandoffCount: humanHandoffTasks,
        averageResolutionHours: avgResolutionHours,
        weeklyTrends,
      },
      patientEngagement: {
        messagesSent,
        messagesDelivered,
        messagesRead,
        patientResponses,
        taskCompletionCount: completedTasks,
        noResponseCount: noResponseTasks,
        deliveryRate,
        readRate,
        responseRate,
      },
      clinicalOperations: {
        reportsPending,
        reportsReviewed,
        followUpsCount,
        activeJourneys: Math.max(activeJourneys, activeTreatments),
        dischargeQueue: dischargeQueueCount,
      },
      fertility: {
        activeIvfCycles,
        journeyStages,
        monitoringWorkload,
        procedureWorkload,
        followUpWorkload,
        outcomes: outcomesCount,
      },
      billing: {
        totalRevenue,
        totalPayments,
        outstanding,
        treatmentRevenue,
        pharmacyRevenue,
        collectionRate,
        packagesInvoicedCount: invoices.filter((i) => i.source === "TREATMENT").length,
      },
      staff: {
        totalStaffTasks: allClinicTasks.length,
        staffWorkload,
      },
    });
  })

  // Specific subsection endpoints for modular queries
  .get("/organization", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPatients,
      newPatients,
      activePatients,
      totalAppointments,
      completedAppointments,
      noShowAppointments,
      activeTreatments,
      activeJourneys,
      totalTasks,
      completedTasks,
      escalatedTasks,
    ] = await Promise.all([
      prisma.patient.count({ where: clinicWhere }),
      prisma.patient.count({ where: { ...clinicWhere, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.patient.count({ where: { ...clinicWhere, status: "ACTIVE" } }),
      prisma.appointment.count({ where: clinicWhere }),
      prisma.appointment.count({ where: { ...clinicWhere, status: "COMPLETED" } }),
      prisma.appointment.count({ where: { ...clinicWhere, status: "NO_SHOW" } }),
      prisma.treatment.count({ where: { clinicId: tenant.clinicId, status: "ACTIVE" } }),
      prisma.carePlan.count({ where: { ...clinicWhere, status: "ACTIVE" } }),
      prisma.careTask.count({ where: clinicWhere }),
      prisma.careTask.count({ where: { ...clinicWhere, status: "COMPLETED" } }),
      prisma.careTask.count({
        where: {
          ...clinicWhere,
          OR: [{ status: "ESCALATED" }, { priority: "CLINICAL" }, { escalationLevel: { gt: 0 } }],
        },
      }),
    ]);

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

    return ok(c, {
      totalPatients,
      newPatients,
      activePatients,
      totalAppointments,
      completedAppointments,
      noShowAppointments,
      activeTreatments,
      activeJourneys,
      taskCompletionRate,
      escalationsCount: escalatedTasks,
    });
  })

  .get("/care-loop", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      tasksCreated,
      tasksCompleted,
      tasksOverdue,
      tasksEscalated,
      tasksWithResponse,
      automationSuccessCount,
      humanHandoffCount,
    ] = await Promise.all([
      prisma.careTask.count({ where: clinicWhere }),
      prisma.careTask.count({ where: { ...clinicWhere, status: "COMPLETED" } }),
      prisma.careTask.count({
        where: {
          ...clinicWhere,
          dueDate: { lt: now },
          status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
        },
      }),
      prisma.careTask.count({
        where: {
          ...clinicWhere,
          OR: [{ status: "ESCALATED" }, { priority: "CLINICAL" }, { escalationLevel: { gt: 0 } }],
        },
      }),
      prisma.careTask.count({ where: { ...clinicWhere, patientResponse: { not: null } } }),
      prisma.careTask.count({
        where: {
          ...clinicWhere,
          automationEnabled: true,
          status: "COMPLETED",
          escalationLevel: 0,
        },
      }),
      prisma.careTask.count({
        where: {
          ...clinicWhere,
          OR: [
            { escalationLevel: { gt: 0 } },
            { status: "ESCALATED" },
            { ownerRole: { in: ["STAFF", "CARE_COORDINATOR", "DOCTOR", "NURSE"] } },
          ],
        },
      }),
    ]);

    const sampleCompletedTasks = await prisma.careTask.findMany({
      where: { ...clinicWhere, status: "COMPLETED", completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
      take: 200,
    });

    let averageResolutionHours = 0;
    if (sampleCompletedTasks.length > 0) {
      const totalDurationMs = sampleCompletedTasks.reduce((acc, t) => {
        const ms = t.completedAt ? t.completedAt.getTime() - t.createdAt.getTime() : 0;
        return acc + Math.max(0, ms);
      }, 0);
      averageResolutionHours =
        Math.round((totalDurationMs / sampleCompletedTasks.length / (1000 * 60 * 60)) * 10) / 10;
    }

    const recentTasks = await prisma.careTask.findMany({
      where: { ...clinicWhere, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, completedAt: true, status: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
    const weeklyTrendsMap = new Map<string, { created: number; completed: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = dayNames[d.getDay()] ?? "Sun";
      weeklyTrendsMap.set(key, { created: 0, completed: 0 });
    }

    for (const t of recentTasks) {
      const createdDay = dayNames[t.createdAt.getDay()] ?? "Sun";
      if (weeklyTrendsMap.has(createdDay)) {
        weeklyTrendsMap.get(createdDay)!.created += 1;
      }
      if (t.completedAt && t.status === "COMPLETED") {
        const completedDay = dayNames[t.completedAt.getDay()] ?? "Sun";
        if (weeklyTrendsMap.has(completedDay)) {
          weeklyTrendsMap.get(completedDay)!.completed += 1;
        }
      }
    }

    const weeklyTrends = Array.from(weeklyTrendsMap.entries()).map(([day, counts]) => ({
      day,
      created: counts.created,
      completed: counts.completed,
    }));

    const responseRate = tasksCreated > 0 ? Math.round((tasksWithResponse / tasksCreated) * 1000) / 10 : 0;

    return ok(c, {
      tasksCreated,
      tasksCompleted,
      tasksOverdue,
      tasksEscalated,
      patientResponseRate: responseRate,
      automationSuccessCount,
      humanHandoffCount,
      averageResolutionHours,
      weeklyTrends,
    });
  })

  .get("/patient-engagement", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };

    const [messagesSent, messagesDelivered, messagesRead, patientResponses, completedTasks, noResponseTasks] =
      await Promise.all([
        prisma.message.count({
          where: { conversation: { clinicId: tenant.clinicId }, direction: "OUTBOUND" },
        }),
        prisma.message.count({
          where: {
            conversation: { clinicId: tenant.clinicId },
            direction: "OUTBOUND",
            status: { in: ["DELIVERED", "READ"] },
          },
        }),
        prisma.message.count({
          where: { conversation: { clinicId: tenant.clinicId }, direction: "OUTBOUND", status: "READ" },
        }),
        prisma.message.count({
          where: { conversation: { clinicId: tenant.clinicId }, direction: "INBOUND" },
        }),
        prisma.careTask.count({ where: { ...clinicWhere, status: "COMPLETED" } }),
        prisma.careTask.count({
          where: {
            ...clinicWhere,
            attempts: { gt: 0 },
            patientResponse: null,
            status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
          },
        }),
      ]);

    const deliveryRate = messagesSent > 0 ? Math.round((messagesDelivered / messagesSent) * 1000) / 10 : 0;
    const readRate = messagesSent > 0 ? Math.round((messagesRead / messagesSent) * 1000) / 10 : 0;
    const responseRate = messagesSent > 0 ? Math.round((patientResponses / messagesSent) * 1000) / 10 : 0;

    return ok(c, {
      messagesSent,
      messagesDelivered,
      messagesRead,
      patientResponses,
      taskCompletionCount: completedTasks,
      noResponseCount: noResponseTasks,
      deliveryRate,
      readRate,
      responseRate,
    });
  })

  .get("/clinical-operations", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };

    const diagnosticTasks = await prisma.careTask.findMany({
      where: {
        ...clinicWhere,
        OR: [{ category: "DIAGNOSTICS" }, { taskType: "DIAGNOSTICS" }],
      },
      select: { id: true, metadata: true },
    });

    let reportsPending = 0;
    let reportsReviewed = 0;
    for (const dt of diagnosticTasks) {
      const meta = (dt.metadata || {}) as any;
      if (meta.doctorReview?.reviewedAt || meta.doctorReview?.action) {
        reportsReviewed++;
      } else if (meta.results?.length || meta.verification?.verifiedAt) {
        reportsPending++;
      }
    }

    const [followUpsCount, activeCarePlans, activeTreatments, dischargeQueue] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "Follow", mode: "insensitive" } },
            { type: { contains: "Review", mode: "insensitive" } },
            { type: { contains: "Consultation", mode: "insensitive" } },
          ],
        },
      }),
      prisma.carePlan.count({ where: { ...clinicWhere, status: "ACTIVE" } }),
      prisma.treatment.count({ where: { clinicId: tenant.clinicId, status: "ACTIVE" } }),
      prisma.carePlan.count({
        where: {
          ...clinicWhere,
          OR: [{ status: "COMPLETED" }, { currentStageIndex: { gte: 14 } }],
        },
      }),
    ]);

    return ok(c, {
      reportsPending,
      reportsReviewed,
      followUpsCount,
      activeJourneys: Math.max(activeCarePlans, activeTreatments),
      dischargeQueue,
    });
  })

  .get("/fertility", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };

    const activeIvfCycles = await prisma.treatment.count({
      where: { clinicId: tenant.clinicId, kind: "IVF", status: "ACTIVE" },
    });

    const activeCarePlans = await prisma.carePlan.findMany({
      where: { ...clinicWhere, status: "ACTIVE" },
      select: { currentStageName: true, currentStageIndex: true, outcome: true },
    });

    const stageCountMap = new Map<string, number>();
    const outcomesCount = { positive: 0, negative: 0, ongoing: 0, total: 0 };

    for (const cp of activeCarePlans) {
      const stage = cp.currentStageName || `Stage ${(cp.currentStageIndex ?? 0) + 1}`;
      stageCountMap.set(stage, (stageCountMap.get(stage) || 0) + 1);

      if (cp.outcome) {
        outcomesCount.total++;
        const outLower = cp.outcome.toLowerCase();
        if (outLower.includes("positive") || outLower.includes("pregnant") || outLower.includes("success")) {
          outcomesCount.positive++;
        } else if (outLower.includes("negative") || outLower.includes("failed")) {
          outcomesCount.negative++;
        } else {
          outcomesCount.ongoing++;
        }
      }
    }

    const journeyStages = Array.from(stageCountMap.entries()).map(([stageName, count]) => ({
      stageName,
      count,
    }));

    const [monitoringWorkload, procedureWorkload, followUpWorkload] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "Scan", mode: "insensitive" } },
            { type: { contains: "Follicular", mode: "insensitive" } },
            { type: { contains: "Monitoring", mode: "insensitive" } },
            { type: { contains: "Ultrasound", mode: "insensitive" } },
          ],
        },
      }),
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "OPU", mode: "insensitive" } },
            { type: { contains: "Pick-up", mode: "insensitive" } },
            { type: { contains: "Transfer", mode: "insensitive" } },
            { type: { contains: "ET", mode: "insensitive" } },
            { type: { contains: "Biopsy", mode: "insensitive" } },
          ],
        },
      }),
      prisma.appointment.count({
        where: {
          ...clinicWhere,
          OR: [
            { type: { contains: "Pregnancy", mode: "insensitive" } },
            { type: { contains: "Beta", mode: "insensitive" } },
            { type: { contains: "Review", mode: "insensitive" } },
            { type: { contains: "Counselling", mode: "insensitive" } },
          ],
        },
      }),
    ]);

    return ok(c, {
      activeIvfCycles,
      journeyStages,
      monitoringWorkload,
      procedureWorkload,
      followUpWorkload,
      outcomes: outcomesCount,
    });
  })

  .get("/billing", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const invoices = await prisma.billingInvoice.findMany({
      where: { clinicId: tenant.clinicId, status: { not: "CANCELLED" } },
      select: { totalAmount: true, paidAmount: true, source: true, status: true },
    });

    let totalRevenue = 0;
    let totalPayments = 0;
    let treatmentRevenue = 0;
    let pharmacyRevenue = 0;

    for (const inv of invoices) {
      const tot = Number(inv.totalAmount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      totalRevenue += tot;
      totalPayments += paid;
      if (inv.source === "TREATMENT") treatmentRevenue += tot;
      if (inv.source === "PHARMACY") pharmacyRevenue += tot;
    }

    const outstanding = Math.max(0, totalRevenue - totalPayments);
    const collectionRate = totalRevenue > 0 ? Math.round((totalPayments / totalRevenue) * 1000) / 10 : 0;

    return ok(c, {
      totalRevenue,
      totalPayments,
      outstanding,
      treatmentRevenue,
      pharmacyRevenue,
      collectionRate,
    });
  })

  // 7. Staff Workload Analytics (Tasks by role/staff, completion, overdue, escalations)
  .get("/staff", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };
    const now = new Date();

    const tasks = await prisma.careTask.findMany({
      where: clinicWhere,
      select: {
        id: true,
        ownerRole: true,
        status: true,
        priority: true,
        escalationLevel: true,
        dueDate: true,
      },
    });

    const roleMap = new Map<string, { role: string; totalTasks: number; completed: number; overdue: number; escalated: number }>();
    for (const t of tasks) {
      const role = t.ownerRole || "UNASSIGNED";
      if (!roleMap.has(role)) {
        roleMap.set(role, { role, totalTasks: 0, completed: 0, overdue: 0, escalated: 0 });
      }
      const entry = roleMap.get(role)!;
      entry.totalTasks++;
      if (t.status === "COMPLETED") {
        entry.completed++;
      } else {
        if (t.dueDate && t.dueDate < now && t.status !== "CANCELLED" && t.status !== "SKIPPED") {
          entry.overdue++;
        }
      }
      if (t.status === "ESCALATED" || t.priority === "CLINICAL" || (t.escalationLevel ?? 0) > 0) {
        entry.escalated++;
      }
    }

    const staffWorkload = Array.from(roleMap.values()).map((r) => ({
      ...r,
      completionRate: r.totalTasks > 0 ? Math.round((r.completed / r.totalTasks) * 1000) / 10 : 0,
      workloadPct: tasks.length > 0 ? Math.round((r.totalTasks / tasks.length) * 1000) / 10 : 0,
    }));

    return ok(c, {
      totalStaffTasks: tasks.length,
      staffWorkload,
    });
  })

  // 8. Report Export (CSV stream for verified operational records)
  .get("/export", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const reportType = c.req.query("report") || "summary";
    const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };

    let csvContent = "";
    const filename = `smrkomed-${reportType}-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === "care-loop") {
      const tasks = await prisma.careTask.findMany({
        where: clinicWhere,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          priority: true,
          ownerRole: true,
          dueDate: true,
          completedAt: true,
        },
        take: 500,
      });
      csvContent = "ID,Title,Category,Status,Priority,Owner Role,Due Date,Completed At\n";
      for (const t of tasks) {
        csvContent += `"${t.id}","${t.title.replace(/"/g, '""')}","${t.category || ""}","${t.status}","${t.priority}","${t.ownerRole}","${t.dueDate ? t.dueDate.toISOString() : ""}","${t.completedAt ? t.completedAt.toISOString() : ""}"\n`;
      }
    } else if (reportType === "billing") {
      const invoices = await prisma.billingInvoice.findMany({
        where: { clinicId: tenant.clinicId },
        select: {
          id: true,
          invoiceNumber: true,
          source: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          createdAt: true,
        },
        take: 500,
      });
      csvContent = "ID,Invoice Number,Source,Status,Total Amount,Paid Amount,Created At\n";
      for (const inv of invoices) {
        csvContent += `"${inv.id}","${inv.invoiceNumber}","${inv.source}","${inv.status}",${inv.totalAmount},${inv.paidAmount},"${inv.createdAt.toISOString()}"\n`;
      }
    } else if (reportType === "staff") {
      const tasks = await prisma.careTask.findMany({
        where: clinicWhere,
        select: { ownerRole: true, status: true, priority: true, escalationLevel: true, dueDate: true },
      });
      const now = new Date();
      const roleMap = new Map<string, { role: string; total: number; completed: number; overdue: number; escalated: number }>();
      for (const t of tasks) {
        const role = t.ownerRole || "UNASSIGNED";
        if (!roleMap.has(role)) {
          roleMap.set(role, { role, total: 0, completed: 0, overdue: 0, escalated: 0 });
        }
        const item = roleMap.get(role)!;
        item.total++;
        if (t.status === "COMPLETED") item.completed++;
        else if (t.dueDate && t.dueDate < now) item.overdue++;
        if (t.status === "ESCALATED" || t.priority === "CLINICAL" || (t.escalationLevel ?? 0) > 0) item.escalated++;
      }
      csvContent = "Staff Role,Total Tasks,Completed,Overdue,Escalated,Completion Rate (%)\n";
      for (const item of roleMap.values()) {
        const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
        csvContent += `"${item.role}",${item.total},${item.completed},${item.overdue},${item.escalated},${rate}%\n`;
      }
    } else {
      // Default: summary metrics report
      const [patients, appointments, treatments, journeys, tasks] = await Promise.all([
        prisma.patient.count({ where: clinicWhere }),
        prisma.appointment.count({ where: clinicWhere }),
        prisma.treatment.count({ where: { clinicId: tenant.clinicId, status: "ACTIVE" } }),
        prisma.carePlan.count({ where: { ...clinicWhere, status: "ACTIVE" } }),
        prisma.careTask.count({ where: clinicWhere }),
      ]);
      csvContent = "Metric,Value,Generated At\n";
      csvContent += `"Total Patients",${patients},"${new Date().toISOString()}"\n`;
      csvContent += `"Total Appointments",${appointments},"${new Date().toISOString()}"\n`;
      csvContent += `"Active Treatments",${treatments},"${new Date().toISOString()}"\n`;
      csvContent += `"Active Journeys",${journeys},"${new Date().toISOString()}"\n`;
      csvContent += `"Total Care Tasks",${tasks},"${new Date().toISOString()}"\n`;
    }

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="${filename}"`);
    return c.body(csvContent);
  });
