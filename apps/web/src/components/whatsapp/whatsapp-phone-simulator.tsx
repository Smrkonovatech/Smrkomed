"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, CheckCheck, ChevronLeft, MoreVertical, Phone, Video, Send, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDoctors, displayNameOf, type DoctorProfile } from "@/lib/doctors";

export type SimMessage = {
  id: string;
  sender: "patient" | "clinic";
  time: string;
  type: "text" | "buttons" | "list" | "card" | "summary" | "confirmation";
  text?: string | undefined;
  header?: string | undefined;
  footer?: string | undefined;
  imageUrl?: string | undefined;
  buttons?: Array<{ id: string; title: string }> | undefined;
  listButtonLabel?: string | undefined;
  listItems?: Array<{ id: string; title: string; subtitle?: string }> | undefined;
};

export function WhatsAppPhoneSimulator({
  clinicName = "SmrkoMed Clinic",
  onSimulateStep,
}: {
  clinicName?: string;
  onSimulateStep?: (stepName: string) => void;
}) {
  const clinicDoctors = useDoctors();
  const realDoctors = useMemo(() => {
    const active = clinicDoctors.filter((d) => !d.isDraft && d.status === "active");
    return active.length > 0 ? active : clinicDoctors.filter((d) => !d.isDraft);
  }, [clinicDoctors]);

  const primaryDoctor = realDoctors[0];
  const primaryDoctorName = primaryDoctor ? displayNameOf(primaryDoctor) : "Dr. Ananya Rao";
  const primaryDoctorSpecialty = primaryDoctor?.primarySpecialty || primaryDoctor?.designation || "Senior Fertility Specialist";
  const primaryDoctorExp = primaryDoctor?.yearsExperience ? `${primaryDoctor.yearsExperience}+ years experience` : "14+ years experience";
  const primaryDoctorImage = primaryDoctor?.photoDataUrl || (primaryDoctor?.staffUserId || primaryDoctor?.id ? `/api/v1/public/doctors/${primaryDoctor.staffUserId || primaryDoctor.id}/photo` : undefined);

  const defaultMessages = useMemo<SimMessage[]>(() => {
    const degrees = primaryDoctor?.qualifications?.map((q) => q.degree).filter(Boolean).join(", ");
    const qualLine = degrees ? ` • ${degrees}` : " • MBBS, MD";
    return [
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
        imageUrl: primaryDoctorImage,
        text: `${primaryDoctorName}\n${primaryDoctorSpecialty}\n${primaryDoctorExp}${qualLine}`,
        footer: clinicName,
        buttons: [
          { id: `appt_doctor_${primaryDoctor?.id || "doc_1"}`, title: "📅 See Available Slots" },
          { id: `view_profile_${primaryDoctor?.id || "doc_1"}`, title: "👩‍⚕️ View Full Profile" },
        ],
      },
    ];
  }, [primaryDoctor, primaryDoctorName, primaryDoctorSpecialty, primaryDoctorExp, primaryDoctorImage, clinicName]);

  const [messages, setMessages] = useState<SimMessage[]>(defaultMessages);
  const [inputText, setInputText] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(primaryDoctorName);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [activeListItems, setActiveListItems] = useState<Array<{ id: string; title: string; subtitle?: string }>>([]);
  const [listModalTitle, setListModalTitle] = useState("Select an option");

  // Keep simulator in sync when clinic admin adds or updates a doctor
  useEffect(() => {
    if (primaryDoctor) {
      setSelectedDoctor(primaryDoctorName);
      setMessages(defaultMessages);
    }
  }, [defaultMessages, primaryDoctor, primaryDoctorName]);

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

    // Check if user selected or typed a doctor's name
    const matchedDoctor = realDoctors.find((d) => {
      const name = displayNameOf(d).toLowerCase();
      const first = (d.firstName || "").toLowerCase();
      const last = (d.lastName || "").toLowerCase();
      const cleanInput = lower.replace(/^dr\.?\s*/i, "").trim();
      return (
        lower.includes(name) ||
        (first && lower.includes(first)) ||
        (last && lower.includes(last)) ||
        (first && cleanInput.includes(first)) ||
        (last && cleanInput.includes(last)) ||
        input.includes(d.id)
      );
    });

    if (matchedDoctor && (lower.includes("dr") || lower.includes(matchedDoctor.firstName.toLowerCase()) || lower.includes("profile") || input.startsWith("btn_doc_"))) {
      const docName = displayNameOf(matchedDoctor);
      setSelectedDoctor(docName);
      const docImg = matchedDoctor.photoDataUrl || (matchedDoctor.staffUserId || matchedDoctor.id ? `/api/v1/public/doctors/${matchedDoctor.staffUserId || matchedDoctor.id}/photo` : undefined);
      const docSpec = matchedDoctor.primarySpecialty || matchedDoctor.designation || "Fertility Specialist";
      const docExp = matchedDoctor.yearsExperience ? `${matchedDoctor.yearsExperience}+ years experience` : "10+ years experience";
      const degrees = matchedDoctor.qualifications?.map((q) => q.degree).filter(Boolean).join(", ");
      const qualLine = degrees ? ` • ${degrees}` : "";

      onSimulateStep?.("SHOW_DOCTOR_PROFILE");
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "card",
          header: "Doctor Profile",
          imageUrl: docImg,
          text: `${docName}\n${docSpec}\n${docExp}${qualLine}`,
          footer: clinicName,
          buttons: [
            { id: `appt_doctor_${matchedDoctor.id}`, title: "📅 See Available Slots" },
            { id: "appt_other_doc", title: "👩‍⚕️ Other Doctors" },
          ],
        },
      ]);
      return;
    }

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
          text: `Available times for Monday, 7 Sep with ${selectedDoctor} ⏰\n\n☀️ Morning Slots:`,
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
      const docButtons = realDoctors.length > 0
        ? realDoctors.slice(0, 3).map((d) => ({
            id: `btn_doc_${d.id}`,
            title: displayNameOf(d),
          }))
        : [
            { id: "btn_doc_ananya", title: "Dr. Ananya Rao" },
            { id: "btn_doc_rahul", title: "Dr. Rahul Mehta" },
            { id: "btn_doc_priya", title: "Dr. Priya Nair" },
          ];

      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "buttons",
          text: "Let's find the right doctor for you 👩‍⚕️",
          buttons: docButtons,
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
    setMessages(defaultMessages);
    setSelectedDoctor(primaryDoctorName);
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

          {/* WhatsApp Header */}
          <div className="flex h-14 items-center justify-between border-b border-black/5 bg-[#f0f2f5] px-3 shadow-2xs dark:bg-[#202c33]">
            <div className="flex items-center gap-2">
              <ChevronLeft className="size-5 text-[#00a884] cursor-pointer" />
              <div className="relative flex size-9 items-center justify-center rounded-full bg-[#00a884] text-white font-bold text-xs shadow-xs">
                {clinicName.slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                  {clinicName}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Video className="size-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" />
              <Phone className="size-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white" />
              <RotateCcw
                className="size-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={resetSimulation}
              />
            </div>
          </div>

          {/* Chat Messages scroll area */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
            {/* Timestamp tag */}
            <div className="flex justify-center">
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-2xs dark:bg-[#182229] dark:text-slate-400">
                TODAY
              </span>
            </div>

            {messages.map((m) => {
              const isPatient = m.sender === "patient";
              return (
                <div key={m.id} className={cn("flex flex-col", isPatient ? "items-end" : "items-start")}>
                  {/* Card message with Image */}
                  {m.type === "card" ? (
                    <div className="max-w-[85%] overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1f2c34]">
                      {m.imageUrl ? (
                        <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.imageUrl} alt="Doctor" className="h-full w-full object-cover" />
                          <div className="absolute bottom-1 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                            Verified Doctor
                          </div>
                        </div>
                      ) : (
                        <div className="relative flex h-24 w-full items-center justify-center bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex flex-col items-center gap-1">
                            <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
                              <UserRound className="size-5 text-emerald-700 dark:text-emerald-300" />
                            </div>
                            <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-200">Verified Specialist</span>
                          </div>
                        </div>
                      )}
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
              <Send className="size-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
