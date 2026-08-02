# OwnerPilot Preview Supabase Isolation Record

Status: INTERNAL OPERATIONS CONTROL
Founder authorization date: 2026-08-02
Scope: Restricted non-Production Preview authentication and synthetic Preview operations
Production authority: None

## Purpose

This record documents the non-secret identity and configuration boundaries that keep OwnerPilot Preview authentication isolated from Production.

It must be updated whenever the dedicated Preview Supabase project, Vercel linkage, callback origins, or environment-variable mapping changes.

No secret values, passwords, tokens, API keys, service-role credentials, session cookies, refresh tokens, magic-link tokens, OTP values, or full administrator allowlists may be recorded here.

## Controlling requirements

- Preview must use a dedicated non-Production Supabase project.
- Production must continue using the existing Production Supabase project.
- Preview and Production project IDs must differ.
- Preview variables must be scoped only to Vercel Preview environments.
- Production variables must not be replaced, modified, or overridden.
- Preview callback origins must contain no Production destination.
- Production callback configuration must remain unchanged.
- Project selection must be server-controlled and fail closed.
- No fallback or automatic substitution between Preview and Production projects is permitted.
- The Preview Auth tenant may contain only Founder-approved administrators and clearly labeled synthetic non-Production identities.
- Public, customer, tenant, landlord-user, or self-service signup is not authorized.

## Vercel project linkage

Vercel project name: `ownerpilot`
Vercel project ID: `prj_e30WRgjKVZvKvJKrtCaGQ1XdjQ31`
Vercel team ID: `team_Hkzcinc4zHhqWOyJA8dEw4Kb`
Authorized deployment scope: Preview only
Production modification authorized: No

## Supabase project identities

### Production

Project name: `Ownerpilot.ai`
Project ID: `txpetdrfsmqnyooydmas`
Role: Existing Production Supabase project and Auth tenant
Modification authorized by this work: No

### Dedicated Preview

Project name: Pending project creation
Project ID: Pending project creation
Role: Restricted Preview authentication and synthetic Preview operations only
Must differ from Production project ID: Yes
Production users permitted: No
Production database connection permitted: No
Production service-role credential permitted: No

## Callback and redirect origins

### Preview permitted origins

Pending dedicated Preview project creation and deployment verification.

Initial successful callback destination is fixed server-side to:

`/internal/executive-agents/preview`

### Explicitly prohibited destinations

- Production domains
- arbitrary browser-supplied return URLs
- external domains
- protocol-relative URLs
- customer-facing destinations
- malformed, missing, expired, or mismatched auth state

### Production callbacks

Modification authorized: No
Verified unchanged: Pending verification after Preview project configuration

## Environment-variable mapping

The mapping below records variable names and scope only. Values must never be committed.

| Variable | Vercel scope | Expected project | Secret value recorded here |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview only | Dedicated Preview Supabase project | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview only | Dedicated Preview Supabase project | No |
| `ADMIN_EMAILS` | Preview only | Authorization metadata only | No |
| `EXECUTIVE_AGENTS_PREVIEW_ENABLED` | Preview only | Exact value `true` | No |
| `EXECUTIVE_AGENTS_PREVIEW_ROUTE_SECRET` | Preview only | Restricted Preview route | No |
| `AI_GATEWAY_API_KEY` | Preview only | Restricted Preview Gateway | No |
| `EXECUTIVE_AGENTS_PREVIEW_INPUT_MICROS_PER_MILLION_TOKENS` | Preview only | Diagnostic cost control | No |
| `EXECUTIVE_AGENTS_PREVIEW_OUTPUT_MICROS_PER_MILLION_TOKENS` | Preview only | Diagnostic cost control | No |

Production Supabase variables must remain mapped to project `txpetdrfsmqnyooydmas` and must not be changed by the Preview authentication work.

## Required verification before login implementation

- [ ] Dedicated Preview Supabase project ID recorded.
- [ ] Preview and Production project IDs proven different.
- [ ] Preview Vercel variables point only to the Preview project.
- [ ] Production Vercel variables remain unchanged.
- [ ] Preview callback origins contain no Production destination.
- [ ] Production callbacks were not modified.
- [ ] Public signup posture in Preview is verified and compliant.
- [ ] Enabled Preview sign-in method is recorded.
- [ ] Production users are absent from the Preview tenant.
- [ ] Founder identity has not been provisioned in Production.
- [ ] No Production service-role credential is used in Preview.
- [ ] Service-role credentials are absent from browser code and client bundles.

## Founder account provisioning checkpoint

Founder provisioning may occur only after the dedicated Preview project ID is recorded above and isolation checks pass.

Provisioning must be a documented human action in the dedicated Preview Auth tenant. It must not use E2E credentials, shared test identities, browser-exposed service-role credentials, database role tables, or any Production Auth action.

## Change-control rule

Any change that would modify Production Supabase configuration, create a Production Auth identity, change Production redirects, introduce shared sessions, enable public signup, add a new identity provider, or require schema or RLS changes requires a new Founder decision before implementation.
