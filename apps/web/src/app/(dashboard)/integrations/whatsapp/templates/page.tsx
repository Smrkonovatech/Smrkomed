import { redirect } from "next/navigation";

/** Canonical templates UI is /whatsapp/templates — keep this path as a redirect only. */
export default function LegacyIntegrationsWhatsAppTemplatesPage() {
  redirect("/whatsapp/templates");
}
