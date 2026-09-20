import Image from "next/image";
import { useRef } from "react";

const roles = [
  {
    name: "Doctor",
    description: "Clinical decisions",
    icon: "/images/landing/care/doctor.svg",
  },
  {
    name: "Care cordinator",
    description: "Clinical decisions",
    icon: "/images/landing/care/care-cordinator.svg",
  },
  {
    name: "Reception",
    description: "Clinical decisions",
    icon: "/images/landing/care/reception.svg",
  },
  {
    name: "Nurse",
    description: "Clinical decisions",
    icon: "/images/landing/care/nurse.svg",
  },
  {
    name: "Lab",
    description: "Clinical decisions",
    icon: "/images/landing/care/lab.svg",
  },
  {
    name: "Embryology",
    description: "Clinical decisions",
    icon: "/images/landing/care/embryology.svg",
  },
  {
    name: "Pharmacy",
    description: "Clinical decisions",
    icon: "/images/landing/care/pharmacy.svg",
  },
  {
    name: "Billing",
    description: "Clinical decisions",
    icon: "/images/landing/care/billing.svg",
  },
  {
    name: "Insurance",
    description: "Clinical decisions",
    icon: "/images/landing/care/insurance.svg",
  },
  {
    name: "Admin",
    description: "Clinical decisions",
    icon: "/images/landing/care/Admin.svg",
  },
];

export function CareRoles() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full overflow-hidden pt-24 pb-48">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 relative z-10">

        {/* Heading Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-[#0B1221] mb-4">
            Built for everyone <span className="font-light">who</span>
            <br />
            <span className="font-light">delivers care</span>
          </h2>
          <p className="text-sm text-slate-700 max-w-xs mx-auto leading-relaxed">
            Every role gets a separate login,
            <br />
            with the tools, context and actions they need.
          </p>
        </div>

        {/* Slider Section */}
        <div className="relative w-full max-w-[1050px] mx-auto group">
          {/* Slider Controls - Visible on hover on desktop */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 hidden h-10 w-10 items-center justify-center rounded-full bg-white  text-slate-400 hover:text-[#00AEEF] md:group-hover:flex transition-all"
            aria-label="Scroll left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          {/* Cards Container */}
          <div
            ref={scrollRef}
            className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-8 pt-4 px-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {roles.map((role, index) => (
              <div
                key={index}
                className="w-[150px] md:w-[184px] shrink-0 snap-center rounded-2xl bg-white p-6 transition-transform hover:-translate-y-1 flex flex-col items-center text-center"
              >
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full">
                  <Image
                    src={role.icon}
                    alt={role.name}
                    width={80}
                    height={80}
                    className="object-contain drop-shadow-sm"
                  />
                </div>
                <h3 className="text-sm font-medium text-[#1E293B] mb-1">{role.name}</h3>
                <p className="text-[10px] text-slate-400">{role.description}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden h-10 w-10 items-center justify-center rounded-full bg-white shadow-md text-slate-400 hover:text-[#00AEEF] md:group-hover:flex transition-all"
            aria-label="Scroll right"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

      </div>

      {/* Bottom Cloud Image */}
      <div className="absolute bottom-0 left-0 right-0 w-full z-0 leading-none pointer-events-none">
        <Image
          src="/images/landing/care/bottom-cloud.svg"
          alt="Clouds"
          width={1440}
          height={300}
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Hide scrollbar styles for Webkit */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `}} />
    </section>
  );
}
