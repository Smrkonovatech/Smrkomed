"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, AlertCircle, Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  url?: string | undefined;
  status: "PENDING" | "DOWNLOADING" | "READY" | "FAILED" | "EXPIRED";
  durationSeconds?: number | null | undefined;
  isVoice?: boolean | undefined;
  isOutbound?: boolean | undefined;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessagePlayer({
  url,
  status,
  durationSeconds,
  isVoice = true,
  isOutbound = false,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  // Sync durationSeconds if provided by server
  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  // Reset state if URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasPlaybackError(false);
  }, [url]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || status !== "READY" || !url) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsAudioLoading(true);
      setHasPlaybackError(false);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsAudioLoading(false);
        })
        .catch((err) => {
          console.error("[VoicePlayer Error]", err);
          setIsPlaying(false);
          setIsAudioLoading(false);
          setHasPlaybackError(true);
        });
    }
  }, [isPlaying, status, url]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetTime = parseFloat(e.target.value);
      setCurrentTime(targetTime);
      if (audioRef.current) {
        audioRef.current.currentTime = targetTime;
      }
    },
    [],
  );

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    }
    setIsAudioLoading(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleAudioError = useCallback(() => {
    setIsPlaying(false);
    setIsAudioLoading(false);
    setHasPlaybackError(true);
  }, []);

  // Loading state while downloading from Meta
  if (status === "PENDING" || status === "DOWNLOADING") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-2xl min-w-[240px] max-w-[320px] transition-all",
          isOutbound
            ? "bg-primary-foreground/10 text-primary-foreground"
            : "bg-muted/60 text-foreground border border-border/40",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span>Voice note loading...</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Downloading from WhatsApp</span>
        </div>
      </div>
    );
  }

  // Failed state
  if (status === "FAILED" || hasPlaybackError) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-2xl min-w-[240px] max-w-[320px]",
          isOutbound
            ? "bg-destructive/10 text-destructive-foreground border border-destructive/20"
            : "bg-destructive/5 text-destructive border border-destructive/20",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold">Voice note unavailable</span>
          <span className="text-[11px] text-muted-foreground">Failed to load audio</span>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-2.5 rounded-2xl min-w-[260px] max-w-[330px] select-none transition-shadow",
        isOutbound
          ? "bg-primary text-primary-foreground"
          : "bg-background/95 text-foreground border border-border/60 shadow-sm",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={!url}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isOutbound
              ? "bg-white text-primary hover:bg-white/90 shadow-sm"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
          )}
        >
          {isAudioLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Progress Bar & Waveform Simulation */}
        <div className="flex flex-col flex-1 gap-1.5 min-w-0">
          <div className="relative flex items-center h-4 w-full">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek voice message"
              className={cn(
                "w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all",
                isOutbound ? "accent-white bg-white/30" : "accent-primary bg-muted",
              )}
              style={{
                backgroundSize: `${progressPercent}% 100%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono leading-none">
            <span className={cn(isOutbound ? "text-primary-foreground/90" : "text-muted-foreground")}>
              {formatDuration(isPlaying ? currentTime : duration || 0)}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 font-sans text-[10px] font-medium tracking-tight uppercase",
                isOutbound ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              <Mic className="h-2.5 w-2.5" />
              {isVoice ? "Voice message" : "Audio"}
            </span>
          </div>
        </div>
      </div>

      {/* Hidden HTML5 Native Audio */}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleAudioError}
        />
      )}
    </div>
  );
}
