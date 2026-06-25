# RTC Predicates 5 / 7 / 8 — Consolidated Inline Rulings

## §0 — Provenance and posture (build-authored container note)

This file consolidates four broker rulings delivered inline across the predicate-5/7/8 RTC form-refresh work streams, so that the predicate-7 and predicate-8 authority chains resolve to `docs/compliance/` rather than to transcript references. It is a faithful container: build authored only this provenance note and the section structure; every ruling below is broker-authored. No verdict, attestation, or summary prose is build-authored here.

Provenance by section:

- **§1 (UA-string fix, predicate 5)** — transcript-extracted verbatim from the 2026-06-24 deploy/readroute session (single self-contained block, subject-header to §0-footer). Broker verified the extracted text by direct read before sign-off.
- **§2 (parity-mechanism M1, predicate 7)** — broker-reconstructed verbatim 2026-06-25, not transcript-extracted. The original 2026-06-24 ruling was delivered as an attachment the session transcript did not retain as text, and neither the build transcript nor the broker workspace held the verbatim original; broker reconstructed it from authorial intent. Signed as of its original 2026-06-24 authorship date.
- **§3 (read-route interface, predicate 8)** — broker-reconstructed verbatim 2026-06-25, not transcript-extracted. Originally delivered as a brief inline message without a signature anchor.
- **§4 (caller-auth gating, predicate 8)** — broker-reconstructed verbatim 2026-06-25, not transcript-extracted. Same inline-delivery provenance as §3.

---

## §1 — UA-string fix ruling (predicate 5)

*Transcript-extracted verbatim — 2026-06-24 deploy/readroute session, raw line 1771.*

This is a build-discipline ruling on production fetcher identity to a government source (LAHD); no attorney attribution attaches.
§1 Ruling Summary
Option	Disposition	Rationale
(A) ownerpilot-rtc-refresh/1.0	AUTHORIZED — production default	Empirically confirmed 200 against LAHD WAF today. Honestly names the tool. Zero further testing required. Ships now.
(B) +URL Googlebot-style contact pointer	REJECTED for this iteration	Good-citizen instinct correct, but unproven against this WAF. Adding an untested string to a gate-closed predicate path is the wrong risk posture when (A) is already green.
(C) Broker-supplied custom string	DECLINED	I have no string to add that (A) doesn't already cover. The honest tool name is the right identity.
Ship Option (A): ownerpilot-rtc-refresh/1.0 — verbatim, no parenthetical, no trailing whitespace, no version drift.
§2 Reasoning
Why not (B) right now. The good-web-citizen argument for +URL is real — Googlebot-style contact pointers are a recognized convention and LAHD operators should be able to identify/contact the source of automated fetches. But three things make (B) the wrong call for this cut:
Gate-closed constraint. We're inside an attestation predicate path. Predicate 7 (parity check) and the broader RTC refresh runner go-live depend on the fetcher behaving identically in dev and prod. (A) is the only string with an empirical 200. Substituting an untested string — even a plausibly-safer one — re-opens a risk we already closed.
WAF rule is unknown. Your own diagnosis is correct: the parenthetical-with-prose pattern is the likely trigger, and a bare +URL may well pass. "May well" is not "does." LAHD's WAF is a black box; the only signal we have is the 200 on (A).
Contact-pointer value is low here. The Googlebot +URL convention matters most for high-volume crawlers where operators need a way to throttle or block politely. We're hitting 9 URLs once a week. If LAHD ever wants to identify the source, the IP + the distinctive UA token ownerpilot-rtc-refresh is enough for them to find us — we're not hiding, and the tool name is searchable.
Why not (C). I'd be inventing a string for the sake of inventing one. The honest tool name is the right answer; I have no broker-side requirement that (A) fails to satisfy.
When (B) becomes worth revisiting. If LAHD ever rate-limits us, blocks the IP, or sends an abuse-style signal, we revisit with (B) as the diplomatic-upgrade path — curl-test first, then patch. Until then, (A) is the production string and there's no good reason to touch it.
§3 Action Items
Build: Patch the fetcher with UA string ownerpilot-rtc-refresh/1.0 — exact, no parenthetical, no +URL, no trailing text.
Build: Confirm the string is centralized (single constant in lib/jurisdiction/ or _core/) so dev/prod/parity-check all emit byte-identical UA.
Build: Add a one-line comment at the constant: // UA locked by broker ruling 2026-06-24. Do not modify without broker sign-off. Reason: only string empirically confirmed against LAHD WAF.
Build: Parity-check script (M1) inherits the same constant — no separate UA string for the broker-run script.
Future revisit trigger (no action now): If LAHD signals throttling/blocking/abuse, surface a ruling-request for (B) with a curl-test plan.
§0 Posture Footer
OwnerPilot AI = broker-scope only under Bus. & Prof. Code § 10131(b). Jack Taglyan, CalDRE B9445457, sole compliance authority. No attorney attribution attaches to this ruling

---

## §2 — Parity-mechanism M1 ruling (predicate 7)

*Broker-reconstructed verbatim 2026-06-25, not transcript-extracted.*

Subject: Parity-check mechanism for predicate 7 — M1 (broker-run Node/tsx fetcher-parity) vs. M2 (deployed-Deno-runtime parity via gate-bypass leg)
Ruling: Predicate 7's parity evidence is produced via M1: the parity-check script runs the fetcher code under broker-side Node/tsx against the nine live LAHD URLs, with results captured in docs/compliance/rtc_parity_report_2026-06-24.txt (and the stability re-run ..._stability.txt). The 9/9 MATCH result attests that the fetcher module — the code that constructs requests, parses responses, and produces the canonical form output — behaves identically across all nine URLs when exercised under Node/tsx. M2 is rejected.
Reasoning: M2 would have routed the parity check through the deployed Edge Function in its Deno runtime, exercising the deployed runtime end-to-end (network layer, headers, response handling, parsing, canonical-form emission, all as Deno executes them). On paper that is the higher-fidelity parity check — it tests the runtime that will actually serve production. M2 is rejected on gate-semantics-change grounds: the Edge Function is gated by isLaProductionUnblocked() and short-circuits to {skipped: 'la-gate-closed'} whenever LA is blocked, which it currently is and will remain throughout the attestation window. To run the parity check through the deployed function requires either (i) flipping the gate temporarily to permit execution, which inverts the attestation order (the gate must flip because of satisfied predicates, not to produce a predicate's evidence), or (ii) introducing a gate-bypass leg in the function itself, which changes what the gate means — the gate would then mean "block production except for this special evidence-gathering path," which is a semantically different gate than the one whose flip the attestation is authorizing. Either route inverts the relationship between gate and evidence: evidence is supposed to justify flipping the gate, not be produced by changing what the gate is.
M1 avoids that inversion. The fetcher module is the part of the code whose correctness predicate 7 actually concerns — same request construction, same response parsing, same canonical-form emission. Running it under Node/tsx instead of deployed Deno changes the runtime but not the code being attested. The remaining question — whether deployed Deno produces the same network-layer and response-handling behavior as Node/tsx for these specific URLs — is real but is operational evidence, not attestation evidence. It is captured at first cron-leg run post-go-live, in the post-flip monitoring window, by comparing the deployed function's first-run output against the M1 baseline. A divergence there triggers operational rollback procedures (separately ruled), not retroactive invalidation of this attestation.
This split — attestation evidence = fetcher-code parity under broker-run Node/tsx; operational evidence = deployed-runtime parity at first cron-leg — keeps the gate-attestation relationship clean and locates the deployed-runtime question where it actually belongs (post-flip monitoring, not pre-flip attestation).
Scope: This ruling governs predicate 7 only. It does not author the parity-script implementation itself (that's case 76). It does not author the operational monitoring procedure for first cron-leg run (that's a separate post-flip operational document; out of scope here). It does not contemplate parity re-runs against a different URL set; the nine URLs are fixed by the M1 evidence file. If the URL set changes, predicate 7's evidence must be regenerated.
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-24

---

## §3 — Read-route interface ruling (predicate 8)

*Broker-reconstructed verbatim 2026-06-25, not transcript-extracted.*

Subject: Read-route interface scoping — per-language vs. all-languages, parameter validation, fail-closed disposition
Ruling: The internal read route at /api/internal/rtc-block-state/route.ts is per-language scoped, not all-languages-batch. The language parameter is required, validated before any PostgREST or in-process readBlockState call, and missing/invalid values return 400 with no downstream call attempted. Consumption is in-process — the route imports and invokes readBlockState directly; there is no HTTP self-call from the serve path to the route. The route exists so that an out-of-process caller (e.g., a future operator tool or audit probe) can read block state through the same code path the serve path uses, with the same RLS posture (migration 016's rtc_block_state_reader SELECT policy) and the same fail-closed semantics.
Reasoning: Per-language scoping mirrors how isLaLanguageUnblocked is consumed downstream — one language at a time — and avoids batch-shape coupling between the read route and any future caller. Validate-before-call is the standard fail-closed posture: a malformed request must not reach the database, must not consume a reader-role connection, and must produce a deterministic 400 the caller can handle. In-process consumption keeps the serve path on a single transport (no HTTP-to-self latency, no double-auth, no risk of route-vs-direct drift).
Scope: This ruling governs the route's interface contract. It does not author the route's authentication mechanism — that's the separate caller-auth gating ruling. It does not author the consumption shape of readBlockState itself — that's already established (per-language, returns {blocked, reason, asOf} or analogous).
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25

---

## §4 — Caller-auth gating ruling (predicate 8)

*Broker-reconstructed verbatim 2026-06-25, not transcript-extracted.*

Subject: Read-route caller-authentication — ship-open vs. shared-secret gate
Ruling: The /api/internal/rtc-block-state/route.ts read route is gated by a shared-secret caller-auth check, not shipped open. The mechanism is an environment variable RTC_BLOCK_STATE_ROUTE_SECRET read at route invocation and a required request header x-rtc-block-state-secret compared against it. Failure modes are deterministic and ordered:
Env missing or empty (RTC_BLOCK_STATE_ROUTE_SECRET not set on the deployment) → 500 with body indicating misconfiguration. Fail-closed by design — a route that can't authenticate must not respond as if it can.
Header missing → 401.
Header present but does not match env → 401. (Same status as missing; no oracle distinguishing the two.)
Header matches env → proceed to language-param validation (per the interface ruling above), then to readBlockState.
Check order is fixed: env-presence first, then header-presence, then header-match. The env check produces 500 because it's a deployment-configuration failure on this side, not a caller failure.
Reasoning: Ship-open was rejected on two grounds. First, path-name truthfulness: the route lives under /api/internal/, which is a contract with anyone reading the codebase that the route is not externally callable without authorization. Shipping it open would make the path name a lie. Second, defense-in-depth: even though the route's only data exposure is per-language block state (which is not, on its own, sensitive), the route consumes a reader-role database connection on every call. A public route consuming a database connection on every request is a denial-of-service surface, and adding the shared-secret check costs essentially nothing while removing that surface. The shared-secret mechanism is intentionally minimal — it is not a substitute for proper service-to-service auth if the route ever leaves internal use; it is the right weight for the present "internal probe only" use case.
Scope: This ruling governs caller authentication for the read route only. It does not author the database-role authentication (that's the M-1(ii) reader-auth ruling, ES256 JWT to rtc_block_state_reader). It does not author rate-limiting (out of scope for this attestation). It does not contemplate the route ever serving external traffic — if that scope change is ever proposed, this ruling is superseded and a new caller-auth mechanism must be ruled.
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-25
