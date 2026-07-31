# California Residential Nonpayment Product Control Specification — Revision 1

Status: NONCANONICAL SOURCE RECOVERY  
Source: OwnerPilot Architect working draft from the July 31, 2026 Founder session  
Production authority: None  
Implementation authority: None  
Canonical consequence: None  
Publication authority: Limited to approved source-recovery import  

This document is an amendment and conforming-revision layer to the
California Residential Nonpayment Product Control Specification —
Noncanonical Draft. It is not a standalone replacement unless the two
documents are later consolidated through a separately approved
reconciliation.

## Recovered source text

California Residential Nonpayment Product Control Specification
Noncanonical Draft — Revision 1
Only the sections affected by the approved corrections are revised below. All other accepted provisions remain unchanged.
1. Revised Governing Status
1.1 Beta review invariant
Every beta notice matter must receive trained non-attorney factual and package review before release eligibility.
This is a fail-closed beta invariant.
A matter may not become eligible for release where:
no reviewer is assigned;
required factual review is incomplete;
the review checklist is incomplete;
required corrections remain unresolved;
owner reconfirmation remains outstanding;
the applicable review record cannot be retrieved;
the review record is not linked to the matter and draft version.
This invariant is not an optional production feature and may not be independently disabled while the free limited beta remains active.
1.2 Separation of draft, release, and action
The specification must distinguish:
Internal draft generation
Creation of a nonreleased internal draft for review and correction.
Release eligibility
Satisfaction of all applicable factual-review, owner-confirmation, source-version, eligibility, and product-control requirements permitting delivery of the draft to the owner.
Operative owner action
Any owner decision to sign, use, send, post, mail, serve, file, deliver, or otherwise act upon a released draft.
Internal draft generation does not establish release eligibility.
Release eligibility does not authorize or establish the legal sufficiency of an operative owner action.
1.3 Independent-attorney wording
Optional independent-attorney wording may appear only in a defined route-out context where:
the current OwnerPilot workflow cannot continue;
the issue is materially legal or outside supported scope;
the suggestion is calm and non-alarmist;
OwnerPilot does not select, recommend, host, connect, assign, or transmit the matter to an attorney;
OwnerPilot does not imply that attorney review is available through the platform.
General workflow screens must not routinely display attorney suggestions merely as defensive copy.
3. Revised Supported Beta Scope
Add the following mandatory exclusion and hard-stop condition:
The actual server must not be a named tenant, occupant, recipient, or other party whose status makes that person an improper or unsupported server under the applicable validated control.
Where server-party status is unknown, conflicting, or disallowed, service declaration progression and any service-based workflow advancement must stop.
The matter may continue only for factual correction, evidence organization, or route-out as permitted by the applicable control.
The exact legal categories constituting a disallowed server-party relationship remain subject to Janna-validated service-control rules.
4. Revised Fact Dictionary
4.7 Service and server facts — added and corrected entries
Fact ID	Label	Definition	Type / allowed values	Required	Source	Confirmation role	Affected workflows	Consequence potential	Authority
SRV-001	Service record ID	Unique factual service record	UUID	Per record	System	System	Serve & Track	Audit	Product control
SRV-002	Service attempt ID	Unique service activity attempt	UUID	Per attempt	System	System	Serve & Track	Audit	Product control
SRV-003	Attempt date	Calendar date of reported activity	Date	Yes	Entrant/server	Actual server	Report/declaration	Pause if missing or conflicting	Service control
SRV-004	Attempt time	Time of reported activity	Time with timezone where available	Yes	Entrant/server	Actual server	Report/declaration	Pause if missing or conflicting	Service control
SRV-005	Method reported	Factual method selected by entrant/server	Validated enum	Yes	Server	Actual server	Report/declaration	Warning, pause, or route-out	Janna validation required
SRV-006	Location	Location where reported activity occurred	Structured text	Yes	Server	Actual server	Report/declaration	Review if incomplete	Service control
SRV-007	Mailing event ID	Distinct mailing event reference	UUID/null	Conditional	System	System	Report	Audit	Product control
SRV-008	Mailing date and time	Distinct timestamp for mailing event	Timestamp/null	Conditional	Server/evidence	Actual server	Report/declaration	Pause if required and missing	Service control
SRV-009	Mailing method reported	Reported mailing method	Validated enum	Conditional	Server	Actual server	Report/declaration	Review	Janna validation required
SRV-010	Server identity	Actual person who performed the reported activity	Structured identity	Yes	Server/owner	Actual server	Report/declaration	Hard stop if missing	Service control
SRV-011	Server party status	Relationship of the actual server to the owner, tenant, occupants, matter, and intended recipients	Enum: owner; employee; manager; independent adult; professional server; tenant; occupant; named recipient; disputed; other; unknown	Yes	Server and owner input; supporting records where available	Actual server and owner	Service documentation; declaration; service-based progression	Hard stop where disallowed, unknown, conflicting, or unsupported	Janna ruling; exact categories require validated control
SRV-012	Data entrant identity	Person entering the record	User ID	Yes	System	System	Audit	None	Product control
SRV-013	Actual-server confirmation	Actual server confirms the factual service record	Boolean	Required before server-confirmed declaration state	Actual server	Actual server	Declaration	Block declaration progression if absent	Service control
SRV-014	Factual attestations	Versioned factual confirmations presented to server	Boolean set	Conditional	Actual server	Actual server	Declaration	Pause if incomplete	Janna validation required
SRV-015	Notes	Factual notes concerning service activity	Text	Optional	Entrant/server	Actual server where substantive	Report	Warning or review	Product control
SRV-016	Amendment reason	Reason a service record was changed	Text	Conditional	Entrant/server/reviewer	Appropriate actor	Audit	None	Product control
SRV-017	Service issue	Missing, inconsistent, disputed, party conflict, unsupported method, or other issue	Enum	Conditional	System/reviewer	Reviewer	Resolve & Record	Pause or route-out	Janna validation required
SRV-018	Report version	Generated report version	String	Yes	System	System	Export	Audit	Product control
SRV-019	Declaration status	Draft, actual-server-review-required, actual-server-confirmed, server-signed, amended, superseded, withdrawn	Enum	Conditional	System/server	Actual server	Declaration	No sufficiency inference	Product control
4.8 Inactive proposed Los Angeles facts
These facts are proposed for the future Los Angeles rule pack and remain inactive.
Fact ID	Label	Definition	Type / allowed values	Required when active	Source	Confirmation role	Affected workflow	Consequence	Status
LA-001	Bedroom count	Number and classification of bedrooms under the validated local rule	Integer/enum/unknown	Yes	Owner, official property source	Owner/reviewer	LA threshold control	Pause if unknown	Inactive
LA-002	RSO applicability	Whether RSO applies	Applies; does not apply; exempt; unknown	Yes	Official source + owner facts	Reviewer	LA eligibility	Pause if unknown	Inactive
LA-003	RSO exemption basis	Claimed exemption and supporting authority	Enum + source	Conditional	Owner/docs/official source	Reviewer	LA eligibility	Pause if unsupported	Inactive
LA-004	JCO applicability	Whether JCO applies	Applies; does not apply; exempt; unknown	Yes	Official source + owner facts	Reviewer	LA eligibility	Pause if unknown	Inactive
LA-005	JCO exemption basis	Claimed exemption and supporting authority	Enum + source	Conditional	Owner/docs/official source	Reviewer	LA eligibility	Pause if unsupported	Inactive
LA-006	RTCP requirement	Whether current RTCP or successor attachment is required	Required; not required; unknown	Yes	Activated local pack	System/reviewer	Packet preparation	Block if required and absent	Inactive
LA-007	RTCP version	Version/checksum of required attachment	String	Conditional	Source registry	System	Packet preparation	Block if stale	Inactive
LA-008	Required language	Required language set based on validated rule	String[]	Conditional	Activated local pack + owner facts	System/reviewer	Packet preparation	Pause if uncertain	Inactive
LA-009	Translation version	Version/checksum of required translation	String	Conditional	Source registry	System	Packet preparation	Block if stale	Inactive
LA-010	LAHD filing requirement	Whether filing is required	Required; not required; unknown	Yes	Activated local pack	System/reviewer	Post-service local workflow	Pause if unknown	Inactive
LA-011	LAHD filing deadline rule	Effective timing rule and source	Rule reference	Conditional	Source registry	System	Filing workflow	Pause if not validated	Inactive
LA-012	Subsidy program	Identified subsidy or housing program	Enum/string/unknown	Yes	Owner/docs/agency records	Owner/reviewer	Demand/local eligibility	Route-out if detected	Inactive
LA-013	Tenant share	Amount the tenant is responsible to pay	Currency/unknown	Conditional	Program documents	Reviewer	Demand	Route-out pending validated rule	Inactive
LA-014	Agency share	Amount payable by agency or third party	Currency/unknown	Conditional	Program documents	Reviewer	Demand	Route-out pending validated rule	Inactive
LA-015	Filing evidence	Evidence of reported LAHD filing	File/reference	Conditional	Owner/operator	Reviewer	Local filing record	Record only until activated	Inactive
LA-016	Amendment/refiling status	Whether amendment or refiling may be required	None; required; reported; unknown; review-required	Conditional	Owner/registry	Reviewer	Filing workflow	Pause	Inactive
4.9 Payment facts — revised event/attribute separation
Payment events
A payment event is a timestamped occurrence. Every event receives a unique event ID and event timestamp.
Fact ID	Label	Definition	Type	Required	Confirmation
PAY-EVT-001	Payment event ID	Unique occurrence identifier	UUID	Yes	System
PAY-EVT-002	Event type	OFFERED, RECEIVED, ACCEPTED, REJECTED, DEPOSITED, ALLOCATED, RETURNED, REFUNDED, REVERSED, DISHONORED, STATUS_REQUIRES_REVIEW	Enum	Yes	Owner/reviewer as applicable
PAY-EVT-003	Event occurred at	Timestamp when the reported occurrence happened	Timestamp	Yes	Owner
PAY-EVT-004	Event recorded at	Server timestamp when OwnerPilot recorded the occurrence	Timestamp	Yes	System
PAY-EVT-005	Reported by	Actor reporting the occurrence	Actor ID/role	Yes	System
PAY-EVT-006	Supporting evidence	Evidence supporting that specific event	Reference[]	Optional	Reviewer where used
PAY-EVT-007	Prior event relationship	Related earlier payment event	UUID/null	Conditional	System/reviewer
PAY-EVT-008	Owner confirmation	Owner confirms event facts	Boolean/reference	Conditional	Owner
Payment attributes
Attributes describe the payment or instrument and may apply to one or more events.
Fact ID	Label	Definition	Type / allowed values
PAY-ATR-001	Amount	Payment amount	Currency
PAY-ATR-002	Payer	Person or entity providing payment	Structured identity
PAY-ATR-003	Instrument type	Cash, check, ACH, card, money order, other	Enum
PAY-ATR-004	Third-party status	Whether payer differs from tenant	Boolean/unknown
PAY-ATR-005	Conditional status	Whether payment appears conditional	Boolean/unknown
PAY-ATR-006	Restrictive endorsement	Whether instrument includes restrictive wording	Boolean/unknown
PAY-ATR-007	Allocation status	Allocated; partially allocated; unallocated; disputed; unknown	Enum
PAY-ATR-008	Allocation detail	Rental period or charge allocation	Structured list
PAY-ATR-009	Dispute status	Whether amount, acceptance, allocation, or effect is disputed	Boolean/unknown
PAY-ATR-010	Subsidy involvement	Whether payment involves subsidy or agency share	Boolean/unknown
An attribute must not be treated as an event. For example:
CONDITIONAL is an attribute unless a distinct act concerning that condition is recorded.
THIRD_PARTY is an attribute identifying payer status.
DISPUTED is an attribute or review state, not necessarily a payment occurrence.
5. Revised Fact-Status Taxonomy
Add the following non-inference rule:
SERVER_CONFIRMED may be assigned only by the actual server after the server’s identity and server-party status have been captured.
The system may not infer that the person entering data is the actual server.
The system may not infer an acceptable server-party status from:
account role;
owner status;
property-manager status;
employment status;
prior service activity;
possession of service photographs;
completion of a report.
Where server-party status is UNKNOWN, DISPUTED, CONFLICTING, or a Janna-validated disallowed value, the service workflow must fail closed for declaration progression and service-dependent advancement.
6. Revised Matter State Model
Replace the prior drafting and release states with the following separation:
State	Entry conditions	Permitted actions	Prohibited actions	Exit conditions	Responsible role	Internal draft generation	Release allowed	Operative action authorized
eligible_for_internal_draft	Intake complete; enough facts for internal draft; no rule prohibits internal generation	Generate internal draft for review	Release or use draft	Draft generated	System	Yes	No	No
internal_draft_generated	Internal draft exists	Factual/package review; corrections	Release; represent eligibility	Review completed	Reviewer	Already generated	No	No
factual_review_required	Internal draft requires mandatory beta review	Perform checklist; return corrections	Release without completed review	Review complete or correction required	Reviewer	Yes	No	No
factual_correction_required	Reviewer identifies factual or clerical issue	Preserve original; revise; obtain reconfirmation	Silently replace values; clear legal issue	Corrections and required reconfirmations complete	Reviewer/owner	Yes	No	No
release_eligibility_pending	Review complete but remaining release controls unresolved	Validate confirmations, versions, controls	Deliver draft	All release invariants satisfied	System/reviewer	Yes	No	No
release_eligible	All fail-closed release invariants satisfied	Prepare owner release	Operative use by system	Release event recorded	System/operator	Yes	Yes	No
released_to_owner	Versioned draft delivered to owner	Owner may decide whether and how to use it outside OwnerPilot	OwnerPilot may not imply validity or direct operative action unless separately supported	Owner action reported or workflow ends	Owner	No new draft unless revised	Completed	No automatic authority
owner_action_reported	Owner reports signing, sending, service, filing, or other use	Record factual action	Infer legal effect	Later factual event or archive	Owner	No	N/A	Owner action only; no legal conclusion
Revise current_notice_path_closed as follows:
State	Revised meaning
current_notice_workflow_closed	OwnerPilot’s current nonpayment notice workflow is no longer available for continued progression because an accepted full or partial payment event was recorded under the approved conservative beta control. This state does not independently determine cure, waiver, notice invalidity, termination of rights, or any other legal consequence.
Replace all prior references to current_notice_path_closed with current_notice_workflow_closed.
7. Revised Trigger and Consequence Architecture
7.1 Added server-party hard-stop trigger
Trigger ID	Factual predicate	Evidence requirement	Consequence	User wording	Reviewer role	Clearable?	Clearing evidence	Audit requirement	Production status	Required authority
TRG-SRV-005	Actual server is a disallowed party, or server-party status is unknown, disputed, conflicting, or unsupported	Server identity; owner confirmation; server confirmation; relationship facts; supporting records where available	Legally consequential hard stop for declaration progression and service-dependent workflow advancement	“The reported server’s relationship to the matter must be resolved before this service-documentation path can continue. Legal sufficiency has not been determined.”	Trained factual reviewer may confirm facts but may not resolve the legal category	Clearable only where factual error is corrected and the resulting category is permitted by an activated Janna-validated rule	Corrected identity/relationship evidence and owner/server reconfirmation	Original value, corrected value, source, reviewer, owner/server confirmations, control version, state transition	Disabled pending validation and implementation authorization	Janna-validated server-party control
7.2 Consolidated production-release invariant
No draft may be released to an owner unless all of the following are satisfied:
The matter falls within the activated beta eligibility envelope.
Every required fact is present or validly marked not applicable.
No required fact is UNKNOWN, MISSING, DISPUTED, CONFLICTING, REQUIRES_REVIEW, or UNSUPPORTED where that status affects release.
Every applicable warning, pause, route-out, and block has been evaluated.
No active non-clearable control exists.
Every required trained non-attorney factual/package review is complete.
The review used the current approved checklist version.
Every correction preserves original and revised values.
Every correction requiring owner reconfirmation has been reconfirmed.
The demand calculation is supported, reconciled, and owner confirmed.
No unresolved payment event exists.
The applicable jurisdiction and local rule pack are active and current.
All required sources, forms, attachments, and translations are current.
The exact draft version has passed review.
The owner has completed the required release confirmation.
Required audit events are durably recorded.
All required feature flags are active under separate authority.
No prohibited production-gate write is required.
No control depends on unvalidated use of counsel_route_trigger.
No runtime error, persistence failure, or version mismatch prevents reconstruction of the matter and review record.
Failure of any invariant results in fail-closed denial of release eligibility.
This invariant applies to release only. It does not establish legal validity or authorize the owner’s later operative action.
8. Revised Non-Attorney Factual Review Specification
8.1 Fail-closed requirement
Every beta notice matter requires a completed trained non-attorney factual and package review.
There is no beta pathway that bypasses this review.
The system must fail closed where:
no reviewer is assigned;
review is incomplete;
the reviewer identity is unavailable;
the checklist version is missing;
the review record is not durable;
the reviewed draft version differs from the release candidate;
a correction lacks lineage;
required owner reconfirmation is incomplete;
a reviewer attempts to clear a prohibited legal issue.
8.2 Provisional completion label
The provisional owner-facing label is:
Factual and package review completed. Legal sufficiency not determined.
“Factual review completed” alone is disabled pending copy validation.
The provisional label may appear only after:
the complete factual/package checklist is finished;
all factual corrections are resolved;
required owner reconfirmations are complete;
the reviewed draft version matches the release candidate.
It must not imply:
attorney review;
broker legal supervision;
legal validity;
legal compliance;
enforceability;
service sufficiency.
9. Revised Owner-Confirmation Specification
Add a separate confirmation architecture for:
Fact confirmation
Release confirmation
Operative-action reporting
The owner’s release confirmation must state substantially:
I confirm the factual information identified for this draft and request that OwnerPilot release this draft to me for my review and independent decision regarding its use. OwnerPilot has not determined legal sufficiency.
A later owner action must be recorded separately.
Owner confirmation does not authorize OwnerPilot to:
sign;
serve;
send;
post;
mail;
file;
transmit;
treat the draft as legally effective.
11. Revised Jurisdiction and Local Rule-Pack Specification
Add the inactive proposed Los Angeles facts listed in Section 4.8 to the future Los Angeles rule-pack schema.
Los Angeles activation requires, at minimum:
validated bedroom-count rules;
validated RSO applicability and exemption rules;
validated JCO applicability and exemption rules;
current RTCP or successor attachment determination;
current attachment checksum;
required-language logic;
current translation versions and checksums;
LAHD filing requirement;
current filing mechanics;
validated filing deadline;
amendment/refiling rules;
subsidy-program detection;
tenant-share treatment;
agency-share treatment;
source ownership;
legal reviewer;
review expiration date;
Founder activation;
rollback and suspension controls;
complete test evidence.
All Los Angeles facts and controls remain inactive.
12. Revised Serve & Track Specification
12.1 Required server-party control
Serve & Track must capture the actual server’s relationship to:
the owner;
the tenant;
the occupants;
the intended recipient;
the matter;
the property-management operation.
The service-documentation workflow must not advance to actual-server-confirmed or server-signed declaration states where:
server identity is missing;
the actual server has not confirmed the record;
server-party status is unknown;
server-party status is disputed;
owner and server descriptions conflict;
the party status is disallowed by an activated service-control rule.
A trained non-attorney reviewer may reconcile clerical or factual discrepancies but may not decide whether a legally disputed category is permissible.
12.2 Implementation-status evidence levels
Every implementation statement must use one of these evidence classifications:
VERIFIED_IN_CODE — confirmed through repository inspection.
OPERATIONALLY_TESTED — executed successfully in an approved test or production-like environment with recorded results.
SCAFFOLDING_ONLY — data structures, placeholders, or partial code exist without a complete user workflow.
INFERRED — suggested by names, structure, or surrounding code but not directly established.
RUNTIME_VERIFICATION_REQUIRED — implementation may exist, but actual runtime behavior has not been demonstrated.
No item may be described as implemented and operationally complete without appropriate evidence.
12.3 Revised current-state classification
Capability	Evidence classification	Current disposition
Service-date fields	VERIFIED_IN_CODE	Present
Service-attempt fields	VERIFIED_IN_CODE	Present
Mailing fields	VERIFIED_IN_CODE	Present
Server identity and attestations	VERIFIED_IN_CODE	Present
Printable service log/report code	VERIFIED_IN_CODE	Present
Serve & Track empty state	Defined in merged tests; RUNTIME_VERIFICATION_REQUIRED until isolated E2E execution	Not operationally proven
Same-browser local draft restoration	Defined in merged tests; RUNTIME_VERIFICATION_REQUIRED until isolated E2E execution	Not operationally proven
Factual attempt entry through UI	Defined in merged tests; RUNTIME_VERIFICATION_REQUIRED until isolated E2E execution	Not operationally proven
Service notes state	SCAFFOLDING_ONLY	No rendered and wired notes input established
Durable server-side service persistence	VERIFIED_IN_CODE as absent in characterized path, subject to later repository change review	Implementation gap
RiskPath record linked to seeded synthetic chat session	OPERATIONALLY_TESTED only after isolated test execution; currently test definition merged but runtime outstanding	Runtime verification required
Cross-device service continuity	SCAFFOLDING_ONLY or absent in characterized path	Implementation gap
Photo upload and preservation	VERIFIED_IN_CODE as absent from current identified flow	Implementation gap
End-to-end service operational readiness	RUNTIME_VERIFICATION_REQUIRED	Not established
Legal service sufficiency	Not an implementation status	Never established by technical evidence
14. Revised Payment-Event State Machine
14.1 Event and attribute model
Payment occurrences must be represented as distinct events with distinct timestamps.
Example:
OFFERED at time A;
RECEIVED at time B;
DEPOSITED at time C;
ACCEPTED at time D;
REVERSED at time E.
The system may not collapse these into one mutable “payment status” field without preserving each event.
Payment attributes—such as third-party payer, conditional wording, allocation, or dispute—must be stored separately from the event timeline.
14.2 Revised accepted-payment consequence
Where the owner confirms an accepted full payment:
OwnerPilot’s current nonpayment notice workflow closes under the approved beta control.
Where the owner confirms an accepted partial payment:
OwnerPilot’s current nonpayment notice workflow closes under the approved conservative beta control.
These consequences do not independently determine:
legal cure;
waiver;
notice invalidity;
satisfaction of the tenancy obligation;
preservation or loss of rights;
legal effect of acceptance;
ability to begin another legally supported process.
The matter state becomes:
current_notice_workflow_closed
The prior recommendation must be labeled:
Superseded by changed facts
14.3 Timestamp requirements
Each payment event must preserve:
occurrence timestamp;
recorded timestamp;
owner-confirmation timestamp;
reviewer timestamp, where applicable;
supporting-evidence timestamp;
source timezone;
system timezone;
correction history.
No later event may overwrite an earlier timestamp.
18. Revised Public-Copy Controls
18.1 Approved factual language
Draft prepared from the information you provided.
Owner review required.
Factual and package review completed. Legal sufficiency not determined.
Service activity recorded — legal sufficiency not determined.
Service documentation recorded.
Payment reported.
Payment status requires review.
Owner withdrew the current notice path.
Possession change reported.
This workflow cannot continue based on the facts reported.
This draft is for owner review before use.
18.2 Defined route-out attorney language
Only in an approved route-out context:
The current OwnerPilot workflow cannot continue. You may wish to consult an independent attorney outside OwnerPilot.
or:
This issue may be important to discuss with an independent attorney outside OwnerPilot.
The wording must not include:
a referral link;
attorney selection;
attorney matching;
document transmission;
implied attorney availability;
implied requirement for every user;
implication that OwnerPilot will review outside advice.
18.3 Disabled pending validation
Factual review completed.
Prepared through an attorney-approved workflow.
Factual review completed — broker supervised.
Broker-supervised workflow.
Broker-reviewed.
Any wording implying broker assurance of notice legality.
All previously prohibited terms remain prohibited.
20. Revised Feature Flags
Remove FF_EVERY_NOTICE_REVIEW as an independently optional production capability.
Replace it with:
Control	Purpose	Status
BETA_INVARIANT_EVERY_NOTICE_REVIEW	Fail-closed rule requiring trained factual/package review for every beta notice matter	Mandatory whenever beta mode is active; may not be independently disabled
FF_BETA_MODE	Activates the free limited beta only where all mandatory beta invariants are enforceable	OFF by default
FF_LA_LOCAL_PACK	Activates validated LA City pack	OFF
FF_OWNER_JURISDICTION_FALLBACK	Permits validated owner-confirmed fallback	OFF
FF_PAYMENT_EVENT_CAPTURE	Enables factual payment event recording	OFF
FF_ACCEPTED_PARTIAL_CLOSES_WORKFLOW	Closes OwnerPilot’s current workflow after accepted partial payment	OFF
FF_RESOLVE_RECORD	Enables six factual outcome records	OFF
FF_SERVER_DECLARATIONS	Enables declaration lifecycle	OFF
FF_SERVER_PARTY_CONTROL	Enables validated server-party hard stop	OFF
FF_SERVICE_PHOTOS	Enables photo feature	OFF
FF_DURABLE_SERVICE_PERSISTENCE	Enables durable service storage	OFF
FF_RISKPATH_SERVICE_LINKAGE	Enables RiskPath linkage	OFF
FF_PAYMENT_REVIVAL	Enables any revival logic	OFF
FF_SETTLEMENT_TOOLS	Enables settlement/agreement tools	OFF
FF_PUBLIC_BROKER_WORDING	Enables validated broker wording	OFF
FF_PUBLIC_ATTORNEY_WORKFLOW_WORDING	Enables validated attorney-workflow wording	OFF
FF_BETA_MODE must refuse activation unless BETA_INVARIANT_EVERY_NOTICE_REVIEW is enforced.
21. Revised Test Matrix
Add or revise the following required tests.
21.1 Server-party-status tests
server-party status is required;
unknown status hard stops declaration progression;
disputed status hard stops progression;
owner/server relationship mismatch hard stops progression;
disallowed party category hard stops progression;
factual correction preserves original value;
corrected status requires owner and actual-server reconfirmation;
reviewer cannot clear a legal-category dispute;
no service-dependent progression occurs while trigger remains active;
no legal-sufficiency conclusion is produced.
21.2 Every-notice review invariant tests
beta release fails where reviewer is missing;
beta release fails where checklist is incomplete;
beta release fails where review record is not durable;
beta release fails where reviewed draft version differs from release candidate;
beta release fails where required owner reconfirmation is incomplete;
API access cannot bypass review;
feature-flag configuration cannot disable review while beta mode is active;
review completion label does not render before all requirements are met.
21.3 Draft/release/action separation tests
internal draft may be generated without release eligibility;
internal draft is not visible as released owner document;
release requires full production-release invariant;
release does not create service, sending, signing, or filing event;
owner action is separately reported and timestamped;
legal effect is never inferred from release or reported owner action.
21.4 Payment event tests
offered, received, deposited, accepted, and reversed events retain separate IDs and timestamps;
attributes do not overwrite event types;
third-party status is stored as an attribute;
conditional status is stored as an attribute;
accepted full payment closes OwnerPilot workflow only;
accepted partial payment closes OwnerPilot workflow only;
no cure or waiver label appears;
reversed payment does not reactivate workflow;
original recommendation remains preserved;
supersession label reads “Superseded by changed facts.”
21.5 LA inactive-fact tests
all proposed LA facts remain inactive while local pack is inactive;
no LA field activates a production consequence;
missing bedroom count cannot silently default;
RSO/JCO applicability cannot be inferred without validated source;
RTCP and translation versions require checksums;
LAHD filing logic remains unavailable;
subsidy, tenant share, and agency share route out;
LA activation fails until every activation prerequisite is satisfied.
21.6 Public-copy tests
Fail if production or public copy contains:
Factual review completed.
Prepared through an attorney-approved workflow.
Factual review completed — broker supervised.
Broker-supervised workflow.
independent attorney wording outside an approved route-out state;
attorney referral or matching language;
any implication of on-platform attorney availability.
Require the provisional label exactly where approved:
Factual and package review completed. Legal sufficiency not determined.
21.7 Evidence-level tests and verification records
Repository-status reports must identify the evidence level for each asserted capability.
A verification report must fail review where it describes a capability as operationally tested without:
environment;
test identifier;
execution timestamp;
result;
deployment or commit reference;
evidence link;
known limitations.
22. Revised Current Implementation Mapping
All repository assertions are reclassified using the following evidence levels.
22.1 Verified in code
The following have been reported as verified through repository inspection:
structured notice wizard code;
owner-review flow code;
notice-draft production code;
customer chat route and provider clients;
Serve & Track route and factual fields;
service-date fields;
service-attempt fields;
mailing fields;
server identity and attestations;
printable service-log/report code;
localStorage draft code;
server-side chat-session persistence code;
LAHD checklist or filing-support code;
RiskPath-related structures;
notes-related state scaffolding;
production-consumed counsel_route_trigger use.
“Verified in code” does not establish runtime success.
22.2 Operationally tested
Only capabilities supported by executed test evidence may be placed here.
The Lane 7 Production Notion Cron Mirror path is operationally verified within its tested scope.
The PR #307 Playwright characterization specifications are merged, but their isolated Preview runtime execution remains outstanding. Therefore, the behaviors described by those specifications are not yet reclassified as operationally tested.
22.3 Scaffolding only
notes state without rendered and wired input;
partial payment and outcome statuses without complete workflows;
local filing data support without activated legal controls;
jurisdiction-routing concepts without an activated registry;
BTRM stages that remain dark;
six Resolve & Record outcomes without complete recording, persistence, audit, routing, and tests;
review-control concepts not yet implemented as mandatory beta invariants.
22.4 Inferred
The following must remain labeled inferred unless directly inspected or executed:
complete RiskPath continuity across the whole matter lifecycle;
production invocation frequency of specific routes;
reliability of cross-route state restoration;
operational reviewer workflow;
complete service-report content;
effect of environment variables on all deployed branches;
production behavior of dark BTRM stages.
22.5 Runtime verification required
PR #307 E2E characterization behavior;
same-browser draft restoration in isolated Preview;
Serve & Track empty-state behavior in isolated Preview;
factual attempt entry in isolated Preview;
absence of a RiskPath record linked to the seeded synthetic chat session;
cross-device continuity behavior;
version-loss behavior;
durable service persistence;
full release-invariant enforcement;
complete non-attorney review process;
service-party hard-stop behavior;
complete six-outcome workflow;
recommendation supersession;
payment event timeline;
end-to-end controlled beta pathway.
23. Revised Activation Prerequisites
No beta release capability may activate unless all of the following are complete:
Final beta eligibility envelope approved by Founder.
Applicable unresolved legal questions validated by Janna.
Every-notice review procedure approved.
Fail-closed review invariant implemented and tested.
Draft-generation, release-eligibility, and operative-action boundaries implemented.
Consolidated production-release invariant implemented and tested.
Owner-confirmation wording validated.
Demand-control rules validated and tested.
Payment events separated from attributes.
Accepted-payment consequences use workflow-closure language only.
Server-party-status fact and trigger validated.
No new use of counsel_route_trigger.
Neutral observation storage is separated from production-consumed gates.
Public-copy registry is validated.
All unresolved features default off.
Complete audit lineage is durable and reconstructable.
Relevant runtime verification is complete in an approved isolated environment.
Applicable source and form versions are current.
No inactive local pack is treated as active.
Separate Founder rollout authorization is issued.
Los Angeles requires all general prerequisites plus the Los Angeles-specific prerequisites in Section 11.
Conforming-Change Matrix
Correction	Sections changed	Conforming effect
Required server-party-status fact and hard stop	3, 4, 5, 7, 12, 21, 23	Adds SRV-011, hard-stop trigger, review limits, tests, and activation dependency
Every-notice review is fail closed	1, 6, 8, 20, 21, 23	Removes review as optional feature and makes it a mandatory beta invariant
Review-completion copy correction	8, 18, 21	Disables “Factual review completed” and adopts provisional qualified wording
Draft/release/action separation	1, 6, 9, 21, 23	Distinguishes internal generation, release eligibility, and later owner action
Inactive LA facts	4, 11, 21, 23	Adds bedroom count, RSO/JCO, RTCP, language, filing, subsidy, tenant share, and agency share facts
Payment events versus attributes	4, 14, 21	Creates timestamped event history and separate instrument/payment attributes
Accepted-payment closure wording	6, 14, 21	Changes effect to closure of OwnerPilot workflow, not legal conclusion
Consolidated release invariant	7, 21, 23	Creates one fail-closed release checklist
Attorney wording restricted	1, 17, 18, 21	Limits calm outside-attorney suggestion to route-out contexts and preserves no-platform-service rule
Repository evidence levels	12, 21, 22	Reclassifies implementation assertions by direct evidence and runtime proof
Feature flags conformed	20	Removes independently disableable every-notice review flag and adds server-party control
Activation prerequisites conformed	23	Requires all revised controls and runtime evidence before activation
Updated Unresolved Items
Legal validation
Exact disallowed server-party categories.
Treatment of owner, employee, manager, agent, named recipient, tenant, occupant, and other interested parties as servers.
Free-beta LDA applicability.
Entity versus individual LDA registration.
Entity-owner and signer-capacity boundaries.
Guided workflow versus prohibited form selection.
Broker-supervision wording.
Attorney-approved-workflow wording.
Demand-source hierarchy.
Subsidized-rent treatment.
Los Angeles bedroom-count rules.
RSO and JCO applicability and exemptions.
RTCP or successor attachment requirements.
Required languages and translations.
LAHD filing mechanics and deadlines.
Business-day definition.
Amendment and refiling treatment.
Tenant-share and agency-share treatment.
Accepted partial-payment policy.
Reversal, dishonor, return, refund, and revival.
Conditional and restrictive payment instruments.
Third-party allocation.
Service declaration content.
Service defect consequences.
Service-photo privacy, retention, authentication, and evidentiary controls.
Final public-copy validation.
Founder decisions
Final beta eligibility envelope.
Entity-owner inclusion.
Fixed-term inclusion.
Narrower-than-maximum product policies.
Service-photo sequencing.
Settlement-feature sequencing.
Final activation authority.
Los Angeles activation.
Rollout sequence.
Final public broker wording after validation.
Architecture and implementation verification
Neutral observation schema separated from production gates.
Every-notice review workflow design.
Durable review record and checklist versioning.
Consolidated release-invariant implementation design.
Server-party-status storage and confirmation design.
Payment event ledger design.
Draft/release/action event separation.
Durable service persistence.
RiskPath service linkage.
Cross-device recovery.
Version migration and warning behavior.
Six complete outcome workflows.
Runtime execution of PR #307 E2E suite.
End-to-end beta-path operational proof.
Final Status Confirmation
Revision 1 remains:
noncanonical;
nonproduction;
nonactivating;
subject to further Architect verification;
subject to targeted Janna validation;
subject to Founder decisions;
subject to separate implementation authorization.
No feature was activated.
No production-consumed legal-gate write was authorized.
No GitHub, Google Drive, Supabase, Vercel, RCO-001, DECG-001, ECAP, or canonical-registry change was made.
All unresolved legal controls, feature flags, local rules, public claims, and consequential workflow behaviors remain disabled.
