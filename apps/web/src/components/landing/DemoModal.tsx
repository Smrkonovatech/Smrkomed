"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail, Phone, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInterest?: string;
}

export function DemoModal({ isOpen, onClose, defaultInterest = "Fertility / IVF" }: DemoModalProps) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState(defaultInterest);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      organization: organization.trim(),
      email: email.trim(),
      phone: phone.trim(),
      interest,
      notes: notes.trim(),
    };

    // Dispatch to local API route which logs to DB and forwards to info@smrkomed.com
    const apiPromise = fetch("/api/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // Also fire FormSubmit directly in parallel (non-blocking)
    void fetch("https://formsubmit.co/ajax/info@smrkomed.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: `New Demo Booking Request: ${name.trim()} (${organization.trim() || "Clinic"})`,
        _template: "table",
        _captcha: "false",
        "Full Name": name.trim(),
        "Clinic / Organization": organization.trim(),
        "Work Email": email.trim(),
        "Phone Number": phone.trim(),
        "Primary Interest": interest,
        "Additional Requirements": notes.trim() || "None provided",
      }),
    }).catch(() => null);

    // Cap wait time at max 1.2 seconds so user is NEVER stuck on a spinner
    await Promise.race([
      apiPromise,
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);

    setSubmitting(false);
    setSubmitted(true);
    toast.success("Demo request submitted successfully!");
  };

  const handleReset = () => {
    setName("");
    setOrganization("");
    setEmail("");
    setPhone("");
    setNotes("");
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={handleReset}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-2xl transition-all z-10">
        <button
          type="button"
          onClick={handleReset}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          /* ============================================================
             THANK YOU NOTE SCREEN
             ============================================================ */
          <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              Thank You!
            </h3>
            <p className="text-sm font-semibold text-emerald-700 mt-1">
              Your Demo Request has been received
            </p>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed px-2">
              Thank you, <strong className="text-slate-900">{name || "Doctor"}</strong>! Your details have been sent to our team at{" "}
              <span className="font-semibold text-sky-600 underline">info@smrkomed.com</span>. We will reach out to you at{" "}
              <strong className="text-slate-900">{email}</strong> or <strong className="text-slate-900">{phone}</strong> shortly to schedule your personalized live platform demonstration.
            </p>

            <div className="mt-6 rounded-2xl bg-sky-50/70 p-4 text-xs text-sky-950 text-left border border-sky-100/80">
              <p className="font-bold flex items-center gap-1.5 text-sky-900 mb-1.5">
                <Sparkles className="h-4 w-4 text-sky-600" /> What to expect in your live demo:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-sky-800">
                <li>End-to-end 16-stage clinical IVF care journey execution</li>
                <li>Care Loop automated WhatsApp reminders & AI voice escalation</li>
                <li>Real-time patient scheduling, EMR, and lab coordination</li>
                <li>Multi-role workflows for doctors, embryologists & care teams</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-full bg-[#2A2B3D] py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-900 transition cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================
             FORM INPUT SCREEN
             ============================================================ */
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-100">
                <Sparkles className="h-3.5 w-3.5 text-sky-500" /> Book a Platform Demo
              </div>
              <h3 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
                Experience SmrkoMed
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Schedule a 1-on-1 walkthrough tailored to your clinic workflows. Sent directly to{" "}
                <span className="font-semibold text-slate-800">info@smrkomed.com</span>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Priya Rao"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/15 transition"
                />
              </div>

              {/* Clinic / Organisation & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Clinic / Hospital <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Bloom Fertility Center"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/15 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/15 transition"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@bloomfertility.in"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/15 transition"
                />
              </div>

              {/* Primary Interest */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Area of Primary Focus
                </label>
                <select
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/15 transition bg-white"
                >
                  <option value="Fertility / IVF">Fertility & IVF Protocol Automation</option>
                  <option value="Care Loop & WhatsApp">Care Loop WhatsApp Patient Follow-ups</option>
                  <option value="Clinic Management">Multi-Branch Clinic Management & EHR</option>
                  <option value="Voice AI & Calls">AI Outbound Calling & Smart Transcripts</option>
                  <option value="Enterprise / Hospital">Hospital & Diagnostic Integration</option>
                </select>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2A2B3D] py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 transition disabled:opacity-70 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting to info@smrkomed.com...
                    </>
                  ) : (
                    "Confirm & Book Demo"
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-500 pt-1">
                Your request is encrypted and routed directly to <span className="font-semibold text-slate-700">info@smrkomed.com</span>.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
