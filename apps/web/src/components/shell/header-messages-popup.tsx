"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  Search,
  Maximize2,
  Minimize2,
  MoreVertical,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Paperclip,
  Send,
  Download,
  Loader2,
  Bot,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";
import { clinicApi } from "@/lib/clinic-api";
import { toast } from "sonner";
import { MediaBubble } from "@/components/whatsapp/media-bubble";

export type ChatMessage = {
  id: string;
  sender: "patient" | "staff";
  senderName?: string | undefined;
  partnerRole?: "PRIMARY" | "PARTNER" | "STAFF" | undefined;
  isAi?: boolean | undefined;
  text?: string | undefined;
  time?: string | undefined;
  media?: any | undefined;
  attachment?: {
    type: "JPG" | "PDF" | "PNG" | "DOC";
    name: string;
    size: string;
    url?: string | undefined;
  } | undefined;
};

export type ActiveChat = {
  id: string;
  conversationId?: string | undefined;
  patientId?: string | undefined;
  coupleId?: string | undefined;
  recipientPhone?: string | undefined;
  isJointCouple?: boolean | undefined;
  name: string;
  avatar?: string | undefined;
  avatarBg?: string | undefined;
  roleSubtitle: string;
  isOnline?: boolean | undefined;
  minimized?: boolean | undefined;
  isExpanded?: boolean | undefined;
  messages: ChatMessage[];
  inputText: string;
  isTyping?: boolean | undefined;
  isLoading?: boolean | undefined;
  isUploading?: boolean | undefined;
  pendingAttachment?: {
    file: File;
    name: string;
    size: string;
    previewUrl?: string | undefined;
    isImage: boolean;
  } | null | undefined;
};

export type CouplePartnerChat = {
  id: string;
  conversationId?: string | undefined;
  patientId?: string | undefined;
  coupleId?: string | undefined;
  recipientPhone?: string | undefined;
  isJointCouple?: boolean | undefined;
  name: string;
  avatar?: string | undefined;
  avatarBg?: string | undefined;
  relation: string;
  lastMessage: string;
  time: string;
  unreadCount?: number | undefined;
  isOnline?: boolean | undefined;
  initialMessages?: ChatMessage[] | undefined;
};

export type ConversationItem = {
  id: string;
  conversationId?: string | undefined;
  name: string;
  avatar?: string | undefined;
  avatarBg?: string | undefined;
  isCouple?: boolean | undefined;
  couplePartners?: CouplePartnerChat[] | undefined;
  lastMessage: string;
  senderPrefix?: string | undefined;
  time: string;
  unreadCount?: number | undefined;
  isOnline?: boolean | undefined;
  statusIcon?: "double-check" | "none" | undefined;
  initialMessages?: ChatMessage[] | undefined;
};

function cleanPhone(p?: string | null): string {
  if (!p) return "";
  return p.replace(/\D/g, "").slice(-10);
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "Active";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Active";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "Active";
  }
}

function formatTimeOnly(iso?: string | null): string {
  if (!iso) return "Today";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Today";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Today";
  }
}

function mapBackendMedia(m: any) {
  const raw = m.media || m.whatsappMedia;
  if (!raw) return undefined;
  const id = raw.id || `media-${Math.random()}`;
  const rawType = String(raw.type || "").toUpperCase();
  const type =
    rawType === "IMAGE" || rawType === "DOCUMENT" || rawType === "AUDIO" || rawType === "VIDEO" || rawType === "STICKER"
      ? rawType
      : raw.mimeType?.startsWith("image/")
        ? "IMAGE"
        : raw.mimeType?.startsWith("video/")
          ? "VIDEO"
          : raw.mimeType?.startsWith("audio/")
            ? "AUDIO"
            : "DOCUMENT";
  const url = raw.url || `/api/v1/whatsapp-automation/inbox/media/${id}`;
  return {
    id,
    type,
    mimeType: raw.mimeType || (type === "IMAGE" ? "image/jpeg" : "application/pdf"),
    filename: raw.filename || (type === "IMAGE" ? "Photo.jpg" : "Document.pdf"),
    caption: raw.caption || null,
    sizeBytes: raw.sizeBytes ?? null,
    durationSeconds: raw.durationSeconds ?? null,
    isVoice: Boolean(raw.isVoice),
    status: raw.status || "READY",
    url,
    error: raw.error || null,
  };
}

function mapChatMessage(m: any): ChatMessage {
  const media = mapBackendMedia(m);
  const rawText = m.text || m.content || "";
  const isPlaceholder = /^(📷\s*Photo|📄\s*Document|📹\s*Video|🎤\s*Voice message|🎵\s*Audio message|Sticker|Image attachment|Document attachment)$/i.test(rawText.trim());
  const displayText = media && isPlaceholder ? "" : rawText;

  return {
    id: m.id || `msg-${Math.random()}`,
    sender: m.sender || (m.direction === "INBOUND" ? "patient" : "staff"),
    senderName: m.senderName,
    partnerRole: m.partnerRole,
    isAi: Boolean(m.isAi || m.senderType === "AI"),
    text: displayText,
    time: formatTimeOnly(m.createdAt),
    media,
    attachment: media
      ? {
          type: media.type === "IMAGE" ? "JPG" : "PDF",
          name: media.filename || (media.type === "IMAGE" ? "Photo.jpg" : "Document.pdf"),
          size: media.sizeBytes ? `${(media.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
          url: media.url,
        }
      : undefined,
  };
}

export function HeaderMessagesPopup() {
  const { couples } = useAppState();
  const [mounted, setMounted] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCouple, setSelectedCouple] = useState<ConversationItem | null>(null);
  const [openChats, setOpenChats] = useState<ActiveChat[]>([]);
  const [inboxRows, setInboxRows] = useState<any[]>([]);
  const chatBottomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chatContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTargetChatIdRef = useRef<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = fileTargetChatIdRef.current;
    if (!file || !targetId) return;

    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    setOpenChats((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              pendingAttachment: { file, name: file.name, size: sizeStr, previewUrl, isImage },
            }
          : c
      )
    );
    e.target.value = "";
  };

  const removePendingAttachment = (chatId: string) => {
    setOpenChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        if (c.pendingAttachment?.previewUrl) {
          URL.revokeObjectURL(c.pendingAttachment.previewUrl);
        }
        return { ...c, pendingAttachment: null };
      })
    );
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for global open-header-messages custom event
  useEffect(() => {
    const handleOpen = () => setMessagesOpen(true);
    window.addEventListener("open-header-messages", handleOpen);
    return () => window.removeEventListener("open-header-messages", handleOpen);
  }, []);

  // Fetch real inbox conversations
  const fetchInbox = useCallback(async () => {
    try {
      const rows = await clinicApi.whatsappInbox();
      if (Array.isArray(rows)) {
        setInboxRows(rows);
      }
    } catch {
      // Offline fallback: keep existing
    }
  }, []);

  useEffect(() => {
    void fetchInbox();
    const interval = setInterval(fetchInbox, 8000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  // When popover opens, refresh immediately
  useEffect(() => {
    if (messagesOpen) {
      void fetchInbox();
    }
  }, [messagesOpen, fetchInbox]);

  // Auto-scroll chat body on new messages
  const scrollToBottom = useCallback((chatId: string, smooth = false) => {
    const container = chatContainerRefs.current[chatId];
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    const el = chatBottomRefs.current[chatId];
    if (el) {
      el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }
  }, []);

  useEffect(() => {
    openChats.forEach((chat) => {
      scrollToBottom(chat.id, false);
      const timer = setTimeout(() => scrollToBottom(chat.id, true), 80);
      return () => clearTimeout(timer);
    });
  }, [openChats, scrollToBottom]);

  // Poll active chat messages from real backend
  useEffect(() => {
    if (openChats.length === 0) return;

    const pollChats = async () => {
      for (const chat of openChats) {
        if (chat.minimized) continue;
        if (chat.isJointCouple && chat.coupleId) {
          try {
            const jointData = await clinicApi.whatsappCoupleMessages(chat.coupleId);
            if (jointData && Array.isArray(jointData.messages)) {
              const mapped: ChatMessage[] = jointData.messages.map(mapChatMessage);
              setOpenChats((prev) =>
                prev.map((c) => {
                  if (c.id !== chat.id) return c;
                  if (
                    c.messages.length !== mapped.length ||
                    (mapped.length > 0 && c.messages[c.messages.length - 1]?.id !== mapped[mapped.length - 1]?.id)
                  ) {
                    return { ...c, messages: mapped, isLoading: false };
                  }
                  return c;
                })
              );
            }
          } catch {
            // Keep prior state
          }
        } else if (chat.conversationId) {
          try {
            const detail = await clinicApi.whatsappConversation(chat.conversationId);
            if (detail && Array.isArray(detail.messages)) {
              const mapped: ChatMessage[] = detail.messages.map(mapChatMessage);

              setOpenChats((prev) =>
                prev.map((c) => {
                  if (c.id !== chat.id) return c;
                  if (
                    c.messages.length !== mapped.length ||
                    (mapped.length > 0 && c.messages[c.messages.length - 1]?.id !== mapped[mapped.length - 1]?.id)
                  ) {
                    return { ...c, messages: mapped, isLoading: false };
                  }
                  return c;
                })
              );
            }
          } catch {
            // Keep prior state
          }
        }
      }
    };

    const interval = setInterval(pollChats, 3500);
    return () => clearInterval(interval);
  }, [openChats]);

  // Build real conversation list from couples + inbox rows
  const conversationList = useMemo<ConversationItem[]>(() => {
    const items: ConversationItem[] = [];
    const matchedConvIds = new Set<string>();

    // 1. Map Couples to 2-step Conversation Items
    if (couples && couples.length > 0) {
      for (const c of couples) {
        const pPhone = cleanPhone(c.primary?.phone);
        const partPhone = cleanPhone(c.partner?.phone);

        const primaryConv = inboxRows.find(
          (cv) =>
            (c.primary?.id && cv.patient?.id === c.primary.id) ||
            (cv.coupleId && cv.coupleId === c.id && cv.patient?.id === c.primary?.id) ||
            (pPhone &&
              (cleanPhone(cv.rawPhone) === pPhone ||
                cleanPhone(cv.contactPhone) === pPhone ||
                cleanPhone(cv.patient?.phone) === pPhone))
        );
        if (primaryConv) matchedConvIds.add(primaryConv.id);

        const partnerConv = inboxRows.find(
          (cv) =>
            (c.partner?.id && cv.patient?.id === c.partner.id) ||
            (cv.coupleId && cv.coupleId === c.id && cv.patient?.id === c.partner?.id) ||
            (partPhone &&
              (cleanPhone(cv.rawPhone) === partPhone ||
                cleanPhone(cv.contactPhone) === partPhone ||
                cleanPhone(cv.patient?.phone) === partPhone))
        );
        if (partnerConv) matchedConvIds.add(partnerConv.id);

        const primaryLast = primaryConv?.lastMessage?.preview || primaryConv?.lastMessage?.content || "";
        const partnerLast = partnerConv?.lastMessage?.preview || partnerConv?.lastMessage?.content || "";

        // Partner sub-chats for Step 2
        const partnerChats: CouplePartnerChat[] = [
          {
            id: `partner-primary-${c.id}`,
            conversationId: primaryConv?.id,
            patientId: c.primary?.id,
            coupleId: c.id,
            recipientPhone: c.primary?.phone,
            name: c.primary?.name || "Primary Patient",
            relation: "Primary Patient",
            avatarBg: "#866BE3",
            time: formatRelativeTime(primaryConv?.lastMessage?.createdAt || primaryConv?.updatedAt),
            lastMessage: primaryLast || "Ready for consultation and treatment updates.",
            unreadCount: primaryConv?.unreadCount || undefined,
            isOnline: true,
            initialMessages: primaryLast
              ? [
                  {
                    id: "m-p-1",
                    sender: primaryConv?.lastMessage?.direction === "INBOUND" ? "patient" : "staff",
                    text: primaryLast,
                    time: formatTimeOnly(primaryConv?.lastMessage?.createdAt),
                  },
                ]
              : undefined,
          },
        ];

        if (c.partner && c.partner.name) {
          partnerChats.push({
            id: `partner-spouse-${c.id}`,
            conversationId: partnerConv?.id,
            patientId: c.partner.id,
            coupleId: c.id,
            recipientPhone: c.partner.phone,
            name: c.partner.name,
            relation: "Partner · Spouse",
            avatarBg: "#E85D5D",
            time: formatRelativeTime(partnerConv?.lastMessage?.createdAt || partnerConv?.updatedAt),
            lastMessage: partnerLast || "Partner care notifications & updates.",
            unreadCount: partnerConv?.unreadCount || undefined,
            isOnline: true,
            initialMessages: partnerLast
              ? [
                  {
                    id: "m-s-1",
                    sender: partnerConv?.lastMessage?.direction === "INBOUND" ? "patient" : "staff",
                    text: partnerLast,
                    time: formatTimeOnly(partnerConv?.lastMessage?.createdAt),
                  },
                ]
              : undefined,
          });
        }

        // Joint care thread: Broadcasts to BOTH partners on WhatsApp
        partnerChats.push({
          id: `partner-joint-${c.id}`,
          isJointCouple: true,
          coupleId: c.id,
          name: `${c.primary?.name || "Primary"} & ${c.partner?.name ? c.partner.name.split(" ")[0] : "Partner"} (Joint Thread)`,
          relation: "Both Partners · Care Loop",
          avatarBg: "#00A89D",
          time: formatRelativeTime(primaryConv?.lastMessage?.createdAt || c.since),
          lastMessage: `${c.treatment || "IVF"} Journey · ${c.stage || "Active Stage"}`,
          isOnline: true,
          initialMessages: [
            {
              id: "mj-1",
              sender: "staff",
              senderName: "Staff",
              partnerRole: "STAFF",
              text: `Joint care thread active for ${c.primary?.name} & ${c.partner?.name || "Partner"}. Broadcasts to both numbers.`,
              time: "Today",
            },
          ],
        });

        // Determine most recent message for the couple card
        let coupleLastMsg = `${c.treatment || "IVF"} Care Journey`;
        let coupleTime = c.since || "Active";
        if (primaryLast) {
          coupleLastMsg = primaryLast;
          coupleTime = formatRelativeTime(primaryConv?.lastMessage?.createdAt);
        } else if (partnerLast) {
          coupleLastMsg = partnerLast;
          coupleTime = formatRelativeTime(partnerConv?.lastMessage?.createdAt);
        }

        const totalCoupleUnread = (primaryConv?.unreadCount || 0) + (partnerConv?.unreadCount || 0);

        items.push({
          id: `couple-${c.id}`,
          name: `${c.primary?.name || "Patient"} & ${c.partner?.name ? c.partner.name.split(" ")[0] : "Partner"}`,
          isCouple: true,
          couplePartners: partnerChats,
          lastMessage: coupleLastMsg,
          time: coupleTime,
          unreadCount: totalCoupleUnread > 0 ? totalCoupleUnread : undefined,
          isOnline: true,
          statusIcon: "double-check",
        });
      }
    }

    // 2. Add any standalone conversations from inbox not linked to couples
    for (const cv of inboxRows) {
      if (matchedConvIds.has(cv.id)) continue;
      const ptName = cv.patient
        ? `${cv.patient.firstName || ""} ${cv.patient.lastName || ""}`.trim()
        : cv.contactPhone || "Patient";
      const lastMsg = cv.lastMessage?.preview || cv.lastMessage?.content || "Conversation open";

      items.push({
        id: `conv-${cv.id}`,
        conversationId: cv.id,
        name: ptName,
        avatarBg: "#866BE3",
        lastMessage: lastMsg,
        time: formatRelativeTime(cv.lastMessage?.createdAt || cv.updatedAt),
        unreadCount: cv.unreadCount > 0 ? cv.unreadCount : undefined,
        isOnline: true,
        statusIcon: "double-check",
      });
    }

    return items;
  }, [couples, inboxRows]);

  // Compute total unread count for badge
  const totalUnread = useMemo(() => {
    let sum = 0;
    for (const item of conversationList) {
      if (item.unreadCount) sum += item.unreadCount;
    }
    // Also include raw inboxRows unread
    for (const r of inboxRows) {
      if (r.unreadCount && typeof r.unreadCount === "number") {
        sum = Math.max(sum, r.unreadCount);
      }
    }
    return sum;
  }, [conversationList, inboxRows]);

  const openOrFocusChat = async (chatData: {
    id: string;
    conversationId?: string | undefined;
    patientId?: string | undefined;
    coupleId?: string | undefined;
    recipientPhone?: string | undefined;
    isJointCouple?: boolean | undefined;
    name: string;
    avatar?: string | undefined;
    avatarBg?: string | undefined;
    roleSubtitle?: string | undefined;
    isOnline?: boolean | undefined;
    initialMessages?: ChatMessage[] | undefined;
  }) => {
    // If chat already open, un-minimize and focus
    const existing = openChats.find((c) => c.id === chatData.id);
    if (existing) {
      setOpenChats((prev) =>
        prev.map((c) => (c.id === chatData.id ? { ...c, minimized: false } : c))
      );
      return;
    }

    // New chat placeholder
    const newChat: ActiveChat = {
      id: chatData.id,
      conversationId: chatData.conversationId,
      patientId: chatData.patientId,
      coupleId: chatData.coupleId,
      recipientPhone: chatData.recipientPhone,
      isJointCouple: chatData.isJointCouple,
      name: chatData.name,
      avatar: chatData.avatar,
      avatarBg: chatData.avatarBg,
      roleSubtitle: chatData.roleSubtitle || (chatData.isJointCouple ? "Joint Thread · Both Partners" : "Active on WhatsApp"),
      isOnline: chatData.isOnline ?? true,
      minimized: false,
      isExpanded: false,
      inputText: "",
      isLoading: Boolean(chatData.conversationId || chatData.isJointCouple),
      messages:
        chatData.initialMessages && chatData.initialMessages.length > 0
          ? [...chatData.initialMessages]
          : [],
    };

    setOpenChats((prev) => {
      if (prev.length >= 3) {
        return [...prev.slice(1), newChat];
      }
      return [...prev, newChat];
    });

    // If Joint Couple Thread, load combined message history
    if (chatData.isJointCouple && chatData.coupleId) {
      try {
        const jointData = await clinicApi.whatsappCoupleMessages(chatData.coupleId);
        if (jointData && Array.isArray(jointData.messages)) {
          const mapped: ChatMessage[] = jointData.messages.map(mapChatMessage);

          setOpenChats((prev) =>
            prev.map((c) =>
              c.id === chatData.id
                ? {
                    ...c,
                    isLoading: false,
                    messages: mapped.length > 0 ? mapped : c.messages,
                  }
                : c
            )
          );
        }
      } catch (err) {
        console.warn("Could not load joint couple messages:", err);
        setOpenChats((prev) =>
          prev.map((c) => (c.id === chatData.id ? { ...c, isLoading: false } : c))
        );
      }
      return;
    }

    // If real conversationId, load full message history from backend
    if (chatData.conversationId) {
      try {
        const detail = await clinicApi.whatsappConversation(chatData.conversationId);
        if (detail && Array.isArray(detail.messages)) {
          const mapped: ChatMessage[] = detail.messages.map(mapChatMessage);

          setOpenChats((prev) =>
            prev.map((c) =>
              c.id === chatData.id
                ? {
                    ...c,
                    isLoading: false,
                    messages: mapped.length > 0 ? mapped : c.messages,
                  }
                : c
            )
          );
        }
      } catch (err) {
        console.warn("Could not load real messages:", err);
        setOpenChats((prev) =>
          prev.map((c) => (c.id === chatData.id ? { ...c, isLoading: false } : c))
        );
      }
    }
  };

  const closeChat = (id: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleMinimize = (id: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, minimized: !c.minimized } : c))
    );
  };

  const toggleExpand = (id: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isExpanded: !c.isExpanded } : c))
    );
  };

  const updateInputText = (id: string, text: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, inputText: text } : c))
    );
  };

  const sendMessage = async (id: string) => {
    const chat = openChats.find((c) => c.id === id);
    if (!chat || chat.isUploading) return;

    const messageText = chat.inputText.trim();
    const pendingFile = chat.pendingAttachment;

    if (!messageText && !pendingFile) return;

    // Handle Media Attachment Send
    if (pendingFile) {
      setOpenChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isUploading: true } : c))
      );

      const formData = new FormData();
      formData.append("file", pendingFile.file);
      if (messageText) {
        formData.append("caption", messageText);
      }
      formData.append("kind", pendingFile.isImage ? "IMAGE" : "DOCUMENT");

      const optimisticMediaId = `opt-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: "staff",
        senderName: "Staff",
        partnerRole: "STAFF",
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        media: {
          id: optimisticMediaId,
          type: pendingFile.isImage ? "IMAGE" : "DOCUMENT",
          mimeType: pendingFile.file.type,
          filename: pendingFile.name,
          caption: messageText || null,
          sizeBytes: pendingFile.file.size,
          durationSeconds: null,
          isVoice: false,
          status: "READY",
          url: pendingFile.previewUrl,
        },
      };

      setOpenChats((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                inputText: "",
                pendingAttachment: null,
                messages: [...c.messages, optimisticMsg],
              }
            : c
        )
      );

      try {
        if (chat.isJointCouple && chat.coupleId) {
          await clinicApi.sendWhatsappCoupleMedia(chat.coupleId, formData);
          toast.success("Attachment dispatched to both partners on WhatsApp");
          setTimeout(async () => {
            try {
              const jointData = await clinicApi.whatsappCoupleMessages(chat.coupleId!);
              if (jointData && Array.isArray(jointData.messages)) {
                const mapped: ChatMessage[] = jointData.messages.map(mapChatMessage);
                setOpenChats((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, isUploading: false, messages: mapped } : c))
                );
              }
            } catch {
              setOpenChats((prev) =>
                prev.map((c) => (c.id === id ? { ...c, isUploading: false } : c))
              );
            }
          }, 1000);
        } else if (chat.conversationId) {
          await clinicApi.sendWhatsappMedia(chat.conversationId, formData);
          toast.success("Attachment dispatched on WhatsApp");
          setTimeout(async () => {
            try {
              const detail = await clinicApi.whatsappConversation(chat.conversationId!);
              if (detail && Array.isArray(detail.messages)) {
                const mapped: ChatMessage[] = detail.messages.map(mapChatMessage);
                setOpenChats((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, isUploading: false, messages: mapped } : c))
                );
              }
            } catch {
              setOpenChats((prev) =>
                prev.map((c) => (c.id === id ? { ...c, isUploading: false } : c))
              );
            }
          }, 1000);
        } else {
          const res = await clinicApi.sendWhatsappToRecipient({
            patientId: chat.patientId,
            coupleId: chat.coupleId,
            phone: chat.recipientPhone,
            body: messageText || "Sent an attachment",
          });
          if (res?.conversationId) {
            await clinicApi.sendWhatsappMedia(res.conversationId, formData);
            toast.success("Attachment dispatched on WhatsApp");
            setOpenChats((prev) =>
              prev.map((c) => (c.id === id ? { ...c, conversationId: res.conversationId, isUploading: false } : c))
            );
          } else {
            setOpenChats((prev) =>
              prev.map((c) => (c.id === id ? { ...c, isUploading: false } : c))
            );
          }
        }
      } catch (err) {
        console.error("Failed to send WhatsApp media:", err);
        toast.error("Could not send attachment over WhatsApp");
        setOpenChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isUploading: false } : c))
        );
      }
      return;
    }

    // Standard Text Message Send
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "staff",
      senderName: "Staff",
      partnerRole: "STAFF",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Optimistic UI update
    setOpenChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              inputText: "",
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    // Case 1: Joint Couple Thread -> Dispatches to BOTH primary and partner mobile numbers
    if (chat.isJointCouple && chat.coupleId) {
      try {
        const res = await clinicApi.sendWhatsappCoupleMessage(chat.coupleId, messageText);
        toast.success(`Dispatched to both partners (${res?.sentCount ?? 2} recipients)`);
        setTimeout(async () => {
          try {
            const jointData = await clinicApi.whatsappCoupleMessages(chat.coupleId!);
            if (jointData && Array.isArray(jointData.messages)) {
              const mapped: ChatMessage[] = jointData.messages.map(mapChatMessage);
              setOpenChats((prev) =>
                prev.map((c) => (c.id === id ? { ...c, messages: mapped } : c))
              );
            }
          } catch {
            // Keep optimistic
          }
        }, 800);
      } catch (err) {
        console.error("Failed to send joint couple message:", err);
        toast.error("Could not broadcast to couple. Queued for delivery.");
      }
      return;
    }

    // Case 2: Chat has existing conversationId
    if (chat.conversationId) {
      try {
        await clinicApi.sendWhatsappMessage(chat.conversationId, messageText);
        toast.success("WhatsApp message dispatched");
        setTimeout(async () => {
          try {
            const detail = await clinicApi.whatsappConversation(chat.conversationId!);
            if (detail && Array.isArray(detail.messages)) {
              const mapped: ChatMessage[] = detail.messages.map(mapChatMessage);
              setOpenChats((prev) =>
                prev.map((c) => (c.id === id ? { ...c, messages: mapped } : c))
              );
            }
          } catch {
            // Keep optimistic
          }
        }, 800);
      } catch (err) {
        console.error("Failed to send WhatsApp message via API:", err);
        toast.error("Message queued for delivery");
      }
      return;
    }

    // Case 3: Chat does not have conversationId yet -> resolve/create conversation directly!
    try {
      const res = await clinicApi.sendWhatsappToRecipient({
        patientId: chat.patientId,
        coupleId: chat.coupleId,
        phone: chat.recipientPhone,
        body: messageText,
      });
      if (res?.conversationId) {
        setOpenChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, conversationId: res.conversationId } : c))
        );
      }
      toast.success("WhatsApp message dispatched");
    } catch (err) {
      console.error("Failed to send via sendWhatsappToRecipient:", err);
      toast.error("Failed to dispatch WhatsApp message.");
    }
  };

  // Filter conversations for Step 1
  const filteredConversations = conversationList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  // Filter partner chats for Step 2
  const filteredPartners = selectedCouple?.couplePartners?.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.relation.toLowerCase().includes(q) ||
      p.lastMessage.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <>
      {/* 1. Header Trigger Button */}
      <Popover
        open={messagesOpen}
        onOpenChange={(open) => {
          setMessagesOpen(open);
          if (!open) {
            setSelectedCouple(null);
            setSearchQuery("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open messages"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <MessageSquare className="size-[18px] text-[#866BE3]" />
            {totalUnread > 0 ? (
              <span className="absolute top-0 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F67575] text-[9px] font-bold text-white border-2 border-white shadow-sm">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            ) : (
              <span className="absolute top-0 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#866BE3] text-[9px] font-bold text-white border-2 border-white shadow-sm">
                {conversationList.length > 0 ? conversationList.length : 1}
              </span>
            )}
          </button>
        </PopoverTrigger>

        {/* 2. Messages Popover (Step 1 & Step 2) */}
        <PopoverContent
          align="end"
          className="w-[340px] rounded-2xl p-0 shadow-[0_10px_40px_rgb(0,0,0,0.12)] border-border/40 overflow-hidden mr-4 mt-2 bg-white z-50"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              {selectedCouple && (
                <button
                  type="button"
                  onClick={() => setSelectedCouple(null)}
                  className="p-1 -ml-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                  title="Back to all messages"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}
              <div>
                <h3 className="font-bold text-gray-900 text-[17px] leading-tight">
                  {selectedCouple ? selectedCouple.name : "Messages"}
                </h3>
                {selectedCouple && (
                  <p className="text-[11px] text-gray-400 font-medium">Couple · Select chat</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                WhatsApp
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder={selectedCouple ? "Search partner chats..." : "Search patients, couples..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border-gray-200 pl-9 text-sm bg-white focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {/* Popover Body List */}
          <div className="max-h-[400px] overflow-y-auto pb-2 divide-y divide-gray-100">
            {/* STEP 2: Couple Partner Chats View */}
            {selectedCouple ? (
              filteredPartners.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  No chats match your search.
                </div>
              ) : (
                filteredPartners.map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => {
                      setMessagesOpen(false);
                      void openOrFocusChat({
                        id: partner.id,
                        conversationId: partner.conversationId,
                        patientId: partner.patientId,
                        coupleId: partner.coupleId,
                        recipientPhone: partner.recipientPhone,
                        isJointCouple: partner.isJointCouple,
                        name: partner.name,
                        avatar: partner.avatar,
                        avatarBg: partner.avatarBg,
                        roleSubtitle: partner.relation,
                        isOnline: partner.isOnline,
                        initialMessages: partner.initialMessages,
                      });
                    }}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="relative shrink-0">
                      <div
                        className="size-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: partner.avatarBg || "#866BE3" }}
                      >
                        {partner.name.slice(0, 1)}
                      </div>
                      {partner.isOnline && (
                        <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#22C55E] border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-sm text-gray-800 truncate">{partner.name}</span>
                        <span className="text-[11px] text-gray-400 shrink-0">{partner.time}</span>
                      </div>
                      <p className="text-[11px] text-[#866BE3] font-medium truncate mb-0.5">
                        {partner.relation}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] text-gray-500 truncate">{partner.lastMessage}</p>
                        {partner.unreadCount ? (
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#866BE3] text-[9px] font-bold text-white">
                            {partner.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* STEP 1: All Conversations View */
              filteredConversations.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  No conversations found in clinic.
                </div>
              ) : (
                filteredConversations.map((item) => {
                  if (item.isCouple) {
                    const names = item.name.split("&").map((n) => n.trim());
                    const init1 = names[0]?.[0] || "P";
                    const init2 = names[1]?.[0] || "P";

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedCouple(item);
                          setSearchQuery("");
                        }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                      >
                        {/* Dual Avatar */}
                        <div className="relative shrink-0 flex -space-x-5">
                          <div className="size-11 rounded-full bg-[#866BE3] border-[3px] border-white relative z-10 flex items-center justify-center text-white text-[12px] font-bold shadow-sm">
                            {init1}
                          </div>
                          <div className="size-11 rounded-full bg-[#E85D5D] flex items-center justify-center text-white text-[12px] font-bold shadow-sm">
                            {init2}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-sm text-gray-800 truncate">{item.name}</span>
                            <span className="text-[11px] text-gray-400 shrink-0">{item.time}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] text-gray-500 truncate">
                              {item.lastMessage}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.unreadCount ? (
                                <span className="flex size-4 items-center justify-center rounded-full bg-[#F67575] text-[9px] font-bold text-white">
                                  {item.unreadCount}
                                </span>
                              ) : null}
                              <ChevronRight className="size-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Single patient item
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setMessagesOpen(false);
                        void openOrFocusChat({
                          id: item.id,
                          conversationId: item.conversationId,
                          name: item.name,
                          avatar: item.avatar,
                          avatarBg: item.avatarBg,
                          roleSubtitle: "Patient · WhatsApp",
                          isOnline: item.isOnline,
                          initialMessages: item.initialMessages,
                        });
                      }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        item.unreadCount ? "bg-[#F8F7FC]" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="size-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                          style={{ backgroundColor: item.avatarBg || "#866BE3" }}
                        >
                          {item.name.slice(0, 1)}
                        </div>
                        {item.isOnline && (
                          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#22C55E] border-2 border-white"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-sm text-gray-800 truncate">{item.name}</span>
                          <span className="text-[11px] text-gray-400 shrink-0">{item.time}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] text-gray-500 truncate flex items-center gap-1">
                            {item.statusIcon === "double-check" && (
                              <CheckCheck className="size-3.5 text-[#4B83D8] shrink-0" />
                            )}
                            {item.lastMessage}
                          </p>
                          {item.unreadCount ? (
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#866BE3] text-[9px] font-bold text-white">
                              {item.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* 3. Docked Floating Chat Popups (Rendered via portal to document.body to escape header backdrop-blur stacking context) */}
      {mounted && openChats.length > 0 && typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-20 right-6 flex items-end gap-4 z-[9999] pointer-events-none max-w-[calc(100vw-3rem)] overflow-x-auto pb-1">
          {openChats.map((chat) => {
            const isMin = Boolean(chat.minimized);
            const isExp = Boolean(chat.isExpanded);

            return (
              <div
                key={chat.id}
                className={`pointer-events-auto bg-white rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.22)] border border-gray-200 overflow-hidden flex flex-col transition-all duration-200 ${
                  isExp ? "w-[400px] h-[540px] max-h-[calc(100vh-140px)]" : "w-[340px] h-[460px] max-h-[calc(100vh-140px)]"
                } ${isMin ? "!h-[58px]" : ""}`}
              >
                {/* Chat Window Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => toggleMinimize(chat.id)}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="size-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                        style={{ backgroundColor: chat.avatarBg || "#866BE3" }}
                      >
                        {chat.name.slice(0, 1)}
                      </div>
                      {chat.isOnline && (
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#22C55E] border border-white"></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-800 leading-tight truncate">{chat.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate">{chat.roleSubtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-400">
                    <button
                      type="button"
                      onClick={() => toggleExpand(chat.id)}
                      className="p-1 hover:text-gray-800 transition-colors"
                      title={isExp ? "Restore size" : "Expand window"}
                    >
                      {isExp ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeChat(chat.id)}
                      className="p-1 hover:text-gray-800 transition-colors"
                      title="Close chat"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Chat Window Body */}
                {!isMin && (
                  <>
                    {chat.isJointCouple && (
                      <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-1.5 shrink-0">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span><strong className="font-semibold">Joint Thread:</strong> Dispatches simultaneously to both partner phone numbers.</span>
                      </div>
                    )}

                    <div
                      ref={(el) => {
                        chatContainerRefs.current[chat.id] = el;
                      }}
                      className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#F8F7FC]"
                    >
                      {/* Loading state */}
                      {chat.isLoading && (
                        <div className="flex items-center justify-center py-6 text-gray-400 gap-2 text-xs">
                          <Loader2 className="size-4 animate-spin text-[#866BE3]" />
                          <span>Loading messages...</span>
                        </div>
                      )}

                      {/* Empty state */}
                      {!chat.isLoading && chat.messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 gap-1.5">
                          <MessageSquare className="size-8 text-gray-300" />
                          <p className="text-xs font-medium">No messages yet.</p>
                          <p className="text-[11px] text-gray-400">Send a WhatsApp message below.</p>
                        </div>
                      )}

                      {/* Messages Flow */}
                      {chat.messages.map((m) => {
                        const isStaff = m.sender === "staff";

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                          >
                            {m.isAi && (
                              <span className="flex items-center gap-1 text-[9px] text-purple-600 font-medium mb-1 px-1">
                                <Bot className="size-3" /> AI Automation
                              </span>
                            )}
                            {!isStaff && (m.senderName || m.partnerRole) && (
                              <span className="text-[10px] font-semibold text-gray-500 mb-1 px-1 flex items-center gap-1">
                                <span className={`size-1.5 rounded-full ${m.partnerRole === "PARTNER" ? "bg-[#E85D5D]" : "bg-[#866BE3]"}`} />
                                {m.senderName || (m.partnerRole === "PARTNER" ? "Partner" : "Primary Patient")}
                              </span>
                            )}

                            {/* Media Attachment View */}
                            {m.media ? (
                              <div className="max-w-[85%] my-0.5">
                                <MediaBubble media={m.media} isOutbound={isStaff} />
                              </div>
                            ) : m.attachment ? (
                              <div
                                className={`bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3 shadow-sm w-[230px] flex items-center gap-3 ${
                                  isStaff ? "self-end rounded-tl-2xl rounded-tr-sm" : "self-start"
                                }`}
                              >
                                <div
                                  className={`size-10 rounded-lg flex flex-col items-center justify-center font-bold text-[10px] shrink-0 ${
                                    m.attachment.type === "PDF" || m.attachment.type === "DOC"
                                      ? "bg-[#FCE8E6] text-[#D93025]"
                                      : "bg-[#E6F4EA] text-[#1E8E3E]"
                                  }`}
                                >
                                  {m.attachment.type}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                                    {m.attachment.name}
                                  </p>
                                  <p className="text-[11px] text-gray-400">{m.attachment.size}</p>
                                </div>
                                {m.attachment.url ? (
                                  <a
                                    href={m.attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={m.attachment.name}
                                    className="size-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-[#866BE3] transition-colors shrink-0"
                                  >
                                    <Download className="size-4" />
                                  </a>
                                ) : (
                                  <Download className="size-4 text-[#866BE3] cursor-pointer hover:opacity-80 transition-opacity shrink-0" />
                                )}
                              </div>
                            ) : null}

                            {/* Text message bubble */}
                            {m.text && m.text.trim() ? (
                              <div
                                className={`p-3 text-[13px] leading-relaxed shadow-sm max-w-[85%] ${
                                  isStaff
                                    ? "bg-[#866BE3] text-white rounded-2xl rounded-tr-sm mt-0.5"
                                    : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm mt-0.5"
                                }`}
                              >
                                {m.text}
                              </div>
                            ) : null}

                            {m.time && (
                              <span className="text-[9px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                                {m.time}
                                {isStaff && <CheckCheck className="size-3 text-gray-400" />}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      <div ref={(el) => { chatBottomRefs.current[chat.id] = el; }} />
                    </div>

                    {/* Chat Composer Bar */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void sendMessage(chat.id);
                      }}
                      className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2 shrink-0"
                    >
                      {/* Pending Attachment Preview Chip */}
                      {chat.pendingAttachment && (
                        <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in">
                          <div className="flex items-center gap-2 min-w-0">
                            {chat.pendingAttachment.isImage && chat.pendingAttachment.previewUrl ? (
                              <img
                                src={chat.pendingAttachment.previewUrl}
                                alt="Preview"
                                className="size-9 rounded-lg object-cover border border-purple-200 shrink-0"
                              />
                            ) : (
                              <div className="size-9 rounded-lg bg-[#866BE3]/15 text-[#866BE3] flex items-center justify-center font-bold text-[10px] shrink-0">
                                {chat.pendingAttachment.isImage ? "IMG" : "DOC"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[200px]">
                                {chat.pendingAttachment.name}
                              </p>
                              <p className="text-[10px] text-gray-400">{chat.pendingAttachment.size}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingAttachment(chat.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Remove attachment"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Input
                            placeholder={
                              chat.pendingAttachment
                                ? "Add a caption (optional)..."
                                : chat.isJointCouple
                                  ? "Broadcast to both partners on WhatsApp..."
                                  : "Send WhatsApp message..."
                            }
                            value={chat.inputText}
                            onChange={(e) => updateInputText(chat.id, e.target.value)}
                            disabled={chat.isUploading}
                            className="h-10 w-full rounded-xl border-gray-200 pr-10 text-sm focus-visible:ring-1 focus-visible:ring-[#866BE3]/30"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              fileTargetChatIdRef.current = chat.id;
                              fileInputRef.current?.click();
                            }}
                            disabled={chat.isUploading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#866BE3] transition-colors"
                            title="Attach document or photo"
                          >
                            <Paperclip className="size-4" />
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={chat.isUploading || (!chat.inputText.trim() && !chat.pendingAttachment)}
                          className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            chat.isUploading
                              ? "bg-[#866BE3]/70 text-white cursor-wait"
                              : chat.inputText.trim() || chat.pendingAttachment
                                ? "bg-[#866BE3] hover:bg-[#7254d1] text-white shadow-sm"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {chat.isUploading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4 ml-0.5" />
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {/* Hidden file input for document and image uploads from chat */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileSelect}
      />
    </>
  );
}
