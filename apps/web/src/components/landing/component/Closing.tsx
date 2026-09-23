import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Linkedin } from "lucide-react";

interface ClosingProps {
  onOpenDemo?: () => void;
}

export function Closing({ onOpenDemo }: ClosingProps = {}) {
  const footerLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Data Deletion", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security Practices", href: "#" },
    { label: "Clinic Login", href: "#" },
  ];

  return (
    <section className="relative w-full bg-gradient-to-b from-[#55CAF5] to-[#25A9F4] overflow-hidden pt-12 lg:pt-32">

      {/* Top CTA Section */}
      <div className="mx-auto max-w-4xl px-6 text-center relative z-20 mb-32">
        <h2 className="text-[2.5rem] sm:text-[3.5rem] font-light text-[#1E293B] tracking-tight mb-4">
          See SmrkoMed in Action
        </h2>
        <p className="text-[14px] sm:text-[15px] text-[#1E293B] mb-10">
          Every role gets the tools, context and actions need.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onOpenDemo}
            className="w-full sm:w-[160px] rounded-full border border-[#1E293B] py-3 text-[13px] font-medium text-[#1E293B] hover:bg-white/10 transition-colors cursor-pointer"
          >
            Talk to Us
          </button>
          <button
            type="button"
            onClick={onOpenDemo}
            className="w-full sm:w-[160px] rounded-full bg-[#2B2B36] py-3 text-[13px] font-medium text-white shadow-lg hover:bg-[#1E1E26] transition-colors cursor-pointer"
          >
            Book a Demo
          </button>
        </div>
      </div>

      {/* Footer Content Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-12 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8 items-start">

          {/* Column 1: Brand / Description */}
          <div className="col-span-1 md:col-span-1 flex flex-col justify-between h-full min-h-[160px]">
            <p className="text-[13px] leading-relaxed text-[#1E293B] font-medium max-w-[260px]">
              One <strong>connected platform</strong> for clinical care, care teams, patient communication and workflows.
            </p>
            <div className="mt-8 flex items-center gap-2">
              <span className="text-[10px] font-medium text-[#1E293B]">Powered by</span>
              <Image 
                src="/images/landing/logo-footer.svg" 
                alt="Smrkonova Logo"
                width={100}
                height={24}
                className="object-contain h-4 w-auto"
              />
            </div>
          </div>

          {/* Column 2: Links 1 */}
          <div className="col-span-1 flex flex-col gap-3">
            {footerLinks.map((link, i) => (
              <Link key={i} href={link.href} className="text-[12px] font-medium text-[#1E293B] hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Column 3: Links 2 (Duplicate as per design) */}
          <div className="col-span-1 flex flex-col gap-3">
            {footerLinks.map((link, i) => (
              <Link key={i} href={link.href} className="text-[12px] font-medium text-[#1E293B] hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Column 4: Contact & Social */}
          <div className="col-span-1 flex flex-col justify-between h-full min-h-[160px]">
            <div>
              <a href="mailto:info@smrkomed.com" className="text-[12px] font-medium text-[#1E293B] hover:text-white transition-colors">
                info@smrkomed.com
              </a>
              <div className="flex gap-2 mt-4">
                <a href="#" className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/40 bg-white/10 text-[#1E293B] hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="#" className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/40 bg-white/10 text-[#1E293B] hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/40 bg-white/10 text-[#1E293B] hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="mt-8 text-[10px] font-medium text-[#1E293B]">
              © 2026 Smrkonova Softech Solutions LLP. All rights reserved.
            </div>
          </div>

        </div>
      </div>

      {/* Cloud Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-[400px] pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent"></div>
        <div className="absolute -bottom-20 -left-20 opacity-50 mix-blend-overlay">
          <Image src="/images/landing/banner-cloud-left.svg" alt="Cloud" width={800} height={400} className="w-full h-auto" />
        </div>
        <div className="absolute -bottom-20 -right-20 opacity-50 mix-blend-overlay">
          <Image src="/images/landing/banner-cloud-right.svg" alt="Cloud" width={800} height={400} className="w-full h-auto" />
        </div>
      </div>

      {/* Massive Bottom Image */}
      <div className="relative w-full overflow-hidden flex justify-center items-end mt-16 pointer-events-none z-10 select-none pb-4 px-4">
        <Image
          src="/images/landing/footer-logo.svg"
          alt="SMRKOMED"
          width={1400}
          height={150}
          className="w-full max-w-[1400px] h-auto opacity-90 drop-shadow-sm"
          priority
        />
      </div>

    </section>
  );
}
