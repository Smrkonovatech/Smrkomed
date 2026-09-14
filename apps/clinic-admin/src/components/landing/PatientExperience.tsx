"use client";

import {
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  HelpCircle,
  MessageSquare,
  PhoneCall,
  RotateCcw,
  Smartphone,
  Sparkles,
} from "lucide-react";

interface PatientExperienceProps {
  onOpenDemo: (interest?: string) => void;
}

export function PatientExperience({ onOpenDemo }: PatientExperienceProps) {
  const touchpoints = [
    { title: "Appointments", desc: "View visit timings, token status & room guidance", icon: Calendar },
    { title: "Confirm / Reschedule", desc: "One-tap confirmation without app downloads", icon: CheckCircle2 },
    { title: "Lab & Scan Reports", desc: "Instant secure PDF delivery upon doctor verification", icon: FileText },
    { title: "Clinical Documents", desc: "Digital prescriptions, discharge summaries & invoices", icon: FileCheck2 },
    { title: "Payments & Receipts", desc: "UPI payment links and verified digital payment receipts", icon: CreditCard },
    { title: "Request Callback", desc: "Direct route to care coordinator when questions arise", icon: PhoneCall },
    { title: "Digital Forms", desc: "Medical intake and history forms filled in advance", icon: FileText },
    { title: "Informed Consent", desc: "Digital procedure consents explained in clear language", icon: FileCheck2 },
    { title: "Care Instructions", desc: "Injection guides, fasting rules & post-procedure care", icon: HelpCircle },
    { title: "Patient Questions", desc: "Verified answers to clinic hours, tests & medication rules", icon: MessageSquare },
    { title: "Action Reminders", desc: "Timed alarms ensuring medication compliance on schedule", icon: Bell },
    { title: "Cycle Continuity", desc: "Both partners stay synchronized on next clinic appointments", icon: RotateCcw },
  ];

  return (
    <section className="py-20 sm:py-28 bg-slate-50/60 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Smartphone className="h-3.5 w-3.5 text-purple-600" /> Patient Touchpoints
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Patients don&apos;t need another complicated system.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            SmrkoMed delivers a seamless, dignified patient experience through the channels they already use every day—without requiring complex app installations or forgotten passwords.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {touchpoints.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm hover:border-purple-200 hover:shadow-md transition"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Supporting Note */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 text-center max-w-2xl mx-auto shadow-sm">
          <p className="text-xs text-slate-600">
            <strong>Connected Experience:</strong> WhatsApp serves as an immediate communication channel, seamlessly backed by SMS, automated phone outreach, and secure patient web portals.
          </p>
        </div>
      </div>
    </section>
  );
}
