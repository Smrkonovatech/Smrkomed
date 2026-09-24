import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/components/auth-session-provider";
import "@/styles.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.smrkomed.com"),
  title: {
    default: "Healthcare Management Software for Clinics & Hospitals | SMRKOMED",
    template: "%s | SMRKOMED",
  },
  description:
    "SMRKOMED is healthcare management software for modern clinics and hospitals. Manage patients, care journeys, appointments, treatment plans, tasks, communication and follow-ups in one connected platform.",
  openGraph: {
    title: "Healthcare Management Software for Clinics & Hospitals | SMRKOMED",
    description: "SMRKOMED is healthcare management software for modern clinics and hospitals. Manage patients, care journeys, appointments, treatment plans, tasks, communication and follow-ups in one connected platform.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/branding/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

import { Inter } from "next/font/google";
import { DesktopScaler } from "@/components/ui/desktop-scaler";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="h-[100dvh] w-[100vw] overflow-hidden font-sans antialiased bg-background text-foreground">
        <DesktopScaler desktopWidth={1440} bgColor="transparent">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </DesktopScaler>
      </body>
    </html>
  );
}
