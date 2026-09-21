import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, organization, email, phone, interest, notes } = body;

    const payload = {
      _subject: `New Demo Booking Request: ${name || "Client"} (${organization || "Clinic"})`,
      _template: "table",
      _captcha: "false",
      "Full Name": name || "N/A",
      "Clinic / Hospital": organization || "N/A",
      "Work Email": email || "N/A",
      "Phone / WhatsApp": phone || "N/A",
      "Primary Focus": interest || "Fertility / IVF",
      "Additional Requirements": notes || "None provided",
      "Submitted At": new Date().toISOString(),
    };

    // Forward to FormSubmit in background with 3.5s timeout so it never blocks the user
    void (async () => {
      try {
        await fetch("https://formsubmit.co/ajax/info@smrkomed.com", {
          method: "POST",
          signal: AbortSignal.timeout(3500),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        console.warn("[DemoRequest] FormSubmit forward failed or timed out:", err.message);
      }
    })();

    // Optionally save as Lead in database if an organization exists
    try {
      const org = await prisma.organization.findFirst({ select: { id: true } });
      if (org?.id) {
        await prisma.lead.create({
          data: {
            organizationId: org.id,
            name: name || "Demo Request",
            phone: phone || null,
            email: email || null,
            source: "WEBSITE",
            sourceDetail: `Demo Booking: ${organization || "N/A"}`,
            treatmentInterest: interest || "IVF",
            landingPage: "/",
          },
        });
      }
    } catch (dbErr: any) {
      console.warn("[DemoRequest] DB lead logging warning:", dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Demo request received and routed to info@smrkomed.com",
    });
  } catch (error: any) {
    console.error("[DemoRequest] Error processing request:", error);
    // Even on error, return success to frontend so user sees Thank You note
    return NextResponse.json({
      success: true,
      message: "Demo request recorded",
    });
  }
}
