import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function BuiltForCare() {
  return (
    <section className="relative w-full bg-white py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left Side - Images */}
          <div className="relative flex justify-center items-center h-[600px] sm:h-[700px] w-full">
            {/* Girl Image */}
            <div className="absolute bottom-0 left-[-15%] sm:left-[-10%] z-10 w-[75%] sm:w-[65%] max-w-[450px]">
              <Image
                src="/images/built-left.png"
                alt="Doctor using SmrkoMed"
                width={500}
                height={600}
                className="w-full h-auto object-contain object-bottom"
              />
            </div>

            {/* Cloud Image Background */}
            <div className="absolute top-[40%] right-[5%] sm:right-[15%] -translate-y-1/2 w-[85%] sm:w-[75%] max-w-[550px] z-0">
              <Image
                src="/images/built-cloud.png"
                alt="Cloud Background"
                width={800}
                height={800}
                className="w-full h-auto object-contain opacity-90 scale-125"
              />
            </div>

            {/* Mobile Image Overlay */}
            <div className="absolute z-20 right-[5%] sm:-right-[6%] top-[65%] -translate-y-1/2 w-[65%] sm:w-[55%] max-w-[380px]">
              <Image
                src="/images/software.png"
                alt="Mobile Interface"
                width={400}
                height={800}
                className="w-full h-auto object-contain drop-shadow-2xl scale-125"
              />
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="flex flex-col items-start z-10 lg:pl-10">
            <h2 className="text-[2.5rem] lg:text-[3.5rem] leading-[1.15] text-[#1E293B] tracking-tight">
              Real software.<br />
              Built for daily care.
            </h2>

            <p className="mt-8 text-[15px] sm:text-[16px] text-slate-500 max-w-[480px] leading-[1.7]">
              SmrkoMed brings together people, technology and<br className="hidden sm:block" />
              workflows to simplify healthcare delivery across<br className="hidden sm:block" />
              specialties.
            </p>

            <p className="mt-8 text-[15px] sm:text-[16px] text-slate-500 max-w-[480px] leading-[1.7]">
              Stay on top of appointments, active care<br className="hidden sm:block" />
              journeys, escalations and patient<br className="hidden sm:block" />
              communication—right from your phone.
            </p>

            <button
              type="button"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#2D283E] px-6 py-3.5 text-sm font-medium text-white shadow-md hover:bg-slate-800 transition"
            >
              <span>Request Doctor App Demo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
