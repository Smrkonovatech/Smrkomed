async function test() {
  const res = await fetch('https://smrkomed-api-production.up.railway.app/api/v1/appointment-booking/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'CALL',
      contactPhone: '+917795559724',
      patientName: 'Ravi'
    })
  });
  console.log('Status:', res.status);
  const data = await res.text();
  console.log('Data:', data);
}

test();
