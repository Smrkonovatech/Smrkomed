const FLAG_KEY = "smrkomed:enter-fullscreen";

export function markFullscreenAfterLogin() {
  try {
    sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

export function consumeFullscreenAfterLoginFlag(): boolean {
  try {
    const value = sessionStorage.getItem(FLAG_KEY);
    if (value) sessionStorage.removeItem(FLAG_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export function isDocumentFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

/** Enter browser full screen (hides chrome). Must run from a user gesture when possible. */
export async function enterAppFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (isDocumentFullscreen()) return true;

  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function exitAppFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;
  if (!isDocumentFullscreen()) return;
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
  } catch {
    // ignore
  }
}
