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
    icon: "/branding/favicon.png",
  },
};

import { DesktopScaler } from "@/components/ui/desktop-scaler";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-[100dvh] w-[100vw] overflow-hidden font-sans antialiased bg-background text-foreground">
        <DesktopScaler desktopWidth={1440} bgColor="transparent">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </DesktopScaler>
      </body>
    </html>
  );
}
