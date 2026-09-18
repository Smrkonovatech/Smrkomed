import { prisma } from "@smrkomed/database";

async function main() {
  const appts = await prisma.appointment.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startsAt: true,
      doctorName: true,
      clinic: { select: { name: true, timezone: true } },
      couple: { select: { primaryPatient: { select: { firstName: true, lastName: true } } } }
    }
  });

  console.log("RECENT APPOINTMENTS:");
  for (const a of appts) {
    console.log({
      id: a.id,
      clinic: a.clinic?.name,
      patient: a.couple?.primaryPatient?.firstName,
      startsAtUTC: a.startsAt.toISOString(),
      startsAtIST: a.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      serializedUtcTime: a.startsAt.toLocaleTimeString("en-IN", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
      }),
      localIstTime: a.startsAt.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      localIstTime24: a.startsAt.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
