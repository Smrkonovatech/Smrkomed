"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegisteredPatientInfo } from "./qr-register-tile";

interface QrActionOptionsProps {
  patient: RegisteredPatientInfo;
  onReset?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function FormattedChatMessage({ content, isUser }: { content: string; isUser?: boolean }) {
  const lines = content.split("\n");

  const formatInline = (text: string) => {
    // Matches **bold** or ***bold***
    const parts = text.split(/(\*{2,3}[^*]+\*{2,3})/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\*{2,3}([^*]+)\*{2,3}$/);
      if (match) {
        return (
          <strong
            key={idx}
            className={`font-semibold ${isUser ? "text-primary-foreground font-bold" : "text-foreground"}`}
          >
            {match[1]}
          </strong>
        );
      }
      // Strip any stray asterisks
      return part.replace(/\*{2,3}/g, "");
    });
  };

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        // Bullet point
        if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletText = trimmed.replace(/^[•\-\*]\s*/, "");
          return (
            <div key={i} className="flex items-start gap-2 pl-0.5">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  isUser ? "bg-primary-foreground" : "bg-primary"
                }`}
              />
              <span className="leading-relaxed">{formatInline(bulletText)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-0.5">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isUser ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                }`}
              >
                {numMatch[1]}
              </span>
              <span className="leading-relaxed">{formatInline(numMatch[2] || "")}</span>
            </div>
          );
        }

        return (
          <p key={i} className="leading-relaxed">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function QrActionOptions({ patient, onReset }: QrActionOptionsProps) {
  const [activeModal, setActiveModal] = useState<"CALL" | "WHATSAPP" | "AI_CHAT" | null>(null);

  // Call modal state
  const [isSimulatingCall, setIsSimulatingCall] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("Ready to connect");

  // WhatsApp modal state
  const [waMessage, setWaMessage] = useState(
    `Hello Hospex Bangalore! I have just checked in at reception via QR Code. My name is ${patient.fullName} (Ref ID: ${patient.id.slice(0, 8)}). I am here for ${patient.purpose || "Consultation"}. Please guide me on next steps.`,
  );

  // AI Chatbot state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-welcome",
      role: "assistant",
      content: `Hello **${patient.fullName}**! Welcome to Hospex Bangalore Center (12 Lavelle Road).\n\nYour registration has been saved to our reception desk. I am **Smrko AI**, your clinical care concierge. Feel free to ask me about:\n• Consulting doctors and specialists\n• Current waiting times and lounge facilities\n• Documents to prepare for your consultation\n• 15-stage IVF and fertility care journey`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  // Handle Call Action
  const handleCallClick = () => {
    setActiveModal("CALL");
  };

  const handleSimulateCall = () => {
    setIsSimulatingCall(true);
    setCallStatus("Dialing Hospex Bangalore Reception (+91 80 4000 1200)...");

    setTimeout(() => {
      setCallStatus("Ringing Counter 2 (Ground Floor)...");
    }, 1200);

    setTimeout(() => {
      setCallStatus("Connected with Hospex Reception Coordinator Meera: 'Hello, welcome to Hospex Bangalore! We see your check-in for Dr. Manideep. Please take a seat in Lounge 1.'");
    }, 2800);
  };

  // Handle WhatsApp Action
  const handleWhatsAppClick = () => {
    setActiveModal("WHATSAPP");
  };

  const openExternalWhatsApp = () => {
    const phone = "918660717328";
    const encoded = encodeURIComponent(waMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  // Handle AI Chat Action
  const handleAiChatClick = () => {
    setActiveModal("AI_CHAT");
  };

  const sendAiMessage = async (customText?: string) => {
    const text = (customText || inputMessage).trim();
    if (!text || aiLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setAiLoading(true);

    try {
      const response = await fetch("/api/qr/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          patientName: patient.fullName,
        }),
      });

      const data = await response.json();

      if (data.success && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        throw new Error("Failed to receive reply");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `Thank you, ${patient.firstName}. Our Bangalore reception coordinator at Counter 2 has been notified and will assist you shortly in the lounge.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-foreground">
      {/* Registration Success Banner */}
      <div className="mb-6 overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-7 shadow-[var(--shadow-lift)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success border border-success/30 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success">
                  CHECK-IN CONFIRMED
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  REF #{patient.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                Welcome, {patient.fullName}
              </h2>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 text-primary" />
                Saved in {patient.clinicName} · {patient.clinicAddress}
              </p>
            </div>
          </div>

          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="self-start sm:self-auto gap-1 text-xs rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New Scan
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-bold text-foreground">
          Choose How You Would Like to Connect
        </h3>
        <p className="text-xs text-muted-foreground">
          Select any of the 3 services below to proceed with your Bangalore clinic visit.
        </p>
      </div>

      {/* 3 Core Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OPTION 1: CALL */}
        <div
          onClick={handleCallClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-lift)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <PhoneCall className="h-6 w-6" />
          </div>

          <h4 className="mt-4 text-base font-bold text-foreground group-hover:text-primary transition-colors">
            1. Call Reception
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Direct audio line to Counter 2 & Emergency Desk at Lavelle Road.
          </p>

          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
            <span>Tap to Call</span>
            <span className="font-mono text-[11px]">(+91 80 4000 1200)</span>
          </div>
        </div>

        {/* OPTION 2: CHAT IN WHATSAPP */}
        <div
          onClick={handleWhatsAppClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-success/60 hover:shadow-[var(--shadow-lift)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success group-hover:bg-success group-hover:text-white transition-colors">
            <MessageCircle className="h-6 w-6" />
          </div>

          <h4 className="mt-4 text-base font-bold text-foreground group-hover:text-success transition-colors">
            2. Chat in WhatsApp
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Instant WhatsApp concierge with your check-in token pre-filled.
          </p>

          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-success">
            <span>Open WhatsApp Chat</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>

        {/* OPTION 3: CHAT WITH SMRKO AI */}
        <div
          onClick={handleAiChatClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/30 via-card to-card p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-lift)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </div>

          <div className="mt-4 flex items-center gap-1.5">
            <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
              3. Chat with Smrko AI
            </h4>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              AI
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Interactive AI chatbot for instant doctor info, directions, and IVF guidance.
          </p>

          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
            <span>Launch Smrko AI Chat</span>
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* ===================== MODAL 1: CALL RECEPTION ===================== */}
      {activeModal === "CALL" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-lift)]">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Call Hospex Reception
                </h3>
                <p className="text-xs text-muted-foreground">Bangalore Center · Counter 2</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-primary/20 bg-primary-soft/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Front Desk Direct Line:
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    OPEN NOW
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-primary">
                  +91 80 4000 1200
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Hours: Mon–Sat · 08:00 AM – 08:00 PM
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <span className="text-xs font-semibold text-muted-foreground">
                  Emergency Medical Helpline:
                </span>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  +91 80 4000 1299
                </p>
              </div>
            </div>

            {/* Simulated Calling Feedback */}
            {isSimulatingCall && (
              <div className="mt-4 rounded-2xl bg-foreground p-3.5 text-background animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  <p className="text-xs font-medium">{callStatus}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <a
                href="tel:+918040001200"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-brand text-primary-foreground font-bold text-sm shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]"
              >
                <Phone className="h-4 w-4" />
                Open Phone Dialer (+91 80 4000 1200)
              </a>

              <Button
                variant="outline"
                onClick={handleSimulateCall}
                className="h-10 text-xs rounded-xl"
              >
                Simulate Call to Reception (In Browser)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: WHATSAPP CHAT ===================== */}
      {activeModal === "WHATSAPP" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-lift)]">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success border border-success/30">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  WhatsApp Care Concierge
                </h3>
                <p className="text-xs text-muted-foreground">Hospex Bangalore (+91 866 071 7328)</p>
              </div>
            </div>

            {/* Simulated WhatsApp Preview Box */}
            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Message Preview:</span>
                <span className="text-success font-bold">Bangalore Desk</span>
              </div>

              <div className="rounded-xl bg-card p-3.5 text-xs text-foreground shadow-sm border border-border">
                <p>{waMessage}</p>
                <div className="mt-2 text-right text-[10px] text-muted-foreground">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[11px] text-muted-foreground">Customize message if needed:</label>
                <Input
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={openExternalWhatsApp}
                className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold h-11 text-sm rounded-xl shadow-sm"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Launch Official WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: SMRKO AI CHATBOT ===================== */}
      {activeModal === "AI_CHAT" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex h-[620px] w-full max-w-xl flex-col rounded-[28px] border border-border bg-card shadow-[var(--shadow-lift)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-brand text-primary-foreground shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-foreground">
                      Smrko AI Assistant
                    </h3>
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Hospex Bangalore Concierge</p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Prompt Pills */}
            <div className="flex gap-2 overflow-x-auto border-b border-border bg-muted/20 px-6 py-2.5">
              {[
                "Where is the waiting lounge?",
                "Which doctor is consulting?",
                "How long is the wait time?",
                "What documents should I prepare?",
              ].map((pill, i) => (
                <button
                  key={i}
                  onClick={() => sendAiMessage(pill)}
                  className="shrink-0 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary-soft transition-colors"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "gradient-brand text-primary-foreground font-medium"
                        : "bg-primary-soft/50 text-foreground border border-primary/15"
                    }`}
                  >
                    <FormattedChatMessage content={m.content} isUser={m.role === "user"} />
                    <span
                      className={`mt-1.5 block text-[9px] ${
                        m.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Smrko AI is consulting Bangalore clinic records...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="border-t border-border p-4 bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendAiMessage();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask Smrko AI about doctors, IVF, directions..."
                  className="text-xs rounded-xl"
                  disabled={aiLoading}
                />
                <Button
                  type="submit"
                  disabled={aiLoading || !inputMessage.trim()}
                  className="h-9 px-3 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
