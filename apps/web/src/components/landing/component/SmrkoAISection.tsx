import Image from "next/image";
import { Sparkles, Mic, Smile, Plus, Camera } from "lucide-react";

export function SmrkoAISection() {
  return (
    <section className="relative w-full bg-white py-10 lg:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* Main Blue Card */}
        <div className="relative w-full rounded-[40px] bg-gradient-to-br from-[#77D0F1] to-[#9CDDF4] h-[750px] lg:h-[650px] flex flex-col-reverse lg:flex-row items-center justify-end px-8 lg:px-20 py-12 lg:py-0 shadow-lg">

          {/* Lady Image Background Container (Clips to card corners) */}
          <div className="absolute inset-0 overflow-hidden rounded-[40px] z-0 pointer-events-none">
            <div className="absolute left-[-8%] lg:left-[2%] bottom-0 w-[95%] lg:w-[65%] max-w-[700px]">
              <Image
                src="/images/ai-lady.png"
                alt="Smrko AI"
                width={800}
                height={1000}
                className="w-full h-auto object-cover object-bottom"
              />
            </div>
          </div>

          {/* Floating Card: Multilingual Care */}
          <div className="hidden lg:block absolute top-[15%] left-[5%] z-20 w-[280px] bg-white/95 backdrop-blur-xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.06)] rounded-3xl p-6">
            <h4 className="text-[#1E293B] font-semibold mb-3 text-[15px]">Multilingual Care</h4>
            <div className="space-y-2 text-[10.5px] text-[#475569] leading-relaxed">
              <p>നിങ്ങളുടെ റിപ്പോർട്ട് തയ്യാറായി. ദയവായി പരിശോധിക്കുക.</p>
              <p>आपकी रिपोर्ट तैयार है. कृपया इसे देख लें.</p>
              <p>ನಿಮ್ಮ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ.</p>
              <p className="font-semibold text-[#0F172A] mt-3">Your report is ready. Please check it.</p>
            </div>
          </div>

          {/* Floating Card: Summarising your day (Overflowing left) */}
          <div className="hidden lg:flex absolute top-[50%] left-[-5%] z-20 items-center gap-3 bg-white shadow-[0_15px_30px_rgba(0,0,0,0.06)] rounded-full py-2.5 px-3 pr-6">
            <div className="w-10 h-10 rounded-full bg-[#00AEEF] flex justify-center items-center shrink-0 shadow-sm">
              <div className="flex gap-[2px] items-center">
                <div className="w-[2px] h-3 bg-white rounded-full animate-pulse" />
                <div className="w-[2px] h-4 bg-white rounded-full animate-pulse delay-75" />
                <div className="w-[2px] h-3 bg-white rounded-full animate-pulse delay-150" />
                <div className="w-[2px] h-2 bg-white rounded-full animate-pulse delay-200" />
              </div>
            </div>
            <span className="text-[#334155] text-[13px] font-medium whitespace-nowrap">Summarising your day....</span>
          </div>

          {/* Floating Card: AI-powered WhatsApp */}
          <div className="hidden lg:block absolute bottom-[8%] left-[15%] z-20 w-[310px] bg-white/95 backdrop-blur-xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.06)] rounded-[28px] p-6 pb-8">
            <div className="flex items-center gap-3 bg-white rounded-full py-2 px-3 mb-5 shadow-sm border border-slate-100">
              <Plus className="w-3.5 h-3.5 text-[#00AEEF]" />
              <span className="text-slate-300 text-[12px] flex-1">Hi....</span>
              <Smile className="w-3.5 h-3.5 text-slate-400" />
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <div className="w-6 h-6 bg-[#00BFA5] rounded-full flex items-center justify-center shrink-0">
                <Mic className="w-3 h-3 text-white" />
              </div>
            </div>
            <p className="text-[#1E293B] font-medium leading-[1.3] text-[17px]">
              AI-powered patient<br />conversations through<br />WhatsApp
            </p>
          </div>

          {/* Floating Language Pills (Right side overflowing) */}
          <div className="hidden lg:flex absolute top-[35%] right-[-4%] z-20 flex-col gap-4 items-end">
            <div className="bg-white shadow-[0_10px_20px_rgba(0,0,0,0.04)] rounded-full py-2 px-6 text-[#334155] text-[13px] font-medium transform -translate-x-10">
              Hello
            </div>
            <div className="bg-white shadow-[0_10px_20px_rgba(0,0,0,0.04)] rounded-full py-2 px-6 text-[#334155] text-[13px] font-medium transform translate-x-3">
              नमस्ते
            </div>
            <div className="bg-white shadow-[0_10px_20px_rgba(0,0,0,0.04)] rounded-full py-2 px-6 text-[#334155] text-[13px] font-medium transform -translate-x-12 mt-1">
              നമസ്കാരം
            </div>
            <div className="bg-white shadow-[0_10px_20px_rgba(0,0,0,0.04)] rounded-full py-2 px-6 text-[#334155] text-[13px] font-medium transform -translate-x-2 mt-1">
              வணக்கம்
            </div>
          </div>

          {/* Right Content */}
          <div className="relative z-30 w-full lg:w-[45%] flex flex-col items-center lg:items-start text-center lg:text-left mt-8 lg:mt-[-40px] lg:mr-[2%]">

            {/* Logo Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-flex-start text-[#1E293B] font-bold text-[32px] tracking-tight">
                <span className="italic mr-2 flex items-center font-black">
                  <Image src="/images/landing/smr-ai.svg" alt="Smrko AI Icon" width={40} height={40} className="w-10 h-10 object-contain" />
                </span>
                Smrko AI.
              </div>
            </div>

            <h2 className="text-[2.5rem] lg:text-[4.8rem] leading-[1.05] text-[#1E293B] font-normal tracking-tight mb-4 lg:mb-6">
              Intelligence <br className="hidden lg:block" />
              built <br className="hidden lg:block" />
              into care.
            </h2>

            <p className="text-[14px] sm:text-[15px] text-[#475569] leading-[1.6] mb-8 max-w-[380px]">
              AI supports the care journey through calls, WhatsApp, multilingual communication, summaries and structured follow-up.
            </p>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[#312E43] px-9 py-3 text-[14px] font-medium text-white shadow-xl hover:bg-slate-800 transition-colors w-full sm:w-auto min-w-[180px] mb-6"
            >
              Get a demo
            </button>

            {/* AI Calls Card (Moved here under the button) */}
            <div className="flex items-center gap-3 bg-white shadow-[0_15px_30px_rgba(0,0,0,0.06)] rounded-[20px] py-2.5 px-4 w-full sm:w-auto mt-2">
              <div className="w-10 h-10 bg-[#00AEEF] rounded-full flex items-center justify-center text-white font-bold italic shadow-sm text-base">
                SI
              </div>
              <div className="text-left">
                <p className="text-[#1E293B] font-semibold text-[14px]">AI Calls</p>
                <p className="text-[#64748B] text-[11px]">The right call. At the right time.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
