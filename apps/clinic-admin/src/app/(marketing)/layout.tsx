import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-width:thin]">
      {children}
    </div>
  );
}

