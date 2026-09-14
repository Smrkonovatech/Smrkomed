"use client";

import { useState } from "react";
import { Globe2, ArrowRight, Mic, Sparkles, Languages, Check } from "lucide-react";

type LangCode = "ta" | "kn" | "te" | "hi" | "ml" | "mr" | "bn";

interface LangItem {
  code: LangCode;
  label: string;
  name: string;
}

const languages: LangItem[] = [
  { code: "ta", label: "தமிழ்", name: "Tamil" },
  { code: "kn", label: "ಕನ್ನಡ", name: "Kannada" },
  { code: "te", label: "తెలుగు", name: "Telugu" },
  { code: "hi", label: "हिन्दी", name: "Hindi" },
  { code: "ml", label: "മലയാളം", name: "Malayalam" },
  { code: "mr", label: "मराठी", name: "Marathi" },
  { code: "bn", label: "বাংলা", name: "Bengali" },
];

const speechSamples: Record<LangCode, { native: string; english: string }> = {
  ta: {
    native: "எனக்கு இன்று காலை லேசான வயிற்று வலி இருந்தது, ஊசி போட்ட பிறகு பரவாயில்லை.",
    english: "Patient reports mild morning abdominal discomfort following injection; symptoms now settled.",
  },
  kn: {
    native: "ನನಗೆ ಇವತ್ತು ಬೆಳಗ್ಗೆ ಸ್ವಲ್ಪ ಹೊಟ್ಟೆ ನೋವು ಇತ್ತು, ಇಂಜೆಕ್ಷನ್ ಆದ್ಮೇಲೆ ಪರವಾಗಿಲ್ಲ.",
    english: "Patient experienced mild abdominal pain this morning post-injection; stabilized now.",
  },
  te: {
    native: "నాకు ఈ ఉదయం కొద్దిగా కడుపు నొప్పి వచ్చింది, ఇంజెక్షన్ తర్వాత ఇప్పుడు తగ్గింది.",
    english: "Patient had slight abdominal pain after morning injection; currently asymptomatic.",
  },
  hi: {
    native: "मुझे आज सुबह थोड़ा पेट दर्द था, इंजेक्शन के बाद अब ठीक लग रहा है।",
    english: "Patient noted mild abdominal cramping post morning injection; condition improved.",
  },
  ml: {
    native: "ഇന്ന് രാവിലെ എനിക്ക് ചെറിയ വയറുവേദന ഉണ്ടായിരുന്നു, ഇൻജക്ഷന് ശേഷം കുഴപ്പമില്ല.",
    english: "Patient reported transient abdominal pain after morning dose; now comfortable.",
  },
  mr: {
    native: "मला आज सकाळी पोटात थोडे दुखत होते, इंजेक्शन नंतर आता बरे वाटत आहे.",
    english: "Patient experienced mild lower abdominal soreness after injection; now resolved.",
  },
  bn: {
    native: "আজ সকালে আমার একটু পেট ব্যাথা ছিল, ইনজেকশনের পরে এখন ঠিক আছি।",
    english: "Patient felt slight abdominal discomfort post injection; presently stable.",
  },
};

export function Multilingual() {
  const [selectedLang, setSelectedLang] = useState<LangItem>(languages[0] ?? { code: "ta", label: "தமிழ்", name: "Tamil" });

  const currentSample = speechSamples[selectedLang.code];

  return (
    <section className="py-16 sm:py-24 bg-slate-900 text-white overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-900/60 border border-purple-400/30 px-3.5 py-1 text-xs font-semibold text-purple-300 mb-3">
            <Languages className="h-3.5 w-3.5 text-cyan-400" />
            <span>Multilingual Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Healthcare that understands your language.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300 font-normal">
            Conversations can be captured, translated and understood across regional languages—helping care teams communicate more clearly.
          </p>
        </div>

        {/* Language Selection Chips */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {languages.map((lang) => {
            const isSelected = selectedLang.code === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  isSelected
                    ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30 scale-105"
                    : "bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60"
                }`}
              >
                <span>{lang.label}</span>
                <span className="text-[11px] opacity-75 font-normal">({lang.name})</span>
              </button>
            );
          })}
        </div>

        {/* Graphical Translation Workflow Showcase */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-10 backdrop-blur-xl">
          
          {/* Box 1: Patient Speaks in Regional Language */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                <Mic className="h-4 w-4 animate-pulse" />
                <span>Patient Voice / Message ({selectedLang.name})</span>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] text-slate-400 font-medium">
                Regional Native Audio
              </span>
            </div>

            <p className="mt-4 text-base sm:text-lg font-medium text-slate-100 leading-relaxed min-h-[64px]">
              &ldquo;{currentSample.native}&rdquo;
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Channel: WhatsApp Audio Note</span>
              <span className="text-emerald-400 font-mono">Captured 100%</span>
            </div>
          </div>

          {/* Center: Intelligence Translation Engine */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 shadow-lg shadow-purple-500/25">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs font-bold text-slate-200">Smrko AI</div>
              <div className="text-[10px] text-cyan-400">Clinical Semantic Parse</div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-600 hidden lg:block mt-2 rotate-0" />
          </div>

          {/* Box 2: Structured Clinical English Context for Doctor */}
          <div className="lg:col-span-5 rounded-2xl border border-purple-500/40 bg-slate-900/90 p-5 sm:p-6 shadow-xl shadow-purple-950/50">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <Globe2 className="h-4 w-4 text-purple-400" />
                <span>Clinical Summary (English)</span>
              </div>
              <span className="rounded-full bg-purple-950 px-2.5 py-0.5 text-[10px] text-purple-300 font-semibold border border-purple-800">
                EMR Ready
              </span>
            </div>

            <p className="mt-4 text-sm sm:text-base font-normal text-slate-200 leading-relaxed min-h-[64px]">
              {currentSample.english}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Recipient: Dr. Shreya / Care Team</span>
              <span className="text-purple-400 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Context Preserved
              </span>
            </div>
          </div>

        </div>

        {/* Reassurance Footer Pill */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Key Philosophy:</span> Patient speaks naturally in their mother tongue. SmrkoMed helps the care team understand without communication breakdown.
        </div>

      </div>
    </section>
  );
}
