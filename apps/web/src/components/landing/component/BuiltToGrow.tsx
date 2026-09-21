"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

export function BuiltToGrow() {
  const [activeIndex, setActiveIndex] = useState(2);

  const items = [
    { title: "Dermatology", desc: "Configurable workflows adapt to your specialty needs." },
    { title: "Dentistry", desc: "Configurable workflows adapt to your specialty needs." },
    { title: "Fertility", desc: "Configurable workflows adapt to your specialty needs." },
    { title: "Orthopedics", desc: "Configurable workflows adapt to your specialty needs." },
    { title: "Pediatrics", desc: "Configurable workflows adapt to your specialty needs." },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [items.length]);

  const getCardStyle = (index: number) => {
    // Calculate circular offset for 5 items
    let offset = (index - activeIndex) % items.length;
    if (offset < -2) offset += items.length;
    if (offset > 2) offset -= items.length;

    // Base style for off-screen cards (should not be reached with 5 items, but good fallback)
    let style = {
      transform: 'translateX(0px) scale(0)',
      opacity: 0,
      zIndex: 0,
      filter: 'blur(10px)'
    };

    if (offset === 0) {
      style = {
        transform: 'translate(0%, 0%) scale(1) rotate(0deg)',
        opacity: 1,
        zIndex: 50,
        filter: 'blur(0px)'
      };
    } else if (offset === -1) {
      style = {
        transform: 'translate(-65%, -5%) scale(0.85) rotate(-18deg)',
        opacity: 0.9,
        zIndex: 40,
        filter: 'blur(0.5px)'
      };
    } else if (offset === 1) {
      style = {
        transform: 'translate(65%, -5%) scale(0.85) rotate(18deg)',
        opacity: 0.9,
        zIndex: 40,
        filter: 'blur(0.5px)'
      };
    } else if (offset === -2) {
      style = {
        transform: 'translate(-120%, -15%) scale(0.75) rotate(-38deg)',
        opacity: 0.7,
        zIndex: 30,
        filter: 'blur(3px)'
      };
    } else if (offset === 2) {
      style = {
        transform: 'translate(120%, -15%) scale(0.75) rotate(38deg)',
        opacity: 0.7,
        zIndex: 30,
        filter: 'blur(3px)'
      };
    }

    return style;
  };

  return (
    <section className="relative w-full bg-white py-10 lg:py-24 overflow-hidden">
      {/* Soft bottom mist */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-50/50 to-transparent z-0 pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 lg:px-12 relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-[2.5rem] lg:text-[3.5rem] leading-[1.15] text-[#1E293B] tracking-tight">
            <span className="font-light">Built to grow across</span><br />
            <span className="font-normal">healthcare</span>
          </h2>
          <p className="mt-6 text-[15px] sm:text-[16px] text-slate-500 max-w-[500px] mx-auto leading-[1.7]">
            SmrkoMed brings together people, technology and workflows<br className="hidden sm:block" />
            to simplify healthcare delivery across specialties.
          </p>
        </div>

        <div className="relative flex justify-center items-center h-[450px] sm:h-[550px] w-full max-w-[1000px] mx-auto">
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className="absolute cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              style={getCardStyle(index)}
            >
              <div className="relative w-[240px] h-[340px] sm:w-[320px] sm:h-[440px] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-slate-900 border border-white/20">
                <Image
                  src="/images/grow/1.png"
                  alt={item.title}
                  fill
                  className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                />

                {/* Gradient overlay for text */}
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 transition-opacity duration-500 ${activeIndex === index ? 'opacity-100' : 'opacity-0'}`} />

                {/* Active Card Content */}
                <div className={`absolute bottom-8 left-0 right-0 px-6 text-center transition-opacity duration-500 delay-100 ${activeIndex === index ? 'opacity-100' : 'opacity-0'}`}>
                  <h3 className="text-white text-xl sm:text-2xl font-normal mb-2 tracking-wide">{item.title}</h3>
                  <p className="text-white/80 text-[11px] sm:text-xs leading-relaxed max-w-[220px] mx-auto font-light">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
