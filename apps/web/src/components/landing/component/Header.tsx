import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  onOpenDemo?: () => void;
}

export function Header({ onOpenDemo }: HeaderProps = {}) {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 w-full px-4 flex justify-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/20 bg-white/20 px-6 py-3 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/images/landing/logo.svg" 
            alt="Smrkomed" 
            width={180} 
            height={32} 
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {["Platform", "Careloop", "Smrko AI", "Solutions", "Integrations", "Pricing"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-[15px] font-medium text-slate-800 transition-colors hover:text-sky-600"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="hidden text-[15px] font-medium text-slate-800 transition-colors hover:text-sky-600 md:block"
          >
            Sign in
          </Link>
          <button 
            type="button"
            onClick={onOpenDemo}
            className="rounded-full bg-[#2A2B3D] px-6 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-md cursor-pointer"
          >
            Book a Demo
          </button>
        </div>
      </div>
    </header>
  );
}