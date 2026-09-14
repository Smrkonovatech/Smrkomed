"use client";

import { useState } from "react";
import { Check, CheckCheck, ChevronLeft, MoreVertical, Phone, Video, Send, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SimMessage = {
  id: string;
  sender: "patient" | "clinic";
  time: string;
  type: "text" | "buttons" | "list" | "card" | "summary" | "confirmation";
  text?: string;
  header?: string;
  footer?: string;
  imageUrl?: string;
  buttons?: Array<{ id: string; title: string }>;
  listButtonLabel?: string;
  listItems?: Array<{ id: string; title: string; subtitle?: string }>;
};

const INITIAL_SIM_MESSAGES: SimMessage[] = [
  {
    id: "m_1",
    sender: "patient",
    time: "10:42 AM",
    type: "text",
    text: "Hi, I'd like to book an appointment with a doctor",
  },
  {
    id: "m_2",
    sender: "clinic",
    time: "10:42 AM",
    type: "text",
    text: "Absolutely! 👋\nI can help you find the right specialist and appointment time.\n\nWho would you like to consult?",
  },
  {
    id: "m_3",
    sender: "clinic",
    time: "10:42 AM",
    type: "card",
    header: "Available Fertility Specialists",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
    text: "Dr. Ananya Rao\nSenior Fertility Specialist\n14+ years experience • MBBS, MD",
    footer: "SmrkoMed Clinic",
    buttons: [
      { id: "appt_doctor_doc_ananya", title: "📅 See Available Slots" },
      { id: "view_profile_ananya", title: "👩‍⚕️ View Full Profile" },
    ],
  },
];

export function WhatsAppPhoneSimulator({
  clinicName = "SmrkoMed Clinic",
  onSimulateStep,
}: {
  clinicName?: string;
  onSimulateStep?: (stepName: string) => void;
}) {
  const [messages, setMessages] = useState<SimMessage[]>(INITIAL_SIM_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("Dr. Ananya Rao");
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [activeListItems, setActiveListItems] = useState<Array<{ id: string; title: string; subtitle?: string }>>([]);
  const [listModalTitle, setListModalTitle] = useState("Select an option");

  function handleSendUserMessage(customText?: string) {
    const text = (customText || inputText).trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: SimMessage = {
      id: `u_${Date.now()}`,
      sender: "patient",
      time,
      type: "text",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");

    // Simulate automated response
    setTimeout(() => {
      handleFlowResponse(text);
    }, 600);
  }

  function handleFlowResponse(input: string) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const lower = input.toLowerCase();

    if (lower.includes("slot") || lower.includes("doctor") || input.startsWith("appt_doctor_")) {
      onSimulateStep?.("GET_AVAILABLE_DATES");
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "list",
          text: `Great choice! 📅 Here are the next available consultation dates for ${selectedDoctor}:`,
          listButtonLabel: "📅 Choose Date",
          listItems: [
            { id: "appt_date_2026-09-07", title: "Mon, 7 Sep 2026", subtitle: "8 slots available" },
            { id: "appt_date_2026-09-08", title: "Tue, 8 Sep 2026", subtitle: "6 slots available" },
            { id: "appt_date_2026-09-09", title: "Wed, 9 Sep 2026", subtitle: "5 slots available" },
          ],
        },
      ]);
    } else if (lower.includes("sep") || lower.includes("mon") || input.startsWith("appt_date_")) {
      onSimulateStep?.("GET_AVAILABLE_SLOTS");
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "buttons",
          text: "Available times for Monday, 7 Sep ⏰\n\n☀️ Morning Slots:",
          buttons: [
            { id: "appt_slot_0930", title: "09:30 AM" },
            { id: "appt_slot_1000", title: "10:00 AM" },
            { id: "appt_slot_1130", title: "11:30 AM" },
          ],
        },
      ]);
    } else if (lower.includes("am") || lower.includes("pm") || input.startsWith("appt_slot_")) {
      onSimulateStep?.("BOOKING_SUMMARY");
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "summary",
          text: `Please confirm your appointment ✨\n\n👩‍⚕️ ${selectedDoctor}\nFertility Specialist\n\n📅 Monday, 7 Sep 2026\n⏰ 10:00 AM\n📍 ${clinicName}`,
          buttons: [
            { id: "appt_confirm", title: "Confirm Appointment ✅" },
            { id: "appt_change", title: "Change Time ⏰" },
            { id: "appt_cancel", title: "Cancel ❌" },
          ],
        },
      ]);
    } else if (lower.includes("confirm") || input === "appt_confirm") {
      onSimulateStep?.("BOOK_APPOINTMENT");
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "confirmation",
          text: `You're all set! 🎉\n\nYour appointment is confirmed.\n\n👩‍⚕️ ${selectedDoctor}\n📅 Monday, 7 Sep 2026\n⏰ 10:00 AM\n📍 ${clinicName}\n\nWe'll send you a WhatsApp reminder before your appointment.`,
          buttons: [
            { id: "appt_reschedule", title: "Reschedule" },
            { id: "appt_cancel_btn", title: "Cancel Booking" },
          ],
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "buttons",
          text: "Let's find the right doctor for you 👩‍⚕️",
          buttons: [
            { id: "btn_doc_ananya", title: "Dr. Ananya Rao" },
            { id: "btn_doc_rahul", title: "Dr. Rahul Mehta" },
            { id: "btn_doc_priya", title: "Dr. Priya Nair" },
          ],
        },
      ]);
    }
  }

  function handleButtonClick(button: { id: string; title: string }) {
    handleSendUserMessage(button.title);
  }

  function openListSheet(label: string, items?: Array<{ id: string; title: string; subtitle?: string }>) {
    if (!items || items.length === 0) return;
    setListModalTitle(label);
    setActiveListItems(items);
    setIsListModalOpen(true);
  }

  function handleSelectListItem(item: { id: string; title: string }) {
    setIsListModalOpen(false);
    handleSendUserMessage(item.title);
  }

  function resetSimulation() {
    setMessages(INITIAL_SIM_MESSAGES);
    setSelectedDoctor("Dr. Ananya Rao");
  }

  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Device wrapper */}
      <div className="relative w-[340px] rounded-[44px] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-800">
        {/* Notch / Dynamic Island */}
        <div className="absolute left-1/2 top-4 z-30 h-5 w-28 -translate-x-1/2 rounded-full bg-slate-950 flex items-center justify-end px-3">
          <div className="size-2 rounded-full bg-slate-800" />
        </div>

        {/* Screen container */}
        <div className="relative flex h-[620px] flex-col overflow-hidden rounded-[34px] bg-[#efeae2] dark:bg-[#0b141a]">
          {/* Status bar */}
          <div className="flex h-8 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="h-2.5 w-5 rounded-sm border border-current p-0.5">
                <div className="h-full w-3/4 rounded-2xs bg-current" />
              </div>
            </div>
          </div>

          {/* WhatsApp top bar */}
          <div className="flex items-center justify-between border-b border-black/5 bg-[#008069] px-2 py-2 text-white dark:bg-[#202c33]">
            <div className="flex items-center gap-1.5">
              <ChevronLeft className="size-5 cursor-pointer opacity-90" />
              <div className="relative flex size-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-inner">
                🏥
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold leading-tight">{clinicName}</span>
                  <span className="rounded-full bg-emerald-400 p-0.5 text-[8px] text-slate-900">✓</span>
                </div>
                <span className="text-[10px] opacity-80">Official WhatsApp Business</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pr-2 opacity-85">
              <Video className="size-4" />
              <Phone className="size-3.5" />
              <MoreVertical className="size-4" />
            </div>
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 space-y-2 overflow-y-auto p-2.5 text-xs">
            <div className="mx-auto my-1 max-w-[200px] rounded-md bg-white/70 px-2 py-1 text-center text-[10px] font-medium text-slate-600 shadow-2xs backdrop-blur-xs dark:bg-slate-800/80 dark:text-slate-300">
              🔒 End-to-end encrypted
            </div>

            {messages.map((m) => {
              const isPatient = m.sender === "patient";
              return (
                <div key={m.id} className={cn("flex flex-col", isPatient ? "items-end" : "items-start")}>
                  {/* Card message with Image */}
                  {m.type === "card" ? (
                    <div className="max-w-[85%] overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1f2c34]">
                      {m.imageUrl ? (
                        <div className="relative h-28 w-full overflow-hidden bg-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.imageUrl} alt="Doctor" className="h-full w-full object-cover" />
                          <div className="absolute bottom-1 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                            Verified Doctor
                          </div>
                        </div>
                      ) : null}
                      <div className="p-2.5">
                        <p className="whitespace-pre-line font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                          {m.text}
                        </p>
                        <span className="mt-1 block text-right text-[9px] text-slate-400">{m.time}</span>
                      </div>
                      {m.buttons && m.buttons.length > 0 ? (
                        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                          {m.buttons.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleButtonClick(b)}
                              className="flex w-full items-center justify-center py-2 text-center text-xs font-semibold text-[#00a884] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              {b.title}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : m.type === "buttons" || m.type === "summary" || m.type === "confirmation" ? (
                    <div className="max-w-[85%] overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1f2c34]">
                      <div className="p-2.5">
                        <p className="whitespace-pre-line leading-relaxed text-slate-900 dark:text-slate-100">
                          {m.text}
                        </p>
                        <span className="mt-1 block text-right text-[9px] text-slate-400">{m.time}</span>
                      </div>
                      {m.buttons && m.buttons.length > 0 ? (
                        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                          {m.buttons.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleButtonClick(b)}
                              className="flex w-full items-center justify-center py-2 text-center text-xs font-semibold text-[#00a884] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              {b.title}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : m.type === "list" ? (
                    <div className="max-w-[85%] overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1f2c34]">
                      <div className="p-2.5">
                        <p className="whitespace-pre-line leading-relaxed text-slate-900 dark:text-slate-100">
                          {m.text}
                        </p>
                        <span className="mt-1 block text-right text-[9px] text-slate-400">{m.time}</span>
                      </div>
                      <div className="border-t border-slate-100 p-2 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => openListSheet(m.listButtonLabel || "Select Option", m.listItems)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#008069] py-2 text-center text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#00705a]"
                        >
                          {m.listButtonLabel || "📅 Select Date"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Simple Text Bubble */
                    <div
                      className={cn(
                        "relative max-w-[80%] rounded-2xl px-3 py-1.5 shadow-2xs",
                        isPatient
                          ? "bg-[#d9fdd3] text-slate-900 dark:bg-[#005c4b] dark:text-slate-100 rounded-tr-xs"
                          : "bg-white text-slate-900 dark:bg-[#1f2c34] dark:text-slate-100 rounded-tl-xs",
                      )}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                        <span>{m.time}</span>
                        {isPatient ? <CheckCheck className="size-3 text-sky-500" /> : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* List Picker Bottom Sheet Modal */}
          {isListModalOpen ? (
            <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50 backdrop-blur-2xs">
              <div className="max-h-[70%] overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#1f2c34]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <span className="font-semibold text-slate-900 dark:text-white">{listModalTitle}</span>
                  <button
                    type="button"
                    onClick={() => setIsListModalOpen(false)}
                    className="text-xs font-semibold text-[#00a884]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-2 dark:divide-slate-800">
                  {activeListItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectListItem(item)}
                      className="flex w-full flex-col p-2 text-left rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                      {item.subtitle ? (
                        <span className="text-[11px] text-slate-400">{item.subtitle}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* WhatsApp input bar */}
          <div className="flex items-center gap-2 border-t border-black/5 bg-[#f0f2f5] p-2 dark:bg-[#202c33]">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendUserMessage();
              }}
              placeholder="Type message..."
              className="h-8 rounded-full border-none bg-white text-xs shadow-none focus-visible:ring-1 dark:bg-[#2a3942]"
            />
            <Button
              size="icon"
              type="button"
              onClick={() => handleSendUserMessage()}
              className="size-8 shrink-0 rounded-full bg-[#00a884] hover:bg-[#008069]"
            >
              <Send className="size-3.5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Simulator Quick Action Toolbar */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSendUserMessage("I want an appointment")}
          className="h-7 text-xs"
        >
          <Sparkles className="mr-1 size-3 text-purple-600" />
          Test: &quot;I want an appointment&quot;
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSendUserMessage("Next Monday evening with Dr Ananya")}
          className="h-7 text-xs"
        >
          Test Natural Language
        </Button>
        <Button size="sm" variant="ghost" onClick={resetSimulation} className="h-7 text-xs">
          <RotateCcw className="mr-1 size-3" />
          Reset Chat
        </Button>
      </div>
    </div>
  );
}
