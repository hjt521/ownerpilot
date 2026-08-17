import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookiebotBanner } from "@/components/CookiebotBanner";
import { GoogleTagManagerScript } from "@/components/GoogleTagManagerScript";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OwnerPilot AI — California 3-Day Notice, Broker-Prepared",
  description: "Create a California 3-Day Notice to Pay Rent or Quit in minutes. Broker-prepared workflow, service tracking, and RiskPath™ follow-up support for California property owners.",
};

const SENSITIVE_TELEMETRY_GUARD = `(() => {
  if (window.__opSensitiveTelemetryGuardInstalled) return;
  const isSensitivePath = () => {
    const p = window.location.pathname;
    return p === '/owner-continuation' || p === '/owner-continuation/' || /^\\/riskpath\\/[^/]+(?:\\/.*)?$/.test(p);
  };
  const isVercelTelemetryTarget = (input) => {
    if (!isSensitivePath()) return false;
    let raw;
    try {
      if (typeof input === 'string') raw = input;
      else if (input && typeof input.url === 'string') raw = input.url;
      else raw = String(input);
      const u = new URL(raw, window.location.href);
      const sameOriginIngest = u.origin === window.location.origin &&
        (u.pathname.startsWith('/_vercel/insights/') || u.pathname.startsWith('/_vercel/speed-insights/'));
      const hostedVitals = u.hostname === 'vitals.vercel-analytics.com' || u.hostname === 'vitals.vercel-insights.com';
      return sameOriginIngest || hostedVitals;
    } catch { return false; }
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (isVercelTelemetryTarget(input)) return Promise.resolve(new Response(null, { status: 204 }));
    return nativeFetch(input, init);
  };
  if (typeof navigator.sendBeacon === 'function') {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    try { navigator.sendBeacon = (url, data) => isVercelTelemetryTarget(url) ? true : nativeBeacon(url, data); } catch {}
  }
  Object.defineProperty(window, '__opSensitiveTelemetryGuardInstalled', { value: true, configurable: false, enumerable: false, writable: false });
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ivory text-ink">
        <script dangerouslySetInnerHTML={{ __html: SENSITIVE_TELEMETRY_GUARD }} />
        <CookiebotBanner />
        <GoogleTagManagerScript />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
