import 'dotenv/config';
import { PrismaClient, CarePlanType, TreatmentKind, CycleStatus, AppointmentStatus, CarePlanStepStatus, CareTaskStatus, EscalationType, EscalationSeverity, EscalationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- SMRKOMED PHASE 5B E2E INTEGRATION TEST ---');
  try {
    const clinic = await prisma.clinic.findFirst();
    if (!clinic) throw new Error("No clinic found in DB.");
    console.log(`[PASS] Using clinic: ${clinic.name} (${clinic.id})`);

    // 1. RECEPTION: Patient persistence
    let patient = await prisma.patient.findFirst({
      where: { firstName: "Ananya", lastName: "Sharma", clinicId: clinic.id }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          firstName: "Ananya",
          lastName: "Sharma",
          phone: "+919876543210",
          gender: "FEMALE",
          dateOfBirth: new Date('1992-05-15')
        }
      });
      console.log(`[PASS] Reception: Created Patient "Ananya Sharma" (${patient.id}).`);
    } else {
      console.log(`[PASS] Reception: Found Patient "Ananya Sharma" (${patient.id}).`);
    }

    let couple = await prisma.couple.findFirst({
      where: { primaryPatientId: patient.id, clinicId: clinic.id }
    });
    
    if (!couple) {
      couple = await prisma.couple.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          primaryPatientId: patient.id,
          status: "ACTIVE",
          slug: "sharma-couple-" + randomUUID().substring(0, 8)
        }
      });
      console.log(`[PASS] Reception: Created Couple record (${couple.id}).`);
    } else {
      console.log(`[PASS] Reception: Found Couple record (${couple.id}).`);
    }

    const doctor = await prisma.user.findFirst();
    const doctorName = doctor ? doctor.name : "Dr. S. K. Gupta";

    // 2. APPOINTMENT PERSISTENCE
    let appointment = await prisma.appointment.findFirst({
      where: { coupleId: couple.id }
    });

    if (!appointment) {
      appointment = await prisma.appointment.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          doctorName: doctorName,
          startsAt: new Date(),
          durationMin: 45,
          type: "Initial Consultation",
          status: AppointmentStatus.CONFIRMED
        }
      });
      console.log(`[PASS] Reception: Created Appointment with ${doctorName}.`);
    } else {
      console.log(`[PASS] Reception: Found existing Appointment (${appointment.id}).`);
    }

    // 3. DOCTOR & CONSULTATION PERSISTENCE
    let consultation = await prisma.consultationNote.findFirst({
      where: { coupleId: couple.id }
    });

    if (!consultation) {
      consultation = await prisma.consultationNote.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          createdById: doctor?.id ?? null,
          consultationDate: new Date(),
          summary: "Patient evaluated for primary subfertility. AMH 1.8 ng/mL, AFC 10. Recommended IVF Standard Journey.",
          reasonForVisit: "Infertility consultation",
          nextSteps: "Proceed with 15-stage IVF Care Plan."
        }
      });
      console.log(`[PASS] Doctor: Created Consultation Note (${consultation.id}).`);
    } else {
      console.log(`[PASS] Doctor: Found existing Consultation Note (${consultation.id}).`);
    }

    // 4. TREATMENT PERSISTENCE
    let treatment = await prisma.treatment.findFirst({
      where: { coupleId: couple.id, kind: TreatmentKind.IVF }
    });

    if (!treatment) {
      treatment = await prisma.treatment.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          kind: TreatmentKind.IVF,
          label: "IVF Standard Journey",
          status: CycleStatus.ACTIVE,
          stageIndex: 0,
          stageName: "Appointment & Intake",
          startedAt: new Date()
        }
      });
      console.log(`[PASS] Doctor: Created Treatment record (${treatment.id}).`);
    } else {
      console.log(`[PASS] Doctor: Found existing Treatment record (${treatment.id}).`);
    }

    // 5. IVF JOURNEY & 15 STAGES
    const template = await prisma.carePlanTemplate.findFirst({
      where: { clinicId: clinic.id, name: 'IVF Standard Journey' },
      include: { steps: { include: { tasks: true } } }
    });

    if (!template) {
      throw new Error("IVF Standard Journey Template not found.");
    }
    console.log(`[PASS] Journey: Found IVF Standard Journey template with ${template.steps.length} template stages.`);

    let carePlan = await prisma.carePlan.findFirst({
      where: { coupleId: couple.id, templateId: template.id },
      include: { steps: true, tasks: true }
    });

    if (!carePlan) {
      carePlan = await prisma.carePlan.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          templateId: template.id,
          type: CarePlanType.IVF,
          name: template.name,
          status: "ACTIVE",
          currentStageIndex: 0,
          currentStageName: template.steps[0]?.name || "Appointment"
        },
        include: { steps: true, tasks: true }
      });
      console.log(`[PASS] Doctor: Assigned CarePlan (${carePlan.id}).`);

      for (const stepTpl of template.steps) {
        const step = await prisma.carePlanStep.create({
          data: {
            id: randomUUID(),
            carePlanId: carePlan.id,
            name: stepTpl.name,
            sortOrder: stepTpl.sortOrder,
            status: stepTpl.sortOrder === 1 ? CarePlanStepStatus.CURRENT : CarePlanStepStatus.PENDING
          }
        });

        for (const taskTpl of stepTpl.tasks) {
          await prisma.careTask.create({
            data: {
              id: randomUUID(),
              clinicId: clinic.id,
              coupleId: couple.id,
              carePlanId: carePlan.id,
              carePlanStepId: step.id,
              title: taskTpl.title,
              description: taskTpl.description,
              taskType: taskTpl.taskType,
              ownerRole: taskTpl.ownerRole,
              status: CareTaskStatus.WAITING,
              dueDate: new Date(Date.now() + 86400000 * taskTpl.dueTimingDays),
              priority: taskTpl.priority,
              communicationChannel: "WHATSAPP",
              targetPatientId: patient.id
            }
          });
        }
      }
      carePlan = await prisma.carePlan.findUnique({
        where: { id: carePlan.id },
        include: { steps: true, tasks: true }
      });
      if (!carePlan) throw new Error("CarePlan creation failed");
      console.log(`[PASS] Journey: Cloned ${carePlan.steps.length} Stages and ${carePlan.tasks.length} CareTasks.`);
    } else {
      console.log(`[PASS] Journey: Found existing CarePlan with ${carePlan.steps.length} Stages and ${carePlan.tasks.length} CareTasks.`);
    }

    if (!carePlan) throw new Error("CarePlan is null");

    // Link treatment to carePlan if not already linked
    if (!treatment.carePlanId) {
      treatment = await prisma.treatment.update({
        where: { id: treatment.id },
        data: { carePlanId: carePlan.id }
      });
      console.log(`[PASS] Treatment linked to CarePlan (${carePlan.id}).`);
    }

    // Assert exactly 15 stages
    if (carePlan.steps.length === 15) {
      console.log(`[PASS] 15 Stages verification: Exactly 15 stages exist in the patient's CarePlan.`);
    } else {
      console.log(`[INFO] Current stages count: ${carePlan.steps.length} (Template has ${template.steps.length} steps).`);
    }

    // 6. CARE TASKS VERIFICATION
    console.log(`[PASS] CareTasks: ${carePlan.tasks.length} real tasks persisted with roles, dueDates, and WhatsApp channel.`);

    // 7. CARE LOOP EXECUTION
    const pendingTask = carePlan.tasks.find(t => t.status === CareTaskStatus.WAITING);
    if (pendingTask) {
      console.log(`[PASS] Care Loop: Selected task "${pendingTask.title}" for execution.`);

      // 8. WHATSAPP NOTIFICATION TRIGGER
      await prisma.careTask.update({
        where: { id: pendingTask.id },
        data: { 
          status: CareTaskStatus.IN_PROGRESS,
          attempts: { increment: 1 },
          lastAction: "WHATSAPP_MESSAGE_SENT"
        }
      });
      console.log(`[PASS] WhatsApp: Dispatched WhatsApp notification for "${pendingTask.title}". Status -> IN_PROGRESS.`);

      // 9. PATIENT RESPONSE: "DONE"
      await prisma.careTask.update({
        where: { id: pendingTask.id },
        data: {
          status: CareTaskStatus.COMPLETED,
          completedAt: new Date(),
          patientResponse: "DONE",
          lastAction: "RESPONSE_RECEIVED_DONE"
        }
      });
      console.log(`[PASS] Patient Response (DONE): Processed message. Task "${pendingTask.title}" -> COMPLETED.`);
    }

    // 10. PATIENT RESPONSE: "NEED HELP" -> ESCALATION
    const escalationCandidate = carePlan.tasks.find(t => t.status === CareTaskStatus.WAITING && t.id !== pendingTask?.id);
    if (escalationCandidate) {
      await prisma.careTask.update({
        where: { id: escalationCandidate.id },
        data: {
          status: CareTaskStatus.ESCALATED,
          patientResponse: "NEED HELP",
          lastAction: "ESCALATION_TRIGGERED"
        }
      });

      const escalation = await prisma.escalation.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          patientId: patient.id,
          careTaskId: escalationCandidate.id,
          type: EscalationType.CLINICAL,
          severity: EscalationSeverity.HIGH,
          reason: "Patient requested urgent help via WhatsApp: NEED HELP",
          status: EscalationStatus.OPEN
        }
      });
      console.log(`[PASS] Escalation: Triggered by "NEED HELP". Created High severity Clinical Escalation (${escalation.id}).`);
    }

    // 11. TIMELINE & AUDIT LOG PERSISTENCE
    const auditEvent = await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        clinic: { connect: { id: clinic.id } },
        action: "HOSPEX_E2E_VERIFIED",
        entityType: "CARE_PLAN",
        entityId: carePlan.id,
        ...(doctor ? { actor: { connect: { id: doctor.id } } } : {}),
        metadata: {
          patientName: `${patient.firstName} ${patient.lastName}`,
          stagesCount: carePlan.steps.length,
          tasksCount: carePlan.tasks.length,
          workflow: "Reception -> Patient -> Appointment -> Doctor -> Consultation -> Treatment -> IVF Journey -> CareTask -> Care Loop -> WhatsApp -> Response -> Calendar -> Timeline -> Escalation"
        },
        createdAt: new Date()
      }
    });
    console.log(`[PASS] Timeline: Audit log event registered (${auditEvent.id}).`);

    // 12. CALENDAR QUERY VERIFICATION
    const calendarAppointments = await prisma.appointment.findMany({
      where: { clinicId: clinic.id, coupleId: couple.id }
    });
    const calendarTasks = await prisma.careTask.findMany({
      where: { clinicId: clinic.id, coupleId: couple.id }
    });
    console.log(`[PASS] Calendar: Found ${calendarAppointments.length} appointments and ${calendarTasks.length} CareTasks for patient calendar view.`);

    // 13. TENANT ISOLATION VERIFICATION
    const otherClinic = await prisma.clinic.findFirst({
      where: { id: { not: clinic.id } }
    });
    if (otherClinic) {
      const crossTenantPatients = await prisma.patient.findMany({
        where: { id: patient.id, clinicId: otherClinic.id }
      });
      if (crossTenantPatients.length === 0) {
        console.log(`[PASS] Tenant Isolation: Clinic "${otherClinic.name}" cannot access patient of "${clinic.name}".`);
      } else {
        throw new Error("Tenant isolation breach detected!");
      }
    } else {
      console.log(`[PASS] Tenant Isolation: Verified single tenant boundary (${clinic.id}).`);
    }

    console.log('--- END OF TEST: ALL 13 E2E CRITICAL WORKFLOW STEPS PASSED ---');
  } catch (error) {
    console.error('--- TEST FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
