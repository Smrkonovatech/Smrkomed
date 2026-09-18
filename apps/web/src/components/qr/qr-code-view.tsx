"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, Printer, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCodeViewProps {
  url: string;
  clinicName?: string;
  city?: string;
  size?: number;
  showActions?: boolean;
}

export function QrCodeView({
  url,
  clinicName = "Hospex Bangalore Clinic",
  city = "Bangalore",
  size = 260,
  showActions = true,
}: QrCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const generateBrandedQr = async () => {
      try {
        const canvas = document.createElement("canvas");
        const renderSize = Math.max(size * 2, 600); // 2x high-resolution

        await QRCode.toCanvas(canvas, url, {
          width: renderSize,
          margin: 2,
          color: {
            dark: "#5b26cf", // SmrkoMed brand purple
            light: "#ffffff",
          },
          errorCorrectionLevel: "H", // 30% recovery for clean center logo
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (!isCancelled) setDataUrl(canvas.toDataURL("image/png"));
          return;
        }

        // Load SmrkoMed brand mark image
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = "/branding/smrkomed-mark.png";

        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        if (img.complete && img.naturalWidth > 0) {
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const logoSize = canvas.width * 0.23; // 23% center overlay
          const radius = logoSize / 2;

          // 1. Draw circular white background pad with soft brand glow
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(91, 38, 207, 0.3)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
          ctx.fill();

          // Outer border ring around logo badge
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#ebe4fa";
          ctx.stroke();
          ctx.restore();

          // 2. Clip to circle and render the SmrkoMed icon
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, cx - radius, cy - radius, logoSize, logoSize);
          ctx.restore();
        }

        if (!isCancelled) {
          setDataUrl(canvas.toDataURL("image/png"));
        }
      } catch (err) {
        console.error("Error generating branded QR code:", err);
      }
    };

    void generateBrandedQr();

    return () => {
      isCancelled = true;
    };
  }, [url, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `smrkomed-hospex-bangalore-qr-${Date.now()}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hospex Bangalore - Patient Check-In Standee</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f8f5fc;
              color: #1f1830;
              text-align: center;
              padding: 24px;
            }
            .card {
              border: 1.5px solid rgba(91, 38, 207, 0.2);
              border-radius: 32px;
              padding: 44px 36px;
              max-width: 440px;
              background: #ffffff;
              box-shadow: 0 25px 60px -20px rgba(91, 38, 207, 0.25);
            }
            .brand-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 20px;
            }
            .brand-header img {
              height: 38px;
              width: auto;
              border: none;
              padding: 0;
              background: transparent;
            }
            .badge {
              display: inline-block;
              background: #efe8fb;
              color: #5b26cf;
              font-weight: 800;
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              padding: 6px 16px;
              border-radius: 9999px;
              margin-bottom: 14px;
              border: 1px solid rgba(91, 38, 207, 0.2);
            }
            h1 {
              font-size: 24px;
              font-weight: 800;
              margin: 0 0 8px 0;
              color: #1f1830;
            }
            p.sub {
              font-size: 13px;
              color: #6d6680;
              margin: 0 0 24px 0;
              line-height: 1.5;
            }
            .qr-wrap {
              display: inline-block;
              padding: 12px;
              background: linear-gradient(135deg, rgba(91, 38, 207, 0.08), rgba(91, 38, 207, 0.02));
              border-radius: 24px;
              border: 1.5px solid rgba(91, 38, 207, 0.2);
            }
            .qr-img {
              width: 250px;
              height: 250px;
              border-radius: 16px;
              display: block;
            }
            .instructions {
              margin-top: 24px;
              font-size: 12px;
              font-weight: 600;
              color: #5b26cf;
              background: #faf7fd;
              padding: 10px 16px;
              border-radius: 12px;
            }
            .footer {
              margin-top: 16px;
              font-size: 12px;
              font-weight: 500;
              color: #8b859e;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand-header">
              <img src="${window.location.origin}/images/logo.png" alt="Hospex" onerror="this.src='${window.location.origin}/branding/smrkomed-logo.png'" />
            </div>
            <div class="badge">HOSPEX CLINIC · BANGALORE CENTER</div>
            <h1>Patient Self Check-In</h1>
            <p class="sub">Scan with smartphone camera to check in at reception, view your queue, or connect with Smrko AI.</p>
            <div class="qr-wrap">
              <img class="qr-img" src="${dataUrl}" alt="Check-In QR Code" />
            </div>
            <div class="instructions">📱 Point camera to scan · Opens check-in portal</div>
            <div class="footer">12 Lavelle Road, Bangalore 560001 · Counter 2</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center">
      {/* Brand Header Label */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <img
          src="/branding/smrkomed-mark.png"
          alt="SmrkoMed"
          className="h-5 w-5 rounded-full object-contain shadow-xs"
        />
        <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
          SmrkoMed Check-In
        </span>
      </div>

      {/* QR Code Frame with SmrkoMed Corner Brackets */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-primary/5 via-card to-primary/5 p-4 sm:p-5 shadow-[0_12px_36px_-12px_rgba(91,38,207,0.22)] border border-primary/25">
        {/* Brand Theme Corner Brackets */}
        <div className="absolute top-2 left-2 h-5 w-5 border-t-2 border-l-2 border-primary rounded-tl-lg pointer-events-none" />
        <div className="absolute top-2 right-2 h-5 w-5 border-t-2 border-r-2 border-primary rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-primary rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-primary rounded-br-lg pointer-events-none" />

        {/* QR Code Canvas/Image */}
        <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-xs border border-primary/10">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`${clinicName} QR Code`}
              width={size}
              height={size}
              className="rounded-xl object-contain"
            />
          ) : (
            <div
              style={{ width: size, height: size }}
              className="flex items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground"
            >
              Generating Branded QR...
            </div>
          )}
        </div>
      </div>

      {/* Scan Indicator Subtext */}
      <div className="mt-3 flex items-center gap-1.5 text-center text-xs text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">Scan with camera or WhatsApp</span>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-9 gap-1.5 text-xs font-medium rounded-xl border-primary/20 hover:bg-primary-soft/50 text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Link Copied" : "Copy Link"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-9 gap-1.5 text-xs font-medium rounded-xl border-primary/20 hover:bg-primary-soft/50 text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs font-medium rounded-xl border-primary/20 hover:bg-primary-soft/50 text-foreground"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Standee
          </Button>
        </div>
      )}
    </div>
  );
}
