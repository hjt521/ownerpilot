import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookiebotBanner } from "@/components/CookiebotBanner";
import { GoogleTagManagerScript } from "@/components/GoogleTagManagerScript";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

// Metadata copy is a DRAFT for JT preview approval (R1a).
export const metadata: Metadata = {
  title: "OwnerPilot AI — California 3-Day Notice, Broker-Prepared",
  description:
    "Create a California 3-Day Notice to Pay Rent or Quit in minutes. Broker-prepared workflow, service tracking, and RiskPath™ follow-up support for California property owners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivory text-ink">
        {/* Consent gate first (Cookiebot Path A, data-blockingmode="auto"), then the consent-gated GTM
            container. GTM only mounts when NEXT_PUBLIC_GTM_ID is provisioned, so preview builds without GA4
            envs don't break and nothing fires pre-consent (Guard G). Vercel Analytics is cookieless. */}
        <CookiebotBanner />
        <GoogleTagManagerScript />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
