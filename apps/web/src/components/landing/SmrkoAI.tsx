"use client";

import { useState } from "react";
import { 
  Bot, 
  Workflow, 
  PhoneCall, 
  Sparkles, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Mic, 
  Volume2, 
  UserCheck, 
  GitBranch, 
  Layers
} from "lucide-react";

interface SmrkoAIProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function SmrkoAI({ onOpenDemo }: SmrkoAIProps) {
  const [activeTab, setActiveTab] = useState<"connect" | "builder" | "voice">("connect");

  return (
    <section id="ai" className="py-20 sm:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1 text-xs font-semibold text-purple-700 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Healthcare Intelligence Layer</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Smrko AI.<br />
            <span className="bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
              Intelligence built into care.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 font-normal">
            Understand information, automate conversations and help your team act faster.
          </p>

          {/* Three Capabilities Tabs */}
          <div className="mt-8 flex justify-center gap-2 sm:gap-3">
            {[
              { id: "connect", label: "Care Connect", desc: "WhatsApp Conversations", icon: MessageSquare },
              { id: "builder", label: "Care Builder", desc: "Workflow Canvas", icon: Workflow },
              { id: "voice", label: "Care Voice", desc: "AI Proactive Calls", icon: PhoneCall },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 rounded-2xl px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Care Connect */}
        {activeTab === "connect" && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-10">
            <div className="lg:col-span-6 flex flex-col items-start">
              <span className="rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                Care Connect
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
                AI-powered patient conversations through WhatsApp.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Connect patients with your care team through WhatsApp while keeping conversations linked to the patient journey and next action.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2.5 w-full">
                {[
                  "Patient questions",
                  "Appointment assistance",
                  "Care task interaction",
                  "Approved information",
                  "AI responses",
                  "Human handoff",
                  "Escalations",
                  "Conversation summaries",
                ].map((cap) => (
                  <div key={cap} className="flex items-center gap-2 rounded-xl bg-white p-2.5 border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Chat Preview */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    Care Connect • Live Channel
                  </div>
                  <span className="text-[11px] text-slate-400">Dr. Priya EMR Connected</span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="rounded-xl bg-slate-100 p-3 text-slate-700 max-w-[85%]">
                    <span className="font-semibold text-purple-700 block mb-1">Smrko AI</span>
                    Hello Anjali, Dr. Priya has scheduled your Day 8 follicular ultrasound tomorrow at 10:00 AM. Can you confirm?
                  </div>
                  <div className="rounded-xl bg-purple-600 p-3 text-white max-w-[80%] ml-auto text-right">
                    Yes, I will be there on time.
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3 text-slate-700 max-w-[85%]">
                    <span className="font-semibold text-emerald-600 block mb-1">Status: Confirmed ✓</span>
                    Thank you! Reminder: Drink 500ml of water 30 mins prior. We have updated your appointment in the clinic schedule.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Care Builder */}
        {activeTab === "builder" && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-10">
            <div className="lg:col-span-5 flex flex-col items-start">
              <span className="rounded-md bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-800">
                Care Builder
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
                Design workflows. Let SmrkoMed run them.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Visual automation canvas for healthcare teams. Coordinate patient journeys, automatic delays, task triggers and human escalation.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {["Trigger", "Condition", "Wait", "Message", "Task", "Assign", "Escalate", "AI", "Complete"].map((n) => (
                  <span key={n} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual Workflow Canvas Mockup */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xl">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Visual Automation Engine</span>
                <span className="text-cyan-600 font-mono">Running: 42 Workflows</span>
              </div>

              {/* Flow Steps */}
              <div className="flex flex-col items-center space-y-2 text-xs">
                {/* Node 1 */}
                <div className="w-full max-w-xs rounded-xl border border-purple-200 bg-purple-50 p-2.5 text-center font-bold text-purple-900 shadow-sm">
                  ⚡ Trigger: Appointment Created
                </div>
                <div className="h-4 w-0.5 bg-slate-300" />

                {/* Node 2 */}
                <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-2.5 text-center font-semibold text-slate-800 shadow-sm">
                  💬 Send WhatsApp Confirmation
                </div>
                <div className="h-4 w-0.5 bg-slate-300" />

                {/* Node 3 */}
                <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-2.5 text-center font-semibold text-slate-800 shadow-sm">
                  ⏳ Wait for Response (2 Hours)
                </div>
                <div className="h-4 w-0.5 bg-slate-300" />

                {/* Branch Split */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-md pt-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                    <div className="font-bold text-emerald-800 text-[11px]">YES (Confirmed)</div>
                    <div className="mt-1 text-emerald-700 font-medium text-xs">Mark Complete &amp; Arm Reminder</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                    <div className="font-bold text-amber-800 text-[11px]">NO / No Response</div>
                    <div className="mt-1 text-amber-700 font-medium text-xs">Trigger Care Voice &amp; Escalate to Staff</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Care Voice */}
        {activeTab === "voice" && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-10">
            <div className="lg:col-span-6 flex flex-col items-start">
              <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                Care Voice
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
                When a message isn&apos;t enough, call.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                AI-powered proactive calling for important patient confirmations, follow-ups and escalation before appointments or procedures.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2.5 w-full">
                {[
                  "Follow-up calls",
                  "Appointment reminder",
                  "Task confirmation",
                  "Patient response",
                  "AI conversation",
                  "Call summary",
                  "Human handoff",
                  "Escalation",
                ].map((cap) => (
                  <div key={cap} className="flex items-center gap-2 rounded-xl bg-white p-2.5 border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Call Interface Preview */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950 px-3 py-1 text-xs font-semibold text-cyan-400 border border-cyan-800">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  Smrko AI Call Active • 00:34
                </div>

                <div className="mt-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 shadow-lg shadow-purple-600/40">
                  <PhoneCall className="h-8 w-8 text-white" />
                </div>

                <div className="mt-4 font-bold text-lg text-white">Veena M.</div>
                <div className="text-xs text-slate-400">Trigger Injection Confirmation</div>

                {/* Animated Audio Waveform Mockup */}
                <div className="mt-6 flex items-center justify-center gap-1.5 h-10">
                  {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-cyan-400 animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>

                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-3 text-left text-xs text-slate-300">
                  <span className="font-bold text-cyan-300 block mb-1">Transcript Snippet:</span>
                  &ldquo;Hello Veena, confirming your Ovitrelle trigger shot was taken at 9:30 PM last night? Patient: Yes, taken exactly on time.&rdquo;
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
