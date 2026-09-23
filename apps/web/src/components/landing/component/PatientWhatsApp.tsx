import Image from "next/image";

export function PatientWhatsApp() {
  return (
    <section className="relative w-full bg-[#FAFAFA] pt-6 lg:pt-24 pb-20 lg:pb-32 overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 relative z-10">

        {/* Headings */}
        <div className="text-center mb-10 lg:mb-16">
          <h2 className="text-3xl lg:text-[2.75rem] leading-[1.2] text-[#1E293B] mb-4 lg:mb-6 font-light">
            Everything patients need.<br />
            Right where they already are.
          </h2>
          <p className="text-[14px] lg:text-[15px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            Meet patients where they already are.<br className="hidden lg:block" />
            SmrkoMed turns WhatsApp into a secure healthcare communication channel.
          </p>
        </div>

        {/* Center Phone Container */}
        <div className="relative w-full max-w-[1000px] flex justify-center mt-12 lg:mt-24">

          {/* Glowing Background Blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#E8F5FF] rounded-full blur-[100px] opacity-60 z-0 pointer-events-none"></div>

          {/* The Phone & Floating Cards */}
          <div className="relative z-10 w-[300px]">

            {/* Top Chat Icon */}
            <div className="absolute -top-[55px] md:-top-[100px] left-[55%] -translate-x-1/2 z-20 flex ">
              <Image
                src="/images/landing/chat.svg"
                alt="Chat Icon"
                width={86}
                height={86}
                className="object-contain w-[46px] h-[46px] lg:w-[86px] md:h-[86px]"
              />
            </div>

            <Image
              src="/images/landing/phone-chat.png"
              alt="WhatsApp Chat interface on mobile phone"
              width={400}
              height={800}
              className="w-full h-auto drop-shadow-2xl relative z-10"
              priority
            />

            {/* FLOATING CARDS */}

            {/* Top Left: Next Care Step */}
            <div className="hidden lg:flex absolute top-[8%] -left-[220px] lg:-left-[260px] z-20 flex-col rounded-2xl border border-white/40 bg-gradient-to-r from-[#EAF4FE] to-[#F1EEFE] p-4 backdrop-blur-md shadow-lg w-[240px]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-blue-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1E293B]">Next care step</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Scan - Due Friday</span>
                  <button className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#00AEEF] bg-white rounded-full px-3 py-1.5 w-fit hover:shadow-sm transition-shadow">
                    Help schedule <span className="text-lg leading-none">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Left: Lab report ready */}
            <div className="hidden lg:flex absolute top-[40%] -left-[260px] lg:-left-[320px] z-20 flex-col rounded-2xl border border-white/40 bg-gradient-to-r from-[#DEF4FC] to-[#F1FBFE] p-4 backdrop-blur-md shadow-lg w-[240px]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#00AEEF]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1E293B]">Lab report ready</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">CBC</span>
                  <button className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#00AEEF] bg-white rounded-full px-3 py-1.5 w-fit hover:shadow-sm transition-shadow">
                    View report <span className="text-lg leading-none">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Left: Appointment confirmed */}
            <div className="hidden lg:flex absolute top-[72%] -left-[220px] lg:-left-[260px] z-20 flex-col rounded-2xl border border-white/40 bg-gradient-to-r from-[#F3EBFE] to-[#F9F5FE] p-4 backdrop-blur-md shadow-lg w-[240px]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#9333EA]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div className="flex flex-col w-full">
                  <span className="text-[13px] font-semibold text-[#1E293B]">Appointment confirmed</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Tomorrow - 10:30 AM</span>
                  <div className="mt-3 flex items-center justify-end gap-1 text-[10px] font-bold text-[#00AEEF]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    All set
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right: Payment received */}
            <div className="hidden lg:flex absolute top-[18%] -right-[220px] lg:-right-[260px] z-20 flex-col rounded-2xl border border-white/40 bg-gradient-to-r from-[#EFE8FE] to-[#FDFBFF] p-4 backdrop-blur-md shadow-lg w-[240px]">
              <div className="flex items-start gap-3">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1E293B]">Payment received</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">₹1,500 paid successfully.</span>
                  <button className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#00AEEF] bg-white rounded-full px-3 py-1.5 w-fit hover:shadow-sm transition-shadow">
                    Download receipt <span className="text-lg leading-none">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Right: Medication reminder */}
            <div className="hidden lg:flex absolute top-[50%] -right-[260px] lg:-right-[320px] z-20 flex-col rounded-2xl border border-white/40 bg-gradient-to-r from-[#FEEBF6] to-[#FFF5FB] p-4 backdrop-blur-md shadow-lg w-[240px]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-pink-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1E293B]">Medication reminder</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Folic acid . 8:00 PM</span>
                  <button className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#00AEEF] bg-white rounded-full px-3 py-1.5 w-fit hover:shadow-sm transition-shadow">
                    Reminder sent <span className="text-lg leading-none">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Right: Connected to care team */}
            <div className="hidden lg:flex absolute top-[82%] -right-[220px] lg:-right-[260px] z-20 flex-col rounded-2xl border border-white/40 bg-gradient-to-r from-[#E3F9F2] to-[#F1FCF9] p-4 backdrop-blur-md shadow-lg w-[240px]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-emerald-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1E293B]">Connected to care team</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Priya - Care coordinator</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
