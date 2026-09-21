import Image from "next/image";

interface HeroBannerProps {
  onOpenDemo?: () => void;
}

export function HeroBanner({ onOpenDemo }: HeroBannerProps = {}) {
  return (
    <section className="relative w-full pt-24 pb-10 lg:pt-40 lg:pb-32">
      {/* Subtle Background Glow/Gradient */}
      {/* <div className="absolute inset-0 bg-gradient-to-br from-[#00AEEF] to-[#0095CC] opacity-80" />+ */}

      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-12 px-6 lg:flex-row relative z-30">
        {/* Left Side: Image & Floating Elements */}
        <div className="relative w-full max-w-lg lg:w-[55%]">
          {/* Main Lady Image */}
          <div className="relative z-10 flex justify-center">
            <Image
              src="/images/landing/banner.png"
              alt="Doctor using SmrkoMed platform"
              width={550}
              height={700}
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>

          {/* Floating UI: Today's Appointments */}
          <div className="absolute left-2 lg:left-6 xl:-left-4 top-12 z-30 flex flex-col rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between gap-6">
              <span className="text-[13px] leading-tight text-white/90">Today's<br />Appointments</span>
              <div className="h-6 w-6 rounded bg-white/20 p-1">
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-5xl font-bold tracking-tight text-white">12</span>
              <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#00AEEF] shadow-sm cursor-pointer hover:scale-105 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="10 5 19 5 19 14"></polyline></svg>
              </div>
            </div>
          </div>

          {/* Floating UI: Patient Confirmed */}
          <div className="absolute left-2 lg:left-4 xl:-left-4 top-[45%] z-30 flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md shadow-lg">
            <span className="text-[11px] font-medium text-[#1E293B]/90">Patient Confirmed</span>
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>

          {/* Floating UI: Patient Record Updated */}
          <div 
            className="absolute left-2 lg:left-0 xl:-left-8 top-[60%] z-30 flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md shadow-lg"
            style={{ animation: 'floatAnim 4s ease-in-out infinite' }}
          >
            <span className="text-[11px] font-medium leading-tight text-[#1E293B]/90 text-right">Patient record updated<br />Lab results synced to EMR</span>
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>

          {/* Floating UI: Care Task Completed */}
          <div className="absolute right-2 lg:right-[-1rem] bottom-[25%] z-30 flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md shadow-lg">
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="text-[11px] font-medium text-[#1E293B]/90">Care task completed</span>
          </div>

          {/* Floating UI: AI Summary Ready */}
          <div
            className="absolute bottom-4 left-[10%] lg:left-[20%] z-40 flex items-center gap-4 rounded-full border border-white/30 bg-white/20 p-2 pr-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            style={{ animation: 'floatAnim 3.5s ease-in-out infinite' }}
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#2A2B3D]">
              {/* Outer Glow */}
              <div className="absolute inset-0 rounded-full bg-[#2A2B3D] opacity-40 blur-md"></div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
            </div>
            <span className="text-[13px] font-medium text-[#1E293B]/95">AI Summary Ready</span>
            <a href="#" className="text-[11px] font-semibold text-[#1E293B]/80 underline decoration-[#1E293B]/40 underline-offset-4 hover:text-[#1E293B] transition-colors">View</a>
          </div>
        </div>

        {/* Right Side: Text & CTA */}
        <div className="w-full max-w-xl lg:w-[45%] relative z-30 text-center lg:text-left">
          <h1 className="text-[2.5rem] sm:text-[3rem] font-light leading-[1.1] tracking-tight text-[#1E293B] lg:text-[4.5rem]">
            One <br className="hidden lg:block" />
            <span className="font-bold text-white drop-shadow-sm">Connected</span> <br className="hidden lg:block" />
            <span className="font-light text-[#1E293B]">Platform</span>
          </h1>
          <p className="mt-3 lg:mt-5 text-lg sm:text-xl lg:text-2xl font-light text-[#1E293B]/90">
            for Every Modern Healthcare Need
          </p>
          <p className="mt-4 lg:mt-8 text-[14px] lg:text-[15px] leading-relaxed text-[#1E293B]/80 max-w-[420px] mx-auto lg:mx-0">
            SmrkoMed brings clinical care, care teams, patient communication, workflows, and intelligence together in one seamless healthcare platform.
          </p>
          <div className="mt-6 lg:mt-10 flex justify-center lg:justify-start">
            <button
              type="button"
              onClick={onOpenDemo}
              className="rounded-full bg-[#2A2B3D] px-9 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-xl cursor-pointer"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Overlays */}
      <img
        src="/images/landing/banner-cloud-left.svg"
        alt=""
        className="pointer-events-none absolute -bottom-[30%] left-0 w-[65%] lg:w-[55%] z-20 h-auto"
      />
      <img
        src="/images/landing/banner-cloud-right.svg"
        alt=""
        className="pointer-events-none absolute -bottom-[20%] right-0 w-[65%] lg:w-[55%] z-20 h-auto"
      />
    </section>
  );
}
