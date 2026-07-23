# Canonical Architecture Mapping — CA-001 Constitutional Auditor

**Rule (anti-duplication):** exactly one canonical representation per concept. Before creating anything, every concept is mapped to an existing owner and a decision — **Extend / Create / Merge / Preserve**. Grounded in live introspection of the `constitution` schema (2026-07-23), which already contains a governance/registry model.

## Existing owners discovered (Phase 1 audit)

- **Constitutional registry:** `constitution.artifacts` (`canonical_id`, `artifact_type`, `title`, `status`, `current_version`, `source_path`, `github_url`, `content_hash`, `metadata`) + `artifact_versions` (`version`, `lifecycle_state`, `content_markdown`, `content_hash`, `approved_by`).
- **Capability registry:** `constitution.capabilities` (`capability_code`, `name`, `risk_tier`, `execution_mode`, `required_approval_stage`, `input_schema`, `output_schema`).
- **AI organization registry:** `constitution.ai_organizations` (`organization_code`, `mission`, `authority_level`, `founder_approval_required`, `escalation_policy`, `operating_policy`) + `ai_organization_capabilities` (link, `enabled`, `constraints`).
- **Review gates:** `constitution.agent_review_gates` (`gate_type`, `status`, `reviewer_type`, `reviewer_ref`, `findings jsonb`, `decision_notes`, `decided_at`).
- **Audit events:** `constitution.agent_event_log` (`event_type`, `severity`, `message`, `payload`).
- **Governance decisions / approvals:** `constitution.governance_decisions` (`decision_id`, `decision_type`, `status`, `decided_by`, `supersedes_decision_id`), `approvals` (`subject_type`, `subject_id`, `approval_stage`, `actor`).
- **Amendment / supersession:** `constitution.amendments`, `cross_references`.

## Mapping matrix

| Concept | Existing owner | Decision | Notes |
|---|---|---|---|
| Constitutional Auditor **capability** | `constitution.capabilities` | **Extend** | new row `capability_code='CA-001'`; `risk_tier`=governance, `execution_mode`=review-only, `required_approval_stage`=human. No new capability table. |
| Constitutional Assurance **organization** | `constitution.ai_organizations` | **Extend** | new row `organization_code='constitutional_assurance'`; `authority_level`=independent-assurance; `founder_approval_required=true`; prohibitions in `operating_policy`. |
| Org ↔ capability binding | `constitution.ai_organization_capabilities` | **Extend** | link the two above; `constraints` jsonb encodes the §3 prohibitions (no write/deploy/merge/ratify/self-audit). |
| Auditor **findings** | `constitution.agent_review_gates.findings` (jsonb) | **Extend** | `reviewer_type='constitutional_auditor'`; the finding model (CA-001 §5) is the jsonb shape. No new findings table unless volume warrants (future ADR). |
| Audit **events** | `constitution.agent_event_log` | **Extend** | `event_type='constitutional_audit'`. No new audit-log table. |
| CA-001 as a registered **artifact** | `constitution.artifacts` + `artifact_versions` | **Extend** | `canonical_id='CA-001'`, `artifact_type='constitutional_capability'`, `source_path` = this repo file, `content_hash` = the CA-001 checksum. |
| Human **dispositions** of findings | `constitution.governance_decisions`, `approvals` | **Extend** | audit conclusions that need a human decision route here. |
| **ADR** for the auditor | `constitution/adr/adr_log.md` | **Preserve + extend** | append ADR-009 (this task); ADR-008 preserved. |
| Constitutional **Knowledge Object** model | `constitution.artifacts` / `artifact_versions` | **Extend** (future, EA-010) | CKL is Phase-II priority; not built here. |
| AI **provider** registry | `constitution.intelligence_model_registry` (possible overlap) | **Audit then extend/rename** (future, EA-011) | flagged; not touched here. |
| Engineering Constitution | `CONSTITUTION.md` + `standards/` | **Preserve** | do not create a duplicate governing document. |

## Decision summary

CA-001 is delivered **entirely by extension** — zero new tables, zero new parallel registries. The auditor is a capability owned by a Constitutional Assurance organization; its findings and events live in the existing review-gate and event-log structures; it registers as an artifact in the existing constitutional registry. **The DB rows that register these (capability, org, link, artifact) are a future reviewed migration; none were applied by this task** (repository-first, no production DB change). The migration, when drafted, follows the COS workflow and does not bypass repository review.

## Conflicts / escalations
None. No repository evidence conflicts with the Appendix A directive. The `constitution` model cleanly supports CA-001 by extension. One open item for the Founder: whether findings should eventually get a dedicated `constitution.audit_findings` table (if audit volume outgrows `agent_review_gates.findings` jsonb) — recorded as an open decision, not built.
