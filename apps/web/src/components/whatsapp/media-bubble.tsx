"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  X,
  Maximize2,
  HelpCircle,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceMessagePlayer } from "./voice-message-player";

export interface MediaBubbleProps {
  media: {
    id: string;
    type: "AUDIO" | "IMAGE" | "VIDEO" | "DOCUMENT" | "STICKER" | "OTHER";
    mimeType: string;
    filename?: string | null;
    caption?: string | null;
    sizeBytes?: number | null;
    durationSeconds?: number | null;
    isVoice?: boolean;
    status: "PENDING" | "DOWNLOADING" | "READY" | "FAILED" | "EXPIRED";
    url?: string;
    error?: string | null;
  };
  isOutbound?: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MediaBubble({ media, isOutbound = false }: MediaBubbleProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  // Close lightbox on Escape
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  // 1. Audio / Voice Note
  if (media.type === "AUDIO") {
    return (
      <div className="flex flex-col gap-1">
        <VoiceMessagePlayer
          url={media.url}
          status={media.status}
          durationSeconds={media.durationSeconds}
          isVoice={media.isVoice ?? true}
          isOutbound={isOutbound}
        />
        {media.caption && (
          <p className={cn("text-xs px-1", isOutbound ? "text-primary-foreground/90" : "text-foreground")}>
            {media.caption}
          </p>
        )}
      </div>
    );
  }

  // 2. Image Message
  if (media.type === "IMAGE") {
    if (media.status === "PENDING" || media.status === "DOWNLOADING") {
      return (
        <div className="flex flex-col items-center justify-center w-64 h-48 rounded-2xl bg-muted/40 border border-border/40 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-medium">Downloading photo...</span>
        </div>
      );
    }

    if (media.status === "FAILED" || hasImageError) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Image unavailable</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 max-w-sm">
        <div
          onClick={() => setIsLightboxOpen(true)}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted/20 transition-all hover:shadow-md"
        >
          {!imageLoaded && (
            <div className="flex h-52 w-64 items-center justify-center bg-muted/40 animate-pulse">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          {media.url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={media.url}
              alt={media.caption || "WhatsApp image"}
              onLoad={() => setImageLoaded(true)}
              onError={() => setHasImageError(true)}
              className={cn(
                "max-h-72 w-auto max-w-full rounded-xl object-contain transition-transform duration-200 group-hover:scale-[1.01]",
                !imageLoaded && "hidden",
              )}
            />
          )}
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 text-foreground text-xs px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 font-medium">
              <Maximize2 className="h-3 w-3" /> View
            </span>
          </div>
        </div>

        {media.caption && (
          <p className={cn("text-xs px-1 whitespace-pre-wrap", isOutbound ? "text-primary-foreground/90" : "text-foreground")}>
            {media.caption}
          </p>
        )}

        {/* Lightbox Modal */}
        {isLightboxOpen && media.url && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Controls */}
              <div className="flex items-center justify-between w-full text-white px-2">
                <span className="text-xs truncate max-w-md">{media.caption || media.filename || "Photo"}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={media.url}
                    download={media.filename || "whatsapp_image.jpg"}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    title="Download original"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Full Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={media.caption || "WhatsApp full image"}
                className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
              />

              {media.caption && (
                <p className="text-xs text-white/90 bg-black/50 px-3 py-1.5 rounded-md text-center max-w-lg">
                  {media.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Video Message
  if (media.type === "VIDEO") {
    if (media.status === "PENDING" || media.status === "DOWNLOADING") {
      return (
        <div className="flex flex-col items-center justify-center w-64 h-44 rounded-2xl bg-muted/40 border border-border/40 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-medium">Downloading video...</span>
        </div>
      );
    }

    if (media.status === "FAILED") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Video unavailable</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 max-w-sm">
        <div className="overflow-hidden rounded-xl border border-border/40 bg-black shadow-sm">
          {media.url && (
            <video
              src={media.url}
              controls
              playsInline
              preload="metadata"
              className="max-h-72 w-full rounded-xl object-contain"
            />
          )}
        </div>
        {media.caption && (
          <p className={cn("text-xs px-1 whitespace-pre-wrap", isOutbound ? "text-primary-foreground/90" : "text-foreground")}>
            {media.caption}
          </p>
        )}
      </div>
    );
  }

  // 4. Document Message
  if (media.type === "DOCUMENT") {
    if (media.status === "PENDING" || media.status === "DOWNLOADING") {
      return (
        <div className="flex items-center gap-3 p-3 rounded-2xl min-w-[240px] max-w-[320px] bg-muted/40 border border-border/40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-medium truncate">{media.filename || "Document"}</span>
            <span className="text-[11px]">Downloading document...</span>
          </div>
        </div>
      );
    }

    if (media.status === "FAILED") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Document unavailable</span>
        </div>
      );
    }

    const isPdf = media.mimeType.includes("pdf") || (media.filename?.toLowerCase().endsWith(".pdf") ?? false);
    const isSpreadsheet =
      media.mimeType.includes("excel") ||
      media.mimeType.includes("spreadsheet") ||
      (media.filename?.toLowerCase().endsWith(".xlsx") ?? false);

    const formattedSize = formatBytes(media.sizeBytes);
    const typeLabel = isPdf ? "PDF" : isSpreadsheet ? "Spreadsheet" : "Document";

    return (
      <div
        className={cn(
          "flex flex-col gap-2 p-3 rounded-2xl min-w-[240px] max-w-[320px] transition-all",
          isOutbound
            ? "bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20"
            : "bg-background text-foreground border border-border/60 shadow-sm",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              isPdf
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : isSpreadsheet
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            )}
          >
            {isSpreadsheet ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold truncate leading-tight" title={media.filename || undefined}>
              {media.filename || "Document"}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              {typeLabel} {formattedSize ? `· ${formattedSize}` : ""}
            </span>
          </div>
        </div>

        {media.caption && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{media.caption}</p>
        )}

        {media.url && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors",
                isOutbound
                  ? "bg-white/20 hover:bg-white/30 text-primary-foreground"
                  : "bg-muted/70 hover:bg-muted text-foreground",
              )}
            >
              <ExternalLink className="h-3 w-3" /> Open
            </a>
            <a
              href={media.url}
              download={media.filename || "document"}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors",
                isOutbound
                  ? "bg-white text-primary hover:bg-white/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Download className="h-3 w-3" /> Download
            </a>
          </div>
        )}
      </div>
    );
  }

  // 5. Sticker
  if (media.type === "STICKER") {
    if (media.status === "PENDING" || media.status === "DOWNLOADING") {
      return (
        <div className="flex items-center justify-center w-28 h-28 rounded-xl bg-muted/40">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (media.url && media.status === "READY") {
      return (
        <div className="relative w-28 h-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt="Sticker"
            className="w-full h-full object-contain filter drop-shadow-sm"
          />
        </div>
      );
    }
  }

  // 6. Unsupported Media Fallback
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/40 text-xs text-muted-foreground">
      <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
      <span>Unsupported WhatsApp media ({media.type.toLowerCase()})</span>
    </div>
  );
}
