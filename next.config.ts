import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 2D (la_notice_production_gap ruling): the produce routes read the RTC
  // packet PDFs + baseline.json from disk at runtime (loadCurrentPacket). Trace
  // those binaries into the serverless function bundle, else they 404 in
  // production and the gate fail-closes to ATTACHMENT_FAILED.
  outputFileTracingIncludes: {
    "/api/notice/produce/**": ["./lib/rtc/packet/**"],
    "/api/riskpath/**/service/pos010-preview": [
      "./docs/legal/official-forms/california/judicial-council/POS-010/2007-01-01/POS-010.pdf",
    ],
    "/api/riskpath/**/filing-preparation/persist": [
      "./docs/legal/official-forms/california/judicial-council/UD-100/2026-07-01/UD-100.pdf",
      "./docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/UD-100.preparation-runtime.pdf",
    ],
  },
};

export default nextConfig;
