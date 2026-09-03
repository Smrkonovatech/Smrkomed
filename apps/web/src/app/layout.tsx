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
  title: {
    default: "SMRKOMED — Connected Healthcare Technology",
    template: "%s | SMRKOMED",
  },
  description:
    "SMRKOMED connects clinics, care teams and patients through modular healthcare workflows. Start with Care Loop.",
  openGraph: {
    title: "SMRKOMED — Building the connected future of healthcare",
    description: "Modular healthcare technology connecting clinics, care teams and patients.",
    type: "website",
  },
  icons: {
    icon: "/branding/favicon.png",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
