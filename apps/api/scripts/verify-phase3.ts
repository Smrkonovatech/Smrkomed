import { prisma } from "@smrkomed/database";
import { processCareLoopExecutions } from "../src/modules/care-loop/worker";

async function runPhase3Verification() {
  console.log("Running Phase 3 Care Loop Worker Verifications...\n");

  const clinic = await prisma.clinic.findFirst();
  if (!clinic) throw new Error("No clinic found");

  let couple = await prisma.couple.findFirst();
  if (!couple) {
    console.log("No couple found, creating one for testing...");
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Demo",
        lastName: "Patient",
        phone: "919999999999",
      }
    });
    couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        primaryPatientId: patient.id,
      }
    });
  }

  console.log("Creating a mock due task...");
  const task = await prisma.careTask.create({
    data: {
      clinicId: clinic.id,
      coupleId: couple.id,
      title: "HOSPEX Demo Task - Medication Reminder",
      status: "WAITING",
      dueDate: new Date(Date.now() - 3600000), // 1 hour overdue
      automationEnabled: true,
      attempts: 0,
    }
  });

  console.log(`Created Task ${task.id}, Status: WAITING, Attempts: 0`);
  
  console.log("\nExecuting Care Loop Worker (Tick 1)...");
  const results = await processCareLoopExecutions(50, clinic.id);
  console.log(`Worker processed ${results.length} tasks.`);
  
  const updatedTask = await prisma.careTask.findUnique({ where: { id: task.id } });
  if (updatedTask?.status !== "ACTIVE") throw new Error("TEST FAILED: Task not updated to ACTIVE");
  if (updatedTask?.attempts !== 1) throw new Error("TEST FAILED: Task attempts not incremented to 1");
  console.log(`✓ Task successfully transitioned to ACTIVE (Reminder Sent).`);

  console.log("\nExecuting Care Loop Worker again immediately (Idempotency Check)...");
  const results2 = await processCareLoopExecutions(50, clinic.id);
  const reprocessed = results2.find(r => r.taskId === task.id);
  if (reprocessed) throw new Error("TEST FAILED: Worker ignored cooldown period");
  console.log(`✓ Worker successfully skipped task due to cooldown (Idempotency).`);

  // Fast forward time to test follow-up
  await prisma.careTask.update({
    where: { id: task.id },
    data: { updatedAt: new Date(Date.now() - 25 * 3600000) } // 25 hours ago
  });

  console.log("\nExecuting Care Loop Worker (Tick 2 - 25h later)...");
  const results3 = await processCareLoopExecutions(50, clinic.id);
  const followedUp = await prisma.careTask.findUnique({ where: { id: task.id } });
  if (followedUp?.attempts !== 2) throw new Error("TEST FAILED: Task follow-up failed");
  console.log(`✓ Task successfully received Follow-up Reminder (Attempts: 2).`);

  console.log("\nSimulating Patient 'Done' Response...");
  const { handleMenuAction } = await import("../src/modules/whatsapp-ai/menu");
  const mockTenantContext = { clinicId: clinic.id, clinicName: clinic.name, role: "SYSTEM" } as any;
  
  const resDone = await handleMenuAction({
    tenant: mockTenantContext,
    conversationId: "demo_conv",
    contactPhone: "919999999999",
    actionIdOrText: `task_done_${task.id}`
  });
  
  if (!resDone.handled) throw new Error("TEST FAILED: Menu Action not handled");
  
  const completedTask = await prisma.careTask.findUnique({ where: { id: task.id } });
  if (completedTask?.status !== "COMPLETED") throw new Error("TEST FAILED: Task not completed");
  console.log(`✓ Task successfully marked as COMPLETED by Patient interaction.`);

  // Cleanup
  await prisma.careTask.delete({ where: { id: task.id } });
  console.log("\nVerification Complete! All Care Loop Execution logic checks out.");
}

runPhase3Verification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
