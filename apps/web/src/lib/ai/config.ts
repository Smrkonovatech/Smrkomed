export const AI_MODEL = process.env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini";
export const AI_TRANSCRIBE_MODEL = process.env["OPENAI_TRANSCRIBE_MODEL"]?.trim() || "whisper-1";

export const AI_LIMITS = {
  maxMessages: 24,
  maxMessageChars: 4000,
  maxTranscriptChars: 40_000,
  maxToolResultChars: 12_000,
  maxToolCalls: 6,
} as const;

export function getOpenAIApiKey(): string | null {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  return key || null;
}

export function assertOpenAIConfigured(): string {
  const key = getOpenAIApiKey();
  if (!key) {
    throw new AiConfigError("OPENAI_API_KEY is not configured.");
  }
  return key;
}

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

export class AiUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUserError";
  }
}
