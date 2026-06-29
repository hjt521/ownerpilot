import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 2D (la_notice_production_gap ruling): the produce routes read the RTC
  // packet PDFs + baseline.json from disk at runtime (loadCurrentPacket). Trace
  // those binaries into the serverless function bundle, else they 404 in
  // production and the gate fail-closes to ATTACHMENT_FAILED.
  outputFileTracingIncludes: {
    "/api/notice/produce/**": ["./lib/rtc/packet/**"],
  },
};

export default nextConfig;
