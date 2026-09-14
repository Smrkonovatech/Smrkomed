/** Supported consultation languages for Voice Notes (Whisper language hint). */
export const CONSULTATION_LANGUAGES = [
  { code: "en", label: "English", whisper: "en" },
  { code: "hi", label: "Hindi", whisper: "hi" },
  { code: "kn", label: "Kannada", whisper: "kn" },
  { code: "ta", label: "Tamil", whisper: "ta" },
  { code: "ml", label: "Malayalam", whisper: "ml" },
] as const;

export type ConsultationLanguageCode = (typeof CONSULTATION_LANGUAGES)[number]["code"];

export function whisperLanguageFor(code: ConsultationLanguageCode | string | undefined) {
  return CONSULTATION_LANGUAGES.find((lang) => lang.code === code)?.whisper;
}
