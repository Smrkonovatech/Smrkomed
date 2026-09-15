import { createApp } from '../apps/api/src/app';

async function main() {
  const res = await fetch('https://smrkomed-api-production.up.railway.app/api/ai/book-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointmentDate: 'tomorrow',
      appointmentTime: '10:00 AM'
    })
  });

  console.log('Status code:', res.status);
  const data = await res.json();
  console.log('Response body:', data);
}

main().catch(console.error);
