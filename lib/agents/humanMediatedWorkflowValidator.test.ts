/**
 * Deterministic tests for the synthetic-only human-mediated workflow
 * validator.
 *
 * These tests use bounded synthetic objects only. They perform no model
 * execution, provider call, tool use, persistence, route activation,
 * Preview activation, or Production action.
 */

import {
  validAuditTrail,
  validAuthorization,
  validCeoAuditExtension,
  validCaoRoleOutput,
  validCeoRoleOutput,
  validChiefOfStaffRoleOutput,
  validClosure,
  validDisagreement,
  validDisposition,
  validEnvelope,
  validEvidence,
  validHandoff,
  validHumanAuditEvent,
  validInitialAuditEvent,
} from './__fixtures__/humanMediatedWorkflowFixtures';

import {
  validateArchitectureAlternativeDraft,
  validateArchitectureEvidenceRecord,
  validateArchitectureRiskAnalysis,
  validateCaoDraftExtension,
  validateCaoHumanMediatedOutput,
  validateCeoDraftExtension,
  validateCeoHumanMediatedOutput,
  validateChiefOfStaffDraftExtension,
  validateChiefOfStaffHumanMediatedOutput,
  validateClarificationRequestProposal,
  validateExecutiveAgentDraftOutput,
  validateExecutiveEscalationPacket,
  validateExecutiveEvidenceItem,
  validateFounderApprovalChecklistItem,
  validateExecutiveRoleAuditExtension,
  validateExecutiveWorkflowAuditEvent,
  validateExecutiveWorkflowEnvelope,
  validateHumanAuthorizationReference,
  validateHumanDispositionRecord,
  validateHumanMediatedHandoff,
  validateInMemoryWorkflowAuditTrail,
  validateMaterialDisagreementV2,
  validateProposedDeadlineRecord,
  validateProposedImplementationSequence,
  validateProposedOwnerRecord,
  validateProposedWorkSequenceItem,
  validateRecordedHumanDecision,
  validateReportedStatusRecord,
  validateRiskDependencyItem,
  validateStrategicOptionDraft,
  validateStatusTransformationRecord,
  validateTestEvaluationPlanDraft,
  validateTechnicalDissentRecord,
  validateWorkflowClosureRecord,
  validateWorkflowDependencyItem,
  validateUnimplementedArchitectureProposal,
} from './humanMediatedWorkflowValidator';

interface ValidationIssueLike {
  path: string;
  code: string;
  message: string;
}

type ValidationResultLike =
  | {
      ok: true;
    }
  | {
      ok: false;
      issues: readonly ValidationIssueLike[];
    };

let passed = 0;
let failed = 0;

function check(
  name: string,
  condition: boolean,
  detail = '',
): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
    return;
  }

  failed += 1;
  console.log(
    `  ✗ ${name}${detail ? ` — ${detail}` : ''}`,
  );
}

function hasIssue(
  validation: ValidationResultLike,
  expected: {
    code?: string;
    path?: string;
    message?: string;
  },
): boolean {
  if (validation.ok) {
    return false;
  }

  return validation.issues.some(issue => {
    return (
      (
        expected.code === undefined ||
        issue.code === expected.code
      ) &&
      (
        expected.path === undefined ||
        issue.path === expected.path
      ) &&
      (
        expected.message === undefined ||
        issue.message === expected.message
      )
    );
  });
}

function main(): void {
  console.log(
    '\nHuman-mediated workflow validator tests',
  );

  {
    const validation =
      validateExecutiveWorkflowEnvelope(
        validEnvelope(),
      );

    check(
      'accepts a bounded Founder-authorized CEO envelope',
      validation.ok,
    );
  }

  {
    const runId = 'synthetic-run-cao-001';

    const validation =
      validateExecutiveWorkflowEnvelope(
        validEnvelope({
          runId,
          roleId:
            'executive.chief_architecture_officer',
          requestedTaskClass:
            'architecture_analysis',
          humanAuthorization:
            validAuthorization({
              humanClass:
                'human_engineering_reviewer',
              humanIdentifier:
                'synthetic-engineering-reviewer',
              approvalReference:
                'synthetic-approval:run:cao-001',
              scopeId: runId,
              roleId:
                'executive.chief_architecture_officer',
              taskClass:
                'architecture_analysis',
            }),
          humanInstructions:
            'Analyze one synthetic architecture boundary.',
        }),
      );

    check(
      'accepts an engineering-authorized CAO envelope',
      validation.ok,
    );
  }

  {
    const validation =
      validateHumanAuthorizationReference({
        ...validAuthorization(),
        unexpectedAuthority: true,
      });

    check(
      'rejects an unknown authorization field',
      hasIssue(validation, {
        code: 'unknown_field',
        path:
          'humanAuthorization.unexpectedAuthority',
      }),
    );
  }

  {
    const validation =
      validateExecutiveEvidenceItem(
        validEvidence({
          sensitiveContentPresent: true,
        }),
      );

    check(
      'rejects sensitive synthetic evidence',
      hasIssue(validation, {
        code: 'sensitive_content_prohibited',
      }),
    );
  }

  {
    const validation =
      validateExecutiveWorkflowEnvelope(
        validEnvelope({
          requestedTools: [
            'repository.read',
          ],
        }),
      );

    check(
      'rejects runtime tools',
      hasIssue(validation, {
        path:
          'workflowEnvelope.requestedTools',
        message:
          'The synthetic workflow must remain tool-free.',
      }),
    );
  }

  {
    const validation =
      validateExecutiveWorkflowEnvelope(
        validEnvelope({
          requestedModelSlot: 'fallback',
        }),
      );

    check(
      'rejects fallback selection',
      hasIssue(validation, {
        path:
          'workflowEnvelope.requestedModelSlot',
      }),
    );
  }

  {
    const validation =
      validateExecutiveWorkflowEnvelope(
        validEnvelope({
          humanAuthorization:
            validAuthorization({
              humanClass:
                'designated_human_reviewer',
            }),
        }),
      );

    check(
      'rejects an unauthorized human class for CEO',
      hasIssue(validation, {
        code:
          'human_authorization_mismatch',
        path:
          'workflowEnvelope.humanAuthorization.humanClass',
      }),
    );
  }

  {
    const validation =
      validateExecutiveWorkflowEnvelope({
        ...validEnvelope(),
        autonomousDispatch: true,
      });

    check(
      'rejects unknown envelope fields',
      hasIssue(validation, {
        code: 'unknown_field',
        path:
          'workflowEnvelope.autonomousDispatch',
      }),
    );
  }

  {
    const validation =
      validateExecutiveWorkflowEnvelope(
        validEnvelope({
          automaticContinuation: true,
        }),
      );

    check(
      'rejects automatic continuation',
      hasIssue(validation, {
        path:
          'workflowEnvelope.automaticContinuation',
        message:
          'Automatic continuation is prohibited.',
      }),
    );
  }

  {
    const validation =
      validateMaterialDisagreementV2(
        validDisagreement(),
      );

    check(
      'accepts an unresolved preserved material disagreement',
      validation.ok,
    );
  }

  {
    const validation =
      validateMaterialDisagreementV2(
        validDisagreement({
          resolved: true,
          humanDisposition: 'pending',
          dispositionSource: null,
          humanResolutionReference:
            'synthetic-resolution-001',
        }),
      );

    check(
      'rejects disagreement resolution without a non-pending human disposition',
      hasIssue(validation, {
        path:
          'materialDisagreement.humanDisposition',
        message:
          'Resolved disagreement requires a non-pending explicit human disposition.',
      }),
    );
  }

  {
    const validation =
      validateMaterialDisagreementV2(
        validDisagreement({
          preservationRequired: false,
        }),
      );

    check(
      'rejects removal of disagreement preservation',
      hasIssue(validation, {
        path:
          'materialDisagreement.preservationRequired',
        message:
          'Material disagreement preservation is mandatory.',
      }),
    );
  }

  {
    const validation =
      validateHumanMediatedHandoff(
        validHandoff(),
      );

    check(
      'accepts a Founder-authorized CAO-to-Chief-of-Staff handoff',
      validation.ok,
    );
  }

  {
    const validation =
      validateHumanMediatedHandoff(
        validHandoff({
          dissentTransferred: [],
        }),
      );

    check(
      'rejects a handoff that omits material dissent',
      hasIssue(validation, {
        path:
          'handoff.dissentTransferred',
        message:
          'All material dissent must be preserved.',
      }),
    );
  }

  {
    const validation =
      validateHumanMediatedHandoff(
        validHandoff({
          automaticContinuation: true,
        }),
      );

    check(
      'rejects automatic handoff continuation',
      hasIssue(validation, {
        path:
          'handoff.automaticContinuation',
        message:
          'automaticContinuation must remain false.',
      }),
    );
  }

  {
    const validation =
      validateHumanMediatedHandoff(
        validHandoff({
          originatingRoleId:
            'executive.ceo',
        }),
      );

    check(
      'rejects an unauthorized CEO-to-Chief-of-Staff direction',
      hasIssue(validation, {
        path: 'handoff.receivingRoleId',
        message:
          'The proposed role direction and receiving task are not authorized.',
      }),
    );
  }

  {
    const validation =
      validateExecutiveRoleAuditExtension(
        validCeoAuditExtension(),
        'executive.ceo',
      );

    check(
      'accepts a bounded CEO in-memory audit extension',
      validation.ok,
    );
  }

  {
    const validation =
      validateExecutiveRoleAuditExtension(
        validCeoAuditExtension({
          implementationAuthorized: true,
        }),
        'executive.ceo',
      );

    check(
      'rejects implementation authority in a CEO audit extension',
      hasIssue(validation, {
        path:
          'roleAuditExtension.implementationAuthorized',
        message:
          'implementationAuthorized must remain false.',
      }),
    );
  }

  {
    const validation =
      validateExecutiveWorkflowAuditEvent(
        validHumanAuditEvent(),
      );

    check(
      'accepts an affirmatively human-authorized audit transition',
      validation.ok,
    );
  }

  {
    const validation =
      validateExecutiveWorkflowAuditEvent(
        validHumanAuditEvent({
          humanAuthorization: null,
        }),
      );

    check(
      'rejects a human-required transition without authorization provenance',
      hasIssue(validation, {
        path:
          'auditEvent.explicitHumanActionObserved',
        message:
          'This transition requires affirmative human action and authorization.',
      }),
    );
  }

  {
    const validation =
      validateInMemoryWorkflowAuditTrail(
        validAuditTrail(),
      );

    check(
      'accepts a continuous nonpersistent in-memory audit trail',
      validation.ok,
    );
  }

  {
    const discontinuousEvent =
      validHumanAuditEvent({
        priorState:
          'awaiting_human_initiation',
        nextState: 'role_run_authorized',
      });

    const validation =
      validateInMemoryWorkflowAuditTrail(
        validAuditTrail({
          events: [
            validInitialAuditEvent(),
            discontinuousEvent,
          ],
        }),
      );

    check(
      'rejects discontinuous audit-event state lineage',
      hasIssue(validation, {
        path:
          'auditTrail.events[1].priorState',
        message:
          'Audit-event state lineage is discontinuous.',
      }),
    );
  }

  {
    const validation =
      validateInMemoryWorkflowAuditTrail(
        validAuditTrail({
          persistencePerformed: true,
        }),
      );

    check(
      'rejects persistence in the in-memory audit trail',
      hasIssue(validation, {
        path:
          'auditTrail.persistencePerformed',
        message:
          'persistencePerformed must remain false.',
      }),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const validation =
      validateExecutiveAgentDraftOutput(
        roleOutput.commonOutput,
      );

    check(
      'accepts a bounded common executive-agent draft output',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const commonOutput =
      roleOutput.commonOutput as
        Record<string, unknown>;

    commonOutput.unexpectedAuthority =
      'not permitted';

    const validation =
      validateExecutiveAgentDraftOutput(
        commonOutput,
      );

    check(
      'rejects unknown common-output fields',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.commonOutput.unexpectedAuthority' &&
          issue.code === 'unknown_field',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const commonOutput =
      roleOutput.commonOutput as
        Record<string, unknown>;

    commonOutput.evidenceReferences = [
      'synthetic-evidence-001',
      'synthetic-evidence-001',
    ];

    const validation =
      validateExecutiveAgentDraftOutput(
        commonOutput,
      );

    check(
      'rejects duplicate common-output evidence references',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.commonOutput.evidenceReferences[1]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const commonOutput =
      roleOutput.commonOutput as
        Record<string, unknown>;

    commonOutput.recommendations =
      Array.from(
        { length: 33 },
        (_, index) =>
          `Synthetic recommendation ${index + 1}`,
      );

    const validation =
      validateExecutiveAgentDraftOutput(
        commonOutput,
      );

    check(
      'rejects common-output recommendation overflow',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.commonOutput.recommendations' &&
          issue.code === 'too_many_items',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const commonOutput =
      roleOutput.commonOutput as
        Record<string, unknown>;

    commonOutput.escalationRequired =
      'false';

    const validation =
      validateExecutiveAgentDraftOutput(
        commonOutput,
      );

    check(
      'rejects a nonboolean escalation marker',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.commonOutput.escalationRequired' &&
          issue.code === 'invalid_type',
      ),
    );
  }

  {
    const validation =
      validateClarificationRequestProposal({
        clarificationRequestId:
          'synthetic-clarification-001',
        workflowId:
          'synthetic-workflow-001',
        runId: 'synthetic-run-ceo-001',
        roleId: 'executive.ceo',
        question:
          'Which synthetic option should be reviewed?',
        reason:
          'A human choice remains required.',
        evidenceReferences: [
          'synthetic-evidence-001',
        ],
        addressedToHuman: true,
        toolCallRequested: false,
        roleDispatchRequested: false,
        automaticContinuationRequested: false,
        evidenceCollectionAuthorized: false,
      });

    check(
      'accepts a bounded clarification-request proposal',
      validation.ok,
    );
  }

  {
    const validation =
      validateClarificationRequestProposal({
        clarificationRequestId:
          'synthetic-clarification-002',
        workflowId:
          'synthetic-workflow-001',
        runId: 'synthetic-run-ceo-001',
        roleId: 'executive.ceo',
        question:
          'Collect additional synthetic evidence?',
        reason:
          'Evidence remains incomplete.',
        evidenceReferences: [],
        addressedToHuman: true,
        toolCallRequested: true,
        roleDispatchRequested: false,
        automaticContinuationRequested: false,
        evidenceCollectionAuthorized: false,
      });

    check(
      'rejects tool authority in a clarification request',
      validation.issues.some(
        issue =>
          issue.path ===
            'clarificationRequest.toolCallRequested' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateFounderApprovalChecklistItem({
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
      });

    check(
      'accepts a bounded Founder checklist item',
      validation.ok,
    );
  }

  {
    const validation =
      validateFounderApprovalChecklistItem({
        checklistItemId:
          'synthetic-checklist-002',
        approvalQuestion:
          'Is a human decision required?',
        approvalReferenceRequired: true,
        currentlyApproved: false,
        humanDecisionRequired: false,
        evidenceReferences: [],
      });

    check(
      'rejects removal of the Founder human-decision requirement',
      validation.issues.some(
        issue =>
          issue.path ===
            'founderApprovalChecklistItem.humanDecisionRequired' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const options =
      extension.strategicOptions as
        unknown[];

    const validation =
      validateStrategicOptionDraft(
        options[0],
      );

    check(
      'accepts a bounded strategic-option draft',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const options =
      extension.strategicOptions as
        Record<string, unknown>[];

    options[0].reversible = 'yes';

    const validation =
      validateStrategicOptionDraft(
        options[0],
      );

    check(
      'rejects an invalid strategic-option reversibility marker',
      validation.issues.some(
        issue =>
          issue.path ===
            'strategicOption.reversible' &&
          issue.code === 'invalid_type',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const options =
      extension.strategicOptions as
        Record<string, unknown>[];

    options[0].implementationAuthorized =
      true;

    const validation =
      validateStrategicOptionDraft(
        options[0],
      );

    check(
      'rejects unknown authority fields in a strategic option',
      validation.issues.some(
        issue =>
          issue.path ===
            'strategicOption.implementationAuthorized' &&
          issue.code === 'unknown_field',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const register =
      extension.riskAndDependencyRegister as
        unknown[];

    const validation =
      validateRiskDependencyItem(
        register[0],
      );

    check(
      'accepts a bounded risk-dependency item',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const register =
      extension.riskAndDependencyRegister as
        Record<string, unknown>[];

    register[0].itemKind = 'authority';

    const validation =
      validateRiskDependencyItem(
        register[0],
      );

    check(
      'rejects an unknown risk-dependency item kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'riskDependencyItem.itemKind' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const register =
      extension.riskAndDependencyRegister as
        Record<string, unknown>[];

    register[0].implementationAuthorized =
      true;

    const validation =
      validateRiskDependencyItem(
        register[0],
      );

    check(
      'rejects unknown authority fields in a risk-dependency item',
      validation.issues.some(
        issue =>
          issue.path ===
            'riskDependencyItem.implementationAuthorized' &&
          issue.code === 'unknown_field',
      ),
    );
  }

  {
    const validation =
      validateExecutiveEscalationPacket(
        {
        escalationPacketId:
          'synthetic-escalation-001',
        workflowId:
          'synthetic-workflow-001',
        runId: 'synthetic-run-ceo-001',
        roleId: 'executive.ceo',
        taskClass: 'strategic_analysis',
        issue:
          'A bounded synthetic decision remains unresolved.',
        evidenceAvailable: [
          'Synthetic evidence was supplied.',
        ],
        evidenceMissing: [
          'Real-world evidence remains unavailable.',
        ],
        options: [
          'Pause for human review.',
        ],
        risks: [
          'Proceeding without review could exceed authority.',
        ],
        requiredHumanDecision:
          'Determine whether bounded draft review should continue.',
        founderApprovalRequired: true,
        verifiedStatus: [],
        conflictingEvidence: [],
        affectedDependencies: [
          'Human disposition',
        ],
        governingConstraints: [
          'No automatic continuation',
        ],
        affectedComponents: [],
        reversibilityConcerns: [
          'No irreversible action may occur.',
        ],
        automaticActionAuthorized: false,
      },
      );

    check(
      'accepts a bounded executive escalation packet',
      validation.ok,
    );
  }

  {
    const candidate =
      {
        escalationPacketId:
          'synthetic-escalation-001',
        workflowId:
          'synthetic-workflow-001',
        runId: 'synthetic-run-ceo-001',
        roleId: 'executive.ceo',
        taskClass: 'strategic_analysis',
        issue:
          'A bounded synthetic decision remains unresolved.',
        evidenceAvailable: [
          'Synthetic evidence was supplied.',
        ],
        evidenceMissing: [
          'Real-world evidence remains unavailable.',
        ],
        options: [
          'Pause for human review.',
        ],
        risks: [
          'Proceeding without review could exceed authority.',
        ],
        requiredHumanDecision:
          'Determine whether bounded draft review should continue.',
        founderApprovalRequired: true,
        verifiedStatus: [],
        conflictingEvidence: [],
        affectedDependencies: [
          'Human disposition',
        ],
        governingConstraints: [
          'No automatic continuation',
        ],
        affectedComponents: [],
        reversibilityConcerns: [
          'No irreversible action may occur.',
        ],
        automaticActionAuthorized: false,
      } as Record<string, unknown>;

    candidate.automaticActionAuthorized =
      true;

    const validation =
      validateExecutiveEscalationPacket(
        candidate,
      );

    check(
      'rejects automatic action authority in an escalation packet',
      validation.issues.some(
        issue =>
          issue.path ===
            'escalationPacket.automaticActionAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      {
        escalationPacketId:
          'synthetic-escalation-001',
        workflowId:
          'synthetic-workflow-001',
        runId: 'synthetic-run-ceo-001',
        roleId: 'executive.ceo',
        taskClass: 'strategic_analysis',
        issue:
          'A bounded synthetic decision remains unresolved.',
        evidenceAvailable: [
          'Synthetic evidence was supplied.',
        ],
        evidenceMissing: [
          'Real-world evidence remains unavailable.',
        ],
        options: [
          'Pause for human review.',
        ],
        risks: [
          'Proceeding without review could exceed authority.',
        ],
        requiredHumanDecision:
          'Determine whether bounded draft review should continue.',
        founderApprovalRequired: true,
        verifiedStatus: [],
        conflictingEvidence: [],
        affectedDependencies: [
          'Human disposition',
        ],
        governingConstraints: [
          'No automatic continuation',
        ],
        affectedComponents: [],
        reversibilityConcerns: [
          'No irreversible action may occur.',
        ],
        automaticActionAuthorized: false,
      } as Record<string, unknown>;

    candidate.taskClass =
      'architecture_analysis';

    const validation =
      validateExecutiveEscalationPacket(
        candidate,
      );

    check(
      'rejects an escalation task not allowed for the role',
      validation.issues.some(
        issue =>
          issue.path ===
            'escalationPacket.taskClass' &&
          issue.code ===
            'task_not_allowed_for_role',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const validation =
      validateCeoDraftExtension(
        roleOutput.roleExtension,
      );

    check(
      'accepts a complete bounded CEO draft extension',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    extension.artifactKind =
      'binding_executive_order';

    const validation =
      validateCeoDraftExtension(
        extension,
      );

    check(
      'rejects an unknown CEO artifact kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.artifactKind' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    extension.preferredOptionId =
      'synthetic-option-missing';

    const validation =
      validateCeoDraftExtension(
        extension,
      );

    check(
      'rejects a dangling CEO preferred-option reference',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.preferredOptionId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const strategicOptions =
      extension.strategicOptions as
        unknown[];

    extension.strategicOptions = [
      strategicOptions[0],
      strategicOptions[0],
    ];

    const validation =
      validateCeoDraftExtension(
        extension,
      );

    check(
      'rejects duplicate CEO strategic-option IDs',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.strategicOptions[1]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validCeoRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    extension.implementationAuthorized =
      true;

    const validation =
      validateCeoDraftExtension(
        extension,
      );

    check(
      'rejects implementation authority in a CEO draft extension',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.implementationAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateCeoHumanMediatedOutput(
        validCeoRoleOutput(),
      );

    check(
      'accepts a complete bounded CEO human-mediated output',
      validation.ok,
    );
  }

  {
    const candidate =
      validCeoRoleOutput({
        roleId:
          'executive.chief_of_staff',
      });

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects a non-CEO role in a CEO output',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCeoRoleOutput({
        taskClass:
          'architecture_analysis',
      });

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects a recognized task not allowed for the CEO',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.taskClass' &&
          issue.code ===
            'task_not_allowed_for_role',
      ),
    );
  }

  {
    const candidate =
      validCeoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    extension.materialDisagreementIds = [
      'synthetic-disagreement-missing',
    ];

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects a dangling top-level CEO disagreement reference',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.materialDisagreementIds[0]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCeoRoleOutput();

    candidate.clarificationRequests = [
      {
        clarificationRequestId:
          'synthetic-clarification-001',
        workflowId:
          'synthetic-workflow-001',
        runId:
          'synthetic-run-mismatched',
        roleId: 'executive.ceo',
        question:
          'Which synthetic option should be reviewed?',
        reason:
          'A human choice remains required.',
        evidenceReferences: [
          'synthetic-evidence-001',
        ],
        addressedToHuman: true,
        toolCallRequested: false,
        roleDispatchRequested: false,
        automaticContinuationRequested: false,
        evidenceCollectionAuthorized: false,
      },
    ];

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects mismatched clarification run lineage',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.clarificationRequests[0].runId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCeoRoleOutput();

    const commonOutput =
      candidate.commonOutput as
        Record<string, unknown>;

    commonOutput.escalationRequired =
      true;

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    check(
      'requires an escalation packet for an escalating CEO output',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.escalationPacket' &&
          issue.code === 'missing_value',
      ),
    );
  }

  {
    const candidate =
      validCeoRoleOutput({
        persistencePerformed: true,
      });

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects persistence in a CEO role output',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.persistencePerformed' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const statuses =
      extension.reportedStatuses as
        unknown[];

    const validation =
      validateReportedStatusRecord(
        statuses[0],
      );

    check(
      'accepts a bounded reported-status record',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const statuses =
      extension.reportedStatuses as
        Record<string, unknown>[];

    statuses[0].verificationState =
      'silently_verified';

    const validation =
      validateReportedStatusRecord(
        statuses[0],
      );

    check(
      'rejects an unknown reported-status verification state',
      validation.issues.some(
        issue =>
          issue.path ===
            'reportedStatus.verificationState' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const statuses =
      extension.reportedStatuses as
        Record<string, unknown>[];

    statuses[0].verifiedFact = true;

    const validation =
      validateReportedStatusRecord(
        statuses[0],
      );

    check(
      'rejects promotion of reported status to verified fact',
      validation.issues.some(
        issue =>
          issue.path ===
            'reportedStatus.verifiedFact' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateStatusTransformationRecord({
        transformationId:
          'synthetic-transformation-001',
        sourceReference:
          'synthetic-source-reference-001',
        sourceClassification:
          'reported_status',
        resultingClassification:
          'verified_fact',
        transformationDescription:
          'A human approved reclassification after reviewing evidence.',
        classificationChanged: true,
        humanApprovalReference:
          'synthetic-human-approval-001',
        silentReclassificationPerformed: false,
      });

    check(
      'accepts a human-approved status transformation',
      validation.ok,
    );
  }

  {
    const validation =
      validateStatusTransformationRecord({
        transformationId:
          'synthetic-transformation-002',
        sourceReference:
          'synthetic-source-reference-002',
        sourceClassification:
          'reported_status',
        resultingClassification:
          'reported_status',
        transformationDescription:
          'No classification change occurred.',
        classificationChanged: true,
        humanApprovalReference: null,
        silentReclassificationPerformed: false,
      });

    check(
      'rejects an inconsistent classification-change marker',
      validation.issues.some(
        issue =>
          issue.path ===
            'statusTransformation.classificationChanged' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateStatusTransformationRecord({
        transformationId:
          'synthetic-transformation-003',
        sourceReference:
          'synthetic-source-reference-003',
        sourceClassification:
          'reported_status',
        resultingClassification:
          'verified_fact',
        transformationDescription:
          'An unsupported silent transformation was attempted.',
        classificationChanged: true,
        humanApprovalReference: null,
        silentReclassificationPerformed: true,
      });

    check(
      'rejects classification change without human provenance',
      validation.issues.some(
        issue =>
          issue.path ===
            'statusTransformation.humanApprovalReference' &&
          issue.code === 'missing_value',
      ),
    );

    check(
      'rejects silent status reclassification',
      validation.issues.some(
        issue =>
          issue.path ===
            'statusTransformation.silentReclassificationPerformed' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const dependencies =
      extension.dependencyItems as
        unknown[];

    const validation =
      validateWorkflowDependencyItem(
        dependencies[0],
      );

    check(
      'accepts a bounded workflow-dependency item',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const dependencies =
      extension.dependencyItems as
        Record<string, unknown>[];

    dependencies[0].upstreamReferences = [
      'synthetic-evidence-cos-001',
      'synthetic-evidence-cos-001',
    ];

    const validation =
      validateWorkflowDependencyItem(
        dependencies[0],
      );

    check(
      'rejects duplicate upstream dependency references',
      validation.issues.some(
        issue =>
          issue.path ===
            'workflowDependency.upstreamReferences[1]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const dependencies =
      extension.dependencyItems as
        Record<string, unknown>[];

    dependencies[0].unresolved =
      'pending';

    const validation =
      validateWorkflowDependencyItem(
        dependencies[0],
      );

    check(
      'rejects a nonboolean dependency unresolved state',
      validation.issues.some(
        issue =>
          issue.path ===
            'workflowDependency.unresolved' &&
          issue.code === 'invalid_type',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const proposedOwners =
      extension.proposedOwners as
        unknown[];

    const validation =
      validateProposedOwnerRecord(
        proposedOwners[0],
      );

    check(
      'accepts a bounded proposed-owner record',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const proposedOwners =
      extension.proposedOwners as
        Record<string, unknown>[];

    proposedOwners[0].approvalStatus =
      'approved';

    const validation =
      validateProposedOwnerRecord(
        proposedOwners[0],
      );

    check(
      'rejects approval of a proposed owner',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedOwner.approvalStatus' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const proposedOwners =
      extension.proposedOwners as
        Record<string, unknown>[];

    proposedOwners[0].bindingAssignmentCreated =
      true;

    const validation =
      validateProposedOwnerRecord(
        proposedOwners[0],
      );

    check(
      'rejects a binding assignment from a proposed-owner record',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedOwner.bindingAssignmentCreated' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const proposedDeadlines =
      extension.proposedDeadlines as
        unknown[];

    const validation =
      validateProposedDeadlineRecord(
        proposedDeadlines[0],
      );

    check(
      'accepts a bounded proposed-deadline record',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const proposedDeadlines =
      extension.proposedDeadlines as
        Record<string, unknown>[];

    proposedDeadlines[0].approvalStatus =
      'approved';

    const validation =
      validateProposedDeadlineRecord(
        proposedDeadlines[0],
      );

    check(
      'rejects approval of a proposed deadline',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedDeadline.approvalStatus' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const proposedDeadlines =
      extension.proposedDeadlines as
        Record<string, unknown>[];

    proposedDeadlines[0].bindingCommitmentCreated =
      true;

    const validation =
      validateProposedDeadlineRecord(
        proposedDeadlines[0],
      );

    check(
      'rejects a binding commitment from a proposed deadline',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedDeadline.bindingCommitmentCreated' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const sequence =
      extension.proposedWorkSequence as
        unknown[];

    const validation =
      validateProposedWorkSequenceItem(
        sequence[0],
      );

    check(
      'accepts a bounded proposed work-sequence item',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const sequence =
      extension.proposedWorkSequence as
        Record<string, unknown>[];

    sequence[0].proposedOrder = 0;

    const validation =
      validateProposedWorkSequenceItem(
        sequence[0],
      );

    check(
      'rejects a nonpositive proposed work-sequence order',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedWorkSequenceItem.proposedOrder' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const sequence =
      extension.proposedWorkSequence as
        Record<string, unknown>[];

    sequence[0].approvalStatus =
      'approved';

    const validation =
      validateProposedWorkSequenceItem(
        sequence[0],
      );

    check(
      'rejects approval of a proposed work sequence',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedWorkSequenceItem.approvalStatus' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateRecordedHumanDecision({
        decisionRecordId:
          'synthetic-human-decision-001',
        decisionStatement:
          'A designated human reviewer approved continued draft review only.',
        humanDecisionReference:
          'synthetic-human-approval-001',
        recordedBy:
          'designated_human_reviewer',
        recordedAt:
          '2026-08-01T20:00:00.000Z',
        evidenceReferences: [
          'synthetic-evidence-cos-001',
        ],
        modelGeneratedDecision: false,
      });

    check(
      'accepts a bounded recorded human decision',
      validation.ok,
    );
  }

  {
    const validation =
      validateRecordedHumanDecision({
        decisionRecordId:
          'synthetic-human-decision-002',
        decisionStatement:
          'An unsupported source attempted to record a decision.',
        humanDecisionReference:
          'synthetic-human-approval-002',
        recordedBy:
          'executive_agent',
        recordedAt:
          '2026-08-01T20:00:00.000Z',
        evidenceReferences: [
          'synthetic-evidence-cos-001',
        ],
        modelGeneratedDecision: false,
      });

    check(
      'rejects an unknown human-decision source kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'recordedHumanDecision.recordedBy' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateRecordedHumanDecision({
        decisionRecordId:
          'synthetic-human-decision-003',
        decisionStatement:
          'A model attempted to represent its output as a human decision.',
        humanDecisionReference:
          'synthetic-human-approval-003',
        recordedBy: 'founder',
        recordedAt:
          '2026-08-01T20:00:00.000Z',
        evidenceReferences: [
          'synthetic-evidence-cos-001',
        ],
        modelGeneratedDecision: true,
      });

    check(
      'rejects a model-generated recorded human decision',
      validation.issues.some(
        issue =>
          issue.path ===
            'recordedHumanDecision.modelGeneratedDecision' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const validation =
      validateChiefOfStaffDraftExtension(
        roleOutput.roleExtension,
      );

    check(
      'accepts a complete bounded Chief of Staff draft extension',
      validation.ok,
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    extension.artifactKind =
      'binding_operating_directive';

    const validation =
      validateChiefOfStaffDraftExtension(
        extension,
      );

    check(
      'rejects an unknown Chief of Staff artifact kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.artifactKind' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    const sequence =
      extension.proposedWorkSequence as
        Record<string, unknown>[];

    extension.proposedWorkSequence = [
      sequence[0],
      {
        ...sequence[0],
      },
    ];

    const validation =
      validateChiefOfStaffDraftExtension(
        extension,
      );

    check(
      'rejects duplicate Chief of Staff sequence-item IDs',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.proposedWorkSequence[1]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    extension.artificialConsensusCreated =
      true;

    const validation =
      validateChiefOfStaffDraftExtension(
        extension,
      );

    check(
      'rejects artificial consensus in a Chief of Staff extension',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.artificialConsensusCreated' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const roleOutput =
      validChiefOfStaffRoleOutput();

    const extension =
      roleOutput.roleExtension as
        Record<string, unknown>;

    extension.bindingAssignmentAuthorized =
      true;

    const validation =
      validateChiefOfStaffDraftExtension(
        extension,
      );

    check(
      'rejects binding-assignment authority in a Chief of Staff extension',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.bindingAssignmentAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        validChiefOfStaffRoleOutput(),
      );

    check(
      'accepts a complete bounded Chief of Staff human-mediated output',
      validation.ok,
    );
  }

  {
    const candidate =
      validChiefOfStaffRoleOutput({
        roleId: 'executive.ceo',
      });

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects a non-Chief-of-Staff role in a Chief of Staff output',
      validation.issues.some(
        issue =>
          issue.path === 'roleOutput.roleId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validChiefOfStaffRoleOutput({
        taskClass: 'strategic_analysis',
      });

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects a recognized task not allowed for the Chief of Staff',
      validation.issues.some(
        issue =>
          issue.path === 'roleOutput.taskClass' &&
          issue.code ===
            'task_not_allowed_for_role',
      ),
    );
  }

  {
    const candidate =
      validChiefOfStaffRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    extension.disagreementSummaryIds = [
      'synthetic-disagreement-missing',
    ];

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects a dangling Chief of Staff disagreement-summary reference',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.disagreementSummaryIds[0]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validChiefOfStaffRoleOutput();

    candidate.clarificationRequests = [
      {
        clarificationRequestId:
          'synthetic-cos-clarification-001',
        workflowId:
          'synthetic-workflow-cos-001',
        runId:
          'synthetic-run-cos-mismatched',
        roleId:
          'executive.chief_of_staff',
        question:
          'Which synthetic sequence should be reviewed?',
        reason:
          'A human coordination decision remains required.',
        evidenceReferences: [
          'synthetic-evidence-cos-001',
        ],
        addressedToHuman: true,
        toolCallRequested: false,
        roleDispatchRequested: false,
        automaticContinuationRequested: false,
        evidenceCollectionAuthorized: false,
      },
    ];

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects mismatched Chief of Staff clarification lineage',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.clarificationRequests[0].runId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validChiefOfStaffRoleOutput();

    const commonOutput =
      candidate.commonOutput as
        Record<string, unknown>;

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    commonOutput.escalationRequired = true;

    candidate.escalationPacket = {
      escalationPacketId:
        'synthetic-cos-escalation-001',
      workflowId:
        'synthetic-workflow-cos-001',
      runId:
        'synthetic-run-cos-001',
      roleId:
        'executive.chief_of_staff',
      taskClass:
        'cross_function_synthesis',
      issue:
        'Synthetic evidence remains incomplete.',
      evidenceAvailable: [
        'synthetic-evidence-cos-001',
      ],
      evidenceMissing: [
        'synthetic-evidence-cos-missing',
      ],
      options: [
        'Pause for human review.',
      ],
      risks: [
        'Proceeding could imply unsupported coordination certainty.',
      ],
      requiredHumanDecision:
        'A human must decide whether to continue draft review.',
      founderApprovalRequired: false,
      verifiedStatus: [],
      conflictingEvidence: [],
      affectedDependencies: [
        'synthetic-dependency-001',
      ],
      governingConstraints: [
        'No automatic continuation.',
      ],
      affectedComponents: [],
      reversibilityConcerns: [
        'No irreversible action is authorized.',
      ],
      automaticActionAuthorized: false,
    };

    extension.escalationPacketId =
      'synthetic-cos-escalation-mismatched';

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects mismatched Chief of Staff escalation identifier linkage',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.escalationPacketId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validChiefOfStaffRoleOutput({
        persistencePerformed: true,
      });

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    check(
      'rejects persistence in a Chief of Staff role output',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.persistencePerformed' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const evidenceInspected =
      extension.evidenceInspected as
        Record<string, unknown>[];

    const validation =
      validateArchitectureEvidenceRecord(
        evidenceInspected[0],
      );

    check(
      'accepts a bounded architecture-evidence record',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const evidenceInspected =
      extension.evidenceInspected as
        Record<string, unknown>[];

    const evidence = {
      ...evidenceInspected[0],
      available: 'yes',
    };

    const validation =
      validateArchitectureEvidenceRecord(
        evidence,
      );

    check(
      'rejects a nonboolean architecture-evidence availability marker',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureEvidence.available' &&
          issue.code === 'invalid_type',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const evidenceInspected =
      extension.evidenceInspected as
        Record<string, unknown>[];

    const evidence = {
      ...evidenceInspected[0],
      evidenceReferences: [
        'synthetic-evidence-cao-001',
        'synthetic-evidence-cao-001',
      ],
    };

    const validation =
      validateArchitectureEvidenceRecord(
        evidence,
      );

    check(
      'rejects duplicate architecture-evidence references',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureEvidence.evidenceReferences[1]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const alternatives =
      extension.alternativesConsidered as
        Record<string, unknown>[];

    const validation =
      validateArchitectureAlternativeDraft(
        alternatives[0],
      );

    check(
      'accepts a bounded architecture-alternative draft',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const alternatives =
      extension.alternativesConsidered as
        Record<string, unknown>[];

    const alternative = {
      ...alternatives[0],
      productionApproved: true,
    };

    const validation =
      validateArchitectureAlternativeDraft(
        alternative,
      );

    check(
      'rejects an unknown architecture-alternative field',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureAlternative.productionApproved' &&
          issue.code === 'unknown_field',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const alternatives =
      extension.alternativesConsidered as
        Record<string, unknown>[];

    const alternative = {
      ...alternatives[0],
      implementationAuthorized: true,
    };

    const validation =
      validateArchitectureAlternativeDraft(
        alternative,
      );

    check(
      'rejects implementation authority in an architecture alternative',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureAlternative.implementationAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const proposals =
      extension.architectureProposals as
        Record<string, unknown>[];

    const validation =
      validateUnimplementedArchitectureProposal(
        proposals[0],
      );

    check(
      'accepts a bounded unimplemented architecture proposal',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const proposals =
      extension.architectureProposals as
        Record<string, unknown>[];

    const proposal = {
      ...proposals[0],
      proposalKind: 'deployment',
    };

    const validation =
      validateUnimplementedArchitectureProposal(
        proposal,
      );

    check(
      'rejects an unknown architecture-proposal kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureProposal.proposalKind' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const proposals =
      extension.architectureProposals as
        Record<string, unknown>[];

    const proposal = {
      ...proposals[0],
      markedUnimplemented: false,
    };

    const validation =
      validateUnimplementedArchitectureProposal(
        proposal,
      );

    check(
      'rejects removal of the unimplemented architecture-proposal marker',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureProposal.markedUnimplemented' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const proposals =
      extension.architectureProposals as
        Record<string, unknown>[];

    const proposal = {
      ...proposals[0],
      repositoryModificationAuthorized: true,
    };

    const validation =
      validateUnimplementedArchitectureProposal(
        proposal,
      );

    check(
      'rejects repository-modification authority in an architecture proposal',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureProposal.repositoryModificationAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const riskAnalyses =
      extension.riskAnalyses as
        Record<string, unknown>[];

    const validation =
      validateArchitectureRiskAnalysis(
        riskAnalyses[0],
      );

    check(
      'accepts a bounded architecture-risk analysis',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const riskAnalyses =
      extension.riskAnalyses as
        Record<string, unknown>[];

    const riskAnalysis = {
      ...riskAnalyses[0],
      riskKind: 'compliance',
    };

    const validation =
      validateArchitectureRiskAnalysis(
        riskAnalysis,
      );

    check(
      'rejects an unknown architecture-risk kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureRiskAnalysis.riskKind' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const riskAnalyses =
      extension.riskAnalyses as
        Record<string, unknown>[];

    const riskAnalysis = {
      ...riskAnalyses[0],
      humanDecisionRequired: 'yes',
    };

    const validation =
      validateArchitectureRiskAnalysis(
        riskAnalysis,
      );

    check(
      'rejects a nonboolean architecture-risk human-decision marker',
      validation.issues.some(
        issue =>
          issue.path ===
            'architectureRiskAnalysis.humanDecisionRequired' &&
          issue.code === 'invalid_type',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const plans =
      extension.testAndEvaluationPlans as
        Record<string, unknown>[];

    const validation =
      validateTestEvaluationPlanDraft(
        plans[0],
      );

    check(
      'accepts a bounded synthetic test-and-evaluation plan',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const plans =
      extension.testAndEvaluationPlans as
        Record<string, unknown>[];

    const plan = {
      ...plans[0],
      syntheticOnly: false,
    };

    const validation =
      validateTestEvaluationPlanDraft(
        plan,
      );

    check(
      'rejects removal of synthetic-only test-plan scope',
      validation.issues.some(
        issue =>
          issue.path ===
            'testEvaluationPlan.syntheticOnly' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const plans =
      extension.testAndEvaluationPlans as
        Record<string, unknown>[];

    const plan = {
      ...plans[0],
      executionAuthorized: true,
    };

    const validation =
      validateTestEvaluationPlanDraft(
        plan,
      );

    check(
      'rejects execution authority in a test-and-evaluation plan',
      validation.issues.some(
        issue =>
          issue.path ===
            'testEvaluationPlan.executionAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const sequences =
      extension.proposedImplementationSequences as
        Record<string, unknown>[];

    const validation =
      validateProposedImplementationSequence(
        sequences[0],
      );

    check(
      'accepts a bounded proposed implementation sequence',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const sequences =
      extension.proposedImplementationSequences as
        Record<string, unknown>[];

    const sequence = {
      ...sequences[0],
      approvalStatus: 'approved',
    };

    const validation =
      validateProposedImplementationSequence(
        sequence,
      );

    check(
      'rejects approval of a proposed implementation sequence',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedImplementationSequence.approvalStatus' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const sequences =
      extension.proposedImplementationSequences as
        Record<string, unknown>[];

    const sequence = {
      ...sequences[0],
      implementationAuthorized: true,
    };

    const validation =
      validateProposedImplementationSequence(
        sequence,
      );

    check(
      'rejects implementation authority in a proposed implementation sequence',
      validation.issues.some(
        issue =>
          issue.path ===
            'proposedImplementationSequence.implementationAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const dissent =
      extension.technicalDissent as
        Record<string, unknown>[];

    const validation =
      validateTechnicalDissentRecord(
        dissent[0],
      );

    check(
      'accepts a bounded technical-dissent record',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const dissent =
      extension.technicalDissent as
        Record<string, unknown>[];

    const record = {
      ...dissent[0],
      preservationRequired: false,
    };

    const validation =
      validateTechnicalDissentRecord(
        record,
      );

    check(
      'rejects removal of technical-dissent preservation',
      validation.issues.some(
        issue =>
          issue.path ===
            'technicalDissent.preservationRequired' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const dissent =
      extension.technicalDissent as
        Record<string, unknown>[];

    const record = {
      ...dissent[0],
      evidenceReferences: [
        'synthetic-evidence-cao-001',
        'synthetic-evidence-cao-001',
      ],
    };

    const validation =
      validateTechnicalDissentRecord(
        record,
      );

    check(
      'rejects duplicate technical-dissent evidence references',
      validation.issues.some(
        issue =>
          issue.path ===
            'technicalDissent.evidenceReferences[1]' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const validation =
      validateCaoDraftExtension(
        candidate.roleExtension,
      );

    check(
      'accepts a complete bounded CAO draft extension',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension = {
      ...(candidate.roleExtension as
        Record<string, unknown>),
      artifactKind: 'production_migration',
    };

    const validation =
      validateCaoDraftExtension(
        extension,
      );

    check(
      'rejects an unknown CAO artifact kind',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.artifactKind' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension =
      candidate.roleExtension as
        Record<string, unknown>;

    const evidenceInspected =
      extension.evidenceInspected as
        Record<string, unknown>[];

    const modifiedExtension = {
      ...extension,
      evidenceInspected: [
        {
          ...evidenceInspected[0],
          available: false,
        },
      ],
    };

    const validation =
      validateCaoDraftExtension(
        modifiedExtension,
      );

    check(
      'rejects unavailable evidence in the CAO inspected collection',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.evidenceInspected[0].available' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension = {
      ...(candidate.roleExtension as
        Record<string, unknown>),
      recommendedOptionId:
        'missing-architecture-alternative',
    };

    const validation =
      validateCaoDraftExtension(
        extension,
      );

    check(
      'rejects a dangling CAO recommended-option reference',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.recommendedOptionId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const extension = {
      ...(candidate.roleExtension as
        Record<string, unknown>),
      repositoryModificationAuthorized: true,
    };

    const validation =
      validateCaoDraftExtension(
        extension,
      );

    check(
      'rejects repository-modification authority in a CAO extension',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.roleExtension.repositoryModificationAuthorized' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const validation =
      validateCaoHumanMediatedOutput(
        candidate,
      );

    check(
      'accepts a complete bounded CAO human-mediated output',
      validation.ok,
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const output = {
      ...(candidate as Record<string, unknown>),
      roleId: 'executive.ceo',
    };

    const validation =
      validateCaoHumanMediatedOutput(
        output,
      );

    check(
      'rejects a non-CAO role in a CAO output',
      validation.issues.some(
        issue =>
          issue.path === 'roleOutput.roleId' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const output = {
      ...(candidate as Record<string, unknown>),
      humanDecisionRequired: false,
    };

    const validation =
      validateCaoHumanMediatedOutput(
        output,
      );

    check(
      'rejects removal of the CAO human-decision requirement',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.humanDecisionRequired' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const output = {
      ...(candidate as Record<string, unknown>),
      persistencePerformed: true,
    };

    const validation =
      validateCaoHumanMediatedOutput(
        output,
      );

    check(
      'rejects persistence in a CAO role output',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.persistencePerformed' &&
          issue.code === 'invalid_value',
      ),
    );
  }

  {
    const candidate =
      validCaoRoleOutput();

    const commonOutput =
      candidate.commonOutput as
        Record<string, unknown>;

    const output = {
      ...(candidate as Record<string, unknown>),
      commonOutput: {
        ...commonOutput,
        escalationRequired: true,
      },
      escalationPacket: null,
    };

    const validation =
      validateCaoHumanMediatedOutput(
        output,
      );

    check(
      'requires an escalation packet for an escalating CAO output',
      validation.issues.some(
        issue =>
          issue.path ===
            'roleOutput.escalationPacket' &&
          issue.code === 'missing_value',
      ),
    );
  }

  {
    const validation =
      validateHumanDispositionRecord(
        validDisposition(),
      );

    check(
      'accepts a bounded human-disposition record',
      validation.ok,
    );
  }

  {
    const validation =
      validateHumanDispositionRecord({
        ...validDisposition(),
        unexpectedField: true,
      });

    check(
      'rejects an unknown human-disposition field',
      hasIssue(validation, {
        code: 'unknown_field',
        path:
          'humanDispositionRecord.unexpectedField',
      }),
    );
  }

  {
    const validation =
      validateHumanDispositionRecord(
        validDisposition({
          disposition:
            'automatic_approval',
        }),
      );

    check(
      'rejects an unknown human disposition',
      hasIssue(validation, {
        code: 'invalid_value',
        path:
          'humanDispositionRecord.disposition',
      }),
    );
  }

  {
    const validation =
      validateHumanDispositionRecord(
        validDisposition({
          sourceKind: 'model',
        }),
      );

    check(
      'rejects a nonhuman disposition source',
      hasIssue(validation, {
        code: 'invalid_value',
        path:
          'humanDispositionRecord.sourceKind',
      }),
    );
  }

  {
    const validation =
      validateHumanDispositionRecord(
        validDisposition({
          permitsDraftRevision: 'yes',
        }),
      );

    check(
      'rejects a nonboolean draft permission',
      hasIssue(validation, {
        code: 'invalid_type',
        path:
          'humanDispositionRecord.permitsDraftRevision',
      }),
    );
  }

  {
    const validation =
      validateHumanDispositionRecord(
        validDisposition({
          implementationAuthorized: true,
        }),
      );

    check(
      'rejects implementation authority in a disposition record',
      hasIssue(validation, {
        code: 'invalid_value',
        path:
          'humanDispositionRecord.implementationAuthorized',
      }),
    );
  }

  {
    const validation =
      validateWorkflowClosureRecord(
        validClosure(),
      );

    check(
      'accepts a bounded administrative workflow closure',
      validation.ok,
    );
  }

  {
    const validation =
      validateWorkflowClosureRecord(
        validClosure({
          unresolvedDissentRemainsVisible:
            false,
        }),
      );

    check(
      'rejects administrative closure that hides unresolved dissent',
      hasIssue(validation, {
        code: 'invalid_value',
        path:
          'workflowClosureRecord.unresolvedDissentRemainsVisible',
      }),
    );
  }

  {
    const validation =
      validateWorkflowClosureRecord(
        validClosure({
          implementationAuthorized: true,
        }),
      );

    check(
      'rejects implementation authority in a workflow closure',
      hasIssue(validation, {
        code: 'invalid_value',
        path:
          'workflowClosureRecord.implementationAuthorized',
      }),
    );
  }

  {
    const validation =
      validateWorkflowClosureRecord(
        validClosure({
          closedBy: 'model',
        }),
      );

    check(
      'rejects a nonhuman workflow-closure source',
      hasIssue(validation, {
        code: 'invalid_value',
        path:
          'workflowClosureRecord.closedBy',
      }),
    );
  }

  console.log(
    `\n${'-'.repeat(72)}\n` +
      `  ${passed} passed, ${failed} failed\n` +
      `${'-'.repeat(72)}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main();
