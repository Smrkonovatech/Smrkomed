import logo from "@/assets/smrkomed-logo.png.asset.json";
import { Btn } from "./primitives";

const links = ["Platform", "Care Loop", "AI", "Specialties", "Resources"];

export function Nav({ onCreateClinic }: { onCreateClinic: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-3">
          <img src={logo.url} alt="SMRKOMED" width={40} height={40} className="h-9 w-auto" />
          <span className="leading-tight">
            <span className="block text-[17px] font-semibold tracking-[0.14em] text-foreground">SMRKOMED</span>
            <span className="block text-[11px] text-muted-foreground">Powered by Smrkonova</span>
          </span>
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l}>
              <a
                href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[14px] text-muted-foreground transition-colors hover:text-primary"
              >
                {l}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="#demo"
            className="hidden text-[14px] text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            See Demo
          </a>
          <a
            href="#demo"
            className="hidden text-[14px] text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            Login
          </a>
          <Btn className="h-11 px-5 text-[14px]" onClick={onCreateClinic}>
            Create Clinic →
          </Btn>
        </div>
      </nav>
    </header>
  );
}
