type FbAuthResponse = { code?: string } | null;
type FbLoginResponse = { authResponse: FbAuthResponse; status?: string };

type EmbeddedSignupSession = {
  wabaId?: string;
  phoneNumberId?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (input: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: FbLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function normalizeGraphVersion(version: string) {
  return version.startsWith("v") ? version : `v${version}`;
}

function loadFacebookSdk(appId: string, graphVersion: string) {
  const version = normalizeGraphVersion(graphVersion);
  return new Promise<void>((resolve, reject) => {
    const init = () => {
      if (!window.FB) {
        reject(new Error("Facebook SDK is not available."));
        return;
      }
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    };

    if (window.FB) {
      init();
      return;
    }

    const previousInit = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      previousInit?.();
      init();
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      // Script tag present but FB may still be loading — wait briefly.
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (window.FB) {
          window.clearInterval(timer);
          init();
        } else if (attempts > 50) {
          window.clearInterval(timer);
          reject(new Error("Unable to connect to Meta right now. Please try again."));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onerror = () => reject(new Error("Unable to connect to Meta right now. Please try again."));
    document.body.appendChild(script);
  });
}

function listenForSession(signal: AbortSignal): Promise<EmbeddedSignupSession> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (signal.aborted) return;
      // Meta posts from facebook.com / business.facebook.com origins.
      if (typeof event.origin === "string" && !event.origin.includes("facebook.com")) return;
      const data = event.data as { type?: string; event?: string; data?: Record<string, string> };
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      const eventName = String(data.event ?? "");
      if (eventName && !eventName.startsWith("FINISH") && eventName !== "FINISH") return;
      cleanup();
      resolve({
        ...(data.data?.["waba_id"] ? { wabaId: data.data["waba_id"] } : {}),
        ...(data.data?.["phone_number_id"] ? { phoneNumberId: data.data["phone_number_id"] } : {}),
      });
    };

    const onAbort = () => {
      cleanup();
      resolve({});
    };

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
    };

    window.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * Official Meta WhatsApp Embedded Signup via Facebook JS SDK.
 * Permissions/assets come from the Login for Business configuration (config_id), not from invented scopes.
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation/
 */
export async function runWhatsAppEmbeddedSignup(input: {
  appId: string;
  configId: string;
  graphVersion: string;
}) {
  await loadFacebookSdk(input.appId, input.graphVersion);

  if (!window.FB) {
    throw new Error("Unable to connect to Meta right now. Please try again.");
  }

  const abort = new AbortController();
  const sessionPromise = listenForSession(abort.signal);

  const code = await new Promise<string>((resolve, reject) => {
    window.FB!.login(
      (response) => {
        const value = response.authResponse?.code;
        if (!value) {
          reject(new Error("WhatsApp authorization was cancelled."));
          return;
        }
        resolve(value);
      },
      {
        config_id: input.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
        },
      },
    );
  });

  // Prefer session IDs from WA_EMBEDDED_SIGNUP postMessage; do not block forever if Meta only returns the code.
  const session = await Promise.race([
    sessionPromise,
    new Promise<EmbeddedSignupSession>((resolve) => {
      window.setTimeout(() => resolve({}), 2_500);
    }),
  ]);
  abort.abort();

  return { code, wabaId: session.wabaId, phoneNumberId: session.phoneNumberId };
}
