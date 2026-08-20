import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/components/auth-session-provider";
import "@/styles.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "SmrkoMed — Fertility Care Platform",
    template: "%s | SmrkoMed",
  },
  description:
    "SmrkoMed manages the clinic. Care Loop makes sure patients actually follow their doctor's plan.",
  openGraph: {
    title: "SmrkoMed — Fertility Care Platform",
    description: "AI-powered patient care coordination for modern fertility clinics.",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
