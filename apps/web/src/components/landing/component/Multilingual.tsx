import Image from "next/image";

export function Multilingual() {
  const features = [
    {
      title: "Multiple language support",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "text-[#00AEEF]",
      bgColor: "bg-blue-50"
    },
    {
      title: "Natural voice conversations",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12h4l3-9 5 18 3-9h5" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      title: "Seamless understanding",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <section className="relative w-full bg-white py-10 lg:py-24 overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row items-center justify-between px-6 lg:px-12 gap-16 lg:gap-8">
        
        {/* Left Content */}
        <div className="flex flex-col w-full lg:w-[45%] z-10">
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
        <div className="w-full lg:w-[55%] flex justify-end relative z-10">
          {/* Subtle background glow behind the image for depth */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#E8F5FF] rounded-full blur-[100px] opacity-50 -z-10"></div>
          
          <Image 
            src="/images/landing/multi-language.png" 
            alt="Multilingual voice capture device with real-time translation"
            width={800}
            height={700}
            className="w-full max-w-[700px] h-auto drop-shadow-2xl object-contain lg:scale-110 lg:origin-right"
            priority
          />
        </div>

      </div>
    </section>
  );
}
