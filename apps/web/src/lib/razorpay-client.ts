export interface RazorpayOptions {
  amount: number; // in paise (e.g. 500000 for ₹5000)
  currency?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
  prefill?:
    | {
        name?: string | undefined;
        email?: string | undefined;
        contact?: string | undefined;
      }
    | undefined;
  notes?: Record<string, string | number> | undefined;
  theme?:
    | {
        color?: string | undefined;
      }
    | undefined;
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerificationResult {
  success: boolean;
  message?: string | undefined;
  order_id: string;
  payment_id: string;
  error?: string | undefined;
}

interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string | undefined;
  error?: string | undefined;
}

/**
 * Loads the Razorpay standard checkout.js script asynchronously.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay checkout script.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

async function requestOrderCreation(options: RazorpayOptions): Promise<CreateOrderResponse> {
  const orderRes = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: options.amount,
      currency: options.currency || "INR",
      notes: options.notes,
    }),
  });

  const orderData = (await orderRes.json().catch(() => null)) as CreateOrderResponse | null;

  if (!orderRes.ok || !orderData?.success || !orderData.order_id) {
    const errMsg = orderData?.error || `Order creation failed (${orderRes.status})`;
    throw new Error(errMsg);
  }

  return orderData;
}

/**
 * Initiates Razorpay checkout:
 * 1. Calls /api/create-order
 * 2. Opens Razorpay Modal with order_id
 * 3. On success, calls /api/verify-payment
 */
export async function openRazorpayCheckout(
  options: RazorpayOptions,
  callbacks?: {
    onSuccess?: ((result: RazorpayVerificationResult) => void) | undefined;
    onError?: ((error: Error) => void) | undefined;
    onDismiss?: (() => void) | undefined;
  } | undefined,
): Promise<RazorpayVerificationResult> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    const err = new Error("Could not load Razorpay SDK. Please check your internet connection.");
    callbacks?.onError?.(err);
    throw err;
  }

  let orderData: CreateOrderResponse;
  try {
    orderData = await requestOrderCreation(options);
  } catch (e) {
    const err = e instanceof Error ? e : new Error("Failed to communicate with order server.");
    callbacks?.onError?.(err);
    throw err;
  }

  const keyId =
    process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"] ||
    orderData.key_id ||
    "rzp_test_TcYdEzKDyLHssH";

  return new Promise((resolve, reject) => {
    const rzpOptions = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: options.name || "SmrkoMed Healthcare",
      description: options.description || "Healthcare & Clinic Plan Subscription",
      image: options.image || "https://smrkomed.com/logo.png",
      order_id: orderData.order_id,
      prefill: {
        name: options.prefill?.name || "",
        email: options.prefill?.email || "",
        contact: options.prefill?.contact || "",
      },
      notes: options.notes || {},
      theme: {
        color: options.theme?.color || "#7c3aed",
      },
      handler: async (response: RazorpayPaymentSuccessResponse) => {
        try {
          // 2. Verify signature on backend
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = (await verifyRes.json().catch(() => null)) as {
            success?: boolean;
            message?: string;
            order_id?: string;
            payment_id?: string;
            error?: string;
          } | null;

          if (!verifyRes.ok || !verifyData?.success) {
            const err = new Error(verifyData?.error || "Payment signature verification failed.");
            callbacks?.onError?.(err);
            reject(err);
            return;
          }

          const result: RazorpayVerificationResult = {
            success: true,
            message: verifyData.message || "Payment verified successfully",
            order_id: verifyData.order_id || response.razorpay_order_id,
            payment_id: verifyData.payment_id || response.razorpay_payment_id,
          };

          callbacks?.onSuccess?.(result);
          resolve(result);
        } catch (error) {
          const err = error instanceof Error ? error : new Error("Error verifying payment");
          callbacks?.onError?.(err);
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          callbacks?.onDismiss?.();
          reject(new Error("Payment cancelled by user."));
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay(rzpOptions);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rzp.on("payment.failed", (response: any) => {
      const failureMsg = response?.error?.description || "Payment failed at gateway";
      const err = new Error(failureMsg);
      callbacks?.onError?.(err);
      reject(err);
    });

    rzp.open();
  });
}
