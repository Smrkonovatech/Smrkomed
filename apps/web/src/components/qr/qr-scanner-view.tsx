"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, QrCode, Scan, ShieldCheck, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerViewProps {
  onScanComplete: () => void;
  clinicName?: string;
  location?: string;
  autoStart?: boolean;
}

export function QrScannerView({
  onScanComplete,
  clinicName = "Hospex Bangalore Clinic",
  location = "12 Lavelle Road, Bangalore",
  autoStart = true,
}: QrScannerViewProps) {
  const [isScanning, setIsScanning] = useState(autoStart);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Aligning QR code...");
  const [isVerified, setIsVerified] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play synthetic scanner audio beep
  const playBeep = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not permitted without gesture or not supported
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanProgress(progress);

      if (progress === 30) {
        setScanStatus("Detecting high-density QR pattern...");
      } else if (progress === 60) {
        setScanStatus("Decoding clinic metadata: Hospex Bangalore...");
      } else if (progress === 90) {
        setScanStatus("Verifying Bangalore Center check-in portal...");
      } else if (progress >= 100) {
        clearInterval(interval);
        setIsVerified(true);
        setScanStatus("QR Code Verified! Launching Registration...");
        playBeep();

        setTimeout(() => {
          onScanComplete();
        }, 800);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isScanning, onScanComplete]);

  const restartScan = () => {
    setScanProgress(0);
    setIsVerified(false);
    setIsScanning(true);
  };

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-lift)] text-foreground">
      {/* Top Clinic Status */}
      <div className="mb-6 flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">{clinicName}</h3>
            <p className="text-[11px] text-primary font-semibold">Verified Bangalore Center</p>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={soundEnabled ? "Mute beep" : "Unmute beep"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* Viewfinder Outer Box */}
      <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl bg-primary-soft/40 p-4 border border-primary/20">
        {/* Animated Corner Brackets */}
        <div className="absolute top-2 left-2 h-7 w-7 border-t-4 border-l-4 border-primary rounded-tl-lg transition-all" />
        <div className="absolute top-2 right-2 h-7 w-7 border-t-4 border-r-4 border-primary rounded-tr-lg transition-all" />
        <div className="absolute bottom-2 left-2 h-7 w-7 border-b-4 border-l-4 border-primary rounded-bl-lg transition-all" />
        <div className="absolute bottom-2 right-2 h-7 w-7 border-b-4 border-r-4 border-primary rounded-br-lg transition-all" />

        {/* Radar concentric wave animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-44 w-44 animate-ping rounded-full border border-primary/20 [animation-duration:3s]" />
          <div className="h-28 w-28 animate-ping rounded-full border border-primary/30 [animation-duration:2s]" />
        </div>

        {/* QR Pattern Graphic */}
        <div className="relative z-10 flex h-44 w-44 flex-col items-center justify-center rounded-xl bg-card p-3 shadow-sm border border-border">
          <QrCode className="h-24 w-24 text-primary/80" />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            HOSPEX · BLR · RECEPTION
          </p>
        </div>

        {/* Scanning Laser Beam (SmrkoMed brand purple) */}
        {isScanning && !isVerified && (
          <div
            className="absolute left-3 right-3 z-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_3px_rgba(123,79,224,0.6)]"
            style={{
              top: `${14 + (scanProgress % 100) * 0.72}%`,
              transition: "top 45ms linear",
            }}
          >
            {/* Holographic light fan effect */}
            <div className="h-12 w-full -translate-y-11 bg-gradient-to-b from-transparent to-primary/20 opacity-80 pointer-events-none" />
          </div>
        )}

        {/* Verification Success Splash */}
        {isVerified && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-14 w-14 text-success animate-bounce" />
            <span className="mt-2 text-sm font-bold text-foreground">Scan Verified</span>
            <span className="text-[11px] text-muted-foreground">Opening Registration...</span>
          </div>
        )}
      </div>

      {/* Progress Bar & Status Text */}
      <div className="mt-6 w-full text-center">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Scan className="h-3.5 w-3.5 text-primary animate-pulse" />
            {scanStatus}
          </span>
          <span className="text-primary font-bold">{scanProgress}%</span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full gradient-brand transition-all duration-75"
            style={{ width: `${scanProgress}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Secured check-in for {location}</span>
        </div>

        {/* Action Buttons */}
        {!isVerified && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={restartScan}
              className="text-xs"
            >
              Restart Scan
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setScanProgress(100);
                setIsVerified(true);
                playBeep();
                setTimeout(onScanComplete, 250);
              }}
              className="text-xs font-bold"
            >
              Skip to Register
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
