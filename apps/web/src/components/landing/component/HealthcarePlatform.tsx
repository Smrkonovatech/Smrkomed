import Image from "next/image";
import { useState } from "react";

const tabs = ["Clinical", "Care", "Operations", "Clinical", "Clinical", "Clinical"];

export function HealthcarePlatform() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="relative w-full bg-white pt-24 pb-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 relative z-10">

        {/* Heading Section */}
        <div className="text-center mb-8">
          <h2 className="text-[2.75rem] leading-[1.1] text-[#0B1221] mb-4">
            <span className="font-semibold">Everything your healthcare</span>
            <br />
            <span className="font-light">organisation needs</span>
          </h2>
          <p className="text-[15px] text-slate-500 max-w-md mx-auto leading-relaxed">
            From clinical care to daily operations<br />all connected seamlessly without clutter.
          </p>
        </div>

        {/* Pill Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 rounded-full border px-5 py-2 text-[13px] font-medium transition-colors ${activeTab === index
                ? "bg-[#D9F1FF] border-[#BBE3FB] text-[#1E293B]"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
            >
              {/* Simple generic SVG for the tab icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              {tab}
            </button>
          ))}
        </div>

        {/* Cards Container - Sticky Stack */}
        <div className="relative w-full max-w-[1100px] flex flex-col gap-[30vh] lg:gap-[50vh] pb-[20vh] lg:pb-[30vh]">

          {/* CARD 1: Clinical */}
          <div
            className="sticky top-[150px] w-full overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-2xl transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #00AEEF 0%, #FFFFFF 100%)", zIndex: 1 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-10 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[13px] font-medium text-[#1E293B] mb-4">Doctor Workspace</span>
              <h3 className="text-4xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-6">
                Clinical Care &<br />Patient 360
              </h3>
              <p className="text-[14px] text-[#1E293B]/80 mb-8 max-w-[320px] leading-relaxed">
                From clinical care to daily operations<br />all connected seamlessly without clutter.
              </p>

              <ul className="flex flex-col gap-4 mb-10">
                {["Patient Management", "Consultations", "Clinical Records", "Medications", "Reports", "Diagnostics"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-8 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Explore Clinical Care
              </button>
            </div>

            {/* Right Image & Floating UI */}
            <div className="w-full lg:w-[55%] relative min-h-[400px] lg:min-h-[600px] flex items-end justify-center lg:justify-end pr-0 lg:pr-8">
              <div className="relative w-full max-w-[600px] h-full flex items-end">
                <Image
                  src="/images/landing/healthcare/clinic.png"
                  alt="Doctor looking at digital records"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-auto drop-shadow-2xl relative z-10"
                  priority
                />

                {/* 1. Today's Appointments */}
                <div className="absolute -left-[5%] lg:left-[0%] top-[15%] lg:top-[20%] z-20 flex flex-col rounded-3xl border border-white/20 bg-white/20 p-5 backdrop-blur-md shadow-lg w-[180px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[13px] font-medium text-white/90 leading-tight">Today's<br />Appointments</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-5xl font-light text-white">08</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#00AEEF] shadow-sm cursor-pointer hover:scale-105 transition-transform">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    </div>
                  </div>
                </div>

                {/* 2. Schedule List */}
                <div className="absolute -left-[10%] lg:-left-[5%] top-[45%] lg:top-[50%] z-0 flex flex-col rounded-2xl border border-white/20 bg-white/20 p-4 backdrop-blur-md shadow-lg w-[220px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-white rounded-md px-2 py-1">
                      <span className="text-[10px] font-bold text-[#00AEEF]">10</span>
                      <span className="text-[10px] font-medium text-slate-600">Sep 2026</span>
                    </div>
                    <span className="text-[10px] font-medium text-white bg-white/20 rounded-full px-2 py-0.5">3 tasks</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] mt-1.5"></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/90">09:30 AM</span>
                          <span className="text-[10px] font-medium text-[#00AEEF] bg-[#00AEEF]/20 rounded px-1">Ultrasound</span>
                        </div>
                        <span className="text-[11px] font-medium text-white block">Ultrasound Scan</span>
                        <span className="text-[9px] text-white/70">Patient: Sarah</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] mt-1.5"></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/90">11:00 AM</span>
                        </div>
                        <span className="text-[11px] font-medium text-white block">Blood Test (E2, LH)</span>
                        <span className="text-[9px] text-white/70">Patient: Emma</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5"></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/90">04:00 PM</span>
                        </div>
                        <span className="text-[11px] font-medium text-white block">Doctor Review</span>
                        <span className="text-[9px] text-white/70">Patient: Beth</span>
                      </div>
                    </div>
                  </div>

                  <button className="mt-4 w-full rounded-full bg-white/30 py-1.5 text-[10px] font-medium text-white hover:bg-white/40 transition-colors">
                    + Add Task for 10th
                  </button>
                </div>

                {/* 3. Patient record updated */}
                <div className="absolute -left-[20%] lg:-left-[15%] bottom-[20%] lg:bottom-[25%] z-20 flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-medium leading-tight text-[#1E293B] block">Patient record updated</span>
                    <span className="text-[10px] text-[#1E293B]/60">Lab results synced to EMR</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>

                {/* 4. Patient need review */}
                <div className="absolute left-[30%] lg:left-[40%] bottom-[8%] z-30 flex items-center gap-3 rounded-full border border-white/40 bg-white/30 p-1 pr-4 backdrop-blur-xl shadow-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-light text-[#00AEEF] shadow-sm">
                    2
                  </div>
                  <span className="text-[12px] font-medium text-[#1E293B]">Patient need review</span>
                  <button className="text-[11px] font-semibold text-[#1E293B]/70 underline underline-offset-2 hover:text-[#1E293B]">View</button>
                </div>

              </div>
            </div>
          </div>


          {/* CARD 2: Care */}
          <div
            className="sticky top-[220px] w-full overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-2xl transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #D4C4FA 0%, #FFFFFF 100%)", zIndex: 2 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-10 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[13px] font-medium text-[#1E293B] mb-4">Coordination Engine</span>
              <h3 className="text-4xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-6">
                Care journeys<br />& execution
              </h3>
              <p className="text-[14px] text-[#1E293B]/80 mb-8 max-w-[320px] leading-relaxed">
                From clinical care to daily operations<br />all connected seamlessly without clutter.
              </p>

              <ul className="flex flex-col gap-4 mb-10">
                {["Patient Management", "Consultations", "Clinical Records", "Medications", "Reports", "Diagnostics"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-8 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Request a walk thorugh
              </button>
            </div>

            {/* Right Image */}
            <div className="w-full lg:w-[55%] relative min-h-[400px] lg:min-h-[600px] flex items-end justify-center lg:justify-end pr-0 lg:pr-8">
              <div className="relative w-full max-w-[600px] h-full flex items-end">
                <Image
                  src="/images/landing/healthcare/care.png"
                  alt="Couple reviewing care plan"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-auto drop-shadow-2xl relative z-10"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
