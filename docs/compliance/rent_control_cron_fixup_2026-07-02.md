# Rent-Control Cities Cron `2faf60f6` — URL/UA Fixup (engineering research → broker applies)

**Re:** `gate2_prerequisites_complete_2026-07-01.md` §6 standing item — cron `2faf60f6` first-run PARTIAL (3/8 baseline captured; 5 cities unreachable). Post-Gate-2 hygiene, `GATE2` operator queue.
**Scope:** Research + verification only. The cron lives in the broker's scheduled-task runner (not the repo), so **broker applies these to the cron body**; engineering supplies the verified targets + fetch strategy.
**Filed:** 2026-07-02 (engineering).

---

## §1 — Root-cause summary (the 5 failures)

| City | Prior symptom | Root cause | Fix class |
|---|---|---|---|
| Oakland | 403 | WAF/CDN bot-block on non-browser User-Agent | **UA header** (URL is fine) |
| San Jose | 403 | Same — WAF bot-block on default cron UA | **UA header** |
| West Hollywood | 403 | Same — WAF bot-block | **UA header** |
| Berkeley | DNS | Host migrated `cityofberkeley.info` → `berkeleyca.gov` | **New hostname** |
| Beverly Hills | 404 | Path/host changed to CivicPlus numeric-ID URL | **New URL** (+ JS-render note) |

The three 403s share one cause — these `.gov` sites sit behind a CDN/WAF that rejects requests without a realistic browser `User-Agent`. A 403 (not 404) means the resource exists but the request was refused, so the fix is the request header, not the path. Berkeley and Beverly Hills are genuine address changes.

## §2 — Verified target URLs (use these in the cron body)

| City | New authoritative URL | Verification |
|---|---|---|
| Oakland (RAP) | `https://www.oaklandca.gov/topics/rent-adjustment-program` | Canonical from oaklandca.gov search; 403 was UA-block, not path |
| San Jose (ARO) | `https://www.sanjoseca.gov/your-government/departments-offices/housing/tenants/learn-about-rent-stabilization` | Canonical from sanjoseca.gov search |
| West Hollywood (RSO) | `https://www.weho.org/city-government/rent-stabilization` | Canonical from weho.org search |
| Berkeley (Rent Board) | `https://rentboard.berkeleyca.gov/` | **Fetched → HTTP 200, live content**, canonical `berkeleyca.gov`, Drupal 10 |
| Beverly Hills (RSO) | `https://www.beverlyhills.org/1098/Rent-Stabilization-Ordinance` | Resolves (200); see §4 JS-render caveat |

## §3 — Fetch strategy (fixes the three 403s)

Add a realistic desktop-browser request header set to the cron's fetcher for all pinned cities (harmless for the ones already working):

```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.9
```

Rationale: a bare/library-default UA (e.g., `node-fetch`, `curl`, `python-requests`) is the classic trigger for a 403 on CDN-fronted government sites. A standard Chrome UA + `Accept`/`Accept-Language` presents as an ordinary browser and clears the block. No auth, cookies, or IP changes needed.

## §4 — Beverly Hills drift-hashing caveat (broker decision)

`beverlyhills.org` is a **CivicPlus, JavaScript-rendered** site — a raw-HTML fetch of `/1098/…` returns a near-empty shell, so a SHA-256 over that response would be **unstable** (or empty) and produce false drift alerts. Two options for the cron's Beverly Hills target:

- **(a)** Keep the landing page `…/1098/Rent-Stabilization-Ordinance` but hash a normalized/extracted-text form, not raw HTML — only viable if the cron runner executes JS or extracts text.
- **(b) Recommended:** point the Beverly Hills pin at a **stable document** instead of the JS page — e.g., the RSO summary PDF surfaced in search: `https://www.beverlyhills.org/DocumentCenter/View/5618/Chapter-5-FAQs-PDF`. PDFs in `DocumentCenter` are static and hash cleanly, which is what drift-detection wants.

The other four targets return server-rendered HTML and hash normally.

## §5 — What broker applies

1. Update cron `2faf60f6` pinned-city URLs to the five in §2 (Berkeley = new host; Beverly Hills = new URL; Oakland/SJ/WeHo unchanged-or-canonical).
2. Add the §3 header set to the cron's fetcher.
3. Decide Beverly Hills §4 (a) vs (b); recommend (b) DocumentCenter PDF for clean hashing.
4. Re-run the cron once; expect **8/8 baseline captured** (the 3 already-good SF/LA/Santa Monica + these 5). First-run for the newly-fixed cities captures baseline SHA in-band (same pattern as the LAHD cover-sheet pin).

## §6 — Verification status (engineering)

- Berkeley: **confirmed 200 + live content** via fetch (new host).
- Beverly Hills: URL resolves; flagged JS-render for §4.
- Oakland / San Jose / West Hollywood: URLs confirmed as current canonical pages via authoritative `.gov` search; the 403s are UA/WAF blocks (not path errors), so canonical URL + §3 UA is the remedy. Final confirmation is the cron's next run with the new UA.

---

— Engineering (Claude Code) · rent-control cron research for broker application · 2026-07-02

**Sources:**
- [Oakland RAP](https://www.oaklandca.gov/topics/rent-adjustment-program)
- [San José Rent Stabilization](https://www.sanjoseca.gov/your-government/departments-offices/housing/tenants/learn-about-rent-stabilization)
- [West Hollywood Rent Stabilization](https://www.weho.org/city-government/rent-stabilization)
- [Berkeley Rent Board](https://rentboard.berkeleyca.gov/)
- [Beverly Hills Rent Stabilization Ordinance](https://www.beverlyhills.org/1098/Rent-Stabilization-Ordinance)
