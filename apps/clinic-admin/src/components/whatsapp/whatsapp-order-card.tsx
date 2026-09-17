import React from "react";
import { Receipt, ExternalLink } from "lucide-react";

export interface WhatsAppOrderCardProps {
  orderNumber: string;
  itemTitle: string;
  quantity?: string | number | undefined;
  total: string;
  payUrl?: string | undefined;
  timestamp?: string | undefined;
  imageUrl?: string | undefined;
  status?: string | undefined;
}

export function parseOrderMessage(content: string): {
  isOrder: boolean;
  orderNumber: string;
  itemTitle: string;
  quantity: string;
  total: string;
  payUrl?: string | undefined;
} | null {
  if (!content || (!content.includes("ORDER #") && !content.includes("Review and pay"))) {
    return null;
  }

  // Extract order number
  const orderMatch = content.match(/ORDER\s*#([A-Za-z0-9-_]+)/i);
  const orderNumber = orderMatch?.[1] ?? "INVOICE";

  // Extract URL
  const urlMatch = content.match(/(https?:\/\/[^\s)]+)/i);
  const payUrl = urlMatch?.[1] ?? undefined;

  // Extract Total
  const totalMatch = content.match(/Total[^\n\d]*([₹$€£]?\s*[\d,]+(?:\.\d{2})?)/i);
  const total = totalMatch?.[1]?.trim() ?? "₹0.00";

  // Extract quantity
  const qtyMatch = content.match(/Quantity\s*(\d+)/i) || content.match(/Qty[:\s]*(\d+)/i);
  const quantity = qtyMatch?.[1] ? `Quantity ${qtyMatch[1]}` : "Quantity 1";

  // Extract Item title (look for *bold* text or line between ORDER and Quantity)
  const boldMatch = content.match(/\*([^*]+)\*/);
  const boldText = boldMatch?.[1];
  let itemTitle = "Clinical Services & Consultation";
  if (boldText && !boldText.toLowerCase().includes("total") && !boldText.toLowerCase().includes("order")) {
    itemTitle = boldText.trim();
  } else {
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.toLowerCase().includes("quantity")) {
        const prevLine = lines[i - 1];
        if (prevLine && !prevLine.includes("ORDER") && !prevLine.includes("┄") && !prevLine.includes("---")) {
          itemTitle = prevLine.replace(/\*/g, "").trim();
          break;
        }
      }
    }
  }

  return {
    isOrder: true,
    orderNumber,
    itemTitle,
    quantity,
    total,
    payUrl,
  };
}

export const WhatsAppOrderCard: React.FC<WhatsAppOrderCardProps> = ({
  orderNumber,
  itemTitle,
  quantity = "Quantity 1",
  total,
  payUrl,
  timestamp,
  imageUrl,
  status,
}) => {
  return (
    <div className="w-full max-w-[320px] sm:max-w-[340px] bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden text-gray-800 transition-all hover:shadow-md">
      {/* Top Header */}
      <div className="px-4 pt-3.5 pb-2">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
          ORDER #{orderNumber}
        </p>
      </div>

      {/* Dotted Divider */}
      <div className="mx-4 border-b border-dotted border-gray-300" />

      {/* Item Body Row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={itemTitle}
            className="size-14 rounded-xl object-cover border border-gray-100 shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="size-14 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-xs">
            <Receipt className="size-7" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
            {itemTitle}
          </h4>
          <p className="text-xs text-gray-500 mt-1 font-medium">{quantity}</p>
        </div>
      </div>

      {/* Dotted Divider */}
      <div className="mx-4 border-b border-dotted border-gray-300" />

      {/* Total & Timestamp Row */}
      <div className="px-4 pt-2.5 pb-2 flex items-baseline justify-between">
        <span className="font-semibold text-gray-700 text-sm">Total</span>
        <span className="font-bold text-gray-900 text-base">{total}</span>
      </div>

      {timestamp && (
        <div className="px-4 pb-1.5 flex items-center justify-end gap-1 text-[10px] text-gray-400 font-medium">
          <span>{timestamp}</span>
          {status && (
            <span className="font-bold text-[#53bdeb]">
              {status === "READ" ? "✓✓" : status === "DELIVERED" ? "✓✓" : status === "SENT" ? "✓" : ""}
            </span>
          )}
        </div>
      )}

      {/* Solid Divider */}
      <div className="border-t border-gray-200" />

      {/* Bottom Action Button: "Review and pay" */}
      {payUrl ? (
        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block w-full py-2.5 px-4 text-center text-sm font-semibold text-[#0284c7] hover:text-[#0369a1] hover:bg-sky-50/50 active:bg-sky-100/50 transition-colors"
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            Review and pay
            <ExternalLink className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </span>
        </a>
      ) : (
        <button
          type="button"
          className="block w-full py-2.5 px-4 text-center text-sm font-semibold text-[#0284c7] hover:bg-sky-50/50 transition-colors cursor-pointer"
        >
          Review and pay
        </button>
      )}
    </div>
  );
};
