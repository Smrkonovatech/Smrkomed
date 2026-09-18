import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIApiKey } from "@/lib/ai/config";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are "Smrko AI", the intelligent reception and clinical care concierge for Hospex Clinic — Bangalore Center (located at 12 Lavelle Road, Bangalore 560001, Karnataka).

Clinic Key Information:
- Location: 12 Lavelle Road, Bangalore 560001 (opposite UB City area).
- Timings: Monday to Saturday, 08:00 AM – 08:00 PM. Sunday: Emergency consultations only.
- Reception Helpline: +91 80 4000 1200
- WhatsApp Care Concierge: +91 866 071 7328
- Key Specialists:
  * Dr. Manideep (Senior Reproductive Endocrinologist & IVF Director)
  * Dr. Ananya Rao (Chief Fertility Specialist & Clinical Lead)
  * Dr. Rahul Menon (Reproductive Endocrinologist & Andrology)
  * Dr. Priya Nair (Gynecologist & High-Risk Obstetric Care)
- Facilities & Services:
  * Class 10,000 Cleanroom IVF & Embryology Lab
  * State-of-the-Art High-Resolution Follicular Ultrasound
  * ICSI, PGT-A Embryo Biopsy, Blastocyst Culture, Laser-Assisted Hatching
  * Semen Analysis & Advanced Sperm DNA Fragmentation (DFI) Testing
  * Egg & Embryo Vitrification / Cryopreservation
  * In-house Specialized Fertility Pharmacy & Diagnostics

Tone and Medical Ethics:
- Warm, polite, reassuring, professional, and clear.
- Welcome patients warmly if they just registered via QR check-in.
- Advise patients where to proceed: Reception Desk Counter 2 on Ground Floor for vital check, or First Floor Waiting Lounge.
- If asked about medications or dosages: Explain the general process but remind them that prescriptions are approved exclusively by the doctor.
- Answer in structured, concise, readable bullet points or short paragraphs.`;

function generateFallbackResponse(userPrompt: string, patientName?: string): string {
  const query = userPrompt.toLowerCase();
  const nameGreeting = patientName ? `Hello ${patientName}! ` : "Hello! ";

  if (query.includes("where") || query.includes("location") || query.includes("address") || query.includes("reach")) {
    return `${nameGreeting}Hospex Clinic Bangalore is located at **12 Lavelle Road, Bangalore 560001** (near Richmond Circle & UB City). If you are already at the entrance, please proceed to Reception Desk Counter 2 on the Ground Floor for token confirmation.`;
  }

  if (query.includes("doctor") || query.includes("dr") || query.includes("specialist") || query.includes("manideep") || query.includes("ananya")) {
    return `${nameGreeting}Our senior clinical specialists at the Bangalore Center today include:
• **Dr. Manideep** — Senior Reproductive Endocrinologist & IVF Specialist
• **Dr. Ananya Rao** — Chief Fertility Specialist
• **Dr. Rahul Menon** — Reproductive Endocrinologist & Andrology
• **Dr. Priya Nair** — Fertility Specialist & Women's Health

Our coordinators are lining up consultations based on your check-in order.`;
  }

  if (query.includes("wait") || query.includes("time") || query.includes("turn") || query.includes("token")) {
    return `${nameGreeting}Your QR check-in has notified our front desk team. The typical wait time for vitals check is **5–10 minutes**. Please relax in the 1st Floor Patient Lounge; tea, coffee, and WiFi are available.`;
  }

  if (query.includes("ivf") || query.includes("treatment") || query.includes("procedure") || query.includes("cost")) {
    return `${nameGreeting}At Hospex Bangalore, our IVF protocol follows a personalized 15-stage care journey, starting with ovarian stimulation, follicular tracking ultrasound, trigger timing, egg retrieval, ICSI/fertilization, and embryo transfer. Your doctor will tailor the plan to your individual health parameters today.`;
  }

  if (query.includes("document") || query.includes("bring") || query.includes("report") || query.includes("file")) {
    return `${nameGreeting}Helpful items to keep ready for your consultation:
1. Government ID (Aadhaar / Passport)
2. Past ultrasound scans, hormone reports (AMH, FSH, Thyroid) or semen analysis
3. Details of previous medical or surgical history
Our nurse can also scan and upload them into your digital SmrkoMed timeline.`;
  }

  if (query.includes("call") || query.includes("phone") || query.includes("contact") || query.includes("reception")) {
    return `${nameGreeting}You can reach Bangalore Hospex Reception directly at **+91 80 4000 1200** or emergency line at **+91 80 4000 1299**. You can also tap the 'Call' button on your screen!`;
  }

  if (query.includes("whatsapp") || query.includes("chat") || query.includes("message")) {
    return `${nameGreeting}Our official WhatsApp Care Concierge number is **+91 866 071 7328**. Tap the 'Chat in WhatsApp' button below to open a pre-filled chat with our Bangalore desk!`;
  }

  return `${nameGreeting}Welcome to Hospex Bangalore Clinic! I am Smrko AI, your personal clinical care assistant. Your check-in is verified in our Bangalore reception system. You can ask me anything about our doctors, clinic location at Lavelle Road, IVF journeys, or preparation for today's appointment.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[];
      patientName?: string;
    };

    const messages = body.messages || [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUserMessage || !lastUserMessage.content.trim()) {
      return NextResponse.json(
        { success: false, error: "A question or message is required." },
        { status: 400 },
      );
    }

    const apiKey = getOpenAIApiKey();

    if (apiKey) {
      try {
        const client = new OpenAI({ apiKey });
        const response = await client.chat.completions.create({
          model: process.env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.slice(-8).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
          temperature: 0.4,
          max_tokens: 500,
        });

        const reply = response.choices[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({
            success: true,
            reply,
            model: "smrko-ai-gpt",
          });
        }
      } catch (err) {
        console.warn("OpenAI API invocation failed, switching to deterministic clinical AI engine:", err);
      }
    }

    // High fidelity deterministic fallback
    const fallbackReply = generateFallbackResponse(lastUserMessage.content, body.patientName);
    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      model: "smrko-ai-local",
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate AI response." },
      { status: 500 },
    );
  }
}
