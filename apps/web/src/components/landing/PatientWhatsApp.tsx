"use client";

import { Check, CheckCheck, Clock, FileText, Calendar, CreditCard, Bell, ShieldCheck, ArrowRight } from "lucide-react";

interface PatientWhatsAppProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function PatientWhatsApp({ onOpenDemo }: PatientWhatsAppProps) {
  const useCases = [
    { title: "Appointment confirmation", icon: Calendar },
    { title: "Reminder", icon: Clock },
    { title: "Report notification", icon: FileText },
    { title: "Payment request", icon: CreditCard },
    { title: "Care instruction", icon: Bell },
    { title: "Follow-up", icon: CheckCheck },
    { title: "Task confirmation", icon: ShieldCheck },
    { title: "Callback request", icon: Check },
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50/50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text & Capabilities Grid */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/70 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>No Patient App Required</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Everything patients need.<br />
              <span className="text-emerald-600">Right where they already are.</span>
            </h2>

            <p className="mt-5 text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Appointments, reminders, reports, payments, instructions and follow-ups—connected through WhatsApp.
            </p>

            {/* 8 Compact Pill Chips */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {useCases.map((uc) => {
                const Icon = uc.icon;
                return (
                  <div
                    key={uc.title}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm text-xs font-semibold text-slate-800 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span>{uc.title}</span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs text-slate-500 font-medium">
              Patients respond naturally in their preferred chat app. Care coordinators and doctors see verified status in real time.
            </p>
          </div>

          {/* Right WhatsApp Mobile Conversation Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-[32px] border-4 border-slate-800 bg-slate-900 p-2.5 shadow-2xl ring-1 ring-slate-900/10">
              {/* Phone Top Notch */}
              <div className="mx-auto mb-2 h-4 w-28 rounded-full bg-slate-800" />

              {/* WhatsApp Interface */}
              <div className="rounded-[24px] bg-[#0b141a] overflow-hidden">
                {/* Chat Top Bar */}
                <div className="flex items-center gap-3 bg-[#1f2c34] px-4 py-3 text-white">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 font-bold text-sm">
                    SM
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-sm truncate">
                      <span>SmrkoMed Clinic</span>
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">
                        ✓
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      Official Healthcare Channel
                    </div>
                  </div>
                </div>

                {/* Message Bubble Canvas */}
                <div className="p-4 space-y-3 bg-[#0b141a] min-h-[340px] flex flex-col justify-end text-xs">
                  {/* Clinic Outbound 1 */}
                  <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1f2c34] p-3 text-slate-200 shadow-sm border border-slate-700/40">
                    <div className="font-semibold text-emerald-400 text-[11px] mb-1">
                      Dr. Priya & Care Team
                    </div>
                    Your appointment is confirmed for tomorrow at 10:00 AM at Bloom Fertility, Scan Room 1.
                    <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                      09:55 AM
                    </div>
                  </div>

                  {/* Patient Reply */}
                  <div className="self-end max-w-[80%] rounded-2xl rounded-tr-sm bg-[#005c4b] p-3 text-white shadow-sm">
                    Thank you.
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-200">
                      09:56 AM <CheckCheck className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Automated CareTask Reminder */}
                  <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1f2c34] p-3 text-slate-200 shadow-sm border border-slate-700/40">
                    <div className="font-semibold text-cyan-400 text-[11px] mb-1">
                      Care Task: Fasting Guidelines
                    </div>
                    Please remember: drink 500ml water 30 mins before your scan. If you need help, reply HELP or CALL.
                    <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                      10:00 AM
                    </div>
                  </div>

                  {/* Quick Action Button within WhatsApp */}
                  <div className="self-start w-full">
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2 text-center text-[11px] font-semibold text-emerald-300">
                      ✓ Confirmed & Logged to Patient 360
                    </div>
                  </div>
                </div>

                {/* WhatsApp Input Bar */}
                <div className="flex items-center gap-2 bg-[#1f2c34] px-3 py-2 text-slate-400 text-xs">
                  <div className="flex-1 rounded-full bg-[#121b22] px-3 py-1.5 text-slate-300">
                    Type a message...
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a884] text-white font-bold text-xs">
                    ➤
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
