# Phase 3 — Constitutional Governance Automation

**Rule:** *no migration may change the Constitution without simultaneously updating its governance artifacts.* Every constitutional migration produces a **Migration Governance Record** (one file per migration, `constitution/database/migrations/<name>_record.md`) covering the ten required outputs. The pre-merge CI gate (checks 11/13/14) fails if a schema-touching PR lacks a complete record or leaves docs/ADRs out of sync.

## The ten required outputs (per migration)

1. **Updated baseline checksum** — recompute `genesis_checksum` (checks.sql check 0) after apply; commit the new `constitution_checksum.sha256` + `constitution_v<X.Y>_manifest.json` (baseline refresh, workflow step 8).
2. **Migration summary** — what changed, why, additive/reversible, objects touched.
3. **Architecture impact report** — which subsystems/tables/functions are affected.
4. **Affected Enterprise Architecture documents** — list + the specific edits made (or "none").
5. **Affected ADRs** — new ADR(s) for novel decisions; ADRs superseded/amended.
6. **Affected Constitutional Doctrines** — governance-handbook sections implicated (or "none").
7. **Affected ESL modules** — downstream modules that read the changed objects.
8. **Dependency graph update** — new/removed FKs, function call-sites, module edges.
9. **Repository health report** — validation run result (all checks green? which changed?).
10. **Constitution version increment recommendation** — patch/minor/major per the versioning policy (handbook §versioning).

## Migration Governance Record — template

```markdown
# Migration Governance Record — <migration_name>
- Constitution version: v<from> → v<to>   | Type: additive | reversible: yes
- Author / date / authorizing ADR:
## 1 Summary
## 2 Architecture impact (subsystems, tables, functions)
## 3 Affected EA documents (+ edits)
## 4 Affected ADRs (new / superseded)
## 5 Affected Doctrines
## 6 Affected ESL modules
## 7 Dependency graph delta (FKs, call-sites, module edges)
## 8 Validation result (checks.sql: which changed, all green?)
## 9 Baseline refresh (old overall_sha256 → new overall_sha256)
## 10 Version increment recommendation (+ rationale)
```

## Automation shape

- A `constitution/tools/new_migration.md` checklist (and, later, a script) scaffolds the migration file + a blank record from the template, so a migration physically cannot be opened without its record.
- The **baseline refresh** (output 1) is scriptable: run `checks.sql` check 0, write the new `overall_sha256` into the record (output 9) and the manifest. The CI baseline gate then verifies committed manifest == live.
- The **doc-sync check** (CI checks 11/13/14) compares the migration's declared "affected docs" against a diff of `architecture/`, `adr/`, and `doctrines/` in the same PR — an undeclared schema/doc divergence fails the build.

## Automated documentation update strategy (deliverable #7)

1. Migration authored → record scaffolded (affected-docs list is mandatory, not optional).
2. Author edits the listed EA/ADR/module docs **in the same PR**.
3. CI cross-checks: every object the migration creates/alters must appear in `module_architecture.md`; every doc claim must map to a live object (checks 11/13).
4. On merge + apply, baseline refresh updates the manifest/checksum; the version increments; the roadmap's "current version" line updates.
5. Result: the docs, the schema, the baseline, and the version move together — never independently.
