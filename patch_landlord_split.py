#!/usr/bin/env python3
"""
Split the landlord-IDENTITY capture into its own step, placed before the
payment step, so the (S) 1161(2) payee name (derived from landlordIdentity) is
available when the payment step renders. Signer/service questions stay on the
existing LandlordAgentInfo step.

Safety: every edit is an exact-match replace that MUST occur exactly once. If
any anchor is not found exactly once, the script aborts and writes nothing.
Run from the repo root:  python3 patch_landlord_split.py
"""
import sys, io

def patch(path, edits):
    with io.open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    out = src
    for i, (old, new) in enumerate(edits, 1):
        n = out.count(old)
        if n != 1:
            print("ABORT: in %s, edit #%d matched %d times (expected 1). No files written." % (path, i, n))
            sys.exit(1)
        out = out.replace(old, new)
    return src, out

# ---------------------------------------------------------------------------
# lib/flow/noticeFlowState.ts  — add the enum member
# ---------------------------------------------------------------------------
NFS = "lib/flow/noticeFlowState.ts"
nfs_edits = [
    (
        "  Tenants = 'step2_tenants',\n  AmountOwed = 'step3_amount',",
        "  Tenants = 'step2_tenants',\n"
        "  // Landlord identity (who the landlord is) is captured BEFORE payment,\n"
        "  // because the (S) 1161(2) payee name is derived from it (derivePayeeName).\n"
        "  // The signer/service questions stay on LandlordAgentInfo, later in the flow.\n"
        "  LandlordIdentity = 'step3_landlord_identity',\n"
        "  AmountOwed = 'step3_amount',",
    ),
]

# ---------------------------------------------------------------------------
# lib/flow/advancement.ts  — add LandlordIdentity case, strip identity checks
# from LandlordAgentInfo, add to STEP_ORDER
# ---------------------------------------------------------------------------
ADV = "lib/flow/advancement.ts"
adv_edits = [
    # (1) Insert the LandlordIdentity validation case before AmountOwed.
    (
        "      break;\n\n    case FlowStep.AmountOwed:",
        "      break;\n\n"
        "    case FlowStep.LandlordIdentity: {\n"
        "      // Defect #1: landlord type must be chosen and confirmed; entity branch\n"
        "      // fields complete. Captured BEFORE payment so the derived (S) 1161(2)\n"
        "      // payee name is available there. SIGNER fields + service/signing dates\n"
        "      // are validated on LandlordAgentInfo, NOT here.\n"
        "      const id = data.landlordIdentity;\n"
        "      if (!id || !data.landlordIdentityConfirmed) {\n"
        "        issues.push('Select whether the landlord is an individual or an entity.');\n"
        "      }\n"
        "      if (id?.type === 'entity') {\n"
        "        if (isBlank(id.entityLegalName)) issues.push(\"Enter the entity's full legal name.\");\n"
        "        if (!id.entityType) issues.push('Select the entity type.');\n"
        "      }\n"
        "      break;\n"
        "    }\n\n"
        "    case FlowStep.AmountOwed:",
    ),
    # (2) Strip the identity checks from the LandlordAgentInfo case (keep `id`
    #     for the entity-title rule; keep everything from signerName onward).
    (
        "    case FlowStep.LandlordAgentInfo: {\n"
        "      // Defect #1: landlord type must be chosen, branch fields complete.\n"
        "      const id = data.landlordIdentity;\n"
        "      if (!id || !data.landlordIdentityConfirmed) {\n"
        "        issues.push('Select whether the landlord is an individual or an entity.');\n"
        "      }\n"
        "      if (id?.type === 'entity') {\n"
        "        if (isBlank(id.entityLegalName)) issues.push(\"Enter the entity's full legal name.\");\n"
        "        if (!id.entityType) issues.push('Select the entity type.');\n"
        "      }\n"
        "      if (isBlank(data.signerName)) issues.push('A signer name is required.');",
        "    case FlowStep.LandlordAgentInfo: {\n"
        "      // Signer + execution/service. Landlord IDENTITY is validated on the\n"
        "      // LandlordIdentity step (earlier); the entity-title rule below still\n"
        "      // keys off id.type, which is already set by the time the user is here.\n"
        "      const id = data.landlordIdentity;\n"
        "      if (isBlank(data.signerName)) issues.push('A signer name is required.');",
    ),
    # (3) STEP_ORDER: insert LandlordIdentity between Tenants and AmountOwed.
    (
        "  FlowStep.Tenants,\n  FlowStep.AmountOwed,",
        "  FlowStep.Tenants,\n  FlowStep.LandlordIdentity,\n  FlowStep.AmountOwed,",
    ),
]

# ---------------------------------------------------------------------------
# components/notice-flow.tsx — PAGES reorder, renderStepBody case, and the
# component split (new LandlordIdentityStep + identity block removed from
# LandlordStep)
# ---------------------------------------------------------------------------
NF = "components/notice-flow.tsx"
nf_edits = [
    # (1) PAGES: put LandlordIdentity at position 3 of "The notice". Lands the
    #     landlord on step 3 — keeps the attorney-locked "Step 3" copy true.
    (
        "    label: 'The notice',\n"
        "    steps: [\n"
        "      FlowStep.PropertyIdentification,\n"
        "      FlowStep.Tenants,\n"
        "      FlowStep.AmountOwed,\n"
        "      FlowStep.PaymentInstructions,\n"
        "    ],",
        "    label: 'The notice',\n"
        "    steps: [\n"
        "      FlowStep.PropertyIdentification,\n"
        "      FlowStep.Tenants,\n"
        "      FlowStep.LandlordIdentity,\n"
        "      FlowStep.AmountOwed,\n"
        "      FlowStep.PaymentInstructions,\n"
        "    ],",
    ),
    # (2) renderStepBody: route the new step to LandlordIdentityStep.
    (
        "    case FlowStep.Tenants:\n"
        "      return <TenantsStep data={data} update={update} />;\n"
        "    case FlowStep.AmountOwed:",
        "    case FlowStep.Tenants:\n"
        "      return <TenantsStep data={data} update={update} />;\n"
        "    case FlowStep.LandlordIdentity:\n"
        "      return <LandlordIdentityStep data={data} update={update} />;\n"
        "    case FlowStep.AmountOwed:",
    ),
    # (3) Insert the new LandlordIdentityStep component immediately before
    #     LandlordStep, reusing the existing identity JSX verbatim.
    (
        "function LandlordStep({\n"
        "  data,\n"
        "  update,\n"
        "}: {\n"
        "  data: NoticeFlowData;\n"
        "  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;\n"
        "}) {\n"
        "  // B1: the signing (execution) date is distinct from the service date. Inline",
        "function LandlordIdentityStep({\n"
        "  data,\n"
        "  update,\n"
        "}: {\n"
        "  data: NoticeFlowData;\n"
        "  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;\n"
        "}) {\n"
        "  const li = data.landlordIdentity;\n"
        "  const entityName = li?.type === 'entity' ? li.entityLegalName : '';\n"
        "  const entityTypeVal: EntityType = li?.type === 'entity' ? li.entityType : 'llc';\n"
        "  return (\n"
        "    <div className=\"space-y-6\">\n"
        "      <StepIntro>\n"
        "        Who is the landlord on this notice? This determines whose name appears\n"
        "        as the party the notice is from, and (unless you say otherwise on the\n"
        "        payment step) who rent is payable to.\n"
        "      </StepIntro>\n"
        "\n"
        "      {/* Stage 1 - who is the landlord (Defect #1, ruling 2.1) */}\n"
        "      <div>\n"
        "        <FieldLabel>Who is the landlord on this notice?<Req /></FieldLabel>\n"
        "        <div className=\"space-y-2\">\n"
        "          {(['individual', 'entity'] as const).map((t) => (\n"
        "            <label\n"
        "              key={t}\n"
        "              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${\n"
        "                li?.type === t ? 'border-blue-400 bg-blue-50' : 'border-gray-200'\n"
        "              }`}\n"
        "            >\n"
        "              <input\n"
        "                type=\"radio\"\n"
        "                name=\"landlordType\"\n"
        "                className=\"mt-1\"\n"
        "                checked={li?.type === t}\n"
        "                onChange={() => update(setLandlordTypePatch(t, data))}\n"
        "              />\n"
        "              <span>\n"
        "                <span className=\"block text-gray-900\">{LANDLORD_TYPE_LABELS[t].title}</span>\n"
        "                <span className=\"block text-sm text-gray-500\">{LANDLORD_TYPE_LABELS[t].help}</span>\n"
        "              </span>\n"
        "            </label>\n"
        "          ))}\n"
        "        </div>\n"
        "      </div>\n"
        "\n"
        "      {/* Entity identity fields */}\n"
        "      {li?.type === 'entity' && (\n"
        "        <>\n"
        "          <div>\n"
        "            <FieldLabel htmlFor=\"entityLegalName\">Entity legal name<Req /></FieldLabel>\n"
        "            <input\n"
        "              id=\"entityLegalName\"\n"
        "              type=\"text\"\n"
        "              value={entityName}\n"
        "              onChange={(e: ChangeEvent<HTMLInputElement>) =>\n"
        "                update((d) =>\n"
        "                  d.landlordIdentity?.type === 'entity'\n"
        "                    ? { landlordIdentity: { ...d.landlordIdentity, entityLegalName: e.target.value } }\n"
        "                    : {},\n"
        "                )\n"
        "              }\n"
        "              placeholder={'Full registered legal name, e.g. \"PTAG Properties, LLC\"'}\n"
        "              className={inputClass}\n"
        "            />\n"
        "            <p className=\"mt-1 text-xs text-gray-500 leading-relaxed\">\n"
        "              {entityLegalNameHelper}\n"
        "            </p>\n"
        "          </div>\n"
        "          <div>\n"
        "            <FieldLabel htmlFor=\"entityType\">Entity type<Req /></FieldLabel>\n"
        "            <select\n"
        "              id=\"entityType\"\n"
        "              value={entityTypeVal}\n"
        "              onChange={(e: ChangeEvent<HTMLSelectElement>) =>\n"
        "                update((d) =>\n"
        "                  d.landlordIdentity?.type === 'entity'\n"
        "                    ? {\n"
        "                        landlordIdentity: {\n"
        "                          ...d.landlordIdentity,\n"
        "                          entityType: e.target.value as EntityType,\n"
        "                        },\n"
        "                      }\n"
        "                    : {},\n"
        "                )\n"
        "              }\n"
        "              className={inputClass}\n"
        "            >\n"
        "              {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((et) => (\n"
        "                <option key={et} value={et}>\n"
        "                  {ENTITY_TYPE_LABELS[et]}\n"
        "                </option>\n"
        "              ))}\n"
        "            </select>\n"
        "          </div>\n"
        "        </>\n"
        "      )}\n"
        "    </div>\n"
        "  );\n"
        "}\n"
        "\n"
        "function LandlordStep({\n"
        "  data,\n"
        "  update,\n"
        "}: {\n"
        "  data: NoticeFlowData;\n"
        "  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;\n"
        "}) {\n"
        "  // B1: the signing (execution) date is distinct from the service date. Inline",
    ),
    # (4) In LandlordStep, drop the now-unused entityName/entityTypeVal locals
    #     (identity fields moved to LandlordIdentityStep). Keep `li` + signingCheck.
    (
        "  const signingCheck = validateSigningDate(data.signingDate, data.serviceDate);\n"
        "  const li = data.landlordIdentity;\n"
        "  const entityName = li?.type === 'entity' ? li.entityLegalName : '';\n"
        "  const entityTypeVal: EntityType = li?.type === 'entity' ? li.entityType : 'llc';\n"
        "  return (\n"
        "    <div className=\"space-y-6\">\n"
        "      <StepIntro>\n"
        "        Who is signing and serving the notice, and when?\n"
        "      </StepIntro>",
        "  const signingCheck = validateSigningDate(data.signingDate, data.serviceDate);\n"
        "  const li = data.landlordIdentity;\n"
        "  return (\n"
        "    <div className=\"space-y-6\">\n"
        "      <StepIntro>\n"
        "        Who is signing and serving the notice, and when?\n"
        "      </StepIntro>",
    ),
    # (5) Remove the identity block (Stage 1 + entity identity fields) from
    #     LandlordStep — it now lives in LandlordIdentityStep. Leaves the signer
    #     name block intact.
    (
        "      {/* Stage 1 — who is the landlord (Defect #1, ruling §2.1) */}\n"
        "      <div>\n"
        "        <FieldLabel>Who is the landlord on this notice?<Req /></FieldLabel>\n"
        "        <div className=\"space-y-2\">\n"
        "          {(['individual', 'entity'] as const).map((t) => (\n"
        "            <label\n"
        "              key={t}\n"
        "              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer ${\n"
        "                li?.type === t ? 'border-blue-400 bg-blue-50' : 'border-gray-200'\n"
        "              }`}\n"
        "            >\n"
        "              <input\n"
        "                type=\"radio\"\n"
        "                name=\"landlordType\"\n"
        "                className=\"mt-1\"\n"
        "                checked={li?.type === t}\n"
        "                onChange={() => update(setLandlordTypePatch(t, data))}\n"
        "              />\n"
        "              <span>\n"
        "                <span className=\"block text-gray-900\">{LANDLORD_TYPE_LABELS[t].title}</span>\n"
        "                <span className=\"block text-sm text-gray-500\">{LANDLORD_TYPE_LABELS[t].help}</span>\n"
        "              </span>\n"
        "            </label>\n"
        "          ))}\n"
        "        </div>\n"
        "      </div>\n"
        "\n"
        "      {/* Entity identity fields */}\n"
        "      {li?.type === 'entity' && (\n"
        "        <>\n"
        "          <div>\n"
        "            <FieldLabel htmlFor=\"entityLegalName\">Entity legal name<Req /></FieldLabel>\n"
        "            <input\n"
        "              id=\"entityLegalName\"\n"
        "              type=\"text\"\n"
        "              value={entityName}\n"
        "              onChange={(e: ChangeEvent<HTMLInputElement>) =>\n"
        "                update((d) =>\n"
        "                  d.landlordIdentity?.type === 'entity'\n"
        "                    ? { landlordIdentity: { ...d.landlordIdentity, entityLegalName: e.target.value } }\n"
        "                    : {},\n"
        "                )\n"
        "              }\n"
        "              placeholder={'Full registered legal name, e.g. \"PTAG Properties, LLC\"'}\n"
        "              className={inputClass}\n"
        "            />\n"
        "            <p className=\"mt-1 text-xs text-gray-500 leading-relaxed\">\n"
        "              {entityLegalNameHelper}\n"
        "            </p>\n"
        "          </div>\n"
        "          <div>\n"
        "            <FieldLabel htmlFor=\"entityType\">Entity type<Req /></FieldLabel>\n"
        "            <select\n"
        "              id=\"entityType\"\n"
        "              value={entityTypeVal}\n"
        "              onChange={(e: ChangeEvent<HTMLSelectElement>) =>\n"
        "                update((d) =>\n"
        "                  d.landlordIdentity?.type === 'entity'\n"
        "                    ? {\n"
        "                        landlordIdentity: {\n"
        "                          ...d.landlordIdentity,\n"
        "                          entityType: e.target.value as EntityType,\n"
        "                        },\n"
        "                      }\n"
        "                    : {},\n"
        "                )\n"
        "              }\n"
        "              className={inputClass}\n"
        "            >\n"
        "              {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((et) => (\n"
        "                <option key={et} value={et}>\n"
        "                  {ENTITY_TYPE_LABELS[et]}\n"
        "                </option>\n"
        "              ))}\n"
        "            </select>\n"
        "          </div>\n"
        "        </>\n"
        "      )}\n"
        "\n"
        "      {/* Signer name — shown once the landlord type is chosen */}",
        "      {/* Signer name — shown once the landlord type is chosen */}",
    ),
]

results = []
for path, edits in [(NFS, nfs_edits), (ADV, adv_edits), (NF, nf_edits)]:
    src, out = patch(path, edits)
    results.append((path, src, out))

# All matched. Write them.
for path, _src, out in results:
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(out)
    print("patched %s" % path)

print("Done. Now run:  npx tsc --noEmit   then   npm test")
