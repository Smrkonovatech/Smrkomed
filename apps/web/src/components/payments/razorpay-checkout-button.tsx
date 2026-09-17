"use client";

import React, { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openRazorpayCheckout, type RazorpayVerificationResult } from "@/lib/razorpay-client";

export interface RazorpayCheckoutButtonProps {
  amount: number; // in paise (e.g. 500000 = ₹5,000)
  currency?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
  prefill?:
    | {
        name?: string | undefined;
        email?: string | undefined;
        contact?: string | undefined;
      }
    | undefined;
  notes?: Record<string, string | number> | undefined;
  className?: string | undefined;
  buttonText?: string | undefined;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | undefined;
  disabled?: boolean | undefined;
  onSuccess?: ((result: RazorpayVerificationResult) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
}

export function RazorpayCheckoutButton({
  amount,
  currency = "INR",
  name = "SmrkoMed Healthcare",
  description = "Plan Subscription & Billing",
  prefill,
  notes,
  className,
  buttonText,
  variant = "default",
  disabled = false,
  onSuccess,
  onError,
  onCancel,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const formattedAmount = (amount / 100).toLocaleString("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const handleCheckout = async () => {
    if (loading || disabled) return;
    setLoading(true);

    try {
      await openRazorpayCheckout(
        {
          amount,
          currency,
          name,
          description,
          prefill,
          notes,
        },
        {
          onSuccess: (res) => {
            setLoading(false);
            onSuccess?.(res);
          },
          onError: (err) => {
            setLoading(false);
            onError?.(err);
          },
          onDismiss: () => {
            setLoading(false);
            onCancel?.();
          },
        },
      );
    } catch {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={disabled || loading}
      onClick={() => void handleCheckout()}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Processing Payment…
        </>
      ) : (
        <>
          <CreditCard className="mr-2 size-4" />
          {buttonText || `Pay with Razorpay (${formattedAmount})`}
        </>
      )}
    </Button>
  );
}
