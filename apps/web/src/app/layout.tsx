import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/components/auth-session-provider";
import "@/styles.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

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
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
