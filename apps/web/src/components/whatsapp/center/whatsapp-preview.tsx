"use client";

import { cn } from "@/lib/utils";

export function WhatsAppPhonePreview({
  clinicName = "ABC Fertility Centre",
  body,
  buttons = [],
  header,
  footer,
}: {
  clinicName?: string;
  body: string;
  buttons?: string[];
  header?: string;
  footer?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-[#0b141a] shadow-lg">
        <div className="bg-[#075e54] px-4 pt-3 pb-2 text-white">
          <div className="mx-auto mb-2 h-1 w-16 rounded-full bg-white/30" />
          <p className="text-sm font-semibold">{clinicName}</p>
          <p className="text-[11px] text-white/70">Business account · Template</p>
        </div>
        <div
          className="min-h-[420px] space-y-3 bg-[#ece5dd] px-3 py-4"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }}
        >
          <div className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-[13px] text-[#111b21] shadow-sm">
            {header ? <p className="mb-1 text-xs font-semibold">{header}</p> : null}
            <p className="whitespace-pre-wrap leading-relaxed">{body || "Start typing your template…"}</p>
            {footer ? <p className="mt-2 text-[11px] text-[#667781]">{footer}</p> : null}
            {buttons.length ? (
              <div className="mt-2 space-y-1 border-t border-black/5 pt-2">
                {buttons.map((b) => (
                  <p key={b} className="text-center text-xs font-semibold text-[#00a884]">
                    {b}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="mt-1 text-right text-[10px] text-[#667781]">9:41 AM</p>
          </div>
          <p className={cn("px-1 text-center text-[10px] text-[#667781]")}>
            Preview only · Meta approval required before send
          </p>
        </div>
      </div>
    </div>
  );
}
