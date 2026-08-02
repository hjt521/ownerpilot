/**
 * Reusable synthetic fixtures for the human-mediated executive workflow.
 *
 * These builders contain no customer, tenant, legal, payment, jurisdiction,
 * credential, provider, persistence, route, Preview-activation, or Production
 * data or capability.
 */

import {
  HUMAN_MEDIATED_WORKFLOW_VERSION,
} from '../humanMediatedWorkflowTypes';

export function validAuthorization(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    humanClass: 'founder',
    humanIdentifier: 'synthetic-founder',
    approvalReference:
      'synthetic-approval:run:ceo-001',
    scopeKind: 'run',
    scopeId: 'synthetic-run-ceo-001',
    roleId: 'executive.ceo',
    taskClass: 'strategic_analysis',
    authorizedAt: '2026-08-01T18:45:00.000Z',
    authorizationVersion:
      'synthetic-authorization-v1',
    ...overrides,
  };
}

export function validClosure(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    closureRecordId:
      'synthetic-closure-001',
    workflowId: 'synthetic-workflow-001',
    closedBy: 'founder',
    closedByIdentifier:
      'synthetic-founder',
    closedAt:
      '2026-08-02T00:02:00.000Z',
    closureReason:
      'Administratively close the bounded synthetic workflow without resolving or suppressing dissent.',
    unresolvedDisagreementIds: [],
    unresolvedDissentRemainsVisible: true,
    consensusClaimed: false,
    disagreementResolutionImplied: false,
    implementationAuthorized: false,
    previewActivationAuthorized: false,
    productionActivationAuthorized: false,
    ...overrides,
  };
}

export function validDisposition(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dispositionRecordId:
      'synthetic-disposition-001',
    workflowId: 'synthetic-workflow-001',
    runId: 'synthetic-run-ceo-001',
    handoffId: null,
    disposition: 'approved_for_draft_use',
    sourceKind: 'founder',
    sourceIdentifier: 'synthetic-founder',
    recordedAt: '2026-08-01T22:00:00.000Z',
    reason:
      'Permit bounded noncanonical draft use only.',
    resolutionReference:
      'synthetic-resolution-001',
    permitsDraftReview: true,
    permitsDraftQuotation: true,
    permitsDraftComparison: true,
    permitsDraftRevision: true,
    permitsNoncanonicalIncorporation: true,
    permitsHumanMediatedHandoff: true,
    implementationAuthorized: false,
    publicationAuthorized: false,
    repositoryModificationAuthorized: false,
    previewActivationAuthorized: false,
    productionUseAuthorized: false,
    ...overrides,
  };
}

export function validEvidence(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    evidenceId: 'synthetic-evidence-001',
    sourceKind: 'synthetic_fixture',
    locator: 'synthetic://evidence/001',
    description:
      'Synthetic strategic evidence.',
    classification: 'verified_fact',
    origin: 'synthetic_fixture',
    verificationState: 'verified',
    introducedByHuman: true,
    transferPermission:
      'human_handoff_permitted',
    verbatimPreservationRequired: false,
    sensitiveContentPresent: false,
    ...overrides,
  };
}

export function validEnvelope(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    workflowVersion:
      HUMAN_MEDIATED_WORKFLOW_VERSION,
    workflowId: 'synthetic-workflow-001',
    runId: 'synthetic-run-ceo-001',
    handoffId: null,
    parentHandoffId: null,
    humanAuthorization: validAuthorization(),
    explicitHumanInitiation: true,
    sourceCommitSha:
      '0000000000000000000000000000000000000000',
    environment: 'preview',
    roleId: 'executive.ceo',
    charterVersion: 'synthetic-charter-v1',
    registryVersion: 'synthetic-registry-v1',
    registryEntryHash:
      'synthetic-registry-entry-hash',
    requestedTaskClass: 'strategic_analysis',
    requestedModelSlot: 'primary',
    providerId: 'synthetic-provider',
    modelId: 'synthetic-model-2026-08-01',
    pinnedModelVersion:
      'synthetic-model-version-2026-08-01',
    adapterId: 'synthetic-adapter-v1',
    reasoningLevel: 'standard',
    evidenceState: 'complete',
    evidenceItems: [validEvidence()],
    priorRoleDraftReferences: [],
    knownConstraints: [
      'Synthetic-only execution.',
    ],
    requestedAuthorityCategories: [
      'advisory_draft',
    ],
    requestedTools: [],
    humanInstructions:
      'Prepare one synthetic strategic analysis draft.',
    currentHumanDisposition: 'pending',
    createdAt: '2026-08-01T18:45:00.000Z',
    supersedesHandoffId: null,
    automaticContinuation: false,
    authorityExpansionRequested: false,
    ...overrides,
  };
}

export function validDisagreement(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: 'material-disagreement-v2',
    disagreementId:
      'synthetic-disagreement-001',
    issueInDispute:
      'Which synthetic adapter boundary should be preferred?',
    positions: [
      {
        positionId: 'position-a',
        origin:
          'executive.chief_architecture_officer',
        statement:
          'Prefer the reversible stateless boundary.',
        evidenceReferences: [
          'synthetic-evidence-a',
        ],
        unsupportedAssertions: [],
        assumptions: [],
        unknowns: [],
        consequenceIfWrong:
          'The prototype may require avoidable rework.',
      },
      {
        positionId: 'position-b',
        origin: 'executive.ceo',
        statement:
          'Prefer the extensible stateful boundary.',
        evidenceReferences: [
          'synthetic-evidence-b',
        ],
        unsupportedAssertions: [],
        assumptions: [
          'Future flexibility will be valuable.',
        ],
        unknowns: [
          'Failure-recovery behavior.',
        ],
        consequenceIfWrong:
          'The prototype may adopt unnecessary complexity.',
      },
    ],
    affectedDependencies: [
      'synthetic-adapter-contract',
    ],
    securityConsequences: [],
    reliabilityConsequences: [
      'State recovery remains unverified.',
    ],
    costConsequences: [],
    latencyConsequences: [],
    reversibilityConsequences: [
      'The stateful boundary is harder to reverse.',
    ],
    consequenceOfDelay: null,
    recommendedOption: null,
    confidenceAndLimitations: [
      'Synthetic evidence only.',
    ],
    recommendedHumanDecisionOwner: 'founder',
    founderApprovalRequired: true,
    humanDisposition: null,
    dispositionSource: null,
    preservationRequired: true,
    resolved: false,
    humanResolutionReference: null,
    ...overrides,
  };
}

export function validHandoff(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const handoffId = 'synthetic-handoff-001';

  return {
    handoffId,
    workflowId: 'synthetic-workflow-002',
    parentHandoffId: null,
    originatingRunId:
      'synthetic-run-cao-002',
    originatingRoleId:
      'executive.chief_architecture_officer',
    receivingRoleId:
      'executive.chief_of_staff',
    originatingDraftReference: {
      draftReferenceId:
        'synthetic-draft-cao-002',
      originatingRunId:
        'synthetic-run-cao-002',
      originatingRoleId:
        'executive.chief_architecture_officer',
      taskClass: 'architecture_analysis',
      sourceCommitSha:
        '0000000000000000000000000000000000000000',
      disposition: 'pending',
      noncanonical: true,
      pendingSubstantiveApproval: true,
      evidenceReferences: [
        'synthetic-evidence-a',
        'synthetic-evidence-b',
      ],
      dissent: [
        'The stateful boundary remains preferred by one position.',
      ],
      unknowns: [
        'Failure-recovery behavior.',
      ],
      requiredHumanDecisions: [
        'Choose the controlling synthetic prototype priority.',
      ],
    },
    originatingDraftStatus:
      'noncanonical_draft',
    originatingHumanDisposition: 'pending',
    substantiveApprovalOccurred: false,
    sectionsSelectedForTransfer: [
      'facts',
      'unknowns',
      'dissent',
      'required_human_decisions',
      'evidence_references',
      'material_disagreements',
    ],
    humanSummaryOrInstruction:
      'Prepare a neutral synthetic disagreement summary.',
    humanAuthorization: {
      humanClass: 'founder',
      humanIdentifier: 'synthetic-founder',
      approvalReference:
        'synthetic-approval:handoff:001',
      scopeKind: 'handoff',
      scopeId: handoffId,
      roleId:
        'executive.chief_of_staff',
      taskClass: 'cross_function_synthesis',
      authorizedAt:
        '2026-08-01T18:47:00.000Z',
      authorizationVersion:
        'synthetic-authorization-v1',
    },
    humanConfirmationNoncanonical: true,
    humanConfirmationNoSubstantiveApproval:
      true,
    evidenceReferencesTransferred: [
      'synthetic-evidence-a',
      'synthetic-evidence-b',
    ],
    dissentTransferred: [
      'The stateful boundary remains preferred by one position.',
    ],
    unknownsTransferred: [
      'Failure-recovery behavior.',
    ],
    requiredHumanDecisionsTransferred: [
      'Choose the controlling synthetic prototype priority.',
    ],
    materialDisagreementsTransferred: [
      validDisagreement(),
    ],
    omissions: [],
    requestedTaskClassForReceiver:
      'cross_function_synthesis',
    createdAt:
      '2026-08-01T18:47:00.000Z',
    receivingRoleDisposition: 'pending',
    receivingRoleSeparatelyInitiated: false,
    automaticContinuation: false,
    inheritedApproval: false,
    roleDispatchPerformed: false,
    authorityExpansionRequested: false,
    implementationAuthorized: false,
    toolPermissionInherited: false,
    modelAssignmentInherited: false,
    ...overrides,
  };
}

export function validCeoAuditExtension(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    extensionVersion:
      'executive-ceo-in-memory-audit-extension-v1',
    roleId: 'executive.ceo',
    artifactKindsProduced: [
      'strategic_option_memorandum',
    ],
    strategicOptionIds: [
      'synthetic-option-001',
    ],
    preferredOptionId:
      'synthetic-option-001',
    founderChecklistItemIds: [
      'synthetic-checklist-001',
    ],
    implementationAuthorized: false,
    publicationAuthorized: false,
    roleDispatchAuthorized: false,
    ...overrides,
  };
}

export function validInitialAuditEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    auditVersion:
      'executive-human-mediated-audit-event-v1',
    auditEventId:
      'synthetic-audit-event-001',
    workflowId:
      'synthetic-audit-workflow-001',
    runId: 'synthetic-run-ceo-001',
    handoffId: null,
    eventKind: 'request_prepared',
    priorState: null,
    nextState: 'draft_request_prepared',
    roleId: 'executive.ceo',
    taskClass: 'strategic_analysis',
    actorKind:
      'local_in_memory_coordinator',
    actorIdentifier:
      'synthetic-local-coordinator',
    humanAuthorization: null,
    recordedAt:
      '2026-08-01T18:50:00.000Z',
    sourceCommitSha:
      '0000000000000000000000000000000000000000',
    evidenceReferences: [],
    draftReferenceIds: [],
    disagreementIds: [],
    roleAuditExtension: null,
    explicitHumanActionObserved: false,
    automaticTransitionPerformed: false,
    autonomousDispatchPerformed: false,
    toolExecutionPerformed: false,
    persistencePerformed: false,
    externalCommunicationPerformed: false,
    previewActivationPerformed: false,
    productionActionPerformed: false,
    legalAuthorityExercised: false,
    constitutionalAuthorityExercised: false,
    ...overrides,
  };
}

export function validHumanAuditEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    auditVersion:
      'executive-human-mediated-audit-event-v1',
    auditEventId:
      'synthetic-audit-event-002',
    workflowId:
      'synthetic-audit-workflow-001',
    runId: 'synthetic-run-ceo-001',
    handoffId: null,
    eventKind: 'human_run_authorized',
    priorState: 'draft_request_prepared',
    nextState: 'awaiting_human_initiation',
    roleId: 'executive.ceo',
    taskClass: 'strategic_analysis',
    actorKind: 'authorized_human',
    actorIdentifier: 'synthetic-founder',
    humanAuthorization:
      validAuthorization(),
    recordedAt:
      '2026-08-01T18:51:00.000Z',
    sourceCommitSha:
      '0000000000000000000000000000000000000000',
    evidenceReferences: [],
    draftReferenceIds: [],
    disagreementIds: [],
    roleAuditExtension:
      validCeoAuditExtension(),
    explicitHumanActionObserved: true,
    automaticTransitionPerformed: false,
    autonomousDispatchPerformed: false,
    toolExecutionPerformed: false,
    persistencePerformed: false,
    externalCommunicationPerformed: false,
    previewActivationPerformed: false,
    productionActionPerformed: false,
    legalAuthorityExercised: false,
    constitutionalAuthorityExercised: false,
    ...overrides,
  };
}

export function validAuditTrail(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    auditTrailVersion:
      'executive-human-mediated-in-memory-audit-trail-v1',
    workflowId:
      'synthetic-audit-workflow-001',
    events: [
      validInitialAuditEvent(),
      validHumanAuditEvent(),
    ],
    inMemoryOnly: true,
    retainedAfterProcessExit: false,
    persistenceRequested: false,
    persistencePerformed: false,
    databaseResourceCreated: false,
    externalLogDestinationConfigured: false,
    automaticExecutionAuthority: false,
    ...overrides,
  };
}

export function validCeoRoleOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    workflowId: 'synthetic-workflow-001',
    runId: 'synthetic-run-ceo-001',
    roleId: 'executive.ceo',
    taskClass: 'strategic_analysis',
    commonOutput: {
      facts: [
        'Synthetic fact grounded in supplied evidence.',
      ],
      assumptions: [
        'Synthetic assumption requiring human review.',
      ],
      unknowns: [
        'Synthetic timing remains unknown.',
      ],
      recommendations: [
        'Review the bounded synthetic option.',
      ],
      dissent: [
        'A synthetic alternative remains available.',
      ],
      requiredHumanDecisions: [
        'A human must determine final disposition.',
      ],
      prohibitedOrUnavailableActions: [
        'Production activation is unavailable.',
      ],
      evidenceReferences: [
        'synthetic-evidence-001',
      ],
      escalationRequired: false,
      draftArtifact:
        'Synthetic noncanonical CEO draft.',
    },
    roleExtension: {
      extensionVersion:
        'executive-ceo-draft-extension-v1',
      artifactKind:
        'strategic_option_memorandum',
      strategicOptions: [
        {
          optionId: 'synthetic-option-001',
          title: 'Bounded synthetic option',
          summary:
            'Retain a reversible human-reviewed approach.',
          evidenceReferences: [
            'synthetic-evidence-001',
          ],
          assumptions: [
            'No operational authority is granted.',
          ],
          unknowns: [
            'Implementation timing remains unknown.',
          ],
          tradeoffs: [
            'Lower scope preserves reversibility.',
          ],
          risks: [
            'Additional evidence may be needed.',
          ],
          dependencies: [
            'Human review',
          ],
          reversible: true,
        },
      ],
      preferredOptionId:
        'synthetic-option-001',
      preferredOptionRationale: [
        'The option is bounded and reversible.',
      ],
      tradeoffs: [
        'The draft does not optimize for implementation speed.',
      ],
      riskAndDependencyRegister: [
        {
          itemId: 'synthetic-risk-001',
          itemKind: 'risk',
          statement:
            'The evidence remains synthetic.',
          evidenceReferences: [
            'synthetic-evidence-001',
          ],
          assumptions: [],
          unknowns: [
            'Real-world performance is unknown.',
          ],
          consequence:
            'Human review remains mandatory.',
          humanDecisionRequired: true,
        },
      ],
      additionalEvidenceRequests: [],
      founderApprovalChecklist: [
        {
          checklistItemId:
            'synthetic-checklist-001',
          approvalQuestion:
            'Does the Founder approve bounded draft use?',
          approvalReferenceRequired: true,
          currentlyApproved: false,
          humanDecisionRequired: true,
          evidenceReferences: [
            'synthetic-evidence-001',
          ],
        },
      ],
      materialDisagreementIds: [],
      approvalsStillRequired: [
        'Founder disposition',
      ],
      implementationAuthorized: false,
      publicationAuthorized: false,
      roleDispatchAuthorized: false,
    },
    materialDisagreements: [],
    escalationPacket: null,
    clarificationRequests: [],
    humanDecisionRequired: true,
    automaticApproval: false,
    automaticSelection: false,
    automaticContinuation: false,
    roleDispatchPerformed: false,
    toolExecutionPerformed: false,
    persistencePerformed: false,
    previewActivationPerformed: false,
    productionEligible: false,
    ...overrides,
  };
}

export function validChiefOfStaffRoleOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    workflowId: 'synthetic-workflow-cos-001',
    runId: 'synthetic-run-cos-001',
    roleId: 'executive.chief_of_staff',
    taskClass: 'cross_function_synthesis',
    commonOutput: {
      facts: [
        'Synthetic coordination evidence was supplied.',
      ],
      assumptions: [
        'No proposed owner has accepted a binding assignment.',
      ],
      unknowns: [
        'The final work sequence remains subject to human review.',
      ],
      recommendations: [
        'Review the proposed dependency-aware sequence.',
      ],
      dissent: [
        'An alternate sequence may preserve more optionality.',
      ],
      requiredHumanDecisions: [
        'A human must approve any resulting coordination decision.',
      ],
      prohibitedOrUnavailableActions: [
        'Automatic role dispatch is unavailable.',
        'Binding assignments and deadlines are unavailable.',
      ],
      evidenceReferences: [
        'synthetic-evidence-cos-001',
      ],
      escalationRequired: false,
      draftArtifact:
        'Synthetic noncanonical Chief of Staff coordination brief.',
    },
    roleExtension: {
      extensionVersion:
        'executive-chief-of-staff-draft-extension-v1',
      artifactKind:
        'executive_status_brief',
      verifiedFacts: [
        'The supplied workflow evidence is synthetic.',
      ],
      reportedStatuses: [
        {
          statusId:
            'synthetic-reported-status-001',
          statement:
            'A synthetic dependency is reported as unresolved.',
          sourceReference:
            'synthetic-source-reference-001',
          verificationState: 'reported',
          evidenceReferences: [
            'synthetic-evidence-cos-001',
          ],
          verifiedFact: false,
        },
      ],
      proposals: [
        'Review the proposed work sequence with the designated human reviewer.',
      ],
      statusTransformations: [],
      dependencyItems: [
        {
          dependencyId:
            'synthetic-dependency-001',
          statement:
            'Human disposition is required before further work.',
          upstreamReferences: [
            'synthetic-evidence-cos-001',
          ],
          downstreamReferences: [
            'synthetic-work-item-001',
          ],
          evidenceReferences: [
            'synthetic-evidence-cos-001',
          ],
          blockers: [
            'No human disposition has been recorded.',
          ],
          unresolved: true,
        },
      ],
      proposedWorkSequence: [
        {
          sequenceItemId:
            'synthetic-sequence-item-001',
          workItemReference:
            'synthetic-work-item-001',
          proposedOrder: 1,
          dependencies: [
            'synthetic-dependency-001',
          ],
          blockers: [
            'Human review remains pending.',
          ],
          rationale:
            'Human review must precede any separately authorized work.',
          approvalStatus: 'unapproved',
        },
      ],
      proposedOwners: [
        {
          proposalId:
            'synthetic-owner-proposal-001',
          workItemReference:
            'synthetic-work-item-001',
          proposedOwnerLabel:
            'Designated human reviewer',
          rationale:
            'The work is coordination-only and remains human-mediated.',
          evidenceReferences: [
            'synthetic-evidence-cos-001',
          ],
          approvalStatus: 'unapproved',
          bindingAssignmentCreated: false,
        },
      ],
      proposedDeadlines: [
        {
          proposalId:
            'synthetic-deadline-proposal-001',
          workItemReference:
            'synthetic-work-item-001',
          proposedDeadline:
            'After explicit human review',
          rationale:
            'No binding date may be created by the role output.',
          evidenceReferences: [
            'synthetic-evidence-cos-001',
          ],
          approvalStatus: 'unapproved',
          bindingCommitmentCreated: false,
        },
      ],
      unresolvedQuestions: [
        'Which proposed sequence should the human reviewer approve?',
      ],
      disagreementSummaryIds: [],
      escalationPacketId: null,
      recordedHumanDecisions: [],
      founderApprovalChecklist: [
        {
          checklistItemId:
            'synthetic-cos-checklist-001',
          approvalQuestion:
            'Does the Founder approve bounded noncanonical draft use?',
          approvalReferenceRequired: true,
          currentlyApproved: false,
          humanDecisionRequired: true,
          evidenceReferences: [
            'synthetic-evidence-cos-001',
          ],
        },
      ],
      artificialConsensusCreated: false,
      adjudicationPerformed: false,
      bindingAssignmentAuthorized: false,
      bindingDeadlineAuthorized: false,
      roleDispatchAuthorized: false,
    },
    materialDisagreements: [],
    escalationPacket: null,
    clarificationRequests: [],
    humanDecisionRequired: true,
    automaticApproval: false,
    automaticSelection: false,
    automaticContinuation: false,
    roleDispatchPerformed: false,
    toolExecutionPerformed: false,
    persistencePerformed: false,
    previewActivationPerformed: false,
    productionEligible: false,
    ...overrides,
  };
}

export function validCaoRoleOutput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    workflowId: 'synthetic-workflow-cao-001',
    runId: 'synthetic-run-cao-001',
    roleId:
      'executive.chief_architecture_officer',
    taskClass: 'architecture_analysis',
    commonOutput: {
      facts: [
        'Synthetic architecture evidence was supplied.',
      ],
      assumptions: [
        'No implementation or repository modification is authorized.',
      ],
      unknowns: [
        'Real provider behavior and production performance remain unknown.',
      ],
      recommendations: [
        'Review the bounded reversible architecture alternative.',
      ],
      dissent: [
        'A narrower alternative may preserve additional optionality.',
      ],
      requiredHumanDecisions: [
        'A human must select or reject every proposed architecture option.',
      ],
      prohibitedOrUnavailableActions: [
        'Implementation, migration, deployment, and repository modification are unavailable.',
        'Provider and adapter assignment are unavailable.',
      ],
      evidenceReferences: [
        'synthetic-evidence-cao-001',
      ],
      escalationRequired: false,
      draftArtifact:
        'Synthetic noncanonical CAO architecture analysis.',
    },
    roleExtension: {
      extensionVersion:
        'executive-chief-architecture-officer-draft-extension-v1',
      artifactKind:
        'architecture_option_memorandum',
      evidenceInspected: [
        {
          evidenceId:
            'synthetic-architecture-evidence-001',
          locator:
            'synthetic://repository/component-a',
          sourceCommitSha:
            '1111111111111111111111111111111111111111',
          description:
            'Synthetic architecture evidence for a bounded component.',
          available: true,
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
        },
      ],
      evidenceUnavailable: [
        {
          evidenceId:
            'synthetic-architecture-evidence-unavailable-001',
          locator:
            'synthetic://repository/component-unavailable',
          sourceCommitSha:
            '2222222222222222222222222222222222222222',
          description:
            'Synthetic evidence identified as unavailable.',
          available: false,
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
        },
      ],
      alternativesConsidered: [
        {
          alternativeId:
            'synthetic-architecture-alternative-001',
          title:
            'Bounded reversible architecture alternative',
          summary:
            'A synthetic option that preserves isolation and human control.',
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
          constraints: [
            'Synthetic-only execution',
            'No persistence or tools',
          ],
          assumptions: [
            'The current injected single-role seam remains available.',
          ],
          unknowns: [
            'Live provider behavior remains unknown.',
          ],
          affectedComponents: [
            'Synthetic coordinator boundary',
          ],
          securityConsequences: [
            'No new credential or tool surface is introduced.',
          ],
          reliabilityConsequences: [
            'The proposal remains fail-closed.',
          ],
          costConsequences: [
            'No live-provider cost is incurred.',
          ],
          latencyConsequences: [
            'No production latency conclusion is claimed.',
          ],
          reversibilityConsequences: [
            'The proposal can be discarded before implementation.',
          ],
          implementationAuthorized: false,
        },
      ],
      affectedComponents: [
        'Synthetic coordinator boundary',
      ],
      architectureProposals: [
        {
          proposalId:
            'synthetic-interface-proposal-001',
          proposalKind: 'interface',
          title:
            'Unimplemented role-output interface proposal',
          description:
            'A synthetic interface proposal retained as an unimplemented draft.',
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
          affectedComponents: [
            'Synthetic coordinator boundary',
          ],
          assumptions: [
            'A future human-authorized increment may evaluate the proposal.',
          ],
          unknowns: [
            'Implementation details remain undecided.',
          ],
          markedUnimplemented: true,
          migrationAuthorized: false,
          repositoryModificationAuthorized: false,
          providerAssignmentAuthorized: false,
          adapterAssignmentAuthorized: false,
        },
      ],
      riskAnalyses: [
        {
          analysisId:
            'synthetic-security-analysis-001',
          riskKind: 'security',
          findings: [
            'No tools, credentials, or persistence are introduced.',
          ],
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
          assumptions: [
            'The workflow remains synthetic and local.',
          ],
          unknowns: [
            'Production threat behavior is not evaluated.',
          ],
          humanDecisionRequired: true,
        },
      ],
      reversibilityAnalysis: [
        {
          analysisId:
            'synthetic-reversibility-analysis-001',
          riskKind: 'reversibility',
          findings: [
            'The draft can be rejected without migration or deployment.',
          ],
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
          assumptions: [
            'No implementation action occurs.',
          ],
          unknowns: [
            'Future authorized implementation consequences remain unknown.',
          ],
          humanDecisionRequired: true,
        },
      ],
      testAndEvaluationPlans: [
        {
          planId:
            'synthetic-evaluation-plan-001',
          objective:
            'Evaluate the draft contract with deterministic synthetic cases.',
          syntheticOnly: true,
          proposedCases: [
            'Validate bounded successful output.',
            'Validate fail-closed authority rejection.',
          ],
          acceptanceCriteria: [
            'All deterministic tests pass.',
            'No provider, tool, persistence, or activation occurs.',
          ],
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
          executionAuthorized: false,
        },
      ],
      proposedImplementationSequences: [
        {
          sequenceId:
            'synthetic-implementation-sequence-001',
          proposedSteps: [
            'Obtain explicit human approval.',
            'Implement only a separately authorized bounded increment.',
          ],
          dependencies: [
            'Founder or authorized human disposition',
          ],
          blockers: [
            'No implementation authorization exists.',
          ],
          rollbackConsiderations: [
            'Discard the unimplemented proposal.',
          ],
          approvalStatus: 'unapproved',
          implementationAuthorized: false,
        },
      ],
      recommendedOptionId:
        'synthetic-architecture-alternative-001',
      technicalDissent: [
        {
          dissentId:
            'synthetic-technical-dissent-001',
          issue:
            'The broader option may increase coupling.',
          position:
            'Preserve the narrower reversible boundary.',
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
          assumptions: [
            'Isolation remains a controlling constraint.',
          ],
          unknowns: [
            'Future integration requirements remain unknown.',
          ],
          confidenceAndLimitations: [
            'The conclusion is based only on synthetic evidence.',
          ],
          consequenceIfIgnored:
            'A future implementation could become harder to reverse.',
          preservationRequired: true,
        },
      ],
      confidenceAndLimitations: [
        'The analysis is synthetic, noncanonical, and nonactivating.',
      ],
      founderApprovalChecklist: [
        {
          checklistItemId:
            'synthetic-cao-checklist-001',
          approvalQuestion:
            'Does the Founder approve bounded draft use of this CAO output?',
          approvalReferenceRequired: true,
          currentlyApproved: false,
          humanDecisionRequired: true,
          evidenceReferences: [
            'synthetic-evidence-cao-001',
          ],
        },
      ],
      approvalsStillRequired: [
        'Founder or authorized human disposition',
        'Separate implementation authorization',
      ],
      constitutionalInterpretationPerformed: false,
      legalInterpretationPerformed: false,
      adrRatificationPerformed: false,
      implementationAuthorized: false,
      repositoryModificationAuthorized: false,
      migrationAuthorized: false,
      deploymentAuthorized: false,
      roleDispatchAuthorized: false,
    },
    materialDisagreements: [],
    escalationPacket: null,
    clarificationRequests: [],
    humanDecisionRequired: true,
    automaticApproval: false,
    automaticSelection: false,
    automaticContinuation: false,
    roleDispatchPerformed: false,
    toolExecutionPerformed: false,
    persistencePerformed: false,
    previewActivationPerformed: false,
    productionEligible: false,
    ...overrides,
  };
}
