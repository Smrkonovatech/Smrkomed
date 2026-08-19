type FbAuthResponse = { code?: string } | null;
type FbLoginResponse = { authResponse: FbAuthResponse };

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

function loadFacebookSdk(appId: string, graphVersion: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: false, version: graphVersion });
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version: graphVersion });
      resolve();
    };
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onerror = () => reject(new Error("Facebook SDK could not be loaded."));
    document.body.appendChild(script);
  });
}

function listenForSession(): Promise<EmbeddedSignupSession> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; event?: string; data?: Record<string, string> };
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (data.event && !String(data.event).startsWith("FINISH")) return;
      window.removeEventListener("message", onMessage);
      resolve({
        ...(data.data?.["waba_id"] ? { wabaId: data.data["waba_id"] } : {}),
        ...(data.data?.["phone_number_id"] ? { phoneNumberId: data.data["phone_number_id"] } : {}),
      });
    };
    window.addEventListener("message", onMessage);
    setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve({});
    }, 5 * 60 * 1000);
  });
}

export async function runWhatsAppEmbeddedSignup(input: {
  appId: string;
  configId: string;
  graphVersion: string;
}) {
  await loadFacebookSdk(input.appId, input.graphVersion.replace(/^v/, "v"));
  const sessionPromise = listenForSession();
  const code = await new Promise<string>((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK is not available."));
      return;
    }
    window.FB.login(
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
        extras: { setup: {} },
      },
    );
  });
  const session = await sessionPromise;
  return { code, wabaId: session.wabaId, phoneNumberId: session.phoneNumberId };
}
