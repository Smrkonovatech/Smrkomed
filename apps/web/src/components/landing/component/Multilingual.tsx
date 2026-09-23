import Image from "next/image";

export function Multilingual() {
  const features = [
    {
      title: "Multiple language support",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "text-[#00AEEF]",
      bgColor: "bg-blue-50"
    },
    {
      title: "Natural voice conversations",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12h4l3-9 5 18 3-9h5" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      title: "Seamless understanding",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <section className="relative w-full bg-white py-10 lg:py-24 overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row items-center justify-between px-6 lg:px-12 gap-16 md:gap-8">

        {/* Left Content */}
        <div className="flex flex-col w-full md:w-[45%] z-10">
          <h2 className="text-[3rem] lg:text-[4rem] leading-[1.1] text-[#1E293B] mb-6 font-light tracking-tight">
            In your<br />
            Language
          </h2>
          <p className="text-[15px] text-slate-500 max-w-[400px] leading-[1.7] mb-12">
            Voice capture, real-time translation and<br />
            AI summaries make doctor–patient communication<br />
            easier for everyone.
          </p>

          <div className="flex flex-col gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-6">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${feature.bgColor} ${feature.color}`}>
                  {feature.icon}
                </div>
                <span className="text-[15px] font-medium text-[#1E293B]">
                  {feature.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content - Graphic */}
        <div className="w-full md:w-[55%] flex justify-end relative z-10 pt-10 md:pt-0">
          {/* Subtle background glow behind the image for depth */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#E8F5FF] rounded-full blur-[100px] opacity-50 -z-10"></div>
          
          <div className="relative w-full max-w-[700px] lg:scale-110 lg:origin-right flex items-center justify-center">
            <Image
              src="/images/landing/multi-languages.png"
              alt="Multilingual voice capture device with real-time translation"
              width={800}
              height={700}
              className="w-full h-auto drop-shadow-2xl object-contain relative z-10"
              priority
            />

            {/* Floating Language Pills */}
            <div className="absolute top-[18%] left-[10%] z-20 px-6 py-2.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1E293B] font-medium text-[13px] animate-float scale-[0.65] sm:scale-100 origin-left">
              नमस्ते
            </div>
            
            <div className="absolute top-[15%] right-[25%] z-20 px-6 py-2.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1E293B] font-medium text-[13px] animate-float scale-[0.65] sm:scale-100 origin-bottom" style={{ animationDelay: '0.5s' }}>
              Hello
            </div>
            
            <div className="absolute top-[32%] left-[0%] lg:-left-[5%] z-20 px-6 py-2.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1E293B] font-medium text-[13px] animate-float scale-[0.65] sm:scale-100 origin-left" style={{ animationDelay: '1s' }}>
              നമസ്കാരം
            </div>

            <div className="absolute top-[48%] left-[2%] lg:left-[5%] z-20 px-6 py-2.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1E293B] font-medium text-[13px] animate-float scale-[0.65] sm:scale-100 origin-left" style={{ animationDelay: '1.5s' }}>
              வணக்கம்
            </div>

            <div className="absolute top-[65%] left-[5%] lg:left-[10%] z-20 px-6 py-2.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1E293B] font-medium text-[13px] animate-float scale-[0.65] sm:scale-100 origin-left" style={{ animationDelay: '2s' }}>
              ನಮಸ್ಕಾರ
            </div>

            <div className="absolute bottom-[20%] right-[10%] lg:right-[15%] z-20 px-6 py-2.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1E293B] font-medium text-[13px] animate-float scale-[0.65] sm:scale-100 origin-right" style={{ animationDelay: '2.5s' }}>
              నమస్తే
            </div>

            {/* Floating Task Box */}
            <div className="absolute top-[35%] right-[-2%] lg:right-[5%] z-30 w-[240px] rounded-[20px] border border-white/50 bg-white/40 backdrop-blur-xl p-4 shadow-xl flex flex-col gap-3 scale-[0.8] sm:scale-100 origin-right">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-indigo-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="text-[13px] font-bold text-[#1E293B]">3 Tasks Identified</span>
              </div>
              
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-[4px] bg-white border border-white/60"></div>
                    <span className="text-[11px] font-medium text-[#1E293B]/80">Repeat CBC</span>
                 </div>
                 <span className="text-[10px] font-bold text-indigo-600">Tomorrow</span>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-[4px] bg-white border border-white/60"></div>
                    <span className="text-[11px] font-medium text-[#1E293B]/80">Call patient</span>
                 </div>
                 <span className="text-[10px] font-bold text-indigo-600">Friday</span>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-[4px] bg-white border border-white/60"></div>
                    <span className="text-[11px] font-medium text-[#1E293B]/80">Review scan</span>
                 </div>
                 <span className="text-[10px] font-bold text-slate-400">Doctor</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
