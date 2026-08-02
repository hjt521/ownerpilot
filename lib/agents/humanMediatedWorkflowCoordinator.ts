/**
 * Bounded in-memory coordinator preparation seam.
 *
 * This module validates and prepares one human-mediated workflow in memory.
 * It does not invoke a model, advance into an authorized role run, dispatch
 * another role, use tools, persist data, activate Preview, or perform any
 * Production action.
 */

import {
  executeLocalSingleRole,
  type LocalSingleRoleExecutionOptions,
  type LocalSingleRoleExecutionReport,
} from './localSingleRoleExecution';


import type {
  ExecutiveAgentDraftOutput,
} from './evaluation/modelEvaluation';

import type {
  CaoDraftExtension,
  CaoHumanMediatedOutput,
  CeoDraftExtension,
  CeoHumanMediatedOutput,
  ChiefOfStaffDraftExtension,
  ChiefOfStaffHumanMediatedOutput,
  ExecutiveEscalationPacket,
  ExecutiveRoleAuditExtension,
  ExecutiveWorkflowAuditEvent,
  ExecutiveWorkflowEnvelope,
  ExecutiveWorkflowState,
  HumanAuthorizationReference,
  HumanDispositionRecord,
  HumanMediatedHandoff,
  InMemoryWorkflowAuditTrail,
  WorkflowClosureRecord,
} from './humanMediatedWorkflowTypes';

import {
  validateCaoHumanMediatedOutput,
  validateCeoHumanMediatedOutput,
  validateChiefOfStaffHumanMediatedOutput,
  validateExecutiveAgentDraftOutput,
  validateExecutiveWorkflowEnvelope,
  validateHumanAuthorizationReference,
  validateHumanDispositionRecord,
  validateWorkflowClosureRecord,
  validateHumanMediatedHandoff,
  validateInMemoryWorkflowAuditTrail,
  type HumanMediatedValidationIssue,
} from './humanMediatedWorkflowValidator';

export const IN_MEMORY_WORKFLOW_COORDINATOR_VERSION =
  'executive-human-mediated-in-memory-coordinator-v1' as const;

export type AnyHumanMediatedRoleOutput =
  | CeoHumanMediatedOutput
  | ChiefOfStaffHumanMediatedOutput
  | CaoHumanMediatedOutput;

export interface InMemoryWorkflowCoordinatorState {
  coordinatorVersion:
    typeof IN_MEMORY_WORKFLOW_COORDINATOR_VERSION;
  executionMode:
    'human_mediated_in_memory_only';
  workflowId: string;
  currentState: ExecutiveWorkflowState;
  envelope: ExecutiveWorkflowEnvelope;
  receivingEnvelope:
    ExecutiveWorkflowEnvelope | null;
  roleOutputs:
    readonly AnyHumanMediatedRoleOutput[];
  localExecutionReports:
    readonly LocalSingleRoleExecutionReport[];
  currentHumanDisposition:
    HumanDispositionRecord['disposition'];
  humanDispositionRecords:
    readonly HumanDispositionRecord[];
  handoffs: readonly HumanMediatedHandoff[];
  closureRecord: WorkflowClosureRecord | null;
  auditTrail: InMemoryWorkflowAuditTrail;
  humanActionPending: true;
  modelInvocationCount: number;
  coordinatorTransitionCount: number;
  automaticContinuation: false;
  autonomousDispatchPerformed: false;
  toolExecutionPerformed: false;
  persistencePerformed: false;
  externalCommunicationPerformed: false;
  previewActivationPerformed: false;
  productionActionPerformed: false;
}

export type PrepareInMemoryWorkflowResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function initialAuditEvent(
  envelope: ExecutiveWorkflowEnvelope,
): ExecutiveWorkflowAuditEvent {
  return {
    auditVersion:
      'executive-human-mediated-audit-event-v1',
    auditEventId: 'audit-event-0001',
    workflowId: envelope.workflowId,
    runId: envelope.runId,
    handoffId: envelope.handoffId,
    eventKind: 'request_prepared',
    priorState: null,
    nextState: 'draft_request_prepared',
    roleId: envelope.roleId,
    taskClass: envelope.requestedTaskClass,
    actorKind:
      'local_in_memory_coordinator',
    actorIdentifier:
      'human-mediated-workflow-coordinator',
    humanAuthorization: null,
    recordedAt: envelope.createdAt,
    sourceCommitSha:
      envelope.sourceCommitSha,
    evidenceReferences:
      envelope.evidenceItems.map(
        evidence => evidence.evidenceId,
      ),
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
  };
}

function initialAuditTrail(
  envelope: ExecutiveWorkflowEnvelope,
): InMemoryWorkflowAuditTrail {
  return {
    auditTrailVersion:
      'executive-human-mediated-in-memory-audit-trail-v1',
    workflowId: envelope.workflowId,
    events: [
      initialAuditEvent(envelope),
    ],
    inMemoryOnly: true,
    retainedAfterProcessExit: false,
    persistenceRequested: false,
    persistencePerformed: false,
    databaseResourceCreated: false,
    externalLogDestinationConfigured: false,
    automaticExecutionAuthority: false,
  };
}

export function prepareInMemoryHumanMediatedWorkflow(
  candidate: unknown,
): PrepareInMemoryWorkflowResult {
  const envelopeValidation =
    validateExecutiveWorkflowEnvelope(candidate);

  if (!envelopeValidation.ok) {
    return {
      ok: false,
      state: null,
      issues: envelopeValidation.issues,
    };
  }

  const envelope = envelopeValidation.value;
  const auditTrail = initialAuditTrail(envelope);
  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      auditTrail,
    );

  if (!auditValidation.ok) {
    return {
      ok: false,
      state: null,
      issues: auditValidation.issues,
    };
  }

  const state:
    InMemoryWorkflowCoordinatorState = {
      coordinatorVersion:
        IN_MEMORY_WORKFLOW_COORDINATOR_VERSION,
      executionMode:
        'human_mediated_in_memory_only',
      workflowId: envelope.workflowId,
      currentState:
        'draft_request_prepared',
      envelope,
      receivingEnvelope: null,
      roleOutputs: [],
      localExecutionReports: [],
      currentHumanDisposition:
        envelope.currentHumanDisposition,
      humanDispositionRecords: [],
      handoffs: [],
      closureRecord: null,
      auditTrail: auditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 0,
      coordinatorTransitionCount: 0,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    };

  return {
    ok: true,
    state,
    issues: [],
  };
}

export type HumanInitiationTransitionResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function coordinatorIssue(
  path: string,
  code:
    HumanMediatedValidationIssue['code'],
  message: string,
): HumanMediatedValidationIssue {
  return {
    path,
    code,
    message,
  };
}

function authorizationMatchesEnvelope(
  authorization: HumanAuthorizationReference,
  envelope: ExecutiveWorkflowEnvelope,
): boolean {
  const expected =
    envelope.humanAuthorization;

  return (
    authorization.humanClass ===
      expected.humanClass &&
    authorization.humanIdentifier ===
      expected.humanIdentifier &&
    authorization.approvalReference ===
      expected.approvalReference &&
    authorization.scopeKind ===
      expected.scopeKind &&
    authorization.scopeId ===
      expected.scopeId &&
    authorization.roleId ===
      expected.roleId &&
    authorization.taskClass ===
      expected.taskClass &&
    authorization.authorizedAt ===
      expected.authorizedAt &&
    authorization.authorizationVersion ===
      expected.authorizationVersion
  );
}

export function recordHumanInitiationAuthorization(
  state: InMemoryWorkflowCoordinatorState,
  authorizationCandidate: unknown,
): HumanInitiationTransitionResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'draft_request_prepared'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Human initiation may be recorded only from draft_request_prepared.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  if (
    state.modelInvocationCount !== 0 ||
    state.coordinatorTransitionCount !== 0 ||
    state.roleOutputs.length !== 0 ||
    state.currentHumanDisposition !==
      'pending' ||
    state.humanDispositionRecords.length !== 0 ||
    state.handoffs.length !== 0
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Human initiation requires an untouched prepared workflow state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const authorizationValidation =
    validateHumanAuthorizationReference(
      authorizationCandidate,
    );

  if (!authorizationValidation.ok) {
    issues.push(
      ...authorizationValidation.issues,
    );
  } else {
    const authorization =
      authorizationValidation.value;

    if (
      authorization.scopeKind !== 'run' ||
      authorization.scopeId !==
        state.envelope.runId ||
      authorization.roleId !==
        state.envelope.roleId ||
      authorization.taskClass !==
        state.envelope.requestedTaskClass
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Human authorization must match this exact run, role, and task.',
        ),
      );
    }

    if (
      !authorizationMatchesEnvelope(
        authorization,
        state.envelope,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Human authorization must match the validated envelope authorization exactly.',
        ),
      );
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      state: null,
      issues,
    };
  }

  const authorization =
    authorizationValidation.ok
      ? authorizationValidation.value
      : state.envelope.humanAuthorization;

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId: 'audit-event-0002',
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: state.envelope.handoffId,
      eventKind: 'human_run_authorized',
      priorState:
        'draft_request_prepared',
      nextState:
        'awaiting_human_initiation',
      roleId: state.envelope.roleId,
      taskClass:
        state.envelope.requestedTaskClass,
      actorKind: 'authorized_human',
      actorIdentifier:
        authorization.humanIdentifier,
      humanAuthorization: authorization,
      recordedAt: authorization.authorizedAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        state.envelope.evidenceItems.map(
          evidence => evidence.evidenceId,
        ),
      draftReferenceIds: [],
      disagreementIds: [],
      roleAuditExtension: null,
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState:
        'awaiting_human_initiation',
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      modelInvocationCount: 0,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    issues: [],
  };
}

export type RoleRunAuthorizationTransitionResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

export function recordRoleRunAuthorization(
  state: InMemoryWorkflowCoordinatorState,
  authorizationCandidate: unknown,
): RoleRunAuthorizationTransitionResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'awaiting_human_initiation'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Role-run authorization may be recorded only from awaiting_human_initiation.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  if (
    state.modelInvocationCount !== 0 ||
    state.coordinatorTransitionCount !== 1 ||
    state.roleOutputs.length !== 0 ||
    state.currentHumanDisposition !==
      'pending' ||
    state.humanDispositionRecords.length !== 0 ||
    state.handoffs.length !== 0
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Role-run authorization requires the untouched awaiting-human-initiation state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const authorizationValidation =
    validateHumanAuthorizationReference(
      authorizationCandidate,
    );

  if (!authorizationValidation.ok) {
    issues.push(
      ...authorizationValidation.issues,
    );
  } else {
    const authorization =
      authorizationValidation.value;

    if (
      authorization.scopeKind !== 'run' ||
      authorization.scopeId !==
        state.envelope.runId ||
      authorization.roleId !==
        state.envelope.roleId ||
      authorization.taskClass !==
        state.envelope.requestedTaskClass
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Role-run authorization must match this exact run, role, and task.',
        ),
      );
    }

    if (
      !authorizationMatchesEnvelope(
        authorization,
        state.envelope,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Role-run authorization must match the validated envelope authorization exactly.',
        ),
      );
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      state: null,
      issues,
    };
  }

  const authorization =
    authorizationValidation.ok
      ? authorizationValidation.value
      : state.envelope.humanAuthorization;

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId: 'audit-event-0003',
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: state.envelope.handoffId,
      eventKind: 'human_run_authorized',
      priorState:
        'awaiting_human_initiation',
      nextState: 'role_run_authorized',
      roleId: state.envelope.roleId,
      taskClass:
        state.envelope.requestedTaskClass,
      actorKind: 'authorized_human',
      actorIdentifier:
        authorization.humanIdentifier,
      humanAuthorization: authorization,
      recordedAt: authorization.authorizedAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        state.envelope.evidenceItems.map(
          evidence => evidence.evidenceId,
        ),
      draftReferenceIds: [],
      disagreementIds: [],
      roleAuditExtension: null,
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState: 'role_run_authorized',
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      modelInvocationCount: 0,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    issues: [],
  };
}

export type AuthorizedSingleRoleExecutionResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      report: LocalSingleRoleExecutionReport;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      report:
        LocalSingleRoleExecutionReport | null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function localExecutionMatchesEnvelope(
  options: LocalSingleRoleExecutionOptions,
  envelope: ExecutiveWorkflowEnvelope,
): boolean {
  const request = options.runRequest;
  const audit = request.auditMetadata;
  const entry = request.registryEntry;

  return (
    audit.runId === envelope.runId &&
    entry.roleId === envelope.roleId &&
    request.requestedTaskClass ===
      envelope.requestedTaskClass &&
    audit.modelSlot ===
      envelope.requestedModelSlot &&
    audit.providerId === envelope.providerId &&
    audit.modelId === envelope.modelId &&
    audit.pinnedModelVersion ===
      envelope.pinnedModelVersion &&
    audit.adapterId === envelope.adapterId &&
    entry.reasoningLevel ===
      envelope.reasoningLevel &&
    request.evidenceState ===
      envelope.evidenceState &&
    options.evaluationCase.roleId ===
      envelope.roleId &&
    options.evaluationCase.taskClass ===
      envelope.requestedTaskClass &&
    request.requestedTools.length === 0
  );
}

function localReportPreservesBoundaries(
  report: LocalSingleRoleExecutionReport,
  envelope: ExecutiveWorkflowEnvelope,
): boolean {
  return (
    report.runRequestValidated === true &&
    report.roleId === envelope.roleId &&
    report.taskClass ===
      envelope.requestedTaskClass &&
    report.modelSlot ===
      envelope.requestedModelSlot &&
    report.humanDecisionRequired === true &&
    report.automaticApproval === false &&
    report.automaticSelection === false &&
    report.toolExecutionPerformed === false &&
    report.persistencePerformed === false &&
    report.providerLookupPerformed === false &&
    report.fallbackPerformed === false &&
    report.substitutionPerformed === false &&
    report.previewActivationPerformed === false &&
    report.productionEligible === false
  );
}

export async function executeAuthorizedSingleRoleDraft(
  state: InMemoryWorkflowCoordinatorState,
  options: LocalSingleRoleExecutionOptions,
): Promise<AuthorizedSingleRoleExecutionResult> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'role_run_authorized'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Single-role execution may begin only from role_run_authorized.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  if (
    state.modelInvocationCount !== 0 ||
    state.coordinatorTransitionCount !== 2 ||
    state.roleOutputs.length !== 0 ||
    state.localExecutionReports.length !== 0 ||
    state.currentHumanDisposition !==
      'pending' ||
    state.humanDispositionRecords.length !== 0 ||
    state.handoffs.length !== 0
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Execution requires one untouched role-run-authorized state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  if (
    !localExecutionMatchesEnvelope(
      options,
      state.envelope,
    )
  ) {
    issues.push(
      coordinatorIssue(
        'localExecutionOptions',
        'invalid_value',
        'Injected single-role options must match the authorized workflow envelope exactly.',
      ),
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      state: null,
      report: null,
      issues,
    };
  }

  let report: LocalSingleRoleExecutionReport;

  try {
    report = await executeLocalSingleRole(
      options,
    );
  } catch (error) {
    return {
      ok: false,
      state: null,
      report: null,
      issues: [
        coordinatorIssue(
          'localExecution',
          'invalid_value',
          error instanceof Error
            ? `Injected single-role execution failed: ${error.message}`
            : 'Injected single-role execution failed.',
        ),
      ],
    };
  }

  if (
    !localReportPreservesBoundaries(
      report,
      state.envelope,
    )
  ) {
    return {
      ok: false,
      state: null,
      report,
      issues: [
        coordinatorIssue(
          'localExecutionReport',
          'invalid_value',
          'Injected single-role report violated a workflow boundary.',
        ),
      ],
    };
  }

  let roleOutput:
    AnyHumanMediatedRoleOutput | null = null;

  if (report.draftForHumanReview !== null) {
    const materialized =
      materializeHumanMediatedRoleOutput(
        state.envelope,
        report.draftForHumanReview,
      );

    if (!materialized.ok) {
      return {
        ok: false,
        state: null,
        report,
        issues: materialized.issues,
      };
    }

    roleOutput = materialized.output;
  }

  const draftCompleted =
    report.finalAudit.outcome ===
      'draft_completed' &&
    roleOutput !== null;

  const nextState: ExecutiveWorkflowState =
    draftCompleted
      ? 'role_draft_completed'
      : 'role_escalation_required';

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId: 'audit-event-0004',
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: state.envelope.handoffId,
      eventKind: draftCompleted
        ? 'role_run_completed'
        : 'role_escalation_returned',
      priorState: 'role_run_authorized',
      nextState,
      roleId: state.envelope.roleId,
      taskClass:
        state.envelope.requestedTaskClass,
      actorKind:
        'local_in_memory_coordinator',
      actorIdentifier:
        'human-mediated-workflow-coordinator',
      humanAuthorization: null,
      recordedAt:
        report.modelRun.completedAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        report.finalAudit.evidenceReferences,
      draftReferenceIds:
        roleOutput === null
          ? []
          : [
              `materialized-draft:${state.envelope.runId}`,
            ],
      disagreementIds:
        roleOutput === null
          ? []
          : roleOutput.materialDisagreements.map(
              disagreement =>
                disagreement.disagreementId,
            ),
      roleAuditExtension:
        roleOutput === null
          ? null
          : buildHumanMediatedRoleAuditExtension(
              roleOutput,
            ),
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      report,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState: nextState,
      roleOutputs:
        roleOutput === null
          ? state.roleOutputs
          : [
              ...state.roleOutputs,
              roleOutput,
            ],
      localExecutionReports: [
        ...state.localExecutionReports,
        report,
      ],
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount:
        state.modelInvocationCount + 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    report,
    issues: [],
  };
}

export type PresentRoleOutputForHumanReviewResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function validateStoredRoleOutput(
  output: AnyHumanMediatedRoleOutput,
  envelope: ExecutiveWorkflowEnvelope,
): readonly HumanMediatedValidationIssue[] {
  const issues: HumanMediatedValidationIssue[] = [];

  const validation =
    envelope.roleId === 'executive.ceo'
      ? validateCeoHumanMediatedOutput(output)
      : envelope.roleId ===
          'executive.chief_of_staff'
        ? validateChiefOfStaffHumanMediatedOutput(
            output,
          )
        : validateCaoHumanMediatedOutput(output);

  if (!validation.ok) {
    issues.push(...validation.issues);
  }

  if (
    output.workflowId !== envelope.workflowId ||
    output.runId !== envelope.runId ||
    output.roleId !== envelope.roleId ||
    output.taskClass !==
      envelope.requestedTaskClass
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.roleOutputs[0]',
        'invalid_value',
        'Stored role-output lineage must match the workflow envelope.',
      ),
    );
  }

  return issues;
}

export function presentRoleOutputForHumanReview(
  state: InMemoryWorkflowCoordinatorState,
): PresentRoleOutputForHumanReviewResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
      'role_draft_completed' &&
    state.currentState !==
      'role_escalation_required'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Human-review presentation requires a completed draft or returned escalation.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  if (
    state.modelInvocationCount !== 1 ||
    state.coordinatorTransitionCount !== 3 ||
    state.roleOutputs.length !== 1 ||
    state.localExecutionReports.length !== 1 ||
    state.currentHumanDisposition !==
      'pending' ||
    state.humanDispositionRecords.length !== 0 ||
    state.handoffs.length !== 0 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Human-review presentation requires one untouched post-run state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const output = state.roleOutputs[0];
  const report = state.localExecutionReports[0];

  if (output === undefined || report === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'missing_value',
        'The post-run report and materialized role output are required.',
      ),
    );
  } else {
    issues.push(
      ...validateStoredRoleOutput(
        output,
        state.envelope,
      ),
    );

    if (
      report.draftForHumanReview === null ||
      JSON.stringify(output.commonOutput) !==
        JSON.stringify(
          report.draftForHumanReview,
        )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.roleOutputs[0].commonOutput',
          'invalid_value',
          'Stored role output must preserve the exact validated draft content.',
        ),
      );
    }

    if (
      state.currentState ===
        'role_draft_completed' &&
      (
        report.finalAudit.outcome !==
          'draft_completed' ||
        output.escalationPacket !== null
      )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.currentState',
          'invalid_value',
          'Completed-draft presentation requires a completed report without an escalation packet.',
        ),
      );
    }

    if (
      state.currentState ===
        'role_escalation_required' &&
      (
        report.finalAudit.outcome !==
          'escalation_required' ||
        output.escalationPacket === null
      )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.currentState',
          'invalid_value',
          'Escalation presentation requires an escalation report and packet.',
        ),
      );
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      state: null,
      issues,
    };
  }

  const roleOutput =
    output as AnyHumanMediatedRoleOutput;
  const executionReport =
    report as LocalSingleRoleExecutionReport;

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId: 'audit-event-0005',
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: state.envelope.handoffId,
      eventKind:
        'role_output_presented_for_review',
      priorState: state.currentState,
      nextState: 'awaiting_human_review',
      roleId: state.envelope.roleId,
      taskClass:
        state.envelope.requestedTaskClass,
      actorKind:
        'local_in_memory_coordinator',
      actorIdentifier:
        'human-mediated-workflow-coordinator',
      humanAuthorization: null,
      recordedAt:
        executionReport.modelRun.completedAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        roleOutput.commonOutput
          .evidenceReferences,
      draftReferenceIds: [
        `materialized-draft:${state.envelope.runId}`,
      ],
      disagreementIds:
        roleOutput.materialDisagreements.map(
          disagreement =>
            disagreement.disagreementId,
        ),
      roleAuditExtension:
        buildHumanMediatedRoleAuditExtension(
          roleOutput,
        ),
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState: 'awaiting_human_review',
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    issues: [],
  };
}

export type RecordHumanDispositionResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      dispositionRecord: HumanDispositionRecord;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      dispositionRecord: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

export function recordHumanDisposition(
  state: InMemoryWorkflowCoordinatorState,
  dispositionCandidate: unknown,
  authorizationCandidate: unknown,
): RecordHumanDispositionResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'awaiting_human_review'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'A human disposition may be recorded only from awaiting_human_review.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  if (
    state.modelInvocationCount !== 1 ||
    state.coordinatorTransitionCount !== 4 ||
    state.roleOutputs.length !== 1 ||
    state.localExecutionReports.length !== 1 ||
    state.currentHumanDisposition !==
      'pending' ||
    state.humanDispositionRecords.length !== 0 ||
    state.handoffs.length !== 0 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Disposition recording requires one untouched awaiting-human-review state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const dispositionValidation =
    validateHumanDispositionRecord(
      dispositionCandidate,
    );

  if (!dispositionValidation.ok) {
    issues.push(
      ...dispositionValidation.issues,
    );
  }

  const authorizationValidation =
    validateHumanAuthorizationReference(
      authorizationCandidate,
    );

  if (!authorizationValidation.ok) {
    issues.push(
      ...authorizationValidation.issues,
    );
  }

  if (
    dispositionValidation.ok &&
    authorizationValidation.ok
  ) {
    const disposition =
      dispositionValidation.value;
    const authorization =
      authorizationValidation.value;

    if (
      disposition.workflowId !==
        state.workflowId ||
      disposition.runId !==
        state.envelope.runId ||
      disposition.handoffId !==
        state.envelope.handoffId
    ) {
      issues.push(
        coordinatorIssue(
          'humanDispositionRecord',
          'invalid_value',
          'Disposition lineage must match the exact workflow, run, and handoff.',
        ),
      );
    }

    if (
      disposition.disposition !==
        'approved_for_draft_use' &&
      disposition.disposition !==
        'revision_required' &&
      disposition.disposition !==
        'rejected'
    ) {
      issues.push(
        coordinatorIssue(
          'humanDispositionRecord.disposition',
          'invalid_value',
          'Only approved_for_draft_use, revision_required, or rejected may be recorded from human review.',
        ),
      );
    }

    if (
      authorization.scopeKind !== 'run' ||
      authorization.scopeId !==
        state.envelope.runId ||
      authorization.roleId !==
        state.envelope.roleId ||
      authorization.taskClass !==
        state.envelope.requestedTaskClass
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Disposition authorization must match this exact run, role, and task.',
        ),
      );
    }

    const authorizationEnvelopeValidation =
      validateExecutiveWorkflowEnvelope({
        ...state.envelope,
        humanAuthorization: authorization,
      });

    if (!authorizationEnvelopeValidation.ok) {
      issues.push(
        ...authorizationEnvelopeValidation.issues,
      );
    }

    if (
      disposition.sourceKind !==
        authorization.humanClass ||
      disposition.sourceIdentifier !==
        authorization.humanIdentifier
    ) {
      issues.push(
        coordinatorIssue(
          'humanDispositionRecord.sourceIdentifier',
          'human_authorization_mismatch',
          'Disposition provenance must identify the authorizing human exactly.',
        ),
      );
    }

    const allDraftPermissions = [
      disposition.permitsDraftReview,
      disposition.permitsDraftQuotation,
      disposition.permitsDraftComparison,
      disposition.permitsDraftRevision,
      disposition
        .permitsNoncanonicalIncorporation,
      disposition
        .permitsHumanMediatedHandoff,
    ];

    if (
      disposition.disposition ===
        'approved_for_draft_use' &&
      !allDraftPermissions.every(
        permission => permission === true,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'humanDispositionRecord',
          'invalid_value',
          'approved_for_draft_use must permit all six bounded noncanonical draft uses.',
        ),
      );
    }

    if (
      disposition.disposition ===
        'revision_required' &&
      (
        disposition.permitsDraftReview !==
          true ||
        disposition.permitsDraftRevision !==
          true ||
        disposition
          .permitsNoncanonicalIncorporation !==
          false ||
        disposition
          .permitsHumanMediatedHandoff !==
          false
      )
    ) {
      issues.push(
        coordinatorIssue(
          'humanDispositionRecord',
          'invalid_value',
          'revision_required must permit review and revision without incorporation or handoff authority.',
        ),
      );
    }

    if (
      disposition.disposition ===
        'rejected' &&
      !allDraftPermissions.every(
        permission => permission === false,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'humanDispositionRecord',
          'invalid_value',
          'A rejected draft may not retain draft-use permissions.',
        ),
      );
    }
  }

  if (
    issues.length > 0 ||
    !dispositionValidation.ok ||
    !authorizationValidation.ok
  ) {
    return {
      ok: false,
      state: null,
      dispositionRecord: null,
      issues,
    };
  }

  const disposition =
    dispositionValidation.value;
  const authorization =
    authorizationValidation.value;
  const roleOutput = state.roleOutputs[0];

  if (roleOutput === undefined) {
    return {
      ok: false,
      state: null,
      dispositionRecord: null,
      issues: [
        coordinatorIssue(
          'coordinator.roleOutputs[0]',
          'missing_value',
          'A materialized role output is required for disposition.',
        ),
      ],
    };
  }

  let nextState: ExecutiveWorkflowState;

  switch (disposition.disposition) {
    case 'approved_for_draft_use':
      nextState = 'approved_for_draft_use';
      break;

    case 'revision_required':
      nextState = 'revision_required';
      break;

    case 'rejected':
      nextState = 'rejected';
      break;

    default:
      return {
        ok: false,
        state: null,
        dispositionRecord: null,
        issues: [
          coordinatorIssue(
            'humanDispositionRecord.disposition',
            'invalid_value',
            'The validated disposition does not map to an allowed human-review workflow state.',
          ),
        ],
      };
  }

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId: 'audit-event-0006',
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: state.envelope.handoffId,
      eventKind:
        nextState === 'revision_required'
          ? 'revision_requested'
          : 'human_disposition_recorded',
      priorState: 'awaiting_human_review',
      nextState,
      roleId: state.envelope.roleId,
      taskClass:
        state.envelope.requestedTaskClass,
      actorKind: 'authorized_human',
      actorIdentifier:
        authorization.humanIdentifier,
      humanAuthorization: authorization,
      recordedAt: disposition.recordedAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        roleOutput.commonOutput
          .evidenceReferences,
      draftReferenceIds: [
        `materialized-draft:${state.envelope.runId}`,
      ],
      disagreementIds:
        roleOutput.materialDisagreements.map(
          disagreement =>
            disagreement.disagreementId,
        ),
      roleAuditExtension:
        buildHumanMediatedRoleAuditExtension(
          roleOutput,
        ),
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      dispositionRecord: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState: nextState,
      currentHumanDisposition:
        disposition.disposition,
      humanDispositionRecords: [
        ...state.humanDispositionRecords,
        disposition,
      ],
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    dispositionRecord: disposition,
    issues: [],
  };
}

export type PrepareHumanMediatedHandoffResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      handoff: HumanMediatedHandoff;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      handoff: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function exactStringArrayMatch(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        value === right[index],
    )
  );
}

export function prepareHumanMediatedHandoff(
  state: InMemoryWorkflowCoordinatorState,
  handoffCandidate: unknown,
): PrepareHumanMediatedHandoffResult {
  const issues: HumanMediatedValidationIssue[] = [];

  const pendingDraftHandoff =
    state.currentState ===
      'awaiting_human_review' &&
    state.currentHumanDisposition ===
      'pending';

  const approvedDraftHandoff =
    state.currentState ===
      'approved_for_draft_use' &&
    state.currentHumanDisposition ===
      'approved_for_draft_use';

  if (
    !pendingDraftHandoff &&
    !approvedDraftHandoff
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Handoff preparation requires a pending human-review draft or an approved-for-draft-use draft.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  const expectedTransitionCount =
    pendingDraftHandoff ? 4 : 5;

  const expectedDispositionRecords =
    pendingDraftHandoff ? 0 : 1;

  if (
    state.modelInvocationCount !== 1 ||
    state.coordinatorTransitionCount !==
      expectedTransitionCount ||
    state.roleOutputs.length !== 1 ||
    state.localExecutionReports.length !== 1 ||
    state.humanDispositionRecords.length !==
      expectedDispositionRecords ||
    state.handoffs.length !== 0 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Handoff preparation requires one untouched eligible source-draft state.',
      ),
    );
  }

  if (
    approvedDraftHandoff &&
    state.humanDispositionRecords[0]
      ?.permitsHumanMediatedHandoff !== true
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.humanDispositionRecords[0].permitsHumanMediatedHandoff',
        'invalid_value',
        'The recorded disposition does not permit a human-mediated handoff.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const output = state.roleOutputs[0];

  if (output === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.roleOutputs[0]',
        'missing_value',
        'A materialized source role output is required.',
      ),
    );
  } else {
    issues.push(
      ...validateStoredRoleOutput(
        output,
        state.envelope,
      ),
    );
  }

  const handoffValidation =
    validateHumanMediatedHandoff(
      handoffCandidate,
    );

  if (!handoffValidation.ok) {
    issues.push(...handoffValidation.issues);
  }

  if (
    output !== undefined &&
    handoffValidation.ok
  ) {
    const handoff = handoffValidation.value;
    const draft =
      handoff.originatingDraftReference;
    const commonOutput = output.commonOutput;
    const expectedDraftReferenceId =
      `materialized-draft:${state.envelope.runId}`;

    if (
      handoff.workflowId !==
        state.workflowId ||
      handoff.parentHandoffId !==
        state.envelope.handoffId ||
      handoff.originatingRunId !==
        state.envelope.runId ||
      handoff.originatingRoleId !==
        state.envelope.roleId
    ) {
      issues.push(
        coordinatorIssue(
          'handoff',
          'invalid_value',
          'Handoff lineage must match the exact source workflow, run, handoff, and role.',
        ),
      );
    }

    if (
      handoff.originatingHumanDisposition !==
        state.currentHumanDisposition ||
      draft.disposition !==
        state.currentHumanDisposition
    ) {
      issues.push(
        coordinatorIssue(
          'handoff.originatingHumanDisposition',
          'invalid_value',
          'Handoff disposition must match the current human disposition exactly.',
        ),
      );
    }

    if (
      draft.draftReferenceId !==
        expectedDraftReferenceId ||
      draft.originatingRunId !==
        state.envelope.runId ||
      draft.originatingRoleId !==
        state.envelope.roleId ||
      draft.taskClass !==
        state.envelope.requestedTaskClass ||
      draft.sourceCommitSha !==
        state.envelope.sourceCommitSha ||
      draft.noncanonical !== true ||
      draft.pendingSubstantiveApproval !==
        pendingDraftHandoff
    ) {
      issues.push(
        coordinatorIssue(
          'handoff.originatingDraftReference',
          'invalid_value',
          'The originating draft reference must identify the exact noncanonical source draft.',
        ),
      );
    }

    if (
      !exactStringArrayMatch(
        draft.evidenceReferences,
        commonOutput.evidenceReferences,
      ) ||
      !exactStringArrayMatch(
        draft.dissent,
        commonOutput.dissent,
      ) ||
      !exactStringArrayMatch(
        draft.unknowns,
        commonOutput.unknowns,
      ) ||
      !exactStringArrayMatch(
        draft.requiredHumanDecisions,
        commonOutput.requiredHumanDecisions,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'handoff.originatingDraftReference',
          'invalid_value',
          'The originating draft reference must preserve exact source evidence, dissent, unknowns, and required human decisions.',
        ),
      );
    }

    if (
      !exactStringArrayMatch(
        handoff.evidenceReferencesTransferred,
        commonOutput.evidenceReferences,
      ) ||
      !exactStringArrayMatch(
        handoff.dissentTransferred,
        commonOutput.dissent,
      ) ||
      !exactStringArrayMatch(
        handoff.unknownsTransferred,
        commonOutput.unknowns,
      ) ||
      !exactStringArrayMatch(
        handoff.requiredHumanDecisionsTransferred,
        commonOutput.requiredHumanDecisions,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'handoff',
          'invalid_value',
          'Transferred evidence, dissent, unknowns, and required decisions must exactly preserve the source draft.',
        ),
      );
    }

    if (
      JSON.stringify(
        handoff.materialDisagreementsTransferred,
      ) !==
      JSON.stringify(
        output.materialDisagreements,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'handoff.materialDisagreementsTransferred',
          'invalid_value',
          'All material disagreements must be preserved exactly.',
        ),
      );
    }
  }

  if (
    issues.length > 0 ||
    !handoffValidation.ok ||
    output === undefined
  ) {
    return {
      ok: false,
      state: null,
      handoff: null,
      issues,
    };
  }

  const handoff = handoffValidation.value;

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId:
        `audit-event-${String(
          state.auditTrail.events.length + 1,
        ).padStart(4, '0')}`,
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: handoff.handoffId,
      eventKind: 'handoff_prepared',
      priorState: state.currentState,
      nextState: 'handoff_prepared',
      roleId: handoff.receivingRoleId,
      taskClass:
        handoff.requestedTaskClassForReceiver,
      actorKind: 'authorized_human',
      actorIdentifier:
        handoff.humanAuthorization
          .humanIdentifier,
      humanAuthorization:
        handoff.humanAuthorization,
      recordedAt: handoff.createdAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        handoff.evidenceReferencesTransferred,
      draftReferenceIds: [
        handoff.originatingDraftReference
          .draftReferenceId,
      ],
      disagreementIds:
        handoff
          .materialDisagreementsTransferred
          .map(
            disagreement =>
              disagreement.disagreementId,
          ),
      roleAuditExtension: null,
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      handoff: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState: 'handoff_prepared',
      handoffs: [
        ...state.handoffs,
        handoff,
      ],
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    handoff,
    issues: [],
  };
}

export type RecordExplicitHandoffAuthorizationResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      handoff: HumanMediatedHandoff;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      handoff: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function exactHumanAuthorizationMatch(
  left: HumanAuthorizationReference,
  right: HumanAuthorizationReference,
): boolean {
  return (
    left.humanClass === right.humanClass &&
    left.humanIdentifier ===
      right.humanIdentifier &&
    left.approvalReference ===
      right.approvalReference &&
    left.scopeKind === right.scopeKind &&
    left.scopeId === right.scopeId &&
    left.roleId === right.roleId &&
    left.taskClass === right.taskClass &&
    left.authorizedAt === right.authorizedAt &&
    left.authorizationVersion ===
      right.authorizationVersion
  );
}

export function recordExplicitHandoffAuthorization(
  state: InMemoryWorkflowCoordinatorState,
  authorizationCandidate: unknown,
): RecordExplicitHandoffAuthorizationResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'handoff_prepared'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Explicit handoff authorization may be recorded only from handoff_prepared.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  const pendingHandoff =
    state.currentHumanDisposition ===
      'pending' &&
    state.humanDispositionRecords.length === 0;

  const approvedHandoff =
    state.currentHumanDisposition ===
      'approved_for_draft_use' &&
    state.humanDispositionRecords.length === 1;

  const expectedTransitionCount =
    pendingHandoff
      ? 5
      : approvedHandoff
        ? 6
        : -1;

  if (
    expectedTransitionCount < 0 ||
    state.modelInvocationCount !== 1 ||
    state.coordinatorTransitionCount !==
      expectedTransitionCount ||
    state.roleOutputs.length !== 1 ||
    state.localExecutionReports.length !== 1 ||
    state.handoffs.length !== 1 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Explicit handoff authorization requires one untouched prepared handoff state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const handoff = state.handoffs[0];

  if (handoff === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.handoffs[0]',
        'missing_value',
        'One prepared handoff is required.',
      ),
    );
  } else {
    const handoffValidation =
      validateHumanMediatedHandoff(handoff);

    if (!handoffValidation.ok) {
      issues.push(...handoffValidation.issues);
    }

    if (
      handoff.workflowId !==
        state.workflowId ||
      handoff.originatingRunId !==
        state.envelope.runId ||
      handoff.originatingRoleId !==
        state.envelope.roleId ||
      handoff.originatingHumanDisposition !==
        state.currentHumanDisposition ||
      handoff.receivingRoleSeparatelyInitiated !==
        false ||
      handoff.roleDispatchPerformed !== false ||
      handoff.automaticContinuation !== false
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.handoffs[0]',
          'invalid_value',
          'Prepared handoff lineage and nonexecution boundaries must remain unchanged.',
        ),
      );
    }
  }

  const authorizationValidation =
    validateHumanAuthorizationReference(
      authorizationCandidate,
    );

  if (!authorizationValidation.ok) {
    issues.push(
      ...authorizationValidation.issues,
    );
  } else if (handoff !== undefined) {
    const authorization =
      authorizationValidation.value;

    if (
      authorization.scopeKind !==
        'handoff' ||
      authorization.scopeId !==
        handoff.handoffId ||
      authorization.roleId !==
        handoff.receivingRoleId ||
      authorization.taskClass !==
        handoff.requestedTaskClassForReceiver
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Authorization must match the exact prepared handoff, receiving role, and receiving task.',
        ),
      );
    }

    if (
      !exactHumanAuthorizationMatch(
        authorization,
        handoff.humanAuthorization,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Explicit authorization must match the prepared handoff authorization provenance exactly.',
        ),
      );
    }
  }

  if (
    issues.length > 0 ||
    handoff === undefined ||
    !authorizationValidation.ok
  ) {
    return {
      ok: false,
      state: null,
      handoff: null,
      issues,
    };
  }

  const authorization =
    authorizationValidation.value;

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId:
        `audit-event-${String(
          state.auditTrail.events.length + 1,
        ).padStart(4, '0')}`,
      workflowId: state.workflowId,
      runId: state.envelope.runId,
      handoffId: handoff.handoffId,
      eventKind:
        'handoff_human_authorized',
      priorState: 'handoff_prepared',
      nextState:
        'handoff_explicitly_authorized',
      roleId: handoff.receivingRoleId,
      taskClass:
        handoff.requestedTaskClassForReceiver,
      actorKind: 'authorized_human',
      actorIdentifier:
        authorization.humanIdentifier,
      humanAuthorization: authorization,
      recordedAt: authorization.authorizedAt,
      sourceCommitSha:
        state.envelope.sourceCommitSha,
      evidenceReferences:
        handoff.evidenceReferencesTransferred,
      draftReferenceIds: [
        handoff.originatingDraftReference
          .draftReferenceId,
      ],
      disagreementIds:
        handoff
          .materialDisagreementsTransferred
          .map(
            disagreement =>
              disagreement.disagreementId,
          ),
      roleAuditExtension: null,
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      handoff: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState:
        'handoff_explicitly_authorized',
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    handoff,
    issues: [],
  };
}

export type RecordReceivingRoleRunAuthorizationResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      receivingEnvelope:
        ExecutiveWorkflowEnvelope;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      receivingEnvelope: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

export function recordReceivingRoleRunAuthorization(
  state: InMemoryWorkflowCoordinatorState,
  receivingEnvelopeCandidate: unknown,
): RecordReceivingRoleRunAuthorizationResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'handoff_explicitly_authorized'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Receiving-role authorization may be recorded only from handoff_explicitly_authorized.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  const pendingHandoff =
    state.currentHumanDisposition ===
      'pending' &&
    state.humanDispositionRecords.length === 0;

  const approvedHandoff =
    state.currentHumanDisposition ===
      'approved_for_draft_use' &&
    state.humanDispositionRecords.length === 1;

  const expectedTransitionCount =
    pendingHandoff
      ? 6
      : approvedHandoff
        ? 7
        : -1;

  if (
    expectedTransitionCount < 0 ||
    state.modelInvocationCount !== 1 ||
    state.coordinatorTransitionCount !==
      expectedTransitionCount ||
    state.receivingEnvelope !== null ||
    state.roleOutputs.length !== 1 ||
    state.localExecutionReports.length !== 1 ||
    state.handoffs.length !== 1 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Receiving-role authorization requires one untouched explicitly authorized handoff state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const handoff = state.handoffs[0];

  if (handoff === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.handoffs[0]',
        'missing_value',
        'One explicitly authorized handoff is required.',
      ),
    );
  } else {
    const handoffValidation =
      validateHumanMediatedHandoff(handoff);

    if (!handoffValidation.ok) {
      issues.push(...handoffValidation.issues);
    }

    if (
      handoff.workflowId !==
        state.workflowId ||
      handoff.originatingRunId !==
        state.envelope.runId ||
      handoff.originatingRoleId !==
        state.envelope.roleId ||
      handoff.originatingHumanDisposition !==
        state.currentHumanDisposition ||
      handoff.receivingRoleSeparatelyInitiated !==
        false ||
      handoff.roleDispatchPerformed !== false ||
      handoff.automaticContinuation !== false
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.handoffs[0]',
          'invalid_value',
          'Authorized handoff lineage and nonexecution boundaries must remain unchanged.',
        ),
      );
    }
  }

  const receivingEnvelopeValidation =
    validateExecutiveWorkflowEnvelope(
      receivingEnvelopeCandidate,
    );

  if (!receivingEnvelopeValidation.ok) {
    issues.push(
      ...receivingEnvelopeValidation.issues,
    );
  }

  if (
    handoff !== undefined &&
    receivingEnvelopeValidation.ok
  ) {
    const receivingEnvelope =
      receivingEnvelopeValidation.value;

    if (
      receivingEnvelope.workflowId !==
        state.workflowId ||
      receivingEnvelope.runId ===
        state.envelope.runId ||
      receivingEnvelope.handoffId !==
        handoff.handoffId ||
      receivingEnvelope.parentHandoffId !==
        handoff.parentHandoffId ||
      receivingEnvelope.roleId !==
        handoff.receivingRoleId ||
      receivingEnvelope.requestedTaskClass !==
        handoff.requestedTaskClassForReceiver ||
      receivingEnvelope.sourceCommitSha !==
        state.envelope.sourceCommitSha
    ) {
      issues.push(
        coordinatorIssue(
          'receivingEnvelope',
          'invalid_value',
          'Receiving envelope must identify a distinct run with the exact workflow, handoff, role, task, parent, and source lineage.',
        ),
      );
    }

    if (
      receivingEnvelope.currentHumanDisposition !==
        'pending' ||
      receivingEnvelope.supersedesHandoffId !==
        null
    ) {
      issues.push(
        coordinatorIssue(
          'receivingEnvelope.currentHumanDisposition',
          'invalid_value',
          'A fresh receiving-role run must begin pending and may not supersede another handoff.',
        ),
      );
    }

    if (
      receivingEnvelope.humanAuthorization
        .approvalReference ===
      handoff.humanAuthorization
        .approvalReference
    ) {
      issues.push(
        coordinatorIssue(
          'receivingEnvelope.humanAuthorization.approvalReference',
          'human_authorization_mismatch',
          'Receiving-role initiation requires an independent run authorization reference.',
        ),
      );
    }

    if (
      receivingEnvelope
        .priorRoleDraftReferences.length !==
        1 ||
      JSON.stringify(
        receivingEnvelope
          .priorRoleDraftReferences[0],
      ) !==
        JSON.stringify(
          handoff.originatingDraftReference,
        )
    ) {
      issues.push(
        coordinatorIssue(
          'receivingEnvelope.priorRoleDraftReferences',
          'invalid_value',
          'Receiving-role initiation must preserve the exact originating draft reference.',
        ),
      );
    }

    const receivingEvidenceIds =
      receivingEnvelope.evidenceItems.map(
        evidence => evidence.evidenceId,
      );

    if (
      !exactStringArrayMatch(
        receivingEvidenceIds,
        handoff.evidenceReferencesTransferred,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'receivingEnvelope.evidenceItems',
          'invalid_value',
          'Receiving-role evidence must exactly match the transferred evidence references.',
        ),
      );
    }

    if (
      receivingEnvelope.humanInstructions !==
        handoff.humanSummaryOrInstruction
    ) {
      issues.push(
        coordinatorIssue(
          'receivingEnvelope.humanInstructions',
          'invalid_value',
          'Receiving-role instructions must preserve the exact human handoff instruction.',
        ),
      );
    }
  }

  if (
    issues.length > 0 ||
    handoff === undefined ||
    !receivingEnvelopeValidation.ok
  ) {
    return {
      ok: false,
      state: null,
      receivingEnvelope: null,
      issues,
    };
  }

  const receivingEnvelope =
    receivingEnvelopeValidation.value;

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId:
        `audit-event-${String(
          state.auditTrail.events.length + 1,
        ).padStart(4, '0')}`,
      workflowId: state.workflowId,
      runId: receivingEnvelope.runId,
      handoffId: handoff.handoffId,
      eventKind:
        'receiving_role_run_human_authorized',
      priorState:
        'handoff_explicitly_authorized',
      nextState:
        'receiving_role_run_authorized',
      roleId: receivingEnvelope.roleId,
      taskClass:
        receivingEnvelope.requestedTaskClass,
      actorKind: 'authorized_human',
      actorIdentifier:
        receivingEnvelope.humanAuthorization
          .humanIdentifier,
      humanAuthorization:
        receivingEnvelope.humanAuthorization,
      recordedAt:
        receivingEnvelope.humanAuthorization
          .authorizedAt,
      sourceCommitSha:
        receivingEnvelope.sourceCommitSha,
      evidenceReferences:
        handoff.evidenceReferencesTransferred,
      draftReferenceIds: [
        handoff.originatingDraftReference
          .draftReferenceId,
      ],
      disagreementIds:
        handoff
          .materialDisagreementsTransferred
          .map(
            disagreement =>
              disagreement.disagreementId,
          ),
      roleAuditExtension: null,
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      receivingEnvelope: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState:
        'receiving_role_run_authorized',
      receivingEnvelope,
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    receivingEnvelope,
    issues: [],
  };
}

export type ReceivingRoleExecutionResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      report: LocalSingleRoleExecutionReport;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      report:
        LocalSingleRoleExecutionReport | null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

export async function executeReceivingRoleDraft(
  state: InMemoryWorkflowCoordinatorState,
  options: LocalSingleRoleExecutionOptions,
): Promise<ReceivingRoleExecutionResult> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'receiving_role_run_authorized'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Receiving-role execution may begin only from receiving_role_run_authorized.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  const receivingEnvelope =
    state.receivingEnvelope;

  if (receivingEnvelope === null) {
    issues.push(
      coordinatorIssue(
        'coordinator.receivingEnvelope',
        'missing_value',
        'A separately authorized receiving envelope is required.',
      ),
    );
  } else {
    const receivingValidation =
      validateExecutiveWorkflowEnvelope(
        receivingEnvelope,
      );

    if (!receivingValidation.ok) {
      issues.push(
        ...receivingValidation.issues,
      );
    }
  }

  const pendingHandoff =
    state.currentHumanDisposition ===
      'pending' &&
    state.humanDispositionRecords.length === 0;

  const approvedHandoff =
    state.currentHumanDisposition ===
      'approved_for_draft_use' &&
    state.humanDispositionRecords.length === 1;

  const expectedTransitionCount =
    pendingHandoff
      ? 7
      : approvedHandoff
        ? 8
        : -1;

  if (
    expectedTransitionCount < 0 ||
    state.modelInvocationCount !== 1 ||
    state.coordinatorTransitionCount !==
      expectedTransitionCount ||
    state.roleOutputs.length !== 1 ||
    state.localExecutionReports.length !== 1 ||
    state.handoffs.length !== 1 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Receiving-role execution requires one untouched separately authorized receiving-run state.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const sourceOutput = state.roleOutputs[0];

  if (sourceOutput === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.roleOutputs[0]',
        'missing_value',
        'The originating role output is required.',
      ),
    );
  } else {
    issues.push(
      ...validateStoredRoleOutput(
        sourceOutput,
        state.envelope,
      ),
    );
  }

  const handoff = state.handoffs[0];

  if (handoff === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.handoffs[0]',
        'missing_value',
        'The authorized handoff is required.',
      ),
    );
  } else {
    const handoffValidation =
      validateHumanMediatedHandoff(handoff);

    if (!handoffValidation.ok) {
      issues.push(...handoffValidation.issues);
    }

    if (
      receivingEnvelope !== null &&
      (
        handoff.workflowId !==
          state.workflowId ||
        handoff.handoffId !==
          receivingEnvelope.handoffId ||
        handoff.receivingRoleId !==
          receivingEnvelope.roleId ||
        handoff.requestedTaskClassForReceiver !==
          receivingEnvelope
            .requestedTaskClass ||
        receivingEnvelope
          .priorRoleDraftReferences.length !==
          1 ||
        JSON.stringify(
          receivingEnvelope
            .priorRoleDraftReferences[0],
        ) !==
          JSON.stringify(
            handoff.originatingDraftReference,
          )
      )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.receivingEnvelope',
          'invalid_value',
          'Receiving execution must preserve the exact authorized handoff and source-draft lineage.',
        ),
      );
    }

    if (
      sourceOutput !== undefined &&
      JSON.stringify(
        handoff.materialDisagreementsTransferred,
      ) !==
        JSON.stringify(
          sourceOutput.materialDisagreements,
        )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.handoffs[0].materialDisagreementsTransferred',
          'invalid_value',
          'The authorized handoff must continue to preserve all originating material disagreements.',
        ),
      );
    }
  }

  if (
    receivingEnvelope !== null &&
    !localExecutionMatchesEnvelope(
      options,
      receivingEnvelope,
    )
  ) {
    issues.push(
      coordinatorIssue(
        'localExecutionOptions',
        'invalid_value',
        'Injected receiving-role options must match the independently authorized receiving envelope exactly.',
      ),
    );
  }

  if (
    receivingEnvelope !== null &&
    handoff !== undefined
  ) {
    const caseEvidenceIds =
      options.evaluationCase.evidence.map(
        evidence => evidence.id,
      );

    if (
      options.evaluationCase.humanRequest !==
        receivingEnvelope
          .humanInstructions ||
      !exactStringArrayMatch(
        caseEvidenceIds,
        handoff.evidenceReferencesTransferred,
      ) ||
      !exactStringArrayMatch(
        options.evaluationCase
          .expectedBehavior
          .requiredEvidenceReferenceIds,
        handoff.evidenceReferencesTransferred,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'localExecutionOptions.evaluationCase',
          'invalid_value',
          'The receiving evaluation case must preserve the exact human instruction and transferred evidence.',
        ),
      );
    }
  }

  if (
    issues.length > 0 ||
    receivingEnvelope === null ||
    handoff === undefined
  ) {
    return {
      ok: false,
      state: null,
      report: null,
      issues,
    };
  }

  let report: LocalSingleRoleExecutionReport;

  try {
    report = await executeLocalSingleRole(
      options,
    );
  } catch (error) {
    return {
      ok: false,
      state: null,
      report: null,
      issues: [
        coordinatorIssue(
          'localExecution',
          'invalid_value',
          error instanceof Error
            ? `Injected receiving-role execution failed: ${error.message}`
            : 'Injected receiving-role execution failed.',
        ),
      ],
    };
  }

  if (
    !localReportPreservesBoundaries(
      report,
      receivingEnvelope,
    )
  ) {
    return {
      ok: false,
      state: null,
      report,
      issues: [
        coordinatorIssue(
          'localExecutionReport',
          'invalid_value',
          'Injected receiving-role report violated a workflow boundary.',
        ),
      ],
    };
  }

  if (
    report.draftForHumanReview === null
  ) {
    return {
      ok: false,
      state: null,
      report,
      issues: [
        coordinatorIssue(
          'localExecutionReport.draftForHumanReview',
          'missing_value',
          'Receiving-role execution did not return a valid bounded draft for human review.',
        ),
      ],
    };
  }

  const materialized =
    materializeHumanMediatedRoleOutput(
      receivingEnvelope,
      report.draftForHumanReview,
    );

  if (!materialized.ok) {
    return {
      ok: false,
      state: null,
      report,
      issues: materialized.issues,
    };
  }

  const receivingOutput =
    materialized.output;

  if (
    !exactStringArrayMatch(
      receivingOutput.commonOutput
        .evidenceReferences,
      handoff.evidenceReferencesTransferred,
    )
  ) {
    return {
      ok: false,
      state: null,
      report,
      issues: [
        coordinatorIssue(
          'receivingRoleOutput.commonOutput.evidenceReferences',
          'invalid_value',
          'The receiving-role draft must preserve all transferred evidence references exactly.',
        ),
      ],
    };
  }

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId:
        `audit-event-${String(
          state.auditTrail.events.length + 1,
        ).padStart(4, '0')}`,
      workflowId: state.workflowId,
      runId: receivingEnvelope.runId,
      handoffId: handoff.handoffId,
      eventKind:
        'receiving_role_run_completed',
      priorState:
        'receiving_role_run_authorized',
      nextState:
        'receiving_role_draft_completed',
      roleId: receivingEnvelope.roleId,
      taskClass:
        receivingEnvelope.requestedTaskClass,
      actorKind:
        'local_in_memory_coordinator',
      actorIdentifier:
        'human-mediated-workflow-coordinator',
      humanAuthorization: null,
      recordedAt:
        report.modelRun.completedAt,
      sourceCommitSha:
        receivingEnvelope.sourceCommitSha,
      evidenceReferences:
        report.finalAudit.evidenceReferences,
      draftReferenceIds: [
        `materialized-draft:${receivingEnvelope.runId}`,
      ],
      disagreementIds:
        receivingOutput.materialDisagreements.map(
          disagreement =>
            disagreement.disagreementId,
        ),
      roleAuditExtension:
        buildHumanMediatedRoleAuditExtension(
          receivingOutput,
        ),
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      report,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState:
        'receiving_role_draft_completed',
      roleOutputs: [
        ...state.roleOutputs,
        receivingOutput,
      ],
      localExecutionReports: [
        ...state.localExecutionReports,
        report,
      ],
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount:
        state.modelInvocationCount + 1,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    report,
    issues: [],
  };
}

export type PresentReceivingRoleOutputForFinalHumanDispositionResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

export function presentReceivingRoleOutputForFinalHumanDisposition(
  state: InMemoryWorkflowCoordinatorState,
): PresentReceivingRoleOutputForFinalHumanDispositionResult {
  const issues: HumanMediatedValidationIssue[] = [];

  if (
    state.currentState !==
    'receiving_role_draft_completed'
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Final presentation may occur only from receiving_role_draft_completed.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  const receivingEnvelope =
    state.receivingEnvelope;

  if (receivingEnvelope === null) {
    issues.push(
      coordinatorIssue(
        'coordinator.receivingEnvelope',
        'missing_value',
        'A receiving envelope is required for final presentation.',
      ),
    );
  } else {
    const receivingValidation =
      validateExecutiveWorkflowEnvelope(
        receivingEnvelope,
      );

    if (!receivingValidation.ok) {
      issues.push(
        ...receivingValidation.issues,
      );
    }
  }

  const pendingHandoff =
    state.currentHumanDisposition ===
      'pending' &&
    state.humanDispositionRecords.length === 0;

  const approvedHandoff =
    state.currentHumanDisposition ===
      'approved_for_draft_use' &&
    state.humanDispositionRecords.length === 1;

  const expectedTransitionCount =
    pendingHandoff
      ? 8
      : approvedHandoff
        ? 9
        : -1;

  if (
    expectedTransitionCount < 0 ||
    state.modelInvocationCount !== 2 ||
    state.coordinatorTransitionCount !==
      expectedTransitionCount ||
    state.roleOutputs.length !== 2 ||
    state.localExecutionReports.length !== 2 ||
    state.handoffs.length !== 1 ||
    state.closureRecord !== null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Final presentation requires one untouched completed two-role workflow.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  const originatingOutput =
    state.roleOutputs[0];
  const receivingOutput =
    state.roleOutputs[1];
  const originatingReport =
    state.localExecutionReports[0];
  const receivingReport =
    state.localExecutionReports[1];
  const handoff = state.handoffs[0];

  if (originatingOutput === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.roleOutputs[0]',
        'missing_value',
        'The originating role output is required.',
      ),
    );
  } else {
    issues.push(
      ...validateStoredRoleOutput(
        originatingOutput,
        state.envelope,
      ),
    );
  }

  if (
    receivingOutput === undefined ||
    receivingEnvelope === null
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.roleOutputs[1]',
        'missing_value',
        'The receiving role output is required.',
      ),
    );
  } else {
    issues.push(
      ...validateStoredRoleOutput(
        receivingOutput,
        receivingEnvelope,
      ),
    );
  }

  if (
    originatingReport === undefined ||
    !localReportPreservesBoundaries(
      originatingReport,
      state.envelope,
    )
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.localExecutionReports[0]',
        'invalid_value',
        'The originating execution report is missing or invalid.',
      ),
    );
  }

  if (
    receivingReport === undefined ||
    receivingEnvelope === null ||
    !localReportPreservesBoundaries(
      receivingReport,
      receivingEnvelope,
    )
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.localExecutionReports[1]',
        'invalid_value',
        'The receiving execution report is missing or invalid.',
      ),
    );
  }

  if (handoff === undefined) {
    issues.push(
      coordinatorIssue(
        'coordinator.handoffs[0]',
        'missing_value',
        'The authorized handoff is required.',
      ),
    );
  } else {
    const handoffValidation =
      validateHumanMediatedHandoff(handoff);

    if (!handoffValidation.ok) {
      issues.push(...handoffValidation.issues);
    }

    if (
      receivingEnvelope !== null &&
      (
        handoff.workflowId !==
          state.workflowId ||
        handoff.handoffId !==
          receivingEnvelope.handoffId ||
        handoff.receivingRoleId !==
          receivingEnvelope.roleId ||
        handoff.requestedTaskClassForReceiver !==
          receivingEnvelope
            .requestedTaskClass
      )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.handoffs[0]',
          'invalid_value',
          'The final presentation must preserve the authorized receiving-role lineage.',
        ),
      );
    }

    if (
      receivingOutput !== undefined &&
      !exactStringArrayMatch(
        receivingOutput.commonOutput
          .evidenceReferences,
        handoff.evidenceReferencesTransferred,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.roleOutputs[1].commonOutput.evidenceReferences',
          'invalid_value',
          'The receiving output must preserve all transferred evidence references.',
        ),
      );
    }
  }

  if (
    receivingEnvelope !== null &&
    receivingReport !== undefined &&
    receivingReport.modelRun.runId !==
      receivingEnvelope.runId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.localExecutionReports[1].modelRun.runId',
        'invalid_value',
        'The receiving report run must match the receiving envelope.',
      ),
    );
  }

  if (
    issues.length > 0 ||
    receivingEnvelope === null ||
    receivingOutput === undefined ||
    receivingReport === undefined ||
    handoff === undefined
  ) {
    return {
      ok: false,
      state: null,
      issues,
    };
  }

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId:
        `audit-event-${String(
          state.auditTrail.events.length + 1,
        ).padStart(4, '0')}`,
      workflowId: state.workflowId,
      runId: receivingEnvelope.runId,
      handoffId: handoff.handoffId,
      eventKind:
        'role_output_presented_for_review',
      priorState:
        'receiving_role_draft_completed',
      nextState:
        'final_human_disposition_pending',
      roleId: receivingEnvelope.roleId,
      taskClass:
        receivingEnvelope.requestedTaskClass,
      actorKind:
        'local_in_memory_coordinator',
      actorIdentifier:
        'human-mediated-workflow-coordinator',
      humanAuthorization: null,
      recordedAt:
        receivingReport.modelRun.completedAt,
      sourceCommitSha:
        receivingEnvelope.sourceCommitSha,
      evidenceReferences:
        receivingOutput.commonOutput
          .evidenceReferences,
      draftReferenceIds: [
        `materialized-draft:${receivingEnvelope.runId}`,
      ],
      disagreementIds:
        receivingOutput.materialDisagreements.map(
          disagreement =>
            disagreement.disagreementId,
        ),
      roleAuditExtension:
        buildHumanMediatedRoleAuditExtension(
          receivingOutput,
        ),
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState:
        'final_human_disposition_pending',
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount: 2,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    issues: [],
  };
}

export type RecordAdministrativeWorkflowClosureResult =
  | {
      ok: true;
      state: InMemoryWorkflowCoordinatorState;
      closureRecord: WorkflowClosureRecord;
      issues: readonly [];
    }
  | {
      ok: false;
      state: null;
      closureRecord: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

export function recordAdministrativeWorkflowClosure(
  state: InMemoryWorkflowCoordinatorState,
  closureCandidate: unknown,
  authorizationCandidate: unknown,
): RecordAdministrativeWorkflowClosureResult {
  const issues: HumanMediatedValidationIssue[] = [];

  const finalPath =
    state.currentState ===
      'final_human_disposition_pending';
  const rejectedPath =
    state.currentState === 'rejected';

  if (!finalPath && !rejectedPath) {
    issues.push(
      coordinatorIssue(
        'coordinator.currentState',
        'invalid_value',
        'Administrative closure may occur only from final_human_disposition_pending or rejected.',
      ),
    );
  }

  if (
    state.workflowId !==
      state.envelope.workflowId ||
    state.auditTrail.workflowId !==
      state.workflowId
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator.workflowId',
        'invalid_value',
        'Coordinator workflow lineage is inconsistent.',
      ),
    );
  }

  if (state.closureRecord !== null) {
    issues.push(
      coordinatorIssue(
        'coordinator.closureRecord',
        'invalid_value',
        'The workflow already contains a closure record.',
      ),
    );
  }

  if (
    state.automaticContinuation !== false ||
    state.autonomousDispatchPerformed !== false ||
    state.toolExecutionPerformed !== false ||
    state.persistencePerformed !== false ||
    state.externalCommunicationPerformed !== false ||
    state.previewActivationPerformed !== false ||
    state.productionActionPerformed !== false
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'A state-changing or activating boundary marker was detected.',
      ),
    );
  }

  const auditValidation =
    validateInMemoryWorkflowAuditTrail(
      state.auditTrail,
    );

  if (!auditValidation.ok) {
    issues.push(...auditValidation.issues);
  }

  if (finalPath) {
    const approvedFinalPath =
      state.currentHumanDisposition ===
        'approved_for_draft_use' &&
      state.humanDispositionRecords.length ===
        1 &&
      state.coordinatorTransitionCount ===
        10;

    const pendingFinalPath =
      state.currentHumanDisposition ===
        'pending' &&
      state.humanDispositionRecords.length ===
        0 &&
      state.coordinatorTransitionCount ===
        9;

    if (
      (
        !approvedFinalPath &&
        !pendingFinalPath
      ) ||
      state.modelInvocationCount !== 2 ||
      state.receivingEnvelope === null ||
      state.roleOutputs.length !== 2 ||
      state.localExecutionReports.length !==
        2 ||
      state.handoffs.length !== 1
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator',
          'invalid_value',
          'Final-chain closure requires one untouched presented two-role workflow.',
        ),
      );
    }
  }

  if (
    rejectedPath &&
    (
      state.currentHumanDisposition !==
        'rejected' ||
      state.humanDispositionRecords.length !==
        1 ||
      state.coordinatorTransitionCount !== 5 ||
      state.modelInvocationCount !== 1 ||
      state.receivingEnvelope !== null ||
      state.roleOutputs.length !== 1 ||
      state.localExecutionReports.length !==
        1 ||
      state.handoffs.length !== 0
    )
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'invalid_value',
        'Rejected-chain closure requires one untouched explicitly rejected workflow.',
      ),
    );
  }

  const activeEnvelope =
    finalPath
      ? state.receivingEnvelope
      : state.envelope;

  const activeOutput =
    finalPath
      ? state.roleOutputs[1]
      : state.roleOutputs[0];

  const activeReport =
    finalPath
      ? state.localExecutionReports[1]
      : state.localExecutionReports[0];

  if (activeEnvelope === null) {
    issues.push(
      coordinatorIssue(
        'coordinator.receivingEnvelope',
        'missing_value',
        'The active closure envelope is required.',
      ),
    );
  } else {
    const envelopeValidation =
      validateExecutiveWorkflowEnvelope(
        activeEnvelope,
      );

    if (!envelopeValidation.ok) {
      issues.push(
        ...envelopeValidation.issues,
      );
    }
  }

  state.roleOutputs.forEach(
    (output, index) => {
      const outputEnvelope =
        index === 0
          ? state.envelope
          : state.receivingEnvelope;

      if (outputEnvelope === null) {
        issues.push(
          coordinatorIssue(
            `coordinator.roleOutputs[${index}]`,
            'invalid_value',
            'A stored role output has no matching workflow envelope.',
          ),
        );
        return;
      }

      issues.push(
        ...validateStoredRoleOutput(
          output,
          outputEnvelope,
        ),
      );
    },
  );

  state.localExecutionReports.forEach(
    (report, index) => {
      const reportEnvelope =
        index === 0
          ? state.envelope
          : state.receivingEnvelope;

      if (
        reportEnvelope === null ||
        !localReportPreservesBoundaries(
          report,
          reportEnvelope,
        )
      ) {
        issues.push(
          coordinatorIssue(
            `coordinator.localExecutionReports[${index}]`,
            'invalid_value',
            'A stored execution report is missing or violates a workflow boundary.',
          ),
        );
      }
    },
  );

  if (
    activeOutput === undefined ||
    activeReport === undefined
  ) {
    issues.push(
      coordinatorIssue(
        'coordinator',
        'missing_value',
        'The active role output and execution report are required for closure.',
      ),
    );
  }

  if (finalPath) {
    const handoff = state.handoffs[0];

    if (
      handoff === undefined ||
      state.receivingEnvelope === null
    ) {
      issues.push(
        coordinatorIssue(
          'coordinator.handoffs[0]',
          'missing_value',
          'The authorized handoff is required for final-chain closure.',
        ),
      );
    } else {
      const handoffValidation =
        validateHumanMediatedHandoff(handoff);

      if (!handoffValidation.ok) {
        issues.push(
          ...handoffValidation.issues,
        );
      }

      if (
        handoff.workflowId !==
          state.workflowId ||
        handoff.handoffId !==
          state.receivingEnvelope.handoffId ||
        handoff.receivingRoleId !==
          state.receivingEnvelope.roleId ||
        handoff.requestedTaskClassForReceiver !==
          state.receivingEnvelope
            .requestedTaskClass
      ) {
        issues.push(
          coordinatorIssue(
            'coordinator.handoffs[0]',
            'invalid_value',
            'Final-chain closure must preserve the exact authorized handoff lineage.',
          ),
        );
      }
    }
  }

  const closureValidation =
    validateWorkflowClosureRecord(
      closureCandidate,
    );

  if (!closureValidation.ok) {
    issues.push(
      ...closureValidation.issues,
    );
  }

  const authorizationValidation =
    validateHumanAuthorizationReference(
      authorizationCandidate,
    );

  if (!authorizationValidation.ok) {
    issues.push(
      ...authorizationValidation.issues,
    );
  }

  const unresolvedDisagreementIds = [
    ...new Set(
      state.roleOutputs.flatMap(
        output =>
          output.materialDisagreements.map(
            disagreement =>
              disagreement.disagreementId,
          ),
      ),
    ),
  ];

  if (
    closureValidation.ok &&
    authorizationValidation.ok &&
    activeEnvelope !== null
  ) {
    const closure =
      closureValidation.value;
    const authorization =
      authorizationValidation.value;

    if (
      closure.workflowId !==
        state.workflowId
    ) {
      issues.push(
        coordinatorIssue(
          'workflowClosureRecord.workflowId',
          'invalid_value',
          'Closure must belong to the exact workflow.',
        ),
      );
    }

    if (
      closure.closedBy !==
        authorization.humanClass ||
      closure.closedByIdentifier !==
        authorization.humanIdentifier
    ) {
      issues.push(
        coordinatorIssue(
          'workflowClosureRecord.closedByIdentifier',
          'human_authorization_mismatch',
          'Closure provenance must identify the authorizing human exactly.',
        ),
      );
    }

    if (
      closure.closedAt !==
        authorization.authorizedAt
    ) {
      issues.push(
        coordinatorIssue(
          'workflowClosureRecord.closedAt',
          'human_authorization_mismatch',
          'Closure time must match the explicit closure authorization time.',
        ),
      );
    }

    if (
      authorization.scopeKind !== 'run' ||
      authorization.scopeId !==
        activeEnvelope.runId ||
      authorization.roleId !==
        activeEnvelope.roleId ||
      authorization.taskClass !==
        activeEnvelope.requestedTaskClass
    ) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization',
          'human_authorization_mismatch',
          'Closure authorization must match the active run, role, and task exactly.',
        ),
      );
    }

    const priorApprovalReferenceUsed =
      state.auditTrail.events.some(
        event =>
          event.humanAuthorization
            ?.approvalReference ===
          authorization.approvalReference,
      );

    if (priorApprovalReferenceUsed) {
      issues.push(
        coordinatorIssue(
          'humanAuthorization.approvalReference',
          'human_authorization_mismatch',
          'Administrative closure requires a fresh human approval reference.',
        ),
      );
    }

    const authorizedEnvelopeValidation =
      validateExecutiveWorkflowEnvelope({
        ...activeEnvelope,
        humanAuthorization: authorization,
      });

    if (
      !authorizedEnvelopeValidation.ok
    ) {
      issues.push(
        ...authorizedEnvelopeValidation.issues,
      );
    }

    if (
      !exactStringArrayMatch(
        closure.unresolvedDisagreementIds,
        unresolvedDisagreementIds,
      )
    ) {
      issues.push(
        coordinatorIssue(
          'workflowClosureRecord.unresolvedDisagreementIds',
          'invalid_value',
          'Administrative closure must preserve the exact unresolved disagreement identifiers.',
        ),
      );
    }
  }

  if (
    issues.length > 0 ||
    !closureValidation.ok ||
    !authorizationValidation.ok ||
    activeEnvelope === null ||
    activeOutput === undefined ||
    activeReport === undefined
  ) {
    return {
      ok: false,
      state: null,
      closureRecord: null,
      issues,
    };
  }

  const closure =
    closureValidation.value;
  const authorization =
    authorizationValidation.value;

  const evidenceReferences = [
    ...new Set(
      state.roleOutputs.flatMap(
        output =>
          output.commonOutput
            .evidenceReferences,
      ),
    ),
  ];

  const draftReferenceIds =
    state.roleOutputs.map(
      output =>
        `materialized-draft:${output.runId}`,
    );

  const event:
    ExecutiveWorkflowAuditEvent = {
      auditVersion:
        'executive-human-mediated-audit-event-v1',
      auditEventId:
        `audit-event-${String(
          state.auditTrail.events.length + 1,
        ).padStart(4, '0')}`,
      workflowId: state.workflowId,
      runId: activeEnvelope.runId,
      handoffId:
        activeEnvelope.handoffId,
      eventKind:
        'workflow_administratively_closed',
      priorState: state.currentState,
      nextState: 'workflow_closed',
      roleId: activeEnvelope.roleId,
      taskClass:
        activeEnvelope.requestedTaskClass,
      actorKind: 'authorized_human',
      actorIdentifier:
        authorization.humanIdentifier,
      humanAuthorization: authorization,
      recordedAt: closure.closedAt,
      sourceCommitSha:
        activeEnvelope.sourceCommitSha,
      evidenceReferences,
      draftReferenceIds,
      disagreementIds:
        closure.unresolvedDisagreementIds,
      roleAuditExtension:
        buildHumanMediatedRoleAuditExtension(
          activeOutput,
        ),
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
    };

  const nextAuditTrail:
    InMemoryWorkflowAuditTrail = {
      ...state.auditTrail,
      events: [
        ...state.auditTrail.events,
        event,
      ],
    };

  const nextAuditValidation =
    validateInMemoryWorkflowAuditTrail(
      nextAuditTrail,
    );

  if (!nextAuditValidation.ok) {
    return {
      ok: false,
      state: null,
      closureRecord: null,
      issues: nextAuditValidation.issues,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentState: 'workflow_closed',
      closureRecord: closure,
      auditTrail: nextAuditValidation.value,
      humanActionPending: true,
      modelInvocationCount:
        state.modelInvocationCount,
      coordinatorTransitionCount:
        state.coordinatorTransitionCount + 1,
      automaticContinuation: false,
      autonomousDispatchPerformed: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      externalCommunicationPerformed: false,
      previewActivationPerformed: false,
      productionActionPerformed: false,
    },
    closureRecord: closure,
    issues: [],
  };
}

export type MaterializeHumanMediatedRoleOutputResult =
  | {
      ok: true;
      output: AnyHumanMediatedRoleOutput;
      issues: readonly [];
    }
  | {
      ok: false;
      output: null;
      issues:
        readonly HumanMediatedValidationIssue[];
    };

function materializedEscalationPacket(
  envelope: ExecutiveWorkflowEnvelope,
  draft: ExecutiveAgentDraftOutput,
): ExecutiveEscalationPacket | null {
  if (!draft.escalationRequired) {
    return null;
  }

  return {
    escalationPacketId:
      'materialized-escalation-001',
    workflowId: envelope.workflowId,
    runId: envelope.runId,
    roleId: envelope.roleId,
    taskClass:
      envelope.requestedTaskClass,
    issue:
      draft.unknowns[0] ??
      draft.draftArtifact,
    evidenceAvailable:
      draft.evidenceReferences,
    evidenceMissing: draft.unknowns,
    options: draft.recommendations,
    risks: draft.dissent,
    requiredHumanDecision:
      draft.requiredHumanDecisions[0] ??
      draft.draftArtifact,
    founderApprovalRequired: false,
    verifiedStatus: draft.facts,
    conflictingEvidence: draft.dissent,
    affectedDependencies: [],
    governingConstraints:
      envelope.knownConstraints,
    affectedComponents: [],
    reversibilityConcerns: [],
    automaticActionAuthorized: false,
  };
}

export function materializeHumanMediatedRoleOutput(
  envelopeCandidate: unknown,
  draftCandidate: unknown,
): MaterializeHumanMediatedRoleOutputResult {
  const issues: HumanMediatedValidationIssue[] = [];

  const envelopeValidation =
    validateExecutiveWorkflowEnvelope(
      envelopeCandidate,
    );

  if (!envelopeValidation.ok) {
    issues.push(...envelopeValidation.issues);
  }

  const draftValidation =
    validateExecutiveAgentDraftOutput(
      draftCandidate,
      'draftForHumanReview',
    );

  if (!draftValidation.ok) {
    issues.push(...draftValidation.issues);
  }

  if (
    !envelopeValidation.ok ||
    !draftValidation.ok
  ) {
    return {
      ok: false,
      output: null,
      issues,
    };
  }

  const envelope = envelopeValidation.value;
  const draft = draftValidation.value;
  const escalationPacket =
    materializedEscalationPacket(
      envelope,
      draft,
    );

  const commonFields = {
    workflowId: envelope.workflowId,
    runId: envelope.runId,
    roleId: envelope.roleId,
    taskClass:
      envelope.requestedTaskClass,
    commonOutput: draft,
    materialDisagreements: [],
    escalationPacket,
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
  } as const;

  if (envelope.roleId === 'executive.ceo') {
    const candidate = {
      ...commonFields,
      roleId: 'executive.ceo' as const,
      roleExtension: {
        extensionVersion:
          'executive-ceo-draft-extension-v1' as const,
        artifactKind:
          'executive_brief' as const,
        strategicOptions: [],
        preferredOptionId: null,
        preferredOptionRationale: [],
        tradeoffs: [],
        riskAndDependencyRegister: [],
        additionalEvidenceRequests: [],
        founderApprovalChecklist: [],
        materialDisagreementIds: [],
        approvalsStillRequired:
          draft.requiredHumanDecisions,
        implementationAuthorized:
          false as const,
        publicationAuthorized:
          false as const,
        roleDispatchAuthorized:
          false as const,
      },
    };

    const validation =
      validateCeoHumanMediatedOutput(
        candidate,
      );

    return validation.ok
      ? {
          ok: true,
          output: validation.value,
          issues: [],
        }
      : {
          ok: false,
          output: null,
          issues: validation.issues,
        };
  }

  if (
    envelope.roleId ===
    'executive.chief_of_staff'
  ) {
    const candidate = {
      ...commonFields,
      roleId:
        'executive.chief_of_staff' as const,
      roleExtension: {
        extensionVersion:
          'executive-chief-of-staff-draft-extension-v1' as const,
        artifactKind:
          'executive_status_brief' as const,
        verifiedFacts: draft.facts,
        reportedStatuses: [],
        proposals: draft.recommendations,
        statusTransformations: [],
        dependencyItems: [],
        proposedWorkSequence: [],
        proposedOwners: [],
        proposedDeadlines: [],
        unresolvedQuestions:
          draft.unknowns,
        disagreementSummaryIds: [],
        escalationPacketId:
          escalationPacket
            ?.escalationPacketId ?? null,
        recordedHumanDecisions: [],
        founderApprovalChecklist: [],
        artificialConsensusCreated:
          false as const,
        adjudicationPerformed:
          false as const,
        bindingAssignmentAuthorized:
          false as const,
        bindingDeadlineAuthorized:
          false as const,
        roleDispatchAuthorized:
          false as const,
      },
    };

    const validation =
      validateChiefOfStaffHumanMediatedOutput(
        candidate,
      );

    return validation.ok
      ? {
          ok: true,
          output: validation.value,
          issues: [],
        }
      : {
          ok: false,
          output: null,
          issues: validation.issues,
        };
  }

  if (
    envelope.roleId ===
    'executive.chief_architecture_officer'
  ) {
    const candidate = {
      ...commonFields,
      roleId:
        'executive.chief_architecture_officer' as const,
      roleExtension: {
        extensionVersion:
          'executive-chief-architecture-officer-draft-extension-v1' as const,
        artifactKind:
          'architecture_option_memorandum' as const,
        evidenceInspected: [],
        evidenceUnavailable: [],
        alternativesConsidered: [],
        affectedComponents: [],
        architectureProposals: [],
        riskAnalyses: [],
        reversibilityAnalysis: [],
        testAndEvaluationPlans: [],
        proposedImplementationSequences: [],
        recommendedOptionId: null,
        technicalDissent: [],
        confidenceAndLimitations:
          draft.unknowns,
        founderApprovalChecklist: [],
        approvalsStillRequired:
          draft.requiredHumanDecisions,
        constitutionalInterpretationPerformed:
          false as const,
        legalInterpretationPerformed:
          false as const,
        adrRatificationPerformed:
          false as const,
        implementationAuthorized:
          false as const,
        repositoryModificationAuthorized:
          false as const,
        migrationAuthorized:
          false as const,
        deploymentAuthorized:
          false as const,
        roleDispatchAuthorized:
          false as const,
      },
    };

    const validation =
      validateCaoHumanMediatedOutput(
        candidate,
      );

    return validation.ok
      ? {
          ok: true,
          output: validation.value,
          issues: [],
        }
      : {
          ok: false,
          output: null,
          issues: validation.issues,
        };
  }

  return {
    ok: false,
    output: null,
    issues: [
      coordinatorIssue(
        'envelope.roleId',
        'unknown_role',
        'No human-mediated output materializer exists for the requested role.',
      ),
    ],
  };
}

export function buildHumanMediatedRoleAuditExtension(
  output: AnyHumanMediatedRoleOutput,
): ExecutiveRoleAuditExtension {
  if (output.roleId === 'executive.ceo') {
    const extension =
      output.roleExtension as CeoDraftExtension;

    return {
      extensionVersion:
        'executive-ceo-in-memory-audit-extension-v1',
      roleId: 'executive.ceo',
      artifactKindsProduced: [
        extension.artifactKind,
      ],
      strategicOptionIds:
        extension.strategicOptions.map(
          option => option.optionId,
        ),
      preferredOptionId:
        extension.preferredOptionId,
      founderChecklistItemIds:
        extension.founderApprovalChecklist.map(
          item => item.checklistItemId,
        ),
      implementationAuthorized: false,
      publicationAuthorized: false,
      roleDispatchAuthorized: false,
    };
  }

  if (
    output.roleId ===
    'executive.chief_of_staff'
  ) {
    const extension =
      output.roleExtension as
        ChiefOfStaffDraftExtension;

    return {
      extensionVersion:
        'executive-chief-of-staff-in-memory-audit-extension-v1',
      roleId: 'executive.chief_of_staff',
      artifactKindsProduced: [
        extension.artifactKind,
      ],
      reportedStatusRecordIds:
        extension.reportedStatuses.map(
          item => item.statusId,
        ),
      dependencyIds:
        extension.dependencyItems.map(
          item => item.dependencyId,
        ),
      proposedOwnerRecordIds:
        extension.proposedOwners.map(
          item => item.proposalId,
        ),
      proposedDeadlineRecordIds:
        extension.proposedDeadlines.map(
          item => item.proposalId,
        ),
      recordedHumanDecisionIds:
        extension.recordedHumanDecisions.map(
          item => item.decisionRecordId,
        ),
      assignmentAuthorityExercised: false,
      deadlineAuthorityExercised: false,
      adjudicationPerformed: false,
      artificialConsensusCreated: false,
      roleDispatchAuthorized: false,
    };
  }

  const extension =
    output.roleExtension as CaoDraftExtension;

  return {
    extensionVersion:
      'executive-chief-architecture-officer-in-memory-audit-extension-v1',
    roleId:
      'executive.chief_architecture_officer',
    artifactKindsProduced: [
      extension.artifactKind,
    ],
    alternativeIds:
      extension.alternativesConsidered.map(
        item => item.alternativeId,
      ),
    architectureProposalIds:
      extension.architectureProposals.map(
        item => item.proposalId,
      ),
    riskAnalysisIds: [
      ...extension.riskAnalyses.map(
        item => item.analysisId,
      ),
      ...extension.reversibilityAnalysis.map(
        item => item.analysisId,
      ),
    ],
    testEvaluationPlanIds:
      extension.testAndEvaluationPlans.map(
        item => item.planId,
      ),
    implementationSequenceIds:
      extension.proposedImplementationSequences.map(
        item => item.sequenceId,
      ),
    providerAssignmentPerformed: false,
    adapterAssignmentPerformed: false,
    schemaMigrationPerformed: false,
    adrRatificationPerformed: false,
    implementationAuthorized: false,
    roleDispatchAuthorized: false,
  };
}
