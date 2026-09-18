"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, Printer, Sparkles } from "lucide-react";
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
  size = 240,
  showActions = true,
}: QrCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: size * 2,
      margin: 2,
      color: {
        dark: "#1f1830", // SmrkoMed ink
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((res) => {
        setDataUrl(res);
      })
      .catch((err) => console.error("Error generating QR code:", err));
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
    a.download = `hospex-bangalore-qr-${Date.now()}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hospex Bangalore - Patient Check-In QR</title>
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
            }
            .card {
              border: 1px solid rgba(123, 79, 224, 0.2);
              border-radius: 28px;
              padding: 48px;
              max-width: 420px;
              background: #ffffff;
              box-shadow: 0 20px 45px -20px rgba(123, 79, 224, 0.3);
            }
            .badge {
              display: inline-block;
              background: #efe8fb;
              color: #7b4fe0;
              font-weight: 700;
              font-size: 13px;
              letter-spacing: 0.05em;
              padding: 6px 16px;
              border-radius: 9999px;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 24px;
              font-weight: 800;
              margin: 0 0 8px 0;
              color: #1f1830;
            }
            p.sub {
              font-size: 14px;
              color: #6d6680;
              margin: 0 0 28px 0;
            }
            img {
              width: 260px;
              height: 260px;
              border-radius: 16px;
              border: 1px solid rgba(123, 79, 224, 0.15);
              padding: 8px;
              background: #fff;
            }
            .footer {
              margin-top: 24px;
              font-size: 13px;
              font-weight: 600;
              color: #6d6680;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">HOSPEX CLINIC · BANGALORE</div>
            <h1>Self Check-In & Registration</h1>
            <p class="sub">Scan with smartphone camera to register and access reception options.</p>
            <img src="${dataUrl}" alt="Check-In QR Code" />
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
      {/* QR Code Container */}
      <div className="relative rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] border border-border">
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
            Generating QR...
          </div>
        )}

        {/* Center Logo Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-brand text-primary-foreground shadow-md ring-4 ring-card">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-9 gap-1.5 text-xs font-medium rounded-xl"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Link Copied" : "Copy Link"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-9 gap-1.5 text-xs font-medium rounded-xl"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs font-medium rounded-xl"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Standee
          </Button>
        </div>
      )}
    </div>
  );
}
