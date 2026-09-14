import { formatRegistrationSuccessMessage } from "../apps/api/src/modules/whatsapp-ai/registration";
import { generateWhatsAppAiReply } from "../apps/api/src/modules/whatsapp-ai/generate";

async function run() {
  const msg = formatRegistrationSuccessMessage({
    clinicName: "Apex Fertility Clinic",
    patientName: "Priya Sharma",
    partnerName: "Vikram Sharma",
  });
  console.log("MSG:", msg);
  console.log("TEST REGEX:", /Book.*Consultation/i.test(msg));

  try {
    const greetingResult = await generateWhatsAppAiReply({
      patientMessage: "hi",
      ctx: {
        clinicName: "Apex Fertility",
        clinicSlug: "apex-fertility",
        isRegistered: false,
        registrationUrl: "https://smrkomed.com/book/apex-fertility",
        patientFirstName: null,
        appointmentSummary: null,
        journeyStage: null,
        careTaskTitle: null,
        recentMessages: [],
      },
      knowledge: [],
    });
    console.log("GREETING RESULT:", greetingResult);

    const bookingResult = await generateWhatsAppAiReply({
      patientMessage: "I want to book an appointment with a doctor",
      ctx: {
        clinicName: "Apex Fertility",
        clinicSlug: "apex-fertility",
        isRegistered: false,
        registrationUrl: "https://smrkomed.com/book/apex-fertility",
        patientFirstName: null,
        appointmentSummary: null,
        journeyStage: null,
        careTaskTitle: null,
        recentMessages: [],
      },
      knowledge: [],
    });
    console.log("BOOKING RESULT:", bookingResult);
  } catch (err) {
    console.error("GREETING ERROR:", err);
  }
}

run();
