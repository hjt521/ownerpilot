import type { NextConfig } from "next";

const e23d1PersistenceRouteAssets = [
  "./docs/legal/official-forms/california/judicial-council/UD-100/2026-07-01/UD-100.pdf",
  "./docs/legal/preparation-artifacts/california/judicial-council/UD-100/2026-07-01/qpdf-12.3.2/UD-100.preparation-runtime.pdf",
] as const;

if (process.argv.includes("build")) {
  process.once("exit", () => {
    const fs = process.getBuiltinModule("node:fs") as typeof import("node:fs");
    const path = process.getBuiltinModule("node:path") as typeof import("node:path");
    const traceFile = path.resolve(
      process.cwd(),
      ".next/server/app/api/riskpath/[id]/filing-preparation/persist/route.js.nft.json",
    );
    if (!fs.existsSync(traceFile)) return;

    try {
      const payload = JSON.parse(fs.readFileSync(traceFile, "utf8")) as { files?: unknown };
      const files = Array.isArray(payload.files)
        ? payload.files.filter((file): file is string => typeof file === "string")
        : [];
      const traced = new Set(
        files.map((file) => path.resolve(path.dirname(traceFile), file)),
      );
      const assets = e23d1PersistenceRouteAssets.map((asset) => ({
        asset,
        present: traced.has(path.resolve(process.cwd(), asset)),
      }));
      fs.writeSync(
        1,
        `[e2.3d1-persistence-route-trace] ${JSON.stringify({
          trace: path.relative(process.cwd(), traceFile),
          assets,
        })}\n`,
      );
    } catch (error) {
      fs.writeSync(
        1,
        `[e2.3d1-persistence-route-trace] unreadable ${String(error)}\n`,
      );
    }
  });
}

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
    "/api/riskpath/**/filing-preparation/persist": [...e23d1PersistenceRouteAssets],
  },
};

export default nextConfig;
