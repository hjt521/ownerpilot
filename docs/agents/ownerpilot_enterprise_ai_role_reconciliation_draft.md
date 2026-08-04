# OwnerPilot Enterprise AI Role Reconciliation — Draft

**Status:** NONCANONICAL RECONCILIATION DRAFT
**Date:** 2026-08-04
**Runtime authority:** None
**Implementation authority:** None
**Preview authority:** None
**Production authority:** None
**Constitutional consequence:** None

## 1. Purpose

This draft creates a controlled classification framework for reconciling OwnerPilot's previously discussed full AI-operated enterprise with the narrower executive-agent implementation now present in the repository.

It does not ratify, activate, implement, or remove any role.

## 2. Controlling distinction

The complete enterprise-agent vision and the current executable role set are not the same thing.

The current repository implements or represents only:

- `executive.ceo`
- `executive.chief_of_staff`
- `executive.chief_architecture_officer`

The broader Founder-confirmed enterprise vision includes a board or advisory layer, sales and marketing agents, and additional executive, departmental, specialist, assurance, and operator functions. Exact names and status remain subject to source recovery.

## 3. Reconciliation categories

Every recovered role must be assigned to exactly one current source-status category pending Founder review:

1. **Ratified constitutional role or organization**
2. **Approved architecture role or organization**
3. **Nonconstitutional research or design proposal**
4. **Founder-confirmed prior concept pending exact source**
5. **Current implemented Preview role**
6. **Newly proposed role**
7. **Superseded or conflicting role**
8. **Unresolved**

Source status does not itself create runtime authority.

## 4. Organizational taxonomy to be evaluated

The CAO should evaluate a full enterprise taxonomy containing these layers without assuming that every layer or role was previously adopted:

### 4.1 Founder and human authority

- Founder
- human reviewers and decision owners
- human engineering and repository operators

### 4.2 Board and independent oversight

- AI Board of Directors or advisory board
- independent strategy review
- independent architecture review
- constitutional and compliance assurance
- risk, security, privacy, and audit functions

### 4.3 Executive advisory layer

- CEO
- Chief of Staff
- Chief Architecture Officer
- additional previously discussed executive roles, subject to recovery

### 4.4 Departmental strategy and coordination

Candidate departments for source recovery and analysis include:

- product;
- engineering;
- architecture;
- sales;
- marketing;
- operations;
- customer success and support;
- finance and business intelligence;
- research and innovation;
- knowledge and documentation;
- security, reliability, compliance, and assurance.

### 4.5 Specialist agents

Specialist roles may perform bounded research, analysis, drafting, testing, quality review, simulation, knowledge maintenance, or other narrowly chartered tasks.

### 4.6 Operator roles

Operator roles perform bounded state-changing work only under explicit authority. Proposed initial operator roles:

- `operator.repository_developer`
- `operator.preview_deployment`

Operator roles must remain separate from advisory executive roles.

### 4.7 Customer-facing roles

Any future customer-facing agent requires a separate authority and safety architecture. No customer-facing enterprise role is authorized by this draft.

## 5. Current verified roles

### 5.1 CEO Agent

Role ID: `executive.ceo`

Verified posture:

- strategic and cross-functional synthesis;
- advisory and draft-only;
- human-initiated;
- no implementation, repository-write, deployment, database-write, external-communication, or Production authority.

### 5.2 Chief of Staff Agent

Role ID: `executive.chief_of_staff`

Verified posture:

- coordination, dependency mapping, status normalization, follow-up and decision packets;
- neutral recorder rather than adjudicator;
- no binding assignment, autonomous dispatch, implementation, or Production authority.

### 5.3 Chief Architecture Officer Agent

Role ID: `executive.chief_architecture_officer`

Verified posture:

- architecture analysis, reconciliation, alternatives, dependencies, risk, security, reliability, and implementation-sequence proposals;
- not an implementation agent, repository maintainer, release authority, deployment operator, or Production operator.

## 6. Newly proposed roles

### 6.1 Bounded Repository Developer Operator

Role ID proposal: `operator.repository_developer`

Candidate authority boundary:

- receives an approved implementation packet;
- works only on a specified branch, commit baseline, and file scope;
- may edit approved files;
- may run approved tests and verification;
- may prepare a draft pull request;
- must stop for human review.

Initial exclusions:

- no self-selected task;
- no scope expansion;
- no merge;
- no deployment;
- no Production access;
- no secrets or environment changes;
- no database or schema change absent separate authorization;
- no legal, notice, payment, attorney, jurisdiction, constitutional, or external-communication authority.

### 6.2 Restricted Preview Deployment Operator

Role ID proposal: `operator.preview_deployment`

Candidate authority boundary:

- receives an approved commit and deployment instruction;
- deploys only to isolated Preview;
- verifies commit and environment identity;
- runs bounded smoke tests;
- reports evidence;
- may execute an explicitly authorized Preview rollback.

Initial exclusions:

- no merge;
- no commit selection;
- no Production deployment or promotion;
- no environment-variable editing;
- no secret rotation;
- no Supabase schema or RLS change;
- no autonomous continuation after verification or failure.

## 7. Required CAO deliverables

The CAO should prepare, for human review:

1. complete enterprise role taxonomy;
2. board, executive, department, specialist, assurance, and operator distinctions;
3. role-ID namespace proposal;
4. authority classes and autonomy levels;
5. tool-permission vocabulary;
6. human approval and stop points;
7. agent-to-agent handoff and orchestration rules;
8. Preview and Production eligibility model;
9. audit, evidence, persistence, and observability requirements;
10. staged implementation sequence;
11. conflict and duplication matrix against current role contracts;
12. explicit list of unresolved Founder decisions.

The CAO may recommend but may not implement or approve the structure.

## 8. Required Chief of Staff deliverables

The Chief of Staff should maintain:

- source inventory;
- missing-source register;
- role status matrix;
- decision log;
- conflict register;
- dependency map;
- proposed Founder review sequence;
- administrative closure record after Founder disposition.

The Chief of Staff may coordinate the record but may not assign authority or treat silence as approval.

## 9. Founder decisions required before implementation

At minimum:

- whether the enterprise uses an AI Board of Directors, advisory board, executive council, or another governance form;
- which executive roles exist;
- which departments and specialist roles exist;
- which roles may become autonomous and at what stage;
- whether any role may initiate another role without human mediation;
- which roles may write to repositories, databases, infrastructure, or external systems;
- which actions always require Founder or human approval;
- whether and when any role becomes Production-eligible;
- how constitutional, legal, notice, payment, jurisdiction, and customer-sensitive boundaries remain segregated.

## 10. Disposition

This document is a reconciliation draft only. It preserves the broader enterprise objective and provides a framework for exact source recovery and CAO design without creating a new organization, registry entry, charter, tool permission, runtime path, or deployment authority.
