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
  const [selectedDoctorId, setSelectedDoctorId] = useState(primaryDoctor?.id || "");
  const [selectedDateIso, setSelectedDateIso] = useState("");
  const [selectedDateLabel, setSelectedDateLabel] = useState("");
  const [selectedSlotTime, setSelectedSlotTime] = useState("10:00 AM");
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [activeListItems, setActiveListItems] = useState<Array<{ id: string; title: string; subtitle?: string }>>([]);
  const [listModalTitle, setListModalTitle] = useState("Select an option");

  function getUpcomingSimDates(count = 5) {
    const dates = [];
    const now = new Date();
    for (let i = 1; i <= count + 4; i++) {
      const d = new Date(now.getTime() + i * 86_400_000);
      if (d.getDay() === 0) continue; // Exclude Sundays
      const iso = d.toISOString().slice(0, 10);
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();
      dates.push({
        id: `appt_date_${iso}`,
        iso,
        title: `${weekday}, ${day} ${month} ${year}`,
        subtitle: "Open for consultations",
      });
      if (dates.length >= count) break;
    }
    return dates;
  }

  // Keep simulator in sync when clinic admin adds or updates a doctor
  useEffect(() => {
    if (primaryDoctor) {
      setSelectedDoctor(primaryDoctorName);
      setSelectedDoctorId(primaryDoctor.id);
      setMessages(defaultMessages);
    }
  }, [defaultMessages, primaryDoctor, primaryDoctorName]);

  function handleSendUserMessage(customText?: string, actionId?: string) {
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
      handleFlowResponse(text, actionId);
    }, 600);
  }

  function handleFlowResponse(input: string, actionId?: string) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const action = actionId || input;
    const lower = (actionId ? `${actionId} ${input}` : input).toLowerCase();

    // 1. Other Doctors or Browse Doctors
    if (action === "appt_other_doc" || lower.includes("other doctor") || lower.includes("all doctor") || lower.includes("choose doctor")) {
      const docItems = realDoctors.length > 0
        ? realDoctors.map((d) => ({
          id: `appt_doctor_${d.id}`,
          title: displayNameOf(d),
          subtitle: `${d.primarySpecialty || d.designation || "Fertility Specialist"}`,
        }))
        : [
          { id: "appt_doctor_doc_ananya", title: "Dr. Ananya Rao", subtitle: "Fertility Specialist" },
          { id: "appt_doctor_doc_rahul", title: "Dr. Rahul Mehta", subtitle: "IVF Specialist" },
          { id: "appt_doctor_doc_priya", title: "Dr. Priya Nair", subtitle: "Gynecologist" },
        ];

      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "list",
          text: `Here are our fertility specialists at ${clinicName}:`,
          listButtonLabel: "👩‍⚕️ Choose Doctor",
          listItems: docItems,
        },
      ]);
      return;
    }

    // 2. Change Time or Reschedule
    if (action === "appt_change" || action === "appt_reschedule" || lower.includes("reschedule") || lower.includes("change time") || lower.includes("change date")) {
      onSimulateStep?.("GET_AVAILABLE_DATES");
      const upcomingDates = getUpcomingSimDates(4);
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "list",
          text: `No problem! 📅 Please select a new date for your consultation with ${selectedDoctor}:`,
          listButtonLabel: "📅 Choose Date",
          listItems: upcomingDates,
        },
      ]);
      return;
    }

    // 3. Cancel Booking
    if (action === "appt_cancel" || action === "appt_cancel_btn" || lower.includes("cancel booking") || lower.includes("cancel appointment") || (lower.startsWith("cancel") && !lower.includes("don't"))) {
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "buttons",
          text: `Your appointment request has been cancelled. ❌\n\nIf you'd like to book a visit at any time, just tap below:`,
          buttons: [
            { id: "btn_book_appointment", title: "📅 Book New Visit" },
            { id: "btn_talk_to_team", title: "💬 Talk to Coordinator" },
          ],
        },
      ]);
      return;
    }

    // 4. Check if user selected or typed a doctor's name
    const matchedDoctor = realDoctors.find((d) => {
      const name = displayNameOf(d).toLowerCase();
      const first = (d.firstName || "").toLowerCase();
      const last = (d.lastName || "").toLowerCase();
      const cleanInput = input.replace(/^dr\.?\s*/i, "").trim().toLowerCase();
      return (
        lower.includes(name) ||
        (first && lower.includes(first)) ||
        (last && lower.includes(last)) ||
        (first && cleanInput.includes(first)) ||
        (last && cleanInput.includes(last)) ||
        action.includes(d.id)
      );
    });

    if (matchedDoctor && (lower.includes("dr") || lower.includes(matchedDoctor.firstName.toLowerCase()) || lower.includes("profile") || action.startsWith("btn_doc_"))) {
      const docName = displayNameOf(matchedDoctor);
      setSelectedDoctor(docName);
      setSelectedDoctorId(matchedDoctor.id);
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

    // 5. Doctor slots or book appointment action -> show available dates
    if (lower.includes("slot") || action.startsWith("appt_doctor_") || action === "btn_book_appointment") {
      onSimulateStep?.("GET_AVAILABLE_DATES");
      const upcomingDates = getUpcomingSimDates(4);
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "list",
          text: `Great choice! 📅 Here are the next available consultation dates for ${selectedDoctor}:`,
          listButtonLabel: "📅 Choose Date",
          listItems: upcomingDates,
        },
      ]);
      return;
    }

    // 6. Date selected -> show available times
    if (action.startsWith("appt_date_") || lower.includes("sep") || lower.includes("oct") || lower.includes("nov") || lower.includes("mon") || lower.includes("tue") || lower.includes("wed") || lower.includes("thu") || lower.includes("fri") || lower.includes("sat") || lower.includes("today") || lower.includes("tomorrow")) {
      onSimulateStep?.("GET_AVAILABLE_SLOTS");
      let iso = action.startsWith("appt_date_") ? action.replace("appt_date_", "") : "";
      if (!iso) {
        const tomorrow = new Date(Date.now() + 86_400_000);
        iso = tomorrow.toISOString().slice(0, 10);
      }
      setSelectedDateIso(iso);
      const displayDate = action.startsWith("appt_date_") ? input : new Date(iso).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
      setSelectedDateLabel(displayDate);

      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "buttons",
          text: `Available times for ${displayDate} with ${selectedDoctor} ⏰\n\n☀️ Morning & Afternoon Slots:`,
          buttons: [
            { id: "appt_slot_0930", title: "09:30 AM" },
            { id: "appt_slot_1000", title: "10:00 AM" },
            { id: "appt_slot_1130", title: "11:30 AM" },
            { id: "appt_slot_1430", title: "02:30 PM" },
          ],
        },
      ]);
      return;
    }

    // 7. Slot selected -> show booking summary
    if (action.startsWith("appt_slot_") || lower.includes("am") || lower.includes("pm") || /\b\d{1,2}:\d{2}\b/.test(lower)) {
      onSimulateStep?.("BOOKING_SUMMARY");
      const chosenTime = action.startsWith("appt_slot_") ? input : "10:00 AM";
      setSelectedSlotTime(chosenTime);
      const dateText = selectedDateLabel || "Tomorrow";

      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "summary",
          text: `Please confirm your appointment ✨\n\n👩‍⚕️ ${selectedDoctor}\nFertility Specialist\n\n📅 ${dateText}\n⏰ ${chosenTime}\n📍 ${clinicName}`,
          buttons: [
            { id: "appt_confirm", title: "Confirm Appointment ✅" },
            { id: "appt_change", title: "Change Time ⏰" },
            { id: "appt_cancel", title: "Cancel ❌" },
          ],
        },
      ]);
      return;
    }

    // 8. Confirmation -> persist real appointment
    if (action === "appt_confirm" || lower.includes("confirm") || lower === "yes" || lower === "1") {
      onSimulateStep?.("BOOK_APPOINTMENT");
      const dateText = selectedDateLabel || "Tomorrow";
      const timeText = selectedSlotTime || "10:00 AM";

      // Trigger actual persistence in database via real appointment booking API
      try {
        fetch("/api/ai/book-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorName: selectedDoctor,
            appointmentDate: selectedDateIso || "tomorrow",
            appointmentTime: timeText,
            appointmentType: "Fertility Consultation",
          }),
        }).catch(() => null);
      } catch { }

      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          sender: "clinic",
          time,
          type: "confirmation",
          text: `You're all set! 🎉\n\nYour appointment is confirmed and registered in our system.\n\n👩‍⚕️ ${selectedDoctor}\n📅 ${dateText}\n⏰ ${timeText}\n📍 ${clinicName}\n\nWe'll send you a WhatsApp reminder with preparation instructions before your consultation.`,
          buttons: [
            { id: "appt_reschedule", title: "Reschedule" },
            { id: "appt_cancel_btn", title: "Cancel Booking" },
          ],
        },
      ]);
      return;
    }

    // 9. Generic / Natural conversation fallback -> show doctor options
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

  function handleButtonClick(button: { id: string; title: string }) {
    handleSendUserMessage(button.title, button.id);
  }

  function openListSheet(label: string, items?: Array<{ id: string; title: string; subtitle?: string }>) {
    if (!items || items.length === 0) return;
    setListModalTitle(label);
    setActiveListItems(items);
    setIsListModalOpen(true);
  }

  function handleSelectListItem(item: { id: string; title: string }) {
    setIsListModalOpen(false);
    handleSendUserMessage(item.title, item.id);
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
