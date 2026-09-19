"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Clock,
  ArrowRight,
  Square,
  Pause,
  Play,
  Check,
  X,
  Minus,
  Maximize2,
  CheckCircle2,
  Sparkles,
  Volume2,
  Copy,
  Globe,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ConsultationSessionState {
  isActive: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  recordSeconds: number;
  patientName: string;
  patientSubtitle: string;
  doctorName: string;
  roomName: string;
  cycleBadge: string;
}

interface ActiveConsultationProps {
  session: ConsultationSessionState;
  onPauseToggle: () => void;
  onMinimizeToggle: () => void;
  onEndRequest: () => void;
  onEndConfirm: (finalTranscript?: string) => void;
  onCancelEnd: () => void;
  isEndingDialogOpen: boolean;
}

export function formatSecondsToTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ActiveConsultationModal({
  session,
  onPauseToggle,
  onMinimizeToggle,
  onEndRequest,
  onEndConfirm,
  onCancelEnd,
  isEndingDialogOpen,
}: ActiveConsultationProps) {
  // Live Microphone & Recording State
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([12, 20, 28, 18, 30, 24, 32, 16, 10]);
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string>("auto");
  const [providerTag, setProviderTag] = useState<string>("Sarvam AI (Saaras)");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 1. Microphone capture & real-time audio visualizer setup
  useEffect(() => {
    if (!session.isActive) {
      stopMicrophone();
      return;
    }

    // Reset transcript on fresh start
    if (session.recordSeconds === 0) {
      setTranscript("");
      recordedChunksRef.current = [];
    }

    startMicrophone();

    return () => {
      stopMicrophone();
    };
  }, [session.isActive]);

  // Handle Pause / Resume on MediaRecorder & AudioContext
  useEffect(() => {
    if (!mediaRecorderRef.current) return;

    if (session.isPaused) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.pause();
      }
      if (audioContextRef.current && audioContextRef.current.state === "running") {
        audioContextRef.current.suspend();
      }
    } else {
      if (mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    }
  }, [session.isPaused]);

  // Periodic transcription every 10 seconds of active consultation
  useEffect(() => {
    if (!session.isActive || session.isPaused) return;

    if (session.recordSeconds > 0 && session.recordSeconds % 10 === 0) {
      transcribeCurrentAudioChunk();
    }
  }, [session.recordSeconds, session.isActive, session.isPaused]);

  const startMicrophone = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setHasMicPermission(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setHasMicPermission(true);

      // Initialize Web Audio API for live soundwave visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateVisualizer = () => {
          if (analyserRef.current && !session.isPaused) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Compute 9 bars from frequencies
            const step = Math.floor(dataArray.length / 9) || 1;
            const newLevels = Array.from({ length: 9 }, (_, i) => {
              const val = dataArray[i * step] || 0;
              // Map 0-255 to min 8px to max 38px
              return Math.max(8, Math.min(38, Math.round((val / 255) * 32 + 8)));
            });
            setAudioLevels(newLevels);
          }
          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
        };
        updateVisualizer();
      }

      // Initialize MediaRecorder
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/wav",
      ];
      let supportedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(3000); // chunk every 3s
    } catch (err: any) {
      console.warn("Microphone access denied or error:", err);
      setHasMicPermission(false);
      toast.error("Microphone access denied. Using simulated voice input.");
    }
  };

  const stopMicrophone = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Transcribe recorded audio with Sarvam AI
  const transcribeCurrentAudioChunk = async () => {
    if (recordedChunksRef.current.length === 0) return;

    try {
      setIsTranscribing(true);
      const audioBlob = new Blob(recordedChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || "audio/webm",
      });

      const formData = new FormData();
      formData.append("file", audioBlob, "consultation_recording.webm");
      formData.append("mode", "transcribe");
      formData.append("language_code", detectedLang === "auto" ? "unknown" : detectedLang);

      const res = await fetch("/api/ai/transcribe-consultation", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcript) {
          setTranscript(data.transcript);
          if (data.language_code) {
            setDetectedLang(data.language_code);
          }
          if (data.provider === "sarvam") {
            setProviderTag("Sarvam AI (Saaras)");
          }
        }
      }
    } catch (error) {
      console.warn("Transcription chunk error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyTranscript = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    toast.success("Transcript copied to clipboard");
  };

  const handleFinalEndConfirm = async () => {
    // Attempt one final transcription before ending
    await transcribeCurrentAudioChunk();
    onEndConfirm(transcript);
  };

  if (!session.isActive) return null;

  const timerText = formatSecondsToTime(session.recordSeconds);

  return (
    <>
      <style jsx global>{`
        @keyframes soundWavePulse {
          0%, 100% {
            transform: scaleY(0.4);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>

      {/* 1. Full Active Consultation Modal (Image 2) */}
      {!session.isMinimized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-[560px] rounded-[32px] bg-white p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-2xl bg-[#F4F0FC] text-[#866BE3] flex items-center justify-center shrink-0 shadow-xs">
                  <Mic className="size-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Active Consultation
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {session.patientName} • {session.cycleBadge}
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onMinimizeToggle}
                  title="Minimize to dock"
                  className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <Minus className="size-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={onMinimizeToggle}
                  title="Close / Minimize"
                  className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="size-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* OPD & Doctor Info Line */}
            <div className="mt-3 pt-3 border-t border-slate-100/90 flex items-center justify-between text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <span>{session.roomName}</span>
                <span>•</span>
                <span>{session.doctorName}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#866BE3] bg-[#F4F0FC] px-2 py-0.5 rounded-md">
                <Sparkles className="size-3" />
                <span>{providerTag}</span>
              </div>
            </div>

            {/* Middle Recording Box */}
            <div className="my-4 flex flex-col items-center justify-center rounded-[24px] border border-slate-100 bg-[#FBFBFE] p-6 shadow-xs">
              {/* Badge */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider border",
                  session.isPaused
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-rose-50 text-rose-600 border-rose-200"
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    session.isPaused ? "bg-amber-500" : "bg-rose-500 animate-ping"
                  )}
                />
                {session.isPaused ? "PAUSED" : "RECORDING"}
              </div>

              {/* Digital Timer */}
              <div className="my-3 font-mono text-5xl font-black tracking-wider text-slate-900 tabular-nums">
                {timerText}
              </div>

              {/* Live Audio Waveform Visualizer */}
              <div className="flex h-10 items-center justify-center gap-1.5">
                {audioLevels.map((lvl, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "w-1.5 rounded-full transition-all duration-75",
                      session.isPaused ? "bg-slate-300" : "bg-[#866BE3]"
                    )}
                    style={{
                      height: session.isPaused ? "8px" : `${lvl}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Multilingual Transcript Box */}
            <div className="mb-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Globe className="size-3.5 text-[#866BE3]" />
                  <span>Multilingual Live Transcript</span>
                  {isTranscribing && (
                    <Loader2 className="size-3 text-[#866BE3] animate-spin ml-1" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                    {detectedLang === "auto" ? "Indic / English" : detectedLang}
                  </span>
                  {transcript && (
                    <button
                      type="button"
                      onClick={copyTranscript}
                      className="text-slate-400 hover:text-slate-700 transition"
                      title="Copy transcript"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-24 overflow-y-auto pr-1 text-xs text-slate-700 leading-relaxed font-normal">
                {transcript ? (
                  <p className="font-medium text-slate-800">{transcript}</p>
                ) : (
                  <p className="text-slate-400 italic">
                    {session.isPaused
                      ? "Consultation paused."
                      : "Speak naturally in English, Hindi, or any Indian language. Sarvam AI will transcribe in real time..."}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPauseToggle}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white py-3 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-[0.98]"
              >
                {session.isPaused ? (
                  <>
                    <Play className="size-4 fill-slate-700" />
                    Resume Session
                  </>
                ) : (
                  <>
                    <Pause className="size-4 fill-slate-700" />
                    Pause Session
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onEndRequest}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#7857e8] py-3 text-sm font-bold text-white shadow-md hover:bg-[#6843e0] transition active:scale-[0.98]"
              >
                <Check className="size-4 stroke-[3]" />
                End consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Minimized Floating Corner Widget (Image 3) */}
      {session.isMinimized && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] sm:w-[410px] overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Top Dark Bar */}
          <div className="flex items-center justify-between bg-[#171427] px-4 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">
                <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
                {session.isPaused ? "Paused" : "Recording"}
              </span>
              <span className="font-mono text-sm font-bold tracking-wider text-slate-200 tabular-nums">
                {timerText}
              </span>
            </div>

            <button
              type="button"
              onClick={onMinimizeToggle}
              title="Expand consultation"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <Maximize2 className="size-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {session.patientName}
                  </h3>
                  <span className="rounded-md border border-[#E9E1F9] bg-[#F4F0FC] px-2 py-0.5 text-[10px] font-bold text-[#866BE3]">
                    {session.cycleBadge}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  {session.roomName} • {session.doctorName}
                </p>
              </div>

              <div className="size-8 rounded-xl bg-[#F4F0FC] text-[#866BE3] flex items-center justify-center shrink-0">
                <Mic className="size-4" />
              </div>
            </div>

            {/* Listening Status Line */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span>Smrko AI Listening...</span>
              </div>

              {/* Mini live audio waveform */}
              <div className="flex h-5 items-center gap-1">
                {audioLevels.slice(0, 5).map((lvl, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-[#866BE3] transition-all duration-75"
                    style={{
                      height: session.isPaused ? "4px" : `${Math.min(18, Math.max(4, lvl / 2))}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Transcript Snippet */}
            {transcript && (
              <div className="mt-2.5 rounded-xl bg-slate-50 p-2 text-[11px] text-slate-700 border border-slate-100 line-clamp-2 italic">
                "{transcript}"
              </div>
            )}

            {/* Buttons */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onPauseToggle}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-[0.98]"
              >
                {session.isPaused ? (
                  <>
                    <Play className="size-3 fill-slate-700" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-3 fill-slate-700" />
                    Pause Session
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onEndRequest}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7857e8] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6843e0] transition active:scale-[0.98]"
              >
                <Check className="size-3.5 stroke-[3]" />
                End & Sign-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirmation Dialog (Image 4) */}
      {isEndingDialogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-[400px] rounded-[28px] bg-white p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Top icon and close */}
            <div className="flex items-start justify-between">
              <div className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
                <Check className="size-6 stroke-[3]" />
              </div>

              <button
                type="button"
                onClick={onCancelEnd}
                className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="size-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Title & Body */}
            <div className="mt-4">
              <h3 className="text-lg font-bold text-slate-900">
                End consultation
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed font-normal">
                Are you sure you want to end session? Once stopped it cannot be resumed
              </p>
            </div>

            {/* Transcript Preview if available */}
            {transcript && (
              <div className="mt-4 max-h-24 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 text-left">
                <p className="font-semibold text-slate-800 text-[11px] mb-0.5">Recorded Transcript:</p>
                <p className="italic">"{transcript}"</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={onCancelEnd}
                className="flex-1 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFinalEndConfirm}
                className="flex-1 rounded-full bg-[#7857e8] py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#6843e0] transition active:scale-[0.98]"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
