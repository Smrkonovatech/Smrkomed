/** Supported consultation languages for Voice Notes (Google Speech & Whisper language hint). */
export const CONSULTATION_LANGUAGES = [
  { code: "en", label: "English", whisper: "en", bcp47: "en-IN" },
  { code: "kn", label: "Kannada", whisper: "kn", bcp47: "kn-IN" },
  { code: "hi", label: "Hindi", whisper: "hi", bcp47: "hi-IN" },
  { code: "ta", label: "Tamil", whisper: "ta", bcp47: "ta-IN" },
  { code: "ml", label: "Malayalam", whisper: "ml", bcp47: "ml-IN" },
] as const;

export type ConsultationLanguageCode = (typeof CONSULTATION_LANGUAGES)[number]["code"];

export function whisperLanguageFor(code: ConsultationLanguageCode | string | undefined) {
  return CONSULTATION_LANGUAGES.find((lang) => lang.code === code)?.whisper;
}

export function googleLocaleFor(code: ConsultationLanguageCode | string | undefined): string {
  return CONSULTATION_LANGUAGES.find((lang) => lang.code === code)?.bcp47 ?? "en-IN";
}

