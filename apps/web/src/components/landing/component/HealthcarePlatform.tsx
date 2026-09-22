import Image from "next/image";
import { useState } from "react";

const tabs = ["Clinical", "Care", "Operations", "Communication", "Billing", "Smrko AI", "Ecosystem"];

export function HealthcarePlatform() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="relative w-full bg-white pt-12 lg:pt-24 pb-12 lg:pb-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 relative z-10">

        {/* Heading Section */}
        <div className="text-center mb-6 lg:mb-8">
          <h2 className="text-3xl lg:text-[2.75rem] leading-[1.1] text-[#0B1221] mb-3 lg:mb-4">
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
              className={`flex items-center gap-2 rounded-full border px-5 py-2 text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${activeTab === index
                ? "bg-[#D9F1FF] border-[#BBE3FB] text-[#1E293B] shadow-sm"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
            >
              {/* Simple generic SVG for the tab icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${activeTab === index ? 'scale-110 text-[#00AEEF]' : ''}`}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              {tab}
            </button>
          ))}
        </div>

        {/* Cards Container - Sticky Stack */}
        <div className="relative w-full max-w-[1100px] flex flex-col gap-[25vh] lg:gap-[50vh] pb-[5vh] lg:pb-[30vh]">

          {/* CARD 1: Clinical */}
          <div
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #00AEEF 0%, #FFFFFF 100%)", zIndex: 1 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">Doctor Workspace</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Clinical Care &<br />Patient 360
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                From clinical care to daily operations, keep every part of the patient journey connected.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["Patient Management", "Consultations", "Clinical Records", "Medications", "Reports", "Diagnostics"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Explore Clinical Care
              </button>
            </div>

            {/* Right Image & Floating UI */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-center lg:justify-end pr-0 lg:pr-8 overflow-hidden lg:overflow-visible pt-2 lg:pt-0">
              <div className="relative w-full max-w-[480px] h-full flex items-end">
                <Image
                  src="/images/landing/healthcare/clinic.png"
                  alt="Doctor looking at digital records"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-10"
                  priority
                />

                {/* 1. Today's Appointments */}
                <div className="absolute left-[0%] lg:left-[0%] top-[10%] sm:top-[15%] lg:top-[20%] z-20 flex flex-col rounded-3xl border border-white/20 bg-white/20 p-5 backdrop-blur-md shadow-lg w-[180px] scale-[0.7] sm:scale-100 origin-left">
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
                <div className="absolute left-[0%] sm:-left-[10%] lg:-left-[5%] top-[40%] lg:top-[50%] z-0 flex flex-col rounded-2xl border border-white/20 bg-white/20 p-4 backdrop-blur-md shadow-lg w-[220px] scale-[0.7] sm:scale-100 origin-left">
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
                <div className="absolute hidden sm:flex -left-[20%] lg:-left-[15%] bottom-[20%] lg:bottom-[25%] z-20 items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-medium leading-tight text-[#1E293B] block">Patient record updated</span>
                    <span className="text-[10px] text-[#1E293B]/60">Lab results synced to EMR</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>

                {/* 4. Patient need review */}
                <div className="absolute left-[10%] sm:left-[30%] lg:left-[40%] bottom-[5%] sm:bottom-[8%] z-30 flex items-center gap-3 rounded-full border border-white/40 bg-white/30 p-1 pr-4 backdrop-blur-xl shadow-lg scale-[0.75] sm:scale-100 origin-bottom">
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
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #D4C4FA 0%, #FFFFFF 100%)", zIndex: 2 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">Coordination Engine</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Care Journeys &<br />Execution
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                Plan, coordinate and track every step of the patient’s care journey.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["Care Plans", "Care Tasks", "Treatment Milestones", "Patient Follow-ups", "Escalations", "Patient Notifications"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Request a walk thorugh
              </button>
            </div>

            {/* Right Image */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-center lg:justify-end pr-0 lg:pr-8 overflow-hidden lg:overflow-visible pt-2 lg:pt-0">
              <div className="relative w-full max-w-[480px] h-full flex items-end">
                
                {/* Purple glowing arch behind */}
                <div className="absolute top-[10%] left-[5%] right-[5%] h-[80%] rounded-t-full border-t-[15px] border-l-[15px] border-r-[15px] border-[#A855F7]/30 blur-2xl z-0 pointer-events-none"></div>

                <Image
                  src="/images/landing/healthcare/care.png"
                  alt="Couple reviewing care plan"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-40"
                />

                {/* Main Care Plan Glass Card */}
                <div className="absolute left-[-5%] sm:left-[-15%] lg:left-[-10%] top-[5%] lg:top-[15%] z-30 flex flex-col rounded-[24px] border border-white/40 bg-white/40 p-5 backdrop-blur-xl shadow-lg w-[240px] scale-[0.65] sm:scale-100 origin-left">
                  <div className="mb-4">
                    <span className="text-[9px] font-bold text-[#9333EA] tracking-wider uppercase">Active Care Plan</span>
                    <h4 className="text-[15px] font-semibold text-[#1E293B]">IVF Treatment</h4>
                    <div className="mt-2 w-full bg-white/50 rounded-full h-1 overflow-hidden">
                      <div className="bg-[#9333EA] h-full w-[60%] rounded-full"></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] font-medium text-[#1E293B]/70">
                      <span>Stage 08 — Monitoring Scan</span>
                      <span>8/15</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-3">
                    {/* Stat Item: 14 Care Tasks */}
                    <div className="flex items-center gap-3 bg-white/50 rounded-[14px] p-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-[#8B5CF6]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1E293B] leading-none">14</span>
                        <span className="text-[9px] text-[#1E293B]/70">Care Tasks scheduled</span>
                      </div>
                    </div>
                    
                    {/* Stat Item: 12 Completed */}
                    <div className="flex items-center gap-3 bg-white/50 rounded-[14px] p-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-[#10B981]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1E293B] leading-none">12</span>
                        <span className="text-[9px] text-[#1E293B]/70">Completed</span>
                      </div>
                    </div>

                    {/* Stat Item: 2 Upcoming */}
                    <div className="flex items-center gap-3 bg-white/50 rounded-[14px] p-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-[#F59E0B]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1E293B] leading-none">2</span>
                        <span className="text-[9px] text-[#1E293B]/70">Upcoming</span>
                      </div>
                    </div>

                    {/* Stat Item: 0 Escalations */}
                    <div className="flex items-center gap-3 bg-white/50 rounded-[14px] p-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-[#EF4444]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[#1E293B] leading-none">0</span>
                        <span className="text-[9px] text-[#1E293B]/70">Escalations</span>
                      </div>
                    </div>
                  </div>

                  {/* Next Follow up */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/20">
                     <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00AEEF] text-white shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] text-[#1E293B]/60 font-medium">Next Follow-up</span>
                        <span className="text-[11px] font-bold text-[#1E293B]">Friday, 20 Sep</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-[#10B981]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Patient notified
                  </div>
                </div>

                {/* Floating Icons Arch */}
                <div className="absolute top-[10%] left-[25%] z-10 flex flex-col items-center gap-1 scale-[0.75] sm:scale-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/30 backdrop-blur-md shadow-lg text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <span className="text-[9px] font-medium text-[#1E293B]">Review</span>
                </div>

                <div className="absolute top-[5%] left-[55%] z-10 flex flex-col items-center gap-1 scale-[0.75] sm:scale-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/30 backdrop-blur-md shadow-lg text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                  <span className="text-[9px] font-medium text-[#1E293B]">Scan</span>
                </div>

                <div className="absolute top-[15%] right-[10%] lg:right-[5%] z-10 flex flex-col items-center gap-1 scale-[0.75] sm:scale-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/30 backdrop-blur-md shadow-lg text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="6" rx="3" ry="3"></rect><line x1="12" y1="9" x2="12" y2="15"></line></svg>
                  </div>
                  <span className="text-[9px] font-medium text-[#1E293B]">Medication</span>
                </div>

                <div className="absolute top-[40%] right-[0%] lg:right-[-5%] z-10 flex flex-col items-center gap-1 scale-[0.75] sm:scale-100 origin-right">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/30 backdrop-blur-md shadow-lg text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  <span className="text-[9px] font-medium text-[#1E293B]">Consultation</span>
                </div>

              </div>
            </div>
          </div>

          {/* CARD 3: Operations */}
          <div
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #BDEAE1 0%, #FFFFFF 100%)", zIndex: 3 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">Operations Hub</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Clinic & Hospital<br />Operations
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                Streamline the day-to-day operations of your clinic with one connected workspace.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["Appointments", "Staff Management", "Laboratory", "Pharmacy", "Patient Discharge", "Daily Schedule"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Request a walk thorugh
              </button>
            </div>

            {/* Right Image & Floating UI */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-center lg:justify-end pr-0 lg:pr-8 overflow-hidden lg:overflow-visible pt-2 lg:pt-0">
              <div className="relative w-full max-w-[480px] h-full flex items-end">
                <Image
                  src="/images/landing/healthcare/operation.png"
                  alt="Operations staff"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-10"
                />

                {/* Today's Appointments */}
                <div className="absolute left-[0%] sm:left-[5%] lg:left-[10%] top-[15%] sm:top-[20%] z-20 flex flex-col rounded-[24px] border border-white/40 bg-white/30 p-5 backdrop-blur-xl shadow-lg w-[160px] scale-[0.7] sm:scale-100 origin-left">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[12px] font-medium text-white leading-tight">Today's<br />Appointments</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-5xl font-light text-white">48</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2DD4BF] shadow-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    </div>
                  </div>
                </div>

                {/* Doctors on duty */}
                <div className="absolute left-[-5%] sm:left-[2%] lg:left-[5%] top-[45%] sm:top-[55%] z-20 flex flex-col rounded-[24px] border border-white/40 bg-white/30 p-5 backdrop-blur-xl shadow-lg w-[160px] scale-[0.7] sm:scale-100 origin-left">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[12px] font-medium text-white leading-tight">Doctors<br />on duty</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.5.5 0 0 0-.1.3"></path><path d="M8 15v0a5 5 0 0 0 5 5h1a3 3 0 0 1 3 3v0"></path><circle cx="17" cy="22" r="1"></circle></svg>
                  </div>
                  <div className="flex items-end mt-2">
                    <span className="text-5xl font-light text-white">8</span>
                  </div>
                </div>

                {/* Clinical Operations Active */}
                <div className="absolute right-[0%] sm:right-[5%] lg:right-[15%] top-[30%] sm:top-[35%] z-20 flex flex-col items-end gap-2 scale-[0.7] sm:scale-100 origin-right">
                  <span className="text-[12px] font-medium text-white drop-shadow-sm">Clinical Operations</span>
                  <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-3 py-1 backdrop-blur-md shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-[#10B981]"></div>
                    <span className="text-[11px] font-medium text-white">Active</span>
                  </div>
                </div>

                {/* Today's Schedule */}
                <div className="absolute right-[-5%] sm:right-[2%] lg:right-[10%] bottom-[5%] sm:bottom-[15%] z-30 flex flex-col rounded-[20px] border border-white/40 bg-white/40 p-4 backdrop-blur-xl shadow-lg w-[240px] scale-[0.7] sm:scale-100 origin-right">
                  <div className="flex items-center justify-between mb-3 border-b border-white/30 pb-2">
                    <span className="text-[11px] font-bold text-[#1E293B]">Today's Schedule</span>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-[#00AEEF] cursor-pointer">
                      View All
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E293B]/70 w-8">09:30</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></div>
                        <span className="font-semibold text-[#1E293B]">Consultation</span>
                      </div>
                      <span className="text-[#1E293B]/60">Room 2</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E293B]/70 w-8">10:00</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></div>
                        <span className="font-semibold text-[#1E293B]">Procedure</span>
                      </div>
                      <span className="text-[#1E293B]/60">OT 1</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E293B]/70 w-8">10:45</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF]"></div>
                        <span className="font-semibold text-[#1E293B]">Lab</span>
                      </div>
                      <span className="text-[#1E293B]/60">Lab 3</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* CARD 4: Communication */}
          <div
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #C2D2F2 0%, #FFFFFF 100%)", zIndex: 4 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">Whatsapp layer</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Connected Patient<br />Communication
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                Keep patients connected through timely, personalised and automated communication.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["WhatsApp Communication", "Appointment Reminders", "Medication Reminders", "Patient Confirmations", "Care Updates", "Human Handoff"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Request a walk thorugh
              </button>
            </div>

            {/* Right Image & Floating UI */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-center lg:justify-end pr-0 lg:pr-8 overflow-hidden lg:overflow-visible pt-2 lg:pt-0">
              <div className="relative w-full max-w-[480px] h-full flex items-end">
                <Image
                  src="/images/landing/healthcare/communication.png"
                  alt="Doctor communicating"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-10"
                />

                {/* Floating WhatsApp Logo */}
                <div className="absolute left-[5%] lg:left-[20%] top-[20%] sm:top-[35%] z-20 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#00AEEF] shadow-lg shadow-[#00AEEF]/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-7 sm:h-7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>

                {/* 1. Reminder Sent Automatically */}
                <div className="absolute left-[-2%] sm:left-[-15%] lg:left-[-10%] top-[40%] sm:top-[45%] z-20 flex flex-col rounded-[20px] border border-white/40 bg-white/40 p-4 backdrop-blur-xl shadow-lg w-[260px] scale-[0.65] sm:scale-100 origin-left">
                  <div className="absolute -top-6 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-slate-100 text-[#10B981]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <div className="mt-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-[#1E293B]">Reminder Sent Automatically</span>
                        <span className="text-[9px] text-[#1E293B]/60">10:00 AM</span>
                      </div>
                      <span className="text-[10px] text-[#1E293B]/70 block">Rahul & Anjali</span>
                      <span className="text-[10px] text-[#1E293B]/70 block">Injection reminder for 6:30 PM</span>
                    </div>
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] mt-1 shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  </div>
                </div>

                {/* 2. Patient Confirmed */}
                <div className="absolute left-[5%] lg:left-[5%] top-[55%] sm:top-[60%] z-20 flex flex-col rounded-full border border-white/40 bg-white/40 p-2 pr-4 backdrop-blur-xl shadow-lg w-[230px] scale-[0.65] sm:scale-100 origin-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-[#00AEEF]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#1E293B]">Patient Confirmed</span>
                        </div>
                        <span className="text-[10px] text-[#1E293B]/70 block">"Confirmed, thank you!"</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] text-[#1E293B]/60">10:24 AM</span>
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. EMR Synced (Hidden on small mobile to reduce clutter) */}
                <div className="absolute hidden sm:flex left-[15%] lg:left-[20%] top-[72%] z-20 flex-col rounded-full border border-white/40 bg-white/40 p-2 pr-4 backdrop-blur-xl shadow-lg w-[220px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-[#00AEEF]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#1E293B]">EMR Synced</span>
                        </div>
                        <span className="text-[10px] text-[#1E293B]/70 block">Patient record updated</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] text-[#1E293B]/60">10:25 AM</span>
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Care Task Updated */}
                <div className="absolute right-[0%] lg:right-[5%] bottom-[5%] sm:bottom-[12%] z-30 flex flex-col rounded-full border border-white/40 bg-white/40 p-2 pr-4 backdrop-blur-xl shadow-lg w-[240px] scale-[0.65] sm:scale-100 origin-right">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-[#F472B6]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#1E293B]">Care Task Updated</span>
                        </div>
                        <span className="text-[10px] text-[#1E293B]/70 block">Injection time confirmed</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] text-[#1E293B]/60">10:24 AM</span>
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Top: All done */}
                <div className="absolute right-[5%] sm:right-[10%] lg:right-[15%] top-[25%] sm:top-[40%] z-20 flex items-center gap-3 scale-[0.7] sm:scale-100 origin-right">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10B981] shadow-md shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold leading-tight text-white block">All done</span>
                    <span className="text-[9px] text-white/80">One less thing to worry about.</span>
                  </div>
                </div>

                {/* Right Middle: Human Handoff */}
                <div className="absolute right-[-5%] sm:right-[-2%] lg:right-[5%] top-[45%] sm:top-[55%] z-20 flex items-center gap-3 rounded-full border border-white/40 bg-white/30 p-2 pr-4 backdrop-blur-xl shadow-lg scale-[0.65] sm:scale-100 origin-right">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-[#00AEEF] bg-transparent opacity-50 shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#1E293B] block">Human Handoff</span>
                    <span className="text-[9px] text-[#1E293B]/70">Not required</span>
                  </div>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white ml-2 shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* CARD 5: Finance */}
          <div
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #FADBF8 0%, #FFFFFF 100%)", zIndex: 5 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">Financial Operations</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Billing, Packages &<br />Payments
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                Manage billing, packages and payments with greater visibility and less manual work.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["Invoices", "Treatment Packages", "Partial Payments", "Payment Receipts", "Insurance Pre-authorisation", "Collections"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Request a walk thorugh
              </button>
            </div>

            {/* Right Image & Floating UI */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-center lg:justify-end pr-0 lg:pr-8 overflow-hidden lg:overflow-visible pt-2 lg:pt-0">
              <div className="relative w-full max-w-[480px] h-full flex items-end">
                <Image
                  src="/images/landing/healthcare/finance.png"
                  alt="Finance operations"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-10"
                />

                {/* 1. Insurance Pre-Auth */}
                <div className="absolute left-[-5%] lg:left-[5%] top-[20%] sm:top-[25%] z-20 flex items-start gap-3 rounded-2xl border border-white/40 bg-white/40 p-4 backdrop-blur-xl shadow-lg scale-[0.75] sm:scale-100 origin-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm text-[#8B5CF6]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#1E293B]">Insurance Pre-Auth</span>
                    <div className="flex items-center gap-1 w-fit rounded-full bg-white px-2 py-0.5 border border-slate-100">
                      <span className="text-[9px] font-medium text-[#10B981]">Approved</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-lg font-bold text-[#1E293B] mt-1">₹50,000</span>
                  </div>
                </div>

                {/* 2. Today's Collections */}
                <div className="absolute left-[0%] lg:left-[5%] bottom-[10%] sm:bottom-[15%] z-20 flex flex-col items-center rounded-[32px] border border-white/40 bg-white/50 p-6 backdrop-blur-xl shadow-lg w-[160px] scale-[0.7] sm:scale-100 origin-left">
                  <span className="text-[10px] text-[#1E293B]/70 w-full text-left mb-4">Today's Collections</span>
                  <div className="flex items-end gap-1.5 h-16 w-full justify-center mb-4">
                    <div className="w-4 rounded-t-sm bg-transparent border-2 border-[#00AEEF] h-[40%]"></div>
                    <div className="w-4 rounded-t-sm bg-transparent border-2 border-[#00AEEF] h-[70%]"></div>
                    <div className="w-4 rounded-t-sm bg-transparent border-2 border-[#00AEEF] h-[100%]"></div>
                  </div>
                  <span className="text-2xl font-light text-[#1E293B] w-full text-left">₹2,48,000</span>
                  <div className="flex items-center gap-2 mt-2 w-full">
                    <div className="flex items-center gap-1 rounded-full bg-[#10B981]/10 px-1.5 py-0.5 text-[#10B981]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                      <span className="text-[9px] font-bold">+12%</span>
                    </div>
                    <span className="text-[9px] text-[#1E293B]/60 font-medium">vs. last week</span>
                  </div>
                </div>

                {/* 3. Payment Received */}
                <div className="absolute right-[0%] lg:right-[0%] top-[35%] sm:top-[45%] z-20 flex items-center gap-3 rounded-full border border-white/40 bg-white/40 p-2 pr-5 backdrop-blur-xl shadow-lg scale-[0.75] sm:scale-100 origin-right">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-[#10B981]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#1E293B]">Payment Received</span>
                    <span className="text-[10px] text-[#1E293B]/70">₹1,00,000 • UPI</span>
                  </div>
                </div>

                {/* 4. Invoice Generated */}
                <div className="absolute right-[-5%] sm:right-[10%] lg:right-[15%] bottom-[15%] sm:bottom-[20%] z-20 flex items-center gap-3 rounded-full border border-white/40 bg-white/40 p-2 pr-3 backdrop-blur-xl shadow-lg scale-[0.75] sm:scale-100 origin-right">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60 shadow-sm text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div className="flex flex-col mr-2">
                    <span className="text-[11px] font-bold text-white">Invoice Generated</span>
                    <span className="text-[10px] text-white/80">#SM-2026-8812</span>
                  </div>
                  <button className="rounded-full bg-transparent border border-white/60 px-3 py-1 text-[10px] font-bold text-[#00AEEF] bg-white">
                    Download
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* CARD 6: Intelligence */}
          <div
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #C1ECFC 0%, #FFFFFF 100%)", zIndex: 6 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">AI Assistant</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Smrko AI —<br />Intelligence Layer
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                Assist doctors and care teams with patient summaries, tasks and intelligent workflow support.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["Patient Summaries", "Consultation Capture", "Task Extraction", "Care Insights", "Smart Handoffs", "AI Assistance"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Meet Smrko AI
              </button>
            </div>

            {/* Right Image & Floating UI */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-end overflow-hidden pt-2 lg:pt-0">
              
              {/* Floating UI: Listening to consultation */}
              <div className="absolute right-[0%] sm:right-[5%] lg:right-[15%] top-[5%] sm:top-[8%] lg:top-[12%] z-30 flex flex-col gap-3 rounded-[24px] border border-white/40 bg-white/30 p-4 pr-6 backdrop-blur-xl shadow-lg scale-[0.7] sm:scale-[0.85] lg:scale-100 origin-right">
                <div className="flex items-center gap-4">
                  {/* Glowing Mic Icon */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2A2B3D] text-white z-10">
                    <div className="absolute inset-0 rounded-full bg-[#00AEEF] blur-[10px] opacity-60 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full bg-[#00AEEF] blur-[20px] opacity-40 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-20"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-[#1E293B]">Listening to consultation...</span>
                    
                    {/* Waveform graphic placeholder */}
                    <div className="flex items-center gap-[2px] mt-1 h-4">
                      {[1, 2, 3, 2, 1, 4, 6, 4, 2, 3, 5, 8, 5, 3, 2, 1, 3, 5, 3, 1, 2].map((height, idx) => (
                        <div key={idx} className="w-[1.5px] bg-[#1E293B]/40 rounded-full animate-pulse" style={{ height: `${height * 10}%`, animationDelay: `${idx * 0.1}s` }}></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]"></div>
                    <span className="text-[9px] font-bold text-[#1E293B]">Transcribing</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-50">
                    <div className="h-1.5 w-1.5 rounded-full border border-[#1E293B]"></div>
                    <span className="text-[9px] font-medium text-[#1E293B]">Identifying tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-50">
                    <div className="h-1.5 w-1.5 rounded-full border border-[#1E293B]"></div>
                    <span className="text-[9px] font-medium text-[#1E293B]">Summarising</span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 w-[95%] sm:w-[85%] lg:w-[110%] max-w-[650px] flex items-end">
                <Image
                  src="/images/landing/healthcare/intelligence.png"
                  alt="Smrko AI Intelligence Layer"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-10 translate-x-[5%] lg:translate-x-[10%]"
                />
              </div>
            </div>
          </div>

          {/* CARD 7: Ecosystem */}
          <div
            className="sticky top-[100px] w-full h-[650px] sm:h-[700px] lg:h-[650px] overflow-hidden rounded-[40px] flex flex-col lg:flex-row shadow-lg transition-transform duration-500 origin-top"
            style={{ background: "linear-gradient(180deg, #D4CBF6 0%, #FFFFFF 100%)", zIndex: 7 }}
          >
            {/* Left Content */}
            <div className="w-full lg:w-[45%] p-5 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
              <span className="text-[12px] lg:text-[13px] font-medium text-[#1E293B] mb-2 lg:mb-4">Ecosystem hub</span>
              <h3 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-light text-[#1E293B] mb-3 lg:mb-6">
                Connected<br />Digital Ecosystem
              </h3>
              <p className="text-[13px] lg:text-[14px] text-[#1E293B]/80 mb-5 lg:mb-8 max-w-[320px] leading-relaxed">
                Connect your healthcare ecosystem with digital health networks, systems, labs and payments.
              </p>

              <ul className="hidden lg:flex lg:flex-col gap-x-2 gap-y-2 lg:gap-4 mb-4 lg:mb-10">
                {["ABDM / ABHA", "Health Records", "Laboratory Systems", "Hospital Systems", "Digital Health", "Payment Integrations"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px] font-medium text-[#1E293B]">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00AEEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="self-start rounded-full bg-[#2A2B3D] px-5 py-2 lg:px-8 lg:py-3.5 text-[12px] lg:text-[14px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-lg">
                Request a walk through
              </button>
            </div>

            {/* Right Image */}
            <div className="w-full lg:w-[55%] relative flex-1 flex items-end justify-end overflow-hidden pt-2 lg:pt-0">
              
              {/* Floating UI: Digital India Bubble */}
              <div className="absolute left-[15%] top-[10%] z-20 flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/60 backdrop-blur-md shadow-lg animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-blue-700 leading-none">Digital</span>
                  <span className="text-[8px] font-bold text-orange-500 leading-none">India</span>
                </div>
              </div>

              {/* Floating UI: NHA Bubble (Small) */}
              <div className="absolute left-[20%] top-[40%] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/60 backdrop-blur-md shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>

              {/* Floating UI: NHA Bubble (Top Right) */}
              <div className="absolute right-[15%] top-[25%] z-20 flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/60 backdrop-blur-md shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="text-center">
                  <span className="text-[7px] font-bold text-slate-800 block leading-tight">national</span>
                  <span className="text-[7px] font-bold text-slate-800 block leading-tight">health</span>
                  <span className="text-[7px] font-bold text-slate-800 block leading-tight">authority</span>
                </div>
              </div>

              {/* Floating UI: India.gov.in Bubble */}
              <div className="absolute right-[5%] bottom-[15%] z-30 flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/80 backdrop-blur-md shadow-xl animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="text-center">
                  <span className="text-[12px] font-black text-blue-700 tracking-tight">india</span>
                  <span className="text-[12px] font-black text-green-600 tracking-tight">.gov.in</span>
                </div>
              </div>

              {/* Floating UI: ABHA Card */}
              <div className="absolute left-[-5%] sm:left-[5%] bottom-[5%] sm:bottom-[10%] z-30 flex w-[280px] sm:w-[320px] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl scale-[0.8] sm:scale-100 origin-bottom-left">
                <div className="flex items-start justify-between p-4 pb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">national</span>
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">health</span>
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">authority</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 pt-0">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div className="flex flex-col justify-center gap-1.5 w-full">
                    <div>
                      <span className="block text-[7px] text-slate-500 font-medium">ABHA Number</span>
                      <span className="block text-[11px] font-bold text-slate-800">91-XXXX-XXXX-XXXX</span>
                    </div>
                    <div>
                      <span className="block text-[7px] text-slate-500 font-medium">Name</span>
                      <span className="block text-[10px] font-semibold text-slate-800">Your name</span>
                    </div>
                    <div>
                      <span className="block text-[7px] text-slate-500 font-medium">Date of Birth</span>
                      <span className="block text-[10px] font-semibold text-slate-800">18/09/1995</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center bg-white p-1 rounded-lg border border-slate-200 self-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M7 7h.01"></path><path d="M17 7h.01"></path><path d="M7 17h.01"></path><path d="M17 17h.01"></path><path d="M12 7v10"></path><path d="M7 12h10"></path></svg>
                  </div>
                </div>
                
                <div className="w-full bg-[#474254] py-2 text-center">
                  <span className="text-[9px] font-medium text-white/90">Access your health records digitally</span>
                </div>
              </div>

              <div className="absolute bottom-0 right-[2%] lg:right-[5%] w-[85%] sm:w-[75%] lg:w-[85%] max-w-[500px] flex items-end">
                <Image
                  src="/images/landing/healthcare/integrations.png"
                  alt="Connected Digital Ecosystem"
                  width={800}
                  height={800}
                  className="object-contain object-bottom w-full h-full drop-shadow-lg relative z-10"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
