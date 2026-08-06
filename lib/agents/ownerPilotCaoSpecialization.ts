/**
 * OwnerPilot specialization of the business-neutral Generic CAO boundary.
 *
 * This file is a nonexecuting, reference-only mapping of already-established
 * OwnerPilot controls. It does not activate the Generic CAO, replace the
 * existing CAO Preview runtime, grant authority, load evidence, call a model,
 * configure transport, persist data, or perform any state-changing action.
 */

import {
  HUMAN_DISPOSITIONS,
} from '../ai/modelRegistry';

import {
  CAO_EVIDENCE_SCOPES,
} from './caoRepositoryEvidence';

import {
  CAO_PREVIEW_ALLOWED_TASK_CLASSES,
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_REGISTRY_ENTRY,
  CAO_PREVIEW_REGISTRY_VERSION,
} from './caoPreviewRegistry';

import {
  EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE,
} from './executiveAgentRegistry';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS,
} from './executiveAgentsPreviewRouteContract';

import type {
  GenericCaoBusinessAdapterContract,
} from './genericCaoBusinessAdapter';

export const OWNERPILOT_CAO_SPECIALIZATION_VERSION =
  'ownerpilot-cao-specialization-v1' as const;

const OWNERPILOT_CAO_ROLE_ID =
  'executive.chief_architecture_officer' as const;

const OWNERPILOT_CAO_CHARTER_VERSION =
  EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE[
    OWNERPILOT_CAO_ROLE_ID
  ];

const OWNERPILOT_CAO_EVIDENCE_SCOPE =
  CAO_EVIDENCE_SCOPES
    .enterprise_workforce_recovery;

export const OWNERPILOT_CAO_SPECIALIZATION = {
  adapterVersion:
    'generic-cao-business-adapter-v1',

  enterpriseIdentity: 'OwnerPilot',

  executiveIdentity:
    OWNERPILOT_CAO_ROLE_ID,

  governingReferences: [
    {
      id:
        'ownerpilot-cao-preview-founder-approval',
      artifactKind:
        'founder_approval_record',
      locator:
        'lib/agents/caoPreviewRegistry.ts#CAO_PREVIEW_APPROVAL_REFERENCE',
      version:
        CAO_PREVIEW_REGISTRY_VERSION,
      authoritySourceReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
    },
    {
      id:
        'ownerpilot-cao-role-charter',
      artifactKind:
        'role_charter',
      locator:
        'docs/agents/charters/chief_architecture_officer.md',
      version:
        OWNERPILOT_CAO_CHARTER_VERSION,
      authoritySourceReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
    },
  ],

  roleCharter: {
    charterId:
      OWNERPILOT_CAO_ROLE_ID,
    charterVersion:
      OWNERPILOT_CAO_CHARTER_VERSION,
    governingReferenceIds: [
      'ownerpilot-cao-preview-founder-approval',
      'ownerpilot-cao-role-charter',
    ],
    mandate: [
      'Analyze approved technical evidence.',
      'Compare architecture alternatives.',
      'Prepare noncanonical advisory drafts for human review.',
    ],
    permittedOutputKinds: [
      'architecture_option_memorandum',
      'dependency_and_impact_map',
      'test_and_evaluation_plan',
      'implementation_sequence_proposal',
      'technical_dissent',
      'founder_approval_checklist',
    ],
    escalationConditions: [
      'Evidence is materially incomplete, stale, or contradictory.',
      'A request crosses a Production, security, privacy, legal, or authority boundary.',
      'A required action is outside the approved task or tool boundary.',
    ],
  },

  taskClasses: [
    {
      taskClass:
        CAO_PREVIEW_ALLOWED_TASK_CLASSES[0],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      advisoryOnly: true,
      grantedByAdapter: false,
    },
    {
      taskClass:
        CAO_PREVIEW_ALLOWED_TASK_CLASSES[1],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      advisoryOnly: true,
      grantedByAdapter: false,
    },
  ],

  approvedEvidenceScopes: [
    {
      scopeId:
        OWNERPILOT_CAO_EVIDENCE_SCOPE.id,
      sourceKinds: [
        'repository',
      ],
      sourceReferences:
        OWNERPILOT_CAO_EVIDENCE_SCOPE.paths,
      classificationRequirements: [
        'approved_non_sensitive_repository_derived',
        'noncanonical_source_recovery',
      ],
      integrityRequirements: [
        `repository:${OWNERPILOT_CAO_EVIDENCE_SCOPE.repository}`,
        `source_commit:${OWNERPILOT_CAO_EVIDENCE_SCOPE.sourceCommit}`,
        'immutable_reference_required',
        'sha256_when_available',
      ],
      unavailableEvidencePolicy:
        'reject',
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
    },
  ],

  vocabulary: [
    {
      conceptId:
        'output_status_noncanonical',
      preferredLabel:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS[0],
      alternateLabels: [],
      prohibitedLabels: [],
    },
    {
      conceptId:
        'output_status_advisory',
      preferredLabel:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS[1],
      alternateLabels: [],
      prohibitedLabels: [],
    },
    {
      conceptId:
        'output_status_draft_only',
      preferredLabel:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS[2],
      alternateLabels: [],
      prohibitedLabels: [],
    },
    {
      conceptId:
        'human_review_required',
      preferredLabel:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS[3],
      alternateLabels: [],
      prohibitedLabels: [],
    },
    {
      conceptId:
        'no_implementation_authority',
      preferredLabel:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS[4],
      alternateLabels: [],
      prohibitedLabels: [],
    },
    {
      conceptId:
        'no_production_authority',
      preferredLabel:
        EXECUTIVE_AGENTS_PREVIEW_ROUTE_LABELS[5],
      alternateLabels: [],
      prohibitedLabels: [],
    },
  ],

  businessCapabilities: [
    {
      capabilityId:
        'ownerpilot-cao-architecture-analysis',
      description:
        'Prepare bounded architecture analysis for human review.',
      permittedAdvisoryUses: [
        'analyze_evidence',
        'compare_alternatives',
        'identify_dependencies',
        'prepare_advisory_draft',
      ],
      prohibitedUses: [
        'implement',
        'approve',
        'merge',
        'deploy',
        'release',
      ],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      grantedByAdapter: false,
    },
    {
      capabilityId:
        'ownerpilot-cao-evaluation-only',
      description:
        'Perform bounded evaluation-only analysis for human review.',
      permittedAdvisoryUses: [
        'evaluate',
        'record_unknowns',
        'preserve_dissent',
        'request_human_decision',
      ],
      prohibitedUses: [
        'automatic_selection',
        'automatic_approval',
        'automatic_dispatch',
        'automatic_continuation',
      ],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      grantedByAdapter: false,
    },
  ],

  restrictions: [
    {
      restrictionId:
        'ownerpilot-cao-state-changing-actions',
      category:
        'operational',
      description:
        'The OwnerPilot CAO specialization has no state-changing tool or operational authority.',
      prohibitedActionClasses:
        CAO_PREVIEW_REGISTRY_ENTRY
          .toolPermissions.prohibited,
      escalationConditions: [
        'A request requires a repository write, database write, deployment, release, external communication, or environment change.',
      ],
      governingReferenceIds: [
        'ownerpilot-cao-preview-founder-approval',
        'ownerpilot-cao-role-charter',
      ],
    },
    {
      restrictionId:
        'ownerpilot-cao-legal-controls',
      category:
        'legal',
      description:
        'The OwnerPilot CAO specialization cannot perform legal-control, notice, payment, or attorney-routing actions.',
      prohibitedActionClasses: [
        'legal_control',
        'notice.release',
        'payment.action',
        'attorney.route',
        'legal_record.modify',
      ],
      escalationConditions: [
        'A request could create or modify a legal consequence.',
        'A request could affect a notice, payment treatment, or attorney routing.',
      ],
      governingReferenceIds: [
        'ownerpilot-cao-preview-founder-approval',
        'ownerpilot-cao-role-charter',
      ],
    },
    {
      restrictionId:
        'ownerpilot-cao-jurisdiction-controls',
      category:
        'jurisdictional',
      description:
        'The OwnerPilot CAO specialization cannot activate or determine jurisdictional controls.',
      prohibitedActionClasses: [
        'jurisdiction.activate',
        'los_angeles_rules.activate',
      ],
      escalationConditions: [
        'A request could activate, determine, or modify jurisdictional rules.',
      ],
      governingReferenceIds: [
        'ownerpilot-cao-preview-founder-approval',
        'ownerpilot-cao-role-charter',
      ],
    },
    {
      restrictionId:
        'ownerpilot-cao-governance-controls',
      category:
        'governance',
      description:
        'The OwnerPilot CAO specialization cannot modify governing records or expand its own authority.',
      prohibitedActionClasses: [
        'constitutional_record.modify',
        'legal_record.modify',
        'authority.self_expand',
      ],
      escalationConditions: [
        'A request requires constitutional interpretation, amendment, ratification, publication, or authority expansion.',
      ],
      governingReferenceIds: [
        'ownerpilot-cao-preview-founder-approval',
        'ownerpilot-cao-role-charter',
      ],
    },
  ],

  modelRequirements: [
    {
      requirementId:
        'ownerpilot-cao-preview-primary-model',
      eligibleModelIdentifiers: [
        CAO_PREVIEW_REGISTRY_ENTRY
          .primaryModel.modelId,
      ],
      pinnedVersionRequired: true,
      substitutionPolicyReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
      fallbackPolicyReference: null,
      reasoningRequirements: [
        `reasoning_level:${CAO_PREVIEW_REGISTRY_ENTRY.reasoningLevel}`,
        'primary_slot_only',
        'no_automatic_provider_substitution',
        'no_automatic_fallback',
      ],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      credentialsIncluded: false,
      transportConfigurationIncluded: false,
    },
  ],

  environmentEligibility: [
    {
      environmentId:
        CAO_PREVIEW_REGISTRY_ENTRY
          .environmentEligibility[0],
      eligible: true,
      conditions: [
        'Explicit human initiation is required.',
        'The restricted Preview gate must accept the request.',
        'The exact approved primary assignment must be used.',
      ],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      activatedByAdapter: false,
    },
    {
      environmentId:
        'production',
      eligible: false,
      conditions: [
        'Production execution and Production authority are prohibited.',
      ],
      authoritySourceReferences: [
        CAO_PREVIEW_APPROVAL_REFERENCE,
      ],
      activatedByAdapter: false,
    },
  ],

  auditRequirements: {
    requiredFields: [
      'run_id',
      'role_id',
      'charter_version',
      'registry_version',
      'source_commit',
      'human_requester',
      'approval_reference',
      'task_class',
      'model_slot',
      'provider_model_and_pinned_version',
      'evidence_references',
      'unknowns',
      'material_dissent',
      'limits_and_usage',
      'outcome',
      'human_disposition',
    ],
    requiredTraceabilityReferences: [
      CAO_PREVIEW_APPROVAL_REFERENCE,
      OWNERPILOT_CAO_CHARTER_VERSION,
      OWNERPILOT_CAO_EVIDENCE_SCOPE
        .sourceCommit,
    ],
    prohibitedContent: [
      'credentials',
      'authentication_headers',
      'raw_secrets',
      'unrestricted_provider_errors',
      'unrestricted_production_logs',
      'unbounded_transcripts',
      'unnecessary_personal_information',
    ],
    retentionPolicyReference: null,
  },

  humanApprovalRequirements: {
    explicitHumanInitiationRequired:
      CAO_PREVIEW_REGISTRY_ENTRY
        .humanApprovalRequirements
        .explicitHumanInitiationRequired,
    approvalRoleReferences: [
      'founder',
      'human_engineering_reviewer',
    ],
    allowedDispositionClasses:
      HUMAN_DISPOSITIONS,
    noApprovalBySilence:
      CAO_PREVIEW_REGISTRY_ENTRY
        .humanApprovalRequirements
        .noApprovalBySilence,
    authoritySourceReferences: [
      CAO_PREVIEW_APPROVAL_REFERENCE,
    ],
  },

  authoritySourceReferences: [
    CAO_PREVIEW_APPROVAL_REFERENCE,
  ],

  authorityGrantingMode:
    'reference_only',

  adapterGrantsAuthority: false,

  runtimeConstructionAllowed: false,

  automaticActivationAllowed: false,
} as const satisfies GenericCaoBusinessAdapterContract;
