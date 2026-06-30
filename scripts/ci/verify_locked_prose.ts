#!/usr/bin/env tsx
/**
 * scripts/ci/verify_locked_prose.ts
 *
 * `BROKER_WORKFLOW_PRODUCTION_LIVE` CI guard.
 *
 * Verifies that every Tier A / Tier B locked-prose string in
 * docs/compliance/locked_prose_manifest.json matches the live exports
 * from the codebase byte-for-byte, and re-computes SHA-256 to detect any
 * drift.
 *
 * Also runs the Tier-2 dangling-reference check from
 * locked_prose_ci_guard_scope_broker_determination_2026-06-15.md §3.4:
 * every `// Source: <filename>.md` comment in lib/ and components/ must
 * resolve to a file in docs/compliance/.
 *
 * Behavior: HARD CI FAIL on any drift (§3.3 — no warn-then-ack mode).
 *
 * Usage:
 *   npx tsx scripts/ci/verify_locked_prose.ts
 *   # or wire into the package.json "ci:verify-locked-prose" script.
 *
 * Exit codes:
 *   0  All locked strings verified; all source-comment refs resolved.
 *   1  Drift detected (manifest mismatch, hash mismatch, missing constant,
 *      or unresolved source-comment ref). PR must be blocked.
 *   2  Internal error (cannot read manifest, malformed JSON, unreadable
 *      source files, etc.). PR must be blocked.
 *
 * Authority:
 *   broker_blanket_authorization_2026-06-15.md
 *   locked_prose_ci_guard_scope_broker_determination_2026-06-15.md
 *   bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md
 *
 * — Jack Taglyan, CalDRE B9445457
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// REPO_ROOT is normally two levels up from scripts/ci/. Tests override it via LOCKED_PROSE_REPO_ROOT
// to point the guard at a fixture tree (see verify_locked_prose.test.mjs).
const REPO_ROOT = process.env.LOCKED_PROSE_REPO_ROOT
  ? resolve(process.env.LOCKED_PROSE_REPO_ROOT)
  : resolve(__dirname, "..", "..");
// Shape A — the original hash-attested manifest. Prose lives in `.ts` exports; this manifest audits them.
const MANIFEST_PATH = join(
  REPO_ROOT,
  "docs",
  "compliance",
  "locked_prose_manifest.json"
);
// Shape B — the phase-2 "assembly" manifest (runtime source). Prose lives in this manifest; `.ts`/`.tsx`
// modules import it via lib/compliance/lockedProse. Added per
// locked_prose_manifest_schema_reconciliation_broker_ruling_2026-06-29.md §2.
const ASSEMBLY_MANIFEST_PATH = join(
  REPO_ROOT,
  "docs",
  "compliance",
  "locked_prose_manifest_phase2_assembly.json"
);
const DOCS_COMPLIANCE_DIR = join(REPO_ROOT, "docs", "compliance");
const SCAN_DIRS = ["lib", "components", "app"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = "A" | "B" | "C";

interface ManifestEntry {
  constant: string;
  tier: Tier;
  file: string;
  verbatim?: string; // omitted for Tier C
  hash: string;
  version_stamp?: string;
  source_determination: string;
  source_section: string;
}

interface Manifest {
  manifest_version: string;
  generated_at: string;
  guard_status: "live" | "required-but-pending";
  broker_authority: string;
  authoring_authority: string;
  guard_design: string;
  entries: ManifestEntry[];
}

interface VerifyFailure {
  kind:
    | "missing-export"
    | "verbatim-mismatch"
    | "hash-mismatch"
    | "missing-version-stamp"
    | "version-stamp-mismatch"
    | "missing-source-file"
    | "dangling-source-comment"
    | "unreadable-file"
    // Shape-B (assembly manifest) failure kinds:
    | "shapeb-schema-violation"
    | "shapeb-hash-mismatch"
    | "shapeb-duplicate-key"
    | "dangling-locked-key";
  detail: string;
}

// ---------------------------------------------------------------------------
// Shape B — assembly manifest (runtime source) types
// ---------------------------------------------------------------------------

interface AssemblyEntry {
  key: string;
  version: string;
  tier: "A" | "B";
  value: string;
  hash: string;
  source_ruling: string;
  subject?: string;
  lane?: string;
  supersedes?: string;
  note?: string;
}

interface AssemblyManifest {
  manifest_version: string;
  manifest_role: string; // "runtime-source"
  guard_status: "live" | "required-but-pending";
  broker_authority: string;
  source_rulings: string[];
  entries: AssemblyEntry[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function readManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }
  const raw = readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw) as Manifest;
}

/**
 * Extracts a single named string export from a TS module by parsing the
 * `export const <name> = "..."` or backtick-template form.
 *
 * This is intentionally a static-parse extractor (no TS compiler dep) to
 * keep the CI guard fast and free of toolchain coupling. It supports:
 *
 *   export const NAME = "literal";
 *   export const NAME = 'literal';
 *   export const NAME = `literal`;
 *   export const NAME = (
 *     "concatenated " +
 *     "literal"
 *   );
 *
 * For Tier-B disclosure copy where the body spans multiple lines and uses
 * template literals or string concatenation, the extractor reconstructs
 * the final string. Anything fancier (function calls, imports, computed
 * values) is rejected — locked-prose constants must be inlined literals.
 */
function extractStringExport(
  filePath: string,
  constantName: string
): string | null {
  if (!existsSync(filePath)) return null;
  const src = readFileSync(filePath, "utf8");

  // Match `export const NAME = <expr>;` lazily across multiple lines.
  // We anchor on `export const NAME =` and consume up to the next
  // unescaped semicolon at column 0 (end of statement).
  const startRe = new RegExp(
    `export\\s+const\\s+${constantName}\\s*(?::\\s*[^=]+)?=\\s*`,
    "m"
  );
  const startMatch = startRe.exec(src);
  if (!startMatch) return null;

  let cursor = startMatch.index + startMatch[0].length;
  let depth = 0;
  let end = cursor;
  while (end < src.length) {
    const c = src[end];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === ";" && depth === 0) break;
    end++;
  }
  const expr = src.slice(cursor, end).trim();

  // Strip a single outer paren if present (so `(...)` -> `...`).
  let body = expr;
  if (body.startsWith("(") && body.endsWith(")")) {
    body = body.slice(1, -1).trim();
  }

  // Reject obvious non-literal expressions to keep behavior predictable.
  // Function calls, JSX, imports — all rejected. Concatenation of string
  // literals is allowed. We scan outside-of-string positions only so we
  // don't false-positive on parens inside the locked prose itself.
  if (containsNonLiteralExpression(body)) {
    throw new Error(
      `Locked constant ${constantName} in ${filePath} is not an inlined literal. ` +
        `Locked constants must be string literals or concatenations of string ` +
        `literals only. Refactor before re-running the CI guard.`
    );
  }

  // Split on top-level `+` and concatenate the string-literal segments.
  const segments: string[] = [];
  let buf = "";
  let inStr: string | null = null;
  let escape = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (escape) {
      buf += ch;
      escape = false;
      continue;
    }
    if (inStr) {
      if (ch === "\\") {
        buf += ch;
        escape = true;
        continue;
      }
      if (ch === inStr) {
        buf += ch;
        inStr = null;
        continue;
      }
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === "+") {
      if (buf.trim().length) segments.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length) segments.push(buf.trim());

  // Decode each segment as a JS string literal.
  let out = "";
  for (const seg of segments) {
    out += decodeStringLiteral(seg);
  }
  return out;
}

/**
 * Returns true if the expression contains a function-call, JSX-like, or
 * other non-literal construct outside of any string literal. Used to
 * reject locked-constant definitions that aren't pure string-literal
 * (or string-literal-concatenation) expressions.
 */
function containsNonLiteralExpression(body: string): boolean {
  let inStr: string | null = null;
  let escape = false;
  let prevNonSpace = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inStr) {
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      prevNonSpace = ch;
      continue;
    }
    // Outside any string: a `(` immediately after an identifier char
    // signals a function call.
    if (ch === "(" && /[A-Za-z_$0-9]/.test(prevNonSpace)) {
      return true;
    }
    if (ch.trim()) prevNonSpace = ch;
  }
  return false;
}

function decodeStringLiteral(literal: string): string {
  const quote = literal[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") {
    throw new Error(`Not a string literal: ${literal.slice(0, 40)}`);
  }
  if (literal[literal.length - 1] !== quote) {
    throw new Error(`Unterminated string literal: ${literal.slice(0, 40)}`);
  }
  const inner = literal.slice(1, -1);
  // Handle the common escape sequences explicitly. We don't attempt to
  // handle template-literal `${...}` interpolation — locked strings must
  // be fully static.
  if (quote === "`" && /\$\{/.test(inner)) {
    throw new Error(
      "Locked constant uses template-literal interpolation (${...}); " +
        "locked constants must be fully static. Refactor before re-running."
    );
  }
  return inner.replace(
    /\\(u[0-9A-Fa-f]{4}|x[0-9A-Fa-f]{2}|[nrt"'`\\])/g,
    (_, c) => {
      if (c[0] === "u" || c[0] === "x") {
        return String.fromCodePoint(parseInt(c.slice(1), 16));
      }
      switch (c) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        default:
          return c;
      }
    }
  );
}

function walkDir(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip node_modules and dotdirs.
      if (name === "node_modules" || name.startsWith(".")) continue;
      walkDir(full, out);
    } else if (SCAN_EXTS.has(extOf(name))) {
      out.push(full);
    }
  }
  return out;
}

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

// ---------------------------------------------------------------------------
// Verification passes
// ---------------------------------------------------------------------------

/**
 * Pass 1 — for each Tier A / Tier B manifest entry:
 *   - Locate the constant in `entry.file`.
 *   - Compare the live string to `entry.verbatim` byte-for-byte.
 *   - Recompute SHA-256 and compare to `entry.hash`.
 *   - If `version_stamp` is set, verify the coupled stamp constant exists
 *     in the same file and has the expected value.
 */
function verifyTierABEntries(manifest: Manifest): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  for (const entry of manifest.entries) {
    if (entry.tier === "C") continue;
    const filePath = join(REPO_ROOT, entry.file);
    let live: string | null;
    try {
      live = extractStringExport(filePath, entry.constant);
    } catch (err) {
      failures.push({
        kind: "unreadable-file",
        detail: `${entry.constant} in ${entry.file}: ${(err as Error).message}`,
      });
      continue;
    }
    if (live === null) {
      failures.push({
        kind: "missing-export",
        detail: `${entry.constant} not exported from ${entry.file}`,
      });
      continue;
    }
    if (entry.verbatim !== undefined && live !== entry.verbatim) {
      failures.push({
        kind: "verbatim-mismatch",
        detail:
          `${entry.constant} in ${entry.file} differs from manifest verbatim. ` +
          `Live SHA-256: ${sha256(live)}. Manifest SHA-256: ${entry.hash}. ` +
          `Source determination: ${entry.source_determination} ${entry.source_section}.`,
      });
      continue;
    }
    const liveHash = sha256(live);
    if (liveHash !== entry.hash) {
      failures.push({
        kind: "hash-mismatch",
        detail:
          `${entry.constant} in ${entry.file} hash mismatch. ` +
          `Live: ${liveHash}. Manifest: ${entry.hash}.`,
      });
      continue;
    }
    if (entry.version_stamp) {
      const [stampName, stampVal] = entry.version_stamp.split("=");
      let liveStamp: string | null;
      try {
        liveStamp = extractStringExport(filePath, stampName);
      } catch (err) {
        failures.push({
          kind: "unreadable-file",
          detail: `${stampName} (version stamp) in ${entry.file}: ${(err as Error).message}`,
        });
        continue;
      }
      if (liveStamp === null) {
        failures.push({
          kind: "missing-version-stamp",
          detail: `${stampName} not exported from ${entry.file} (required for ${entry.constant})`,
        });
        continue;
      }
      if (liveStamp !== stampVal) {
        failures.push({
          kind: "version-stamp-mismatch",
          detail:
            `${stampName} in ${entry.file} is "${liveStamp}", expected "${stampVal}" ` +
            `(coupled to ${entry.constant}).`,
        });
      }
    }
  }
  return failures;
}

/**
 * Pass 2 — for every Tier C manifest entry:
 *   - Locate the constant.
 *   - Recompute SHA-256 and compare to `entry.hash`.
 *   - Tier C is hash-only (no verbatim in the manifest).
 */
function verifyTierCEntries(manifest: Manifest): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  for (const entry of manifest.entries) {
    if (entry.tier !== "C") continue;
    const filePath = join(REPO_ROOT, entry.file);
    let live: string | null;
    try {
      live = extractStringExport(filePath, entry.constant);
    } catch (err) {
      failures.push({
        kind: "unreadable-file",
        detail: `${entry.constant} in ${entry.file}: ${(err as Error).message}`,
      });
      continue;
    }
    if (live === null) {
      failures.push({
        kind: "missing-export",
        detail: `${entry.constant} not exported from ${entry.file}`,
      });
      continue;
    }
    const liveHash = sha256(live);
    if (liveHash !== entry.hash) {
      failures.push({
        kind: "hash-mismatch",
        detail:
          `${entry.constant} (Tier C) in ${entry.file} hash mismatch. ` +
          `Live: ${liveHash}. Manifest: ${entry.hash}.`,
      });
    }
  }
  return failures;
}

/**
 * Pass 3 — for every manifest entry, verify that the cited source
 * determination file exists in docs/compliance/.
 */
function verifySourceDeterminations(manifest: Manifest): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  for (const entry of manifest.entries) {
    const detPath = join(REPO_ROOT, entry.source_determination);
    if (!existsSync(detPath)) {
      failures.push({
        kind: "missing-source-file",
        detail:
          `${entry.constant} cites ${entry.source_determination} ` +
          `which does not exist in the repo.`,
      });
    }
  }
  return failures;
}

/**
 * Pass 4 — Tier-2 dangling-reference check (§3.4 of the guard design).
 *
 * Scan lib/ and components/ for source-comments of the form
 *   // Source: <filename>.md
 *   // source_determination: <filename>.md
 *   // see <filename>.md
 *
 * and verify each cited filename resolves to a file in docs/compliance/.
 */
function verifyDanglingReferences(): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    walkDir(join(REPO_ROOT, dir), files);
  }
  const re = /\/\/[^\n]*?([A-Za-z0-9_./-]+\.md)/g;
  for (const file of files) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch (err) {
      failures.push({
        kind: "unreadable-file",
        detail: `${file}: ${(err as Error).message}`,
      });
      continue;
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const cited = m[1];
      // Skip URL fragments and non-determination references.
      if (cited.includes("://")) continue;
      // Resolve as a docs/compliance/ filename (basename match) OR as
      // a path relative to repo root.
      const basename = cited.split("/").pop()!;
      const directPath = join(REPO_ROOT, cited);
      const compliancePath = join(DOCS_COMPLIANCE_DIR, basename);
      if (!existsSync(directPath) && !existsSync(compliancePath)) {
        const line = src.slice(0, m.index).split("\n").length;
        failures.push({
          kind: "dangling-source-comment",
          detail:
            `${relative(REPO_ROOT, file)}:${line} cites ${cited} ` +
            `which does not exist in docs/compliance/ or at the given path.`,
        });
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Shape B — assembly manifest passes
// ---------------------------------------------------------------------------

function readAssemblyManifest(): AssemblyManifest {
  if (!existsSync(ASSEMBLY_MANIFEST_PATH)) {
    throw new Error(`Assembly manifest not found at ${ASSEMBLY_MANIFEST_PATH}`);
  }
  return JSON.parse(readFileSync(ASSEMBLY_MANIFEST_PATH, "utf8")) as AssemblyManifest;
}

/**
 * Shape-B Pass 0 — schema validator (ruling §2.4 item 5).
 * Every assembly entry must carry {key, value, hash, tier, version}. An entry that looks like a
 * Shape-A entry (has `constant`/`file`/`verbatim`) is a cross-schema contamination and hard-fails.
 * Duplicate keys hard-fail (ambiguous resolution).
 */
function validateShapeBSchema(m: AssemblyManifest): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  if (!Array.isArray(m.entries)) {
    return [{ kind: "shapeb-schema-violation", detail: "assembly manifest `entries` is not an array" }];
  }
  const seen = new Set<string>();
  for (const e of m.entries as unknown[]) {
    const o = e as Record<string, unknown>;
    const id = typeof o.key === "string" ? o.key : JSON.stringify(o).slice(0, 60);
    for (const req of ["key", "value", "hash", "tier", "version"]) {
      if (typeof o[req] !== "string") {
        failures.push({
          kind: "shapeb-schema-violation",
          detail: `assembly entry "${id}" missing/invalid required field "${req}"`,
        });
      }
    }
    if ("constant" in o || "file" in o || "verbatim" in o) {
      failures.push({
        kind: "shapeb-schema-violation",
        detail: `assembly entry "${id}" carries Shape-A fields (constant/file/verbatim) — cross-schema contamination`,
      });
    }
    if (o.tier !== undefined && o.tier !== "A" && o.tier !== "B") {
      failures.push({
        kind: "shapeb-schema-violation",
        detail: `assembly entry "${id}" tier must be "A" or "B" (got ${JSON.stringify(o.tier)})`,
      });
    }
    if (typeof o.key === "string") {
      if (seen.has(o.key)) {
        failures.push({ kind: "shapeb-duplicate-key", detail: `assembly manifest has duplicate key "${o.key}"` });
      }
      seen.add(o.key);
    }
  }
  return failures;
}

/**
 * Shape-B Pass 1 — tamper detection: recompute SHA-256 of each `value` and compare to `hash`.
 * The manifest itself is the source-of-truth for the prose, so the guard protects the file from edits
 * that change a value without re-running the hash (i.e., un-attested prose changes).
 */
function verifyShapeBHashes(m: AssemblyManifest): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  for (const entry of m.entries) {
    if (typeof entry.value !== "string" || typeof entry.hash !== "string") continue; // schema pass reports
    const live = sha256(entry.value);
    if (live !== entry.hash) {
      failures.push({
        kind: "shapeb-hash-mismatch",
        detail:
          `assembly key "${entry.key}" value/hash mismatch. Computed: ${live}. Stored: ${entry.hash}. ` +
          `Source ruling: ${entry.source_ruling}. (Run \`npm run lockedprose:hash\` only after broker re-ratification.)`,
      });
    }
  }
  return failures;
}

/**
 * Shape-B Pass 2 — dangling LockedKey check. Scan lib/, components/, app/ for `// LockedKey: <KEY>`
 * comments and confirm each cited KEY resolves to an entry in the assembly manifest. Mirrors the
 * Tier-2 `// Source: <file>.md` scanner (ruling §2.4 item 4).
 */
function verifyDanglingLockedKeys(validKeys: Set<string>): VerifyFailure[] {
  const failures: VerifyFailure[] = [];
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walkDir(join(REPO_ROOT, dir), files);
  const re = /\/\/\s*LockedKey:\s*([A-Za-z0-9_]+)/g;
  for (const file of files) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch (err) {
      failures.push({ kind: "unreadable-file", detail: `${file}: ${(err as Error).message}` });
      continue;
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const key = m[1];
      if (!validKeys.has(key)) {
        const line = src.slice(0, m.index).split("\n").length;
        failures.push({
          kind: "dangling-locked-key",
          detail:
            `${relative(REPO_ROOT, file)}:${line} references // LockedKey: ${key} ` +
            `which does not resolve to an entry in locked_prose_manifest_phase2_assembly.json.`,
        });
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): number {
  // --- Shape A: original hash-attested manifest (prose in .ts exports) ---
  let manifest: Manifest;
  try {
    manifest = readManifest();
  } catch (err) {
    console.error(`[verify-locked-prose] FATAL (shape A): ${(err as Error).message}`);
    return 2;
  }

  // --- Shape B: assembly manifest (prose in the manifest itself) ---
  let assembly: AssemblyManifest | null = null;
  try {
    assembly = readAssemblyManifest();
  } catch (err) {
    // The assembly manifest is required once it exists in the repo. If it's genuinely absent
    // (e.g. running on a pre-Phase-1.5 checkout), shape-A-only verification still proceeds.
    if (existsSync(ASSEMBLY_MANIFEST_PATH)) {
      console.error(`[verify-locked-prose] FATAL (shape B): ${(err as Error).message}`);
      return 2;
    }
    console.warn("[verify-locked-prose] note: assembly manifest absent — shape-A-only run.");
  }

  console.log(
    `[verify-locked-prose] shape A: ${manifest.manifest_version} ` +
      `(${manifest.entries.length} entries)` +
      (assembly
        ? ` | shape B: ${assembly.manifest_version} (${assembly.entries.length} entries, role=${assembly.manifest_role})`
        : " | shape B: absent")
  );

  const failures: VerifyFailure[] = [
    // Shape A passes (unchanged).
    ...verifyTierABEntries(manifest),
    ...verifyTierCEntries(manifest),
    ...verifySourceDeterminations(manifest),
    // Tier-2 dangling `// Source: <file>.md` scanner (now also scans app/).
    ...verifyDanglingReferences(),
  ];

  if (assembly) {
    const schemaFailures = validateShapeBSchema(assembly);
    failures.push(...schemaFailures);
    // Only run hash + key-resolution passes if the schema is structurally sound.
    if (schemaFailures.length === 0) {
      const validKeys = new Set(assembly.entries.map((e) => e.key));
      failures.push(...verifyShapeBHashes(assembly));
      failures.push(...verifyDanglingLockedKeys(validKeys));
    }
  }

  if (failures.length === 0) {
    const total = manifest.entries.length + (assembly ? assembly.entries.length : 0);
    console.log(
      `[verify-locked-prose] PASS — ${total} locked entries verified across ` +
        `${assembly ? "two manifests" : "one manifest"}; no dangling references.`
    );
    return 0;
  }

  console.error(
    `[verify-locked-prose] FAIL — ${failures.length} drift(s) detected:`
  );
  for (const f of failures) {
    console.error(`  [${f.kind}] ${f.detail}`);
  }
  console.error(
    "\nThis is a HARD CI FAIL per " +
      "locked_prose_ci_guard_scope_broker_determination_2026-06-15.md §3.3 " +
      "(extended by locked_prose_manifest_schema_reconciliation_broker_ruling_2026-06-29.md §2.4). " +
      "Resolve by (a) authoring/citing a broker determination, (b) updating the relevant manifest " +
      "(shape A: docs/compliance/locked_prose_manifest.json; shape B: " +
      "docs/compliance/locked_prose_manifest_phase2_assembly.json), (c) re-hashing any edited shape-B " +
      "value after broker re-ratification, and (d) referencing the determination filename in the PR."
  );
  return 1;
}

process.exit(main());
