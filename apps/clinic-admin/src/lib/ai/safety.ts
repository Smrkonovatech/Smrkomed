import { AI_LIMITS } from "./config";

export function clipText(value: string, max = AI_LIMITS.maxToolResultChars): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n…[truncated]`;
}

export function sanitizeUserFacingError(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: string }).name);
    if (name === "AiConfigError") {
      return "Smrko AI is not configured yet. Ask your administrator to set OPENAI_API_KEY.";
    }
    if (name === "AiUserError") {
      return error instanceof Error ? error.message : "Unable to process that request.";
    }
  }
  return "Smrko AI is temporarily unavailable. Please try again.";
}

export function isMedicalDecisionRequest(text: string): boolean {
  return /\b(diagnos|prescrib|dosage|dose of|should i give|what medication|treat with)\b/i.test(
    text,
  );
}
