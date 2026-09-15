import { createApp } from '../apps/api/src/app';

async function main() {
  const app = createApp();

  console.log('--- 1. Testing GET /api/ai/doctor-schedule ---');
  const schedRes = await app.request('/api/ai/doctor-schedule?doctor=Dr.+Ananya+Rao&date=tomorrow', {
    method: 'GET',
  });
  console.log('Schedule Status:', schedRes.status);
  const schedData = await schedRes.json();
  console.log('Schedule Data:', JSON.stringify(schedData, null, 2));

  console.log('\n--- 2. Testing First Booking at 11:00 AM ---');
  const bookRes1 = await app.request('/api/ai/book-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorName: 'Dr. Ananya Rao',
      appointmentDate: 'tomorrow',
      appointmentTime: '11:00 AM',
      patientName: 'Test Patient Alpha',
      phoneNumber: '+919876543210'
    })
  });
  console.log('Book 1 Status:', bookRes1.status);
  console.log('Book 1 Body:', await bookRes1.json());

  console.log('\n--- 3. Testing Conflicting Booking for Different Patient at EXACT same 11:00 AM ---');
  const bookRes2 = await app.request('/api/ai/book-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorName: 'Dr. Ananya Rao',
      appointmentDate: 'tomorrow',
      appointmentTime: '11:00 AM',
      patientName: 'Test Patient Beta',
      phoneNumber: '+919876543211'
    })
  });
  console.log('Book 2 Status:', bookRes2.status);
  const book2Body = await bookRes2.json();
  console.log('Book 2 Body:', book2Body);

  console.log('\n--- 4. Verify No Overlapping Appointments in DB ---');
  const { prisma } = await import('@smrkomed/database');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart = new Date(tomorrow);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(tomorrow);
  dayEnd.setHours(23, 59, 59, 999);

  const appts = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      doctorName: { contains: 'Ananya' },
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { startsAt: 'asc' },
    select: { id: true, startsAt: true, notes: true, couple: { select: { primaryPatient: { select: { firstName: true } } } } }
  });

  console.log('Confirmed Appointments for Dr. Ananya Rao tomorrow:');
  for (const a of appts) {
    console.log(`- ${new Date(a.startsAt).toLocaleTimeString('en-IN')}: ${a.notes?.slice(0, 80)}`);
  }
}

main().catch(console.error);
