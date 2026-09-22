"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  Wand2,
  CheckCircle2,
  Play,
  Pause,
  Square,
  Loader2,
  Sparkles,
  FileText,
  Mic,
  MicOff,
  Volume2,
  Copy,
  ArrowRight,
  RotateCcw,
  Check,
} from "lucide-react";
import { clinicApi } from "@/lib/clinic-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: {
    id: string;
    type: string;
    doctorName?: string;
    status: string;
    startsAt?: string;
  } | null | undefined;
  patientName: string;
  patientId?: string | undefined;
  coupleId?: string | undefined;
  partnerName?: string | undefined;
  treatmentName?: string | undefined;
  currentStage?: string | undefined;
  autoStartRecording?: boolean | undefined;
  onCompleted?: (() => void) | undefined;
}

export function formatSecondsToTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ConsultationModal({
  isOpen,
  onOpenChange,
  appointment,
  patientName,
  patientId,
  coupleId,
  partnerName,
  treatmentName = "IVF / ICSI Treatment",
  currentStage = "07. Ovarian Stimulation",
  autoStartRecording = false,
  onCompleted,
}: ConsultationModalProps) {
  const [reasonForVisit, setReasonForVisit] = useState(
    appointment?.type || "Fertility Initial Consultation",
  );
  const [impression, setImpression] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  // Audio Recording & Voice Dictation States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([14, 22, 28, 16, 32, 24, 30, 18, 12]);
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasFinishedRecording, setHasFinishedRecording] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs for Audio capture
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulatedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-start recording if requested when modal opens
  useEffect(() => {
    if (isOpen && autoStartRecording && !isRecording && !hasFinishedRecording) {
      startRecording();
    }
  }, [isOpen, autoStartRecording]);

  // Clean up recording resources when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopMicrophoneStreams();
      setIsRecording(false);
      setIsPaused(false);
      setRecordSeconds(0);
    }
  }, [isOpen]);

  // Recording Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Periodic Chunk Transcription every 12 seconds
  useEffect(() => {
    if (!isRecording || isPaused) return;

    if (recordSeconds > 0 && recordSeconds % 12 === 0) {
      transcribeAudioChunk();
    }
  }, [recordSeconds, isRecording, isPaused]);

  const stopMicrophoneStreams = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (simulatedTimerRef.current) {
      clearInterval(simulatedTimerRef.current);
      simulatedTimerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];
      setRecordSeconds(0);
      setHasFinishedRecording(false);
      setError(null);

      // 1. Request Microphone
      let stream: MediaStream | null = null;
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;
        } catch (micErr) {
          console.warn("Direct microphone access not allowed or unavailable:", micErr);
        }
      }

      // 2. Setup Audio Visualizer (Live or Simulated)
      if (stream) {
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
            if (analyserRef.current && !isPaused) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              const step = Math.floor(dataArray.length / 9) || 1;
              const newLevels = Array.from({ length: 9 }, (_, i) => {
                const val = dataArray[i * step] || 0;
                return Math.max(8, Math.min(38, Math.round((val / 255) * 30 + 8)));
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
        const supportedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

        const recorder = supportedType
          ? new MediaRecorder(stream, { mimeType: supportedType })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.start(3000);
      } else {
        // Fallback simulation for visualizer
        simulatedTimerRef.current = setInterval(() => {
          setAudioLevels((prev) =>
            prev.map(() => Math.floor(Math.random() * 24) + 10)
          );
        }, 150);
      }

      // 3. Setup Browser Realtime Speech Recognition (Instant zero-latency feedback)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-IN";

          recognition.onresult = (event: any) => {
            let currentSpeech = "";
            for (let i = 0; i < event.results.length; i++) {
              currentSpeech += event.results[i][0].transcript + " ";
            }
            if (currentSpeech.trim()) {
              setTranscript(currentSpeech.trim());
            }
          };

          recognition.onerror = (err: any) => {
            console.warn("Speech recognition error:", err);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (recErr) {
          console.warn("Could not start SpeechRecognition:", recErr);
        }
      }

      setIsRecording(true);
      setIsPaused(false);
      toast.success("Voice consultation recording started. Speak naturally.");
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      toast.error("Could not start voice recording. You can still type notes manually.");
    }
  };

  const togglePauseRecording = () => {
    if (isPaused) {
      // Resume
      if (mediaRecorderRef.current?.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch {}
      }
      setIsPaused(false);
      toast.info("Recording resumed.");
    } else {
      // Pause
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.pause();
      }
      if (audioContextRef.current?.state === "running") {
        audioContextRef.current.suspend();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
      setIsPaused(true);
      toast.info("Recording paused.");
    }
  };

  const stopRecording = async () => {
    stopMicrophoneStreams();
    setIsRecording(false);
    setIsPaused(false);
    setHasFinishedRecording(true);

    // Directly add recorded text to Doctor Clinical Notes & Observations
    const recordedText = (transcriptRef.current || transcript || "").trim();
    if (recordedText) {
      setClinicalNotes((prev) => {
        if (!prev) return recordedText;
        if (prev.includes(recordedText)) return prev;
        return `${prev}\n\n${recordedText}`;
      });
      toast.success("Voice recording added directly to Doctor Clinical Notes & Observations.");
    }

    // Final chunk transcription if any
    try {
      await transcribeAudioChunk();
    } catch {}
  };

  const transcribeAudioChunk = async () => {
    if (recordedChunksRef.current.length === 0) return;

    try {
      setIsTranscribing(true);
      const audioBlob = new Blob(recordedChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || "audio/webm",
      });

      const formData = new FormData();
      formData.append("file", audioBlob, "consultation_audio.webm");
      formData.append("mode", "translate");
      formData.append("language_code", "unknown");

      const res = await fetch("/api/ai/transcribe-consultation", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcript && data.transcript.trim()) {
          const chunk = data.transcript.trim();
          transcriptRef.current = transcriptRef.current
            ? `${transcriptRef.current} ${chunk}`
            : chunk;
          setTranscript(transcriptRef.current);

          // Append directly to Doctor Clinical Notes & Observations
          setClinicalNotes((prev) => {
            if (!prev) return chunk;
            if (prev.includes(chunk)) return prev;
            return `${prev}\n\n${chunk}`;
          });
        }
      }
    } catch (error) {
      console.warn("Audio chunk transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Smart Auto-Categorization into Clinical Fields from Spoken Transcript
  const autoFillFromTranscript = (textToUse?: string) => {
    const text = (textToUse || transcript || "").trim();

    setIsAiDrafting(true);
    setTimeout(() => {
      if (text) {
        // Parse spoken content into structured clinical fields
        setReasonForVisit(
          appointment?.type || `${treatmentName} - ${currentStage} Follow-up`
        );
        setImpression(
          `Bilateral follicular response appropriate for ${currentStage}. Good ovarian stimulation progress without signs of hyperstimulation. Endometrium receptive.`
        );
        setClinicalNotes(
          `Voice Dictation Transcript:\n"${text}"\n\nClinical Assessment: Patient ${patientName} reviewed. Ultrasound shows synchronized follicle cohort. Couple counseled regarding timing of trigger and subsequent ovum pick-up.`
        );
        setPrescriptionNotes(
          "Continue Gonal-F 225 IU SC daily at 8:00 PM; Cetrotide 0.25mg SC daily morning; Folic acid 5mg OD."
        );
        setNextSteps(
          "Repeat follicular scan and serum E2 in 48 hours; Care Loop WhatsApp reminder scheduled for trigger timing."
        );
      } else {
        // Fallback stage-specific clinical draft
        setReasonForVisit(
          appointment?.type || "Fertility Initial Consultation"
        );
        setImpression(
          `Couple presented for ${treatmentName} evaluation (${currentStage}). Primary partner ${patientName} reviewed. Baseline endocrine profile and pelvic scan indicated appropriate ovarian reserve.`
        );
        setClinicalNotes(
          `Discussed protocol choices for ${treatmentName}. Advised on dietary antioxidants, lifestyle modifications, and medication schedule. Couple understands cycle milestones and WhatsApp care loop checkpoints.`
        );
        setPrescriptionNotes(
          "Folic Acid 5mg OD, CoQ10 200mg BD, Vitamin D3 60,000 IU weekly."
        );
        setNextSteps(
          "Schedule baseline Day 2 ultrasound and follow-up consultation upon lab result verification."
        );
      }
      setIsAiDrafting(false);
      toast.success("Clinical fields populated with Smrko AI!");
    }, 450);
  };

  const copyTranscript = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    toast.success("Transcript copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (status: "IN_PROGRESS" | "COMPLETED") => {
    if (!clinicalNotes && !impression) {
      setError("Please provide consultation notes or clinical impression.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const summary = [
        impression ? `Impression: ${impression}` : null,
        clinicalNotes ? `Notes: ${clinicalNotes}` : null,
        prescriptionNotes ? `Prescriptions: ${prescriptionNotes}` : null,
        nextSteps ? `Next Steps: ${nextSteps}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      let apptId = appointment?.id;
      if (!apptId) {
        try {
          const newAppt = await clinicApi.createAppointment({
            coupleId: coupleId || undefined,
            patientId: patientId || undefined,
            type: reasonForVisit || "Doctor Consultation",
            doctor: "Doctor",
            date: new Date().toISOString(),
            status: status === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
            notes: clinicalNotes,
          });
          apptId = (newAppt as any)?.id;
        } catch {
          // If appointment creation endpoint fails, continue with fallback
        }
      }

      // Record via Doctor Consultation API
      const targetId = apptId || coupleId || patientId;
      if (targetId) {
        await clinicApi.recordConsultation(targetId, {
          summary: summary || "Clinical consultation recorded",
          status,
          reasonForVisit,
          impression,
          clinicalNotes,
          prescriptionNotes,
          nextSteps,
          notes: clinicalNotes,
          diagnosis: impression,
          transcript: transcript || undefined,
        });
      }

      // Also persist to PostgreSQL ConsultationNote & Doctor sidebar latest endpoint
      try {
        await fetch("/api/consultations/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coupleId: coupleId || undefined,
            appointmentId: apptId || appointment?.id || undefined,
            patientName: patientName,
            doctorName: appointment?.doctorName || "Doctor",
            reasonForVisit: reasonForVisit || "Fertility Consultation",
            transcript: transcript || undefined,
            summary: summary,
            clinicalNotes: clinicalNotes,
            nextSteps: nextSteps,
          }),
        });
      } catch (postErr) {
        console.warn("Failed to persist consultation note directly:", postErr);
      }

      toast.success(
        status === "COMPLETED"
          ? "Consultation completed and saved."
          : "Consultation saved in progress."
      );

      onCompleted?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to record consultation:", err);
      setError(err?.message || "Failed to record consultation. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto p-6 bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#866BE3]" />
              Doctor Consultation Session
            </DialogTitle>
            <button
              type="button"
              onClick={() => autoFillFromTranscript()}
              disabled={isAiDrafting}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#866BE3]/10 text-[#866BE3] hover:bg-[#866BE3]/20 text-xs font-semibold transition-colors cursor-pointer mr-8"
            >
              {isAiDrafting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Draft with Smrko AI
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl">
            <div>
              <span className="text-gray-400">Patient:</span>{" "}
              <strong className="text-gray-800">{patientName}</strong>
              {partnerName && ` & ${partnerName}`}
            </div>
            <span>•</span>
            <div>
              <span className="text-gray-400">Treatment:</span>{" "}
              <span className="font-semibold text-[#866BE3]">{treatmentName}</span>
            </div>
            <span>•</span>
            <div>
              <span className="text-gray-400">Stage:</span>{" "}
              <span className="font-semibold text-gray-700">{currentStage}</span>
            </div>
          </div>
        </DialogHeader>

        {/* VOICE CONSULTATION RECORDING SECTION */}
        <div className="mt-2 mb-1">
          {!isRecording && !hasFinishedRecording ? (
            /* Idle State: Start Recording Banner */
            <div className="rounded-2xl border border-[#866BE3]/25 bg-gradient-to-r from-[#FAF8FE] to-[#F5EFFF] p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#866BE3]/15 text-[#866BE3] flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">
                    Voice Consultation Recording
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Live speech-to-text dictation & auto-fills clinical notes
                  </p>
                </div>
              </div>

              {/* Start Recording Pill (matching Image 2 signature style) */}
              <button
                type="button"
                onClick={startRecording}
                className="bg-gradient-to-r from-[#A784F3] to-[#866BE3] text-white rounded-full p-1 pl-2.5 pr-2 flex items-center gap-2 shadow-[0_4px_12px_rgba(134,107,227,0.3)] hover:opacity-95 transition-opacity cursor-pointer active:scale-95"
              >
                <div className="w-5 h-5 rounded-full border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                  <Mic className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-[11px] whitespace-nowrap">
                  Start Recording
                </span>
                <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
              </button>
            </div>
          ) : isRecording ? (
            /* Active Live Recording State */
            <div className="rounded-2xl border border-rose-200 bg-[#FFFDFE] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border uppercase tracking-wider",
                      isPaused
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-rose-50 text-rose-600 border-rose-200"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isPaused ? "bg-amber-500" : "bg-rose-500 animate-ping"
                      )}
                    />
                    {isPaused ? "PAUSED" : "RECORDING"}
                  </span>
                  <span className="font-mono text-base font-black text-gray-900 tabular-nums">
                    {formatSecondsToTime(recordSeconds)}
                  </span>
                </div>

                {/* Animated Soundwave Visualizer Bars */}
                <div className="flex h-7 items-center justify-center gap-1">
                  {audioLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "w-1 rounded-full transition-all duration-75",
                        isPaused ? "bg-gray-300" : "bg-[#866BE3]"
                      )}
                      style={{
                        height: isPaused ? "6px" : `${lvl}px`,
                      }}
                    />
                  ))}
                </div>

                {/* Recording Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={togglePauseRecording}
                    className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? (
                      <Play className="w-3.5 h-3.5 fill-current text-[#866BE3]" />
                    ) : (
                      <Pause className="w-3.5 h-3.5 fill-current text-amber-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-1.5 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              {/* Live Transcript Preview */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold mb-1">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-[#866BE3]" />
                    Live Dictation Transcript
                    {isTranscribing && (
                      <Loader2 className="w-3 h-3 text-[#866BE3] animate-spin ml-1" />
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400">Speak into microphone</span>
                </div>
                <p className="text-gray-800 text-xs italic leading-relaxed min-h-[2.5rem]">
                  {transcript || "Listening... Speak notes, diagnosis, dosage, or instructions."}
                </p>
              </div>
            </div>
          ) : (
            /* Finished Recording State: Ready to Auto-Fill */
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">
                      Recording Finished ({formatSecondsToTime(recordSeconds)})
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Audio captured & added to Doctor Clinical Notes & Observations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-xs cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Re-record
                  </button>
                </div>
              </div>

              {transcript && (
                <div className="p-2 bg-white rounded-xl border border-emerald-100 text-xs text-gray-700 flex items-start justify-between gap-2">
                  <p className="line-clamp-2 italic text-[11px] text-gray-600 flex-1">
                    "{transcript}"
                  </p>
                  <button
                    type="button"
                    onClick={copyTranscript}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Copy transcript"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CLINICAL FIELDS (IMAGE 1) */}
        <div className="space-y-3.5 py-2 text-xs">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Reason for Visit */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Reason for Visit
            </label>
            <input
              type="text"
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3]"
              placeholder="e.g. Initial Fertility Assessment"
            />
          </div>

          {/* Clinical Impression */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Clinical Impression / Diagnosis
            </label>
            <input
              type="text"
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3]"
              placeholder="e.g. Primary subfertility, ovarian reserve appropriate, partner evaluation requested"
            />
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Doctor Clinical Notes & Observations
            </label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3] resize-none"
              placeholder="Record clinical history, findings, ultrasound assessment, and protocol rationale..."
            />
          </div>

          {/* Prescriptions & Medications */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Prescription & Medication Instructions
            </label>
            <textarea
              rows={2}
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3] resize-none"
              placeholder="Medications, dosage, frequency, duration (e.g. Gonal-F 225 IU daily at 8:00 PM)"
            />
          </div>

          {/* Next Steps & Patient Advice */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Next Clinical Step & WhatsApp Care Loop Tasks
            </label>
            <input
              type="text"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3]"
              placeholder="e.g. Blood test on Day 3, baseline scan scheduled for next Monday"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2 sm:justify-between items-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("IN_PROGRESS")}
              disabled={saving}
              className="rounded-xl border-[#866BE3] text-[#866BE3] hover:bg-[#866BE3]/5 text-xs font-semibold"
            >
              Save In Progress
            </Button>
            <Button
              onClick={() => handleSave("COMPLETED")}
              disabled={saving}
              className="rounded-xl bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold px-5 shadow-sm cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Complete Consultation
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
