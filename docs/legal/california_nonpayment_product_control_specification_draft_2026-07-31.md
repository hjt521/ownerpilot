# California Residential Nonpayment Product Control Specification

Status: NONCANONICAL SOURCE RECOVERY  
Source: OwnerPilot Architect working draft from the July 31, 2026 Founder session  
Production authority: None  
Implementation authority: None  
Canonical consequence: None  
Publication authority: Limited to approved source-recovery import  

## Recovered source text

California Residential Nonpayment Product Control Specification
Noncanonical Draft
Document status: Noncanonical draft
Approved vertical: California residential nonpayment
Launch mode: Free limited beta with defined eligibility gates
Professional-review input: Janna Group 1 Final Legal Review Handoff
Controlling drafting basis: Accepted OwnerPilot Track B Group 1 Legal Review Reconciliation and Specification-Drafting Package
Production authority: None
Implementation authority: None
Canonical consequence: None
Los Angeles City status: Proposed first local rule pack; not activated
Runtime attorney review through OwnerPilot: Not provided
Required beta review: Trained non-attorney factual and package review for every notice matter
Owner confirmation: Required before draft release or any operative action
Unresolved controls: Disabled by default
1. Governing Status
1.1 Purpose
This specification defines proposed implementation-level controls for OwnerPilot’s first product vertical: preparation and factual lifecycle support for California residential nonpayment matters.
It is intended to support:
Architect verification;
targeted Janna validation;
Founder product decisions;
narrow future engineering authorizations;
implementation testing;
operational review design;
source and version control.
It does not itself authorize:
code changes;
production activation;
legal-control activation;
Los Angeles City activation;
GitHub publication;
Google Drive publication;
Supabase changes;
Vercel changes;
public-copy changes;
jurisdiction-rule-pack activation;
RCO-001 or DECG-001 integration;
ECAP work.
1.2 Controlling launch posture
The controlled launch remains:
FREE, LIMITED BETA WITH DEFINED ELIGIBILITY GATES
The beta is not invitation-only and does not charge users.
The beta must include:
explicit eligibility assessment;
trained non-attorney factual/package review for every notice matter;
owner confirmation before release;
route-out of unsupported matters;
disabled unresolved controls;
no autonomous legal conclusions;
no on-platform attorney service;
no claim that an attorney reviewed or approved a matter.
1.3 Product-role boundaries
OwnerPilot may:
collect and organize facts;
provide validated general education;
guide users through approved workflows;
populate approved draft documents;
perform arithmetic and factual consistency checks;
preserve documentation;
record factual events;
generate warnings;
pause unsupported or uncertain paths;
recommend independent consultation outside OwnerPilot where appropriate.
OwnerPilot may not:
provide individualized legal advice;
determine legal validity;
determine service sufficiency;
determine waiver or cure;
select or provide an attorney;
represent that legal review is available through the platform;
autonomously file, serve, sign, settle, or commence litigation;
clear unresolved legal issues through owner confirmation or non-attorney review.
2. Authority Hierarchy
The following precedence applies to all proposed controls:
Applicable controlling law
Effective-dated, legally validated, Founder-activated local rule pack
Janna-validated product control
Founder-approved conservative product policy
Architect implementation specification
Owner-supplied facts
Non-attorney factual review
Technical derivation
2.1 Precedence rules
A lower-level source may not override a higher-level source.
Owner confirmation does not override controlling law, an active legal control, or a non-clearable block.
Non-attorney review cannot resolve an unresolved legal issue.
Technical calculations cannot establish a legal conclusion.
Engineering may not infer legal behavior from schemas, labels, comments, or field names.
A later source version may not silently alter an existing matter.
Existing matters retain the rule-pack, source, template, and control versions applied when the operative draft was produced, subject to a separately defined supersession or suspension process.
A source update affecting legal eligibility must create a review event, not a silent mutation.
Where authority conflicts or applicability is unresolved, the matter must pause or route out.
3. Supported Beta Scope
3.1 Proposed included cases
Subject to Founder selection and Janna validation, the initial beta may include matters satisfying all of the following:
California residential rental property;
conventional landlord-tenant relationship;
owner or authorized representative can confirm authority;
residential nonpayment is the sole proposed notice basis;
rent consists of identified, already-due base rent;
rent periods are identifiable;
current rent is supported by the lease or validated rent-change documentation;
ledger and payment history are consistent;
amount is undisputed;
no unresolved subsidy issue;
no bankruptcy;
no active unlawful-detainer or related litigation;
no unresolved habitability, retaliation, fair-housing, accommodation, domestic-violence, or source-of-income issue;
no disputed tenancy relationship;
no unresolved master-lease, sublease, hotel, residential-hotel, mobilehome, government-ownership, or specialized occupancy issue;
jurisdiction is activated or the matter remains in nonoperative education/intake mode;
trained non-attorney factual review is completed;
owner confirms all required facts;
no payment event requiring reconsideration remains unresolved.
3.2 Proposed excluded cases
The following should be excluded from operative beta document preparation unless separately validated and activated:
commercial property;
mixed-use tenancy with unresolved classification;
subsidized tenancy;
Section 8 or housing-authority payment involvement;
bankruptcy stay or pending bankruptcy;
active eviction litigation;
active rent-board, administrative, or court proceeding affecting the matter;
mobilehome tenancy;
hotel or residential-hotel occupancy;
government-owned property;
institutional or specialized housing;
master lease;
sublease where legal responsibility is disputed;
disputed owner authority;
disputed tenancy;
disputed rent;
unresolved rent increase;
unresolved payment allocation;
pending payment;
conditional payment;
third-party payment with unclear allocation;
habitability allegation;
retaliation facts;
fair-housing or accommodation issue;
domestic-violence or protected-tenancy issue;
settlement or surrender request;
request for combined legal theories;
nonpayment plus another alleged breach;
unsupported jurisdiction;
inactive local rule pack.
3.3 Mandatory route-outs
The system must route out where:
legal eligibility cannot be established under an activated rule;
the matter requires individualized legal judgment;
a protected issue is detected;
a payment event requires legal interpretation;
a local requirement is unknown or stale;
a required source or form is unavailable;
tenancy classification is unresolved;
owner authority is disputed;
litigation or bankruptcy is active;
the user requests settlement, release, waiver, surrender, or litigation strategy.
3.4 Founder decisions required
The following scope points require Founder selection and must not be decided by this draft:
whether entity owners are included in the first beta;
whether fixed-term tenancies are included;
whether any rent-controlled property is included before local-pack activation;
whether periodic tenancies outside activated local packs are included;
whether owners using property managers may participate;
whether personally owned and entity-owned properties follow the same review path;
whether any manual exception path exists;
whether beta scope is narrower than Janna’s maximum approved scope.
3.5 Janna validation required
The following require targeted legal validation:
free-beta LDA applicability;
entity versus individual owner handling;
entity registration or representation;
guided selection versus autonomous form selection;
fixed-term and periodic treatment;
rent-control applicability;
owner jurisdiction fallback;
subsidized-rent treatment;
master lease and sublease treatment;
residential-hotel classification;
mobilehome classification;
government ownership;
active litigation boundary;
bankruptcy detection and route-out;
disputed tenancy treatment;
service-state effect on later progression.
4. Fact Dictionary
Each fact must be stored with:
fact_id;
value;
status;
source;
actor;
timestamp;
matter ID;
source version where applicable;
prior value where revised;
confirmation role;
affected controls;
audit event.
4.1 User and owner authority facts
Fact ID	Label	Definition	Type / allowed values	Required	Source	Confirmation role	Affected workflows	Consequence potential	Authority
AUTH-001	Account user identity	Identity of person operating OwnerPilot	UUID/string	Yes	Account record	User	All	Pause if unavailable	Product control
AUTH-002	Owner name	Legal name of owner represented	String	Yes	Owner input/document	Owner	Intake, notice, signing	Pause/block	Legal applicability
AUTH-003	Ownership type	Individual, LLC, corporation, trust, partnership, other	Enum	Yes	Owner input/document	Owner	Eligibility, signature	Route-out if unsupported	Janna pending
AUTH-004	User relationship to owner	Owner, employee, manager, agent, broker, other	Enum	Yes	User input	Owner/user	Eligibility	Pause/route-out	Janna pending
AUTH-005	Authority basis	Deed, management agreement, officer role, trustee role, other	Enum + document link	Conditional	Document	Owner/reviewer	Eligibility, signing	Pause	Entity authority
AUTH-006	Authority confirmed	Owner confirms authority to request draft	Boolean	Yes before release	Owner attestation	Owner	Release	Block if false	Product control
AUTH-007	Signer identity	Person intended to sign	String	Yes before release	Owner input	Owner	Draft	Pause	Legal applicability
AUTH-008	Signer capacity	Owner, manager, officer, trustee, agent, other	Enum	Yes	Owner input/document	Owner/reviewer	Draft	Route-out if unsupported	Janna pending
4.2 Property facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Affected workflow	Consequence	Authority
PROP-001	Property address	Full rental-property address	Structured address	Yes	Owner input	Owner	Jurisdiction, notice	Block if missing	Statutory/local
PROP-002	Unit identifier	Unit number or designation	String	Conditional	Owner input/lease	Owner	Notice	Pause if ambiguous	Statutory
PROP-003	Property use	Residential, mixed, commercial, other	Enum	Yes	Owner input/document	Owner/reviewer	Eligibility	Route-out if not residential	Scope
PROP-004	Property class	Single-family, multifamily, condo, ADU, duplex, other	Enum	Yes	Owner input/source	Owner/reviewer	Local controls	Pause if uncertain	Local law
PROP-005	Government ownership	Whether government owns or controls property	Boolean/unknown	Yes	Owner input/document	Owner	Eligibility	Route-out if true/unknown	Unresolved
PROP-006	Mobilehome status	Mobilehome/mobilehome park relationship	Boolean/unknown	Yes	Owner input	Owner	Eligibility	Route-out	Specialized law
PROP-007	Hotel status	Hotel/residential-hotel occupancy	Boolean/unknown	Yes	Owner input	Owner	Eligibility	Route-out	Specialized law
PROP-008	Rent-control status	RSO/JCO/other/none/unknown	Enum	Yes	System/source + owner	Reviewer	Local eligibility	Pause if unknown	Local law
PROP-009	Subsidy-linked property	Property or tenancy linked to subsidy program	Boolean/unknown	Yes	Owner input/docs	Owner/reviewer	Demand	Route-out	Janna pending
4.3 Jurisdiction facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence	Authority
JUR-001	State jurisdiction	California	Enum	Yes	Address derivation	System	Eligibility	Block if not CA	Scope
JUR-002	City jurisdiction	City/local authority	String/unknown	Yes	Resolver/owner	System + owner	Local pack	Pause	Local law
JUR-003	County	County	String	Yes	Resolver	System	Forms/filing	Warning/pause	Local process
JUR-004	Jurisdiction confidence	Confidence of resolver	Decimal/enum	Yes	System	System	Local pack	Warning/pause	Product control
JUR-005	Owner jurisdiction confirmation	Explicit confirmation after resolver uncertainty	Boolean	Conditional	Owner	Owner	Local pack	Proposed only	Janna/Founder pending
JUR-006	Activated pack ID	Applicable active local-pack identifier	UUID/null	Yes before local operation	Registry	System	Local controls	Block if absent	Product control
JUR-007	Pack version	Effective local-pack version	String	Yes	Registry	System	All local controls	Freeze matter version	Governance
JUR-008	Pack state	Draft, pending, active, suspended, expired, superseded, retired	Enum	Yes	Registry	System	Eligibility	Block unless active	Governance
4.4 Tenancy facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence	Authority
TEN-001	Tenant legal name	Tenant named in tenancy	String[]	Yes	Lease/owner	Owner/reviewer	Notice	Block if uncertain	Statutory
TEN-002	Occupant names	Known adult occupants	String[]	Optional	Owner	Owner	Notice/service	Review	Janna pending
TEN-003	Tenancy start date	Start date	Date	Yes	Lease/owner	Reviewer	Eligibility	Pause if conflicting	Legal
TEN-004	Tenancy type	Fixed, month-to-month, other	Enum	Yes	Lease	Reviewer	Eligibility	Route-out if unsupported	Janna pending
TEN-005	Written lease exists	Whether written agreement exists	Boolean	Yes	Owner/document	Owner	Demand	Warning/pause	Legal
TEN-006	Lease document	Current operative lease source	File reference	Conditional	Upload	Reviewer	Demand	Pause if required/missing	Product control
TEN-007	Master lease	Master-lease structure	Boolean/unknown	Yes	Owner/lease	Reviewer	Eligibility	Route-out	Janna pending
TEN-008	Sublease	Subtenant or sublease issue	Boolean/unknown	Yes	Owner/lease	Reviewer	Eligibility	Route-out	Janna pending
TEN-009	Tenancy disputed	Tenant denies tenancy terms or relationship	Boolean/unknown	Yes	Owner	Owner	Eligibility	Route-out	Legal judgment
TEN-010	Active litigation	Existing lawsuit or administrative case	Boolean/unknown	Yes	Owner	Owner	Eligibility	Route-out	Legal
TEN-011	Bankruptcy	Known bankruptcy or stay	Boolean/unknown	Yes	Owner	Owner	Eligibility	Route-out	Federal law
TEN-012	Protected issue present	Habitability, retaliation, fair housing, accommodation, DV, source-of-income	Multi-enum	Yes	Owner/communications	Owner	Eligibility	Route-out	Legal
4.5 Rent and ledger facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence
RENT-001	Current base rent	Monthly base rent currently due	Currency	Yes	Lease/rent-change source	Reviewer + owner	Demand	Block if unsupported
RENT-002	Rent frequency	Monthly, weekly, other	Enum	Yes	Lease	Reviewer	Demand	Route-out if unsupported
RENT-003	Rent due date	Contractual due date	Day/date rule	Yes	Lease	Reviewer	Period calculation	Pause if unclear
RENT-004	Rent-change source	Current valid increase document	File reference	Conditional	Upload	Reviewer	Demand	Pause if absent
RENT-005	Rent-change effective date	Effective date	Date	Conditional	Document	Reviewer	Demand	Block if inconsistent
RENT-006	Ledger source	Owner ledger	File/structured records	Yes	Owner	Reviewer	Demand	Pause if missing
RENT-007	Ledger consistency	Whether ledger aligns with lease/payment history	Enum	Yes	Reviewer	Reviewer	Demand	Pause if conflicting
RENT-008	Disputed amount	Whether tenant disputes amount	Boolean/unknown	Yes	Owner	Owner	Demand	Route-out/pause
RENT-009	Rental period start	Start of demanded period	Date	Yes per line	Ledger	Reviewer	Demand	Block if absent
RENT-010	Rental period end	End of demanded period	Date	Yes per line	Ledger	Reviewer	Demand	Block if absent
RENT-011	Base rent due per period	Base rent demanded for period	Currency	Yes	Calculation	System/reviewer	Demand	Block if unsupported
RENT-012	Partial-period amount	Prorated amount	Currency/null	Conditional	Calculation	Reviewer	Demand	Disabled unless validated
RENT-013	Total proposed demand	Sum of approved period records	Currency	Yes	System	Reviewer + owner	Draft	Block if mismatch
RENT-014	Rounding adjustment	Applied rounding	Currency	Optional	System	Reviewer	Demand	Audit required
RENT-015	Unsupported increase detected	Increase lacks validated support	Boolean	System/reviewer	Reviewer	Demand	Pause	
4.6 Payment, credit, and concession facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence
PAY-001	Payment event ID	Unique payment event	UUID	Per event	System	System	Payment	Audit
PAY-002	Payment status	Offered, received, accepted, rejected, deposited, allocated, returned, refunded, reversed, dishonored, conditional, third-party, disputed, review-required	Enum	Yes	Owner/evidence	Owner	Payment state	State-specific
PAY-003	Payment amount	Amount	Currency	Yes	Owner/evidence	Owner	Payment	Recalculate/pause
PAY-004	Payment date	Date tendered or received	Timestamp/date	Yes	Owner/evidence	Owner	Payment	Supersession
PAY-005	Acceptance date	Date accepted	Date/null	Conditional	Owner	Owner	Current path	Close path if accepted
PAY-006	Allocation	Period/charge allocation	Structured list/unknown	Conditional	Owner/ledger	Owner/reviewer	Demand	Pause if unknown
PAY-007	Payment instrument	Check, ACH, cash, money order, other	Enum	Optional	Owner	Owner	Payment	Warning
PAY-008	Restrictive endorsement	Conditional wording present	Boolean/unknown	Conditional	Instrument	Owner	Payment	Route-out
PAY-009	Third-party payer	Third-party identity/type	String/enum	Conditional	Owner	Owner	Payment	Pause
PAY-010	Credit amount	Credit against rent	Currency	Conditional	Ledger/agreement	Reviewer + owner	Demand	Reduce demand
PAY-011	Concession amount	Agreed concession	Currency	Conditional	Agreement	Reviewer + owner	Demand	Reduce demand
PAY-012	Overpayment	Payment exceeds amount allocated	Currency	Optional	Calculation	Reviewer	Demand	Pause/review
PAY-013	Pending payment	Payment initiated but unresolved	Boolean	Yes	Owner	Owner	Demand/release	Pause
PAY-014	Subsidy payment	Agency/third-party subsidy involvement	Boolean/unknown	Yes	Owner/docs	Owner	Demand	Route-out
4.7 Service and server facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence
SRV-001	Service record ID	Unique factual service record	UUID	Per record	System	System	Serve & Track	Audit
SRV-002	Service attempt ID	Unique attempt	UUID	Per attempt	System	System	Serve & Track	Audit
SRV-003	Attempt date	Date of attempt	Date	Yes	Entrant/server	Server	Report	Review if inconsistent
SRV-004	Attempt time	Time of attempt	Time	Yes	Entrant/server	Server	Report	Review
SRV-005	Method reported	Personal, substituted, posting/mailing, other	Enum	Yes	Server	Server	Report	Warning/pause
SRV-006	Location	Where activity occurred	String	Yes	Server	Server	Report	Review
SRV-007	Mailing date	Date mailed	Date/null	Conditional	Server	Server	Report	Review
SRV-008	Mailing method	Method reported	Enum	Conditional	Server	Server	Report	Review
SRV-009	Server identity	Actual person performing activity	Structured identity	Yes	Server/owner	Server	Declaration	Pause if missing
SRV-010	Data entrant	Person entering record	User ID	Yes	System	System	Audit	None
SRV-011	Actual-server confirmation	Server confirms factual entry	Boolean	Required for signed declaration	Server	Server	Declaration	Block declaration if false
SRV-012	Factual attestation	Specific factual confirmations	Boolean set	Conditional	Server	Server	Declaration	Review
SRV-013	Notes	Factual notes	Text	Optional	Entrant/server	Server if substantive	Report	Warning
SRV-014	Amendment reason	Reason record changed	Text	Conditional	Entrant/server	Reviewer/server	Audit	None
SRV-015	Service issue	Incomplete, inconsistent, disputed, other	Enum	Conditional	System/reviewer	Reviewer	Resolve & Record	Pause
SRV-016	Report version	Generated report version	String	Yes	System	System	Export	Audit
SRV-017	Declaration status	Draft, server-reviewed, server-signed, superseded	Enum	Conditional	System/server	Server	Declaration	No sufficiency inference
4.8 Local attachment and filing facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence
LOC-001	Required attachment ID	Attachment required by active pack	UUID	Conditional	Registry	System	Draft	Block if missing
LOC-002	Attachment version	Version/checksum	String	Conditional	Registry	System	Draft	Block if stale
LOC-003	Translation requirement	Required language/version	Structured list	Conditional	Registry	System	Draft	Pause if uncertain
FIL-001	Filing requirement	Whether local filing is required	Boolean	Conditional	Active pack	System	Post-service	Pause
FIL-002	Filing due rule	Effective timing rule	Rule reference	Conditional	Registry	System	Filing	Warning/pause
FIL-003	Filing reported date	Date owner reports filing	Date	Conditional	Owner	Owner	Filing	Record only
FIL-004	Filing evidence	Receipt or confirmation	File/reference	Conditional	Owner	Reviewer	Filing	Pause if missing
FIL-005	Amendment/refiling status	None, required, reported, review-required	Enum	Conditional	Owner/registry	Reviewer	Filing	Pause
4.9 Review and confirmation facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence
REV-001	Reviewer identity	Assigned trained reviewer	User ID	Yes	System	System	Review	Block if absent
REV-002	Review status	Pending, correction-required, complete, route-out	Enum	Yes	Reviewer	Reviewer	Draft	Gate
REV-003	Review checklist version	Version used	String	Yes	System	Reviewer	Audit	None
REV-004	Correction event	Original/revised value and reason	Structured record	Conditional	Reviewer	Reviewer	Review	Owner reconfirmation
CONF-001	Owner confirmation event	Versioned owner attestation	UUID	Per event	Owner	Owner	Release/action	Gate
CONF-002	Confirmation scope	Facts, amount, jurisdiction, release, payment, service, filing, withdrawal	Enum	Yes	System	Owner	Workflow	Gate
CONF-003	Confirmation text version	Exact wording version	String	Yes	System	System	Audit	None
4.10 Outcome and recommendation facts
Fact ID	Label	Definition	Type	Required	Source	Confirmation	Workflow	Consequence
OUT-001	Outcome type	One of six approved factual outcomes	Enum	Per outcome	Owner/operator	Owner/reviewer	Resolve & Record	State transition
OUT-002	Outcome timestamp	When reported	Timestamp	Yes	System	System	Audit	None
OUT-003	Outcome evidence	Supporting record	File/reference	Optional	Owner	Reviewer	Outcome	Warning
REC-001	Recommendation ID	Internal recommendation record	UUID	Per recommendation	System	System	Lineage	None
REC-002	Original facts reference	Facts supporting original recommendation	Reference list	Yes	System	System	Lineage	None
REC-003	Original evidence reference	Evidence supporting original recommendation	Reference list	Yes	System	System	Lineage	None
REC-004	Superseding event ID	Event causing changed-fact review	UUID	Conditional	System	System	Supersession	None
REC-005	Supersession status	Active, superseded, withdrawn	Enum	Yes	System	System	Recommendation	Controls current use
REC-006	Supersession label	“Superseded by changed facts”	Fixed string	Conditional	System	System	UI	No error implication
5. Fact-Status Taxonomy
5.1 Defined statuses
Status	Meaning	Assignable by
USER_SUPPLIED	Entered by user but not independently confirmed	User/system on capture
OWNER_CONFIRMED	Owner explicitly confirmed fact	Owner only
SERVER_CONFIRMED	Actual server confirmed service fact	Actual server only
DOCUMENT_SUPPORTED	Fact matches a reviewed document	Trained reviewer or validated extraction plus review
SYSTEM_DERIVED	Deterministically derived from confirmed inputs and approved rule	System
REVIEWER_CONFIRMED_FACTUAL	Reviewer confirmed factual or clerical consistency	Trained reviewer
UNKNOWN	Fact cannot presently be determined	User, reviewer, system
MISSING	Required fact absent	System or reviewer
DISPUTED	Fact is affirmatively contested	Owner, reviewer
CONFLICTING	Two or more sources disagree	System or reviewer
SUPERSEDED	Replaced by later accepted fact while retained in lineage	System after authorized event
REQUIRES_REVIEW	Factual or legal applicability review required	System or reviewer
UNSUPPORTED	Outside activated workflow or lacks required authority/evidence	System under approved rule
5.2 Non-inference rules
The system may never automatically infer:
OWNER_CONFIRMED;
SERVER_CONFIRMED;
REVIEWER_CONFIRMED_FACTUAL;
absence of dispute;
legal validity;
legal sufficiency;
cure;
waiver;
surrender;
tenancy termination;
enforceability;
attorney approval.
DOCUMENT_SUPPORTED may not be assigned solely because a file exists. A reviewer or separately approved extraction-validation process must establish the match.
6. Matter State Model
6.1 Lifecycle states
State	Entry conditions	Permitted actions	Prohibited actions	Exit condition	Responsible role	Document production
intake_started	Matter created	Enter facts, upload records	Generate/release draft	Required intake begun	Owner/user	No
intake_incomplete	Required facts missing	Complete facts	Eligibility approval	Required facts supplied	Owner	No
factual_review_required	Intake complete	Reviewer comparison	Release draft	Review begins/completes	Reviewer	No
factual_correction_required	Reviewer finds clerical/factual issue	Correct with lineage	Clear legal issue	Correction + owner reconfirmation	Reviewer/owner	No
eligibility_pending	Facts reviewed; controls unresolved	Evaluate activated controls	Release	Eligible, pause, or route-out	System/reviewer	No
paused	Clearable uncertainty or missing evidence	Add evidence, factual correction	Operative progression	Valid clearing evidence	Owner/reviewer	No
routed_out	Unsupported or non-clearable condition	Education, export, independent consultation suggestion	Continue current workflow	New separately supported matter only	Owner	No
eligible_for_draft	All active controls satisfied	Generate draft	Release without confirmation	Draft generated	System	Yes
draft_generated	Draft created	Review draft	Sign/send/serve through platform	Owner confirmation required	Owner	Yes
owner_confirmation_required	Draft ready for release	Confirm facts and release decision	Release without confirmation	Valid confirmation	Owner	Yes
owner_confirmed	Confirmation recorded	Release draft	Alter confirmed facts silently	Release event	System/operator	Yes
released_to_owner	Draft delivered to owner	Download/use outside platform, begin service documentation	Imply validity	Owner action	Owner	Already produced
service_documentation_started	Service lane opened	Record factual activity	Determine sufficiency	Outcome or issue	Owner/server	No new legal document unless approved
service_issue_requires_review	Missing/conflicting service facts	Correct facts or route out	Mark legally served	Resolved factual issue or route-out	Reviewer/server	No
payment_event_reported	Payment event recorded	Confirm status/evidence	Continue prior recommendation automatically	Consequence applied	Owner/reviewer	No
recommendation_superseded	Changed facts supersede active recommendation	Review updated path	Use superseded recommendation	New recommendation or withdrawal	System/owner	No
current_notice_path_closed	Accepted full or partial payment under approved beta policy	Record factual outcome, archive current path	Revive same notice	New supported workflow	Owner/system	No
owner_withdrew_path	Owner chooses withdrawal	Record withdrawal	Continue current notice path	Archive/new matter	Owner	No
possession_change_reported	Owner reports possession change	Record facts, route if needed	Infer surrender or termination	Archive/new supported path	Owner	No
attorney_referral_reported	Owner reports independent attorney involvement	Record limited factual status	Transmit or verify advice	Archive/new supported workflow	Owner	No
archived	Matter no longer active	View/export permitted records	Operative progression	New matter required	Owner/operator	No
6.2 State naming rule
No state may imply:
legal validity;
cure;
waiver;
termination;
successful service;
surrender;
enforceability;
litigation readiness;
court acceptance.
7. Trigger and Consequence Architecture
7.1 Five consequence layers
Neutral observation
Records a fact without changing workflow authority.
Warning
Displays information but permits continuation.
Workflow pause
Temporarily prevents progression until specified factual evidence is supplied.
Route-out
Ends the current supported workflow without determining the user’s legal rights.
Legally consequential block
Prevents draft production, release, service-related progression, filing-related progression, or other operative action under a Janna-validated and Founder-activated control.
These are separate from:
owner confirmation;
non-attorney review;
optional independent-attorney suggestion.
7.2 counsel_route_trigger
counsel_route_trigger is:
an existing production-consumed field;
subject to separate semantic review;
unavailable for new controls in this draft;
not a neutral risk-observation field;
not authorized for new writes;
not authorized for reuse or reinterpretation.
7.3 Proposed trigger catalog
Trigger ID	Predicate	Evidence	Consequence	User wording	Reviewer	Clearable?	Production state
TRG-JUR-001	Jurisdiction unresolved	Resolver output + address	Pause	“We could not confirm the local jurisdiction.”	Reviewer/owner	Proposed, pending validation	Disabled
TRG-JUR-002	No active local pack	Registry state	Route-out	“This workflow is not active for this jurisdiction.”	System	No within current workflow	Disabled until registry exists
TRG-AUTH-001	Owner authority missing	Authority docs	Pause	“Owner authority must be confirmed before continuing.”	Reviewer	Yes factually	Disabled
TRG-AUTH-002	Owner authority disputed	Conflicting evidence	Route-out	“Authority to act is disputed and cannot be resolved in this workflow.”	Reviewer	No	Disabled
TRG-RENT-001	Non-base charge included	Ledger line category	Block	“This amount is outside the approved automated demand path.”	System/reviewer	Yes by removal	Disabled
TRG-RENT-002	Ledger conflict	Conflicting sources	Pause	“The rent records do not match.”	Reviewer	Sometimes	Disabled
TRG-RENT-003	Period unidentified	Missing period	Block	“Each amount must be tied to a rental period.”	System	Yes factually	Disabled
TRG-RENT-004	Unsupported increase	Missing source	Pause	“The current rent amount requires supporting documentation.”	Reviewer	Sometimes	Disabled
TRG-PAY-001	Pending payment	Owner report	Pause	“A payment is still pending. Record the result before continuing.”	Owner	Yes factually	Disabled
TRG-PAY-002	Accepted full payment	Owner confirmation	Close current path	“Accepted full payment ends the current nonpayment path.”	Owner	No same-notice revival	Disabled
TRG-PAY-003	Accepted partial payment	Owner confirmation	Close current path	“Accepted partial payment ends the current path under the beta policy.”	Owner	No same-notice revival	Disabled
TRG-PAY-004	Rejected payment	Owner confirmation	Record only/warning	“The rejected payment was recorded.”	Owner	N/A	Disabled
TRG-PAY-005	Reversal/dishonor/refund	Evidence	Pause and route-out	“This payment change requires a new review.”	Reviewer	No within current workflow	Disabled
TRG-PAY-006	Conditional endorsement	Instrument/evidence	Route-out	“The payment contains conditions this workflow cannot evaluate.”	Reviewer	No	Disabled
TRG-SUB-001	Subsidy detected	Owner/docs	Route-out	“Subsidized-rent treatment is not supported in this beta path.”	Reviewer	No	Disabled
TRG-SRV-001	Server identity missing	Service record	Pause	“The actual server must be identified.”	Reviewer	Yes	Disabled
TRG-SRV-002	Server confirmation absent	Service record	Pause	“Actual-server confirmation is required for this declaration state.”	Server	Yes	Disabled
TRG-SRV-003	Service inconsistency	Conflicting entries	Pause/route-out	“The service record contains inconsistent information.”	Reviewer	Sometimes	Disabled
TRG-SRV-004	Legal sufficiency requested	User request	Warning/route-out	“OwnerPilot records service activity but does not determine legal sufficiency.”	System	No conclusion available	Disabled
TRG-LOC-001	Required attachment missing	Packet/registry	Block	“A required local attachment is missing.”	Reviewer/system	Yes	Disabled
TRG-LOC-002	Source expired	Registry date/version	Block	“This local workflow is temporarily unavailable while sources are updated.”	Source owner	No until revalidated	Disabled
TRG-PROT-001	Habitability issue	Owner facts	Route-out	“A property-condition issue requires a different review path.”	Reviewer	No	Disabled
TRG-PROT-002	Retaliation issue	Owner facts	Route-out	“The surrounding facts require independent legal review.”	Reviewer	No	Disabled
TRG-PROT-003	Fair housing/accommodation	Owner facts	Route-out	“This issue is outside the supported beta path.”	Reviewer	No	Disabled
TRG-LIT-001	Bankruptcy	Owner facts	Route-out	“This workflow cannot continue where bankruptcy may affect the matter.”	Reviewer	No	Disabled
TRG-LIT-002	Active litigation	Owner facts	Route-out	“This workflow is not available for an active legal proceeding.”	Reviewer	No	Disabled
TRG-AGR-001	Settlement/surrender request	User request	Route-out	“Agreement tools are not available in this beta path.”	System/reviewer	No	Disabled
7.4 Required audit record per trigger
Each trigger event must record:
trigger ID;
matter ID;
predicate facts;
fact statuses;
source references;
control version;
timestamp;
consequence layer;
user wording version;
reviewer identity;
clearable status;
clearing evidence, if any;
prior and next matter states;
feature-flag state;
correlation ID.
8. Non-Attorney Factual Review Specification
8.1 Permitted activities
A trained non-attorney reviewer may:
confirm factual completeness;
compare fields with source documents;
check arithmetic;
reconcile an unambiguous ledger;
identify discrepancies;
perform clerical corrections;
confirm rule-pack and form versions;
check packet completeness;
preserve pauses, blocks, and route-outs;
return matters for owner correction;
verify that owner confirmation occurred.
8.2 Prohibited activities
The reviewer may not:
provide legal advice;
select remedies;
determine waiver;
determine cure;
determine service validity;
clear disputed legal issues;
advise settlement terms;
declare a notice valid;
declare a notice enforceable;
represent that legal eligibility has been attorney approved;
override a disabled or non-clearable control.
8.3 Review checklist
The reviewer must check:
owner identity and authority;
property address and unit;
tenancy identity;
tenancy type;
current lease or rent source;
rent amount;
rental periods;
ledger consistency;
payment history;
credits and concessions;
excluded charges;
pending or disputed payments;
subsidy detection;
protected-issue detection;
jurisdiction and pack version;
required attachments;
owner confirmation requirements;
packet field consistency;
source and template versions;
unresolved route-outs.
8.4 Correction workflow
Every correction must preserve:
immutable original value;
original actor;
revised value;
reviewer identity;
reason;
supporting source;
timestamp;
affected calculations;
affected draft version;
whether owner reconfirmation is required.
Owner reconfirmation is required where correction affects:
owner authority;
property;
tenant identity;
rent;
rental periods;
demand amount;
credits;
payments;
jurisdiction;
signer;
release decision;
service facts previously confirmed by owner;
outcome status.
9. Owner-Confirmation Specification
9.1 Required confirmation events
Event	Confirmation scope
CONF-AUTH	Owner authority and signer capacity
CONF-PROP	Property and tenancy facts
CONF-JUR	Proposed jurisdiction fallback, when later authorized
CONF-RENT	Current rent and supporting source
CONF-DEMAND	Period-by-period demand and total
CONF-CREDIT	Payments, credits, concessions, pending funds
CONF-RELEASE	Release of draft to owner
CONF-PAY	Payment acceptance, rejection, allocation, reversal facts
CONF-WITHDRAW	Owner withdrawal of current path
CONF-SRV	Owner-entered administrative service facts
CONF-SIGN	Owner decision to sign or use document
CONF-SERVE	Owner decision regarding service outside platform
CONF-FILE	Owner-reported filing action
CONF-META	Metadata opt-out or photo settings, when later implemented
9.2 Confirmation effect
Owner confirmation:
confirms owner-supplied facts or decisions;
records the owner’s requested action;
does not establish legal sufficiency;
does not validate the notice;
does not cure UPL or LDA issues;
does not clear a non-clearable trigger;
does not constitute attorney review;
does not convert an inactive jurisdiction into an active one.
10. Demand-Control Specification
10.1 Approved automated path
The proposed automated demand path may include only:
unpaid base rent;
already due;
tied to identified rental periods;
supported by a lease or validated rent-change source;
consistent with the ledger;
consistent with payment history;
adjusted for payments;
adjusted for credits;
adjusted for concessions;
adjusted for agreed changes;
undisputed;
owner confirmed.
10.2 Automatic exclusions
Automatically exclude:
late fees;
utilities;
repair charges;
returned-payment fees;
parking;
penalties;
legal fees;
administrative fees;
all other non-base-rent amounts.
Excluded amounts may be displayed separately as owner-reported claims only if approved copy makes clear they are not included in the automated statutory-demand calculation.
10.3 Period record structure
Each demanded period must include:
period ID;
period start;
period end;
contractual base rent;
supported rent source;
due date;
payments allocated;
credits allocated;
concessions allocated;
net unpaid base rent;
source references;
owner confirmation;
reviewer confirmation;
calculation version.
10.4 Calculation rules
Use decimal currency arithmetic.
Store currency in smallest units or a fixed-precision decimal type.
Never use floating-point arithmetic for totals.
Round only at displayed currency precision.
Preserve pre-rounding values where prorating is later authorized.
Total demand equals the sum of approved period records.
Negative period balances may not be silently applied across periods without an approved allocation rule.
Overpayments require review.
Partial periods remain disabled unless a validated rule authorizes them.
Unsupported rent increases must pause.
Pending payments must pause.
Disputed amounts must route out.
Subsidized matters must route out.
Unknown allocation must pause.
10.5 Provenance
The calculation record must preserve:
lease version;
rent-change version;
ledger version;
payment-history version;
credits and concessions;
calculation code version;
reviewer identity;
owner confirmation;
timestamp;
superseded calculations.
11. Jurisdiction and Local Rule-Pack Specification
11.1 Jurisdiction registry fields
Each jurisdiction record must contain:
jurisdiction ID;
name;
activation status;
controlling authority;
source owner;
legal reviewer;
approval date;
review or expiration date;
effective date;
source version;
form version;
form checksum;
required attachments;
translation versions;
applicability conditions;
unsupported-jurisdiction fallback;
rollback or suspension state;
audit history.
11.2 Local-pack states
DRAFT
RESEARCH_PENDING
LEGAL_VALIDATION_PENDING
FOUNDER_ACTIVATION_PENDING
ACTIVE
SUSPENDED
EXPIRED
SUPERSEDED
RETIRED
Only ACTIVE may support operative local behavior.
11.3 Version preservation
Each matter must retain:
jurisdiction pack ID;
pack version;
source versions;
form versions;
attachment versions;
translation versions;
activation date;
effective date;
review date.
A later pack may not silently update an existing matter.
11.4 Suspension and rollback
A pack must suspend where:
controlling authority changes;
source version is uncertain;
required form is withdrawn;
checksum changes unexpectedly;
legal review expires;
attachment or translation rules are uncertain;
a material defect is discovered.
Suspension must:
block new operative use;
preserve existing matter records;
identify affected matters;
create an audit event;
require legal revalidation and Founder reactivation.
11.5 Los Angeles City
Los Angeles City remains:
proposed;
inactive;
not production authorized;
subject to source repair;
subject to Janna validation;
subject to Founder activation.
Owner-confirmed jurisdiction fallback is a proposed control only and must not be used in production until separately activated.
12. Serve & Track Specification
12.1 Product role
Serve & Track is the Founder-approved complete factual service-documentation lane in product scope.
It must remain distinct from:
legal service sufficiency;
filing eligibility;
court acceptance;
proof-of-service conclusions.
12.2 Approved labels
Service Activity Report
Service activity recorded — legal sufficiency not determined
Service documentation recorded
Draft Server Declaration — actual-server review and signature required
Server-Signed Declaration — legal sufficiency not determined
12.3 Prohibited labels
Proof of Service
Service Completed
Legally Served
Valid Service
Filing-Ready Service Declaration
12.4 Service record structure
Each service record should support:
matter ID;
notice ID;
service-record ID;
service-attempt ID;
date;
time;
method reported;
location;
mailing date;
mailing method;
server identity;
data entrant identity;
server confirmation;
factual attestations;
notes;
amendment history;
evidence references;
report version;
declaration state;
service issue status.
12.5 Declaration lifecycle
Proposed states:
NOT_STARTED
DRAFT_GENERATED
ACTUAL_SERVER_REVIEW_REQUIRED
ACTUAL_SERVER_CONFIRMED
SERVER_SIGNED
AMENDED
SUPERSEDED
WITHDRAWN
No state may imply legal sufficiency.
12.6 Implementation classification
Currently implemented and verified
service dates;
attempts;
mailing;
server identity and attestations;
printable service logs/reports;
same-browser localStorage continuity.
Present but incomplete
notes-related state scaffolding;
service report generation;
service workflow dependent on prior local matter state.
Absent or not verified
rendered notes input;
durable server-side service persistence;
RiskPath linkage;
photograph upload;
durable photograph storage;
authoritative timestamp/provenance preservation;
cross-device continuity;
end-to-end operational proof;
identified comprehensive automated test coverage.
Legally permitted in concept but not implementation authorized
factual service prompts;
actual-server confirmation;
draft declaration lifecycle;
durable factual documentation;
approved reports.
Disabled pending validation
legal sufficiency conclusions;
service defect clearing;
photo evidentiary claims;
filing-readiness conclusions.
13. Service-Photo Design Controls
Design status only. Feature remains disabled.
Each photo record should support:
immutable original file;
cryptographic hash;
server upload timestamp;
device-created timestamp, if available;
GPS metadata, if available;
uploader identity;
actual photographer/server identity;
matter ID;
notice ID;
service-attempt ID;
original metadata;
metadata opt-out record;
annotations stored separately;
annotation actor and timestamp;
access log;
export log;
retention state;
deletion state;
legal-hold state, if later validated;
provenance warnings.
13.1 Required controls
Never rewrite original metadata.
Store annotations separately from the original.
Preserve original hash.
Record imported versus device-captured status.
Distinguish device timestamp from trusted server receipt time.
Do not call a timestamp authoritative unless a separately approved architecture establishes that status.
Do not infer location from missing GPS.
Do not infer photographer identity from uploader identity.
Warn where metadata is missing or altered.
Require owner-controlled metadata opt-out.
Record every access and export.
13.2 Unresolved items
retention period;
deletion period;
legal-hold treatment;
privacy notices;
access rights;
evidentiary wording;
third-party faces or identifying information;
location sensitivity;
server consent;
tenant privacy implications.
14. Payment-Event State Machine
14.1 Event types
OFFERED
RECEIVED
ACCEPTED
REJECTED
DEPOSITED
ALLOCATED
RETURNED
REFUNDED
REVERSED
DISHONORED
CONDITIONAL
THIRD_PARTY
DISPUTED
STATUS_REQUIRES_REVIEW
14.2 Required event fields
payment-event ID;
matter ID;
amount;
date;
event type;
payer;
payment instrument;
acceptance status;
allocation;
evidence;
owner confirmation;
reviewer status;
prior recommendation ID;
supersession result;
audit timestamp.
14.3 Approved beta consequences
Accepted full payment closes the current nonpayment path.
Accepted partial payment closes the current path under the conservative beta policy.
Rejected payment may be recorded without automatic closure.
Unresolved events pause or remain record-only.
Prior recommendation lineage remains preserved.
Changed facts may supersede the active recommendation.
14.4 Disabled consequences
same-notice revival;
revival after reversal;
revival after dishonor;
revival after return;
revival after refund;
legal effect of conditional payment;
restrictive-endorsement conclusions;
waiver conclusions;
cure conclusions;
preservation-of-rights conclusions;
settlement conclusions.
15. Recommendation Supersession
A supersession record must contain:
original recommendation ID;
original facts;
original evidence;
original timestamp;
superseding event;
new facts;
new evidence;
supersession timestamp;
updated recommendation;
owner decision;
lineage references;
control version;
actor.
Required label:
Superseded by changed facts
Do not use “incorrect” unless the original recommendation was inaccurate based on the facts and evidence available when issued.
Supersession:
does not delete the original;
does not automatically imply record correction;
does not automatically imply DECG trace staleness;
does not amend RCO-001;
does not amend DECG-001;
does not determine waiver or cure.
16. Resolve & Record
16.1 Approved factual outcomes
payment reported;
payment status requires review;
owner withdrew the current notice path;
possession change reported;
service issue requires review;
attorney referral.
16.2 Outcome structure
Each outcome must include:
outcome ID;
matter ID;
type;
timestamp;
reporting actor;
owner confirmation;
factual description;
evidence references;
reviewer requirement;
prior matter state;
new matter state;
RiskPath link;
copy version;
audit history;
prohibited-inference code.
16.3 Outcome rules
Payment reported
Records factual payment activity.
May initiate payment state processing.
Does not independently imply acceptance, cure, or waiver.
Payment status requires review
Used where amount, status, allocation, or effect is unresolved.
Pauses progression.
Does not determine legal consequence.
Owner withdrew current notice path
Records owner’s decision not to continue that path.
Does not imply waiver of unrelated rights.
Does not determine tenancy status.
Possession change reported
Records owner-reported change in occupancy or possession.
Does not establish surrender, abandonment, termination, or lawful recovery.
Service issue requires review
Records incomplete, conflicting, disputed, or uncertain service documentation.
Does not determine invalidity.
Attorney referral
Defined narrowly as:
A factual record that the owner reports the matter was referred or taken to an independent attorney outside OwnerPilot.
It must not:
provide a referral service;
recommend an attorney;
select an attorney;
transmit the matter;
imply attorney availability through OwnerPilot;
imply OwnerPilot verified advice;
store privileged communications without separate approval.
17. External Legal Review and Route-Out
Where a control cannot be resolved within OwnerPilot, use:
Cannot be cleared within OwnerPilot. The current workflow remains paused or routed out. The owner may later begin a newly supported workflow using updated owner-supplied facts and evidence.
OwnerPilot must not:
certify outside legal advice;
verify an outside attorney’s conclusion;
treat outside advice as automatically clearing a control;
accept privileged communications unless separately authorized;
represent outside consultation as required in every matter;
imply an attorney is available through OwnerPilot.
A later workflow may begin only through:
new owner-supplied facts;
new evidence;
an activated product path;
a new eligibility assessment.
18. Public-Copy Controls
18.1 Approved factual language
Draft prepared from the information you provided.
Owner review required.
Factual review completed.
Service activity recorded — legal sufficiency not determined.
Service documentation recorded.
Payment reported.
Payment status requires review.
Owner withdrew the current notice path.
Possession change reported.
Independent legal consultation may be appropriate.
This workflow is not available for the facts reported.
This draft is for owner review before use.
18.2 Disabled pending validation
Prepared through an attorney-approved workflow.
Factual review completed — broker supervised.
18.3 Prohibited language
lawyer reviewed;
legally approved;
legally compliant;
legally verified;
valid notice;
court-ready;
service-ready;
guaranteed;
stay protected;
attorney supervised;
attorney approved;
legal approval complete;
service legally completed.
18.4 Internal-only language
The following may appear only in internal control records:
trigger identifier;
control version;
route-out classification;
legal-validation status;
source hierarchy;
disabled-control state;
reviewer queue;
unresolved authority;
Founder activation status.
19. Audit and Versioning Specification
19.1 Required audit event types
intake created;
fact added;
fact changed;
source added;
source changed;
correction proposed;
correction accepted;
calculation created;
calculation superseded;
review assigned;
review completed;
owner confirmation requested;
owner confirmation completed;
draft generated;
draft superseded;
draft released;
service attempt recorded;
service record amended;
report generated;
declaration state changed;
payment event recorded;
payment status changed;
workflow paused;
workflow routed out;
workflow blocked;
outcome recorded;
recommendation superseded;
source version changed;
local pack suspended;
local pack activated;
export created;
archive event.
19.2 Required audit fields
Each event must include:
event ID;
matter ID;
actor ID;
actor role;
timestamp;
previous value;
new value;
source reference;
reason;
control version;
template version;
jurisdiction-pack version;
correlation ID;
feature-flag state;
review status;
owner-confirmation reference;
supersession link, where applicable.
19.3 Version rules
Every draft must be versioned.
Every calculation must be versioned.
Every template must be versioned.
Every local pack must be versioned.
Every public-copy string used in a consequential step must be versioned.
Every confirmation text must be versioned.
Every report and declaration must identify its version.
Superseded versions must remain auditable.
No silent mutation is allowed.
20. Feature Flags
All unresolved flags default OFF.
Flag	Purpose	Default
FF_BETA_ELIGIBILITY	Enables validated beta eligibility controls	OFF
FF_EVERY_NOTICE_REVIEW	Requires factual/package review for every notice	OFF until implementation authorization, but controlling launch policy requires it
FF_LA_LOCAL_PACK	Activates LA City pack	OFF
FF_OWNER_JURISDICTION_FALLBACK	Allows owner confirmation after resolver uncertainty	OFF
FF_PAYMENT_EVENT_CAPTURE	Enables payment-event recording	OFF
FF_ACCEPTED_PARTIAL_CLOSES_PATH	Applies conservative partial-payment consequence	OFF
FF_RESOLVE_RECORD	Enables six factual outcomes	OFF
FF_SERVER_DECLARATIONS	Enables declaration lifecycle	OFF
FF_SERVICE_PHOTOS	Enables photo upload	OFF
FF_DURABLE_SERVICE_PERSISTENCE	Enables server-side service persistence	OFF
FF_RISKPATH_SERVICE_LINKAGE	Links service records to RiskPath	OFF
FF_PAYMENT_REVIVAL	Enables any notice revival	OFF
FF_SETTLEMENT_TOOLS	Enables agreement tools	OFF
FF_PUBLIC_BROKER_WORDING	Enables broker-supervision copy	OFF
FF_PUBLIC_ATTORNEY_WORKFLOW_WORDING	Enables attorney-workflow copy	OFF
No flag may itself create authority. Each requires:
legal validation where applicable;
Founder activation;
implementation authorization;
test evidence;
release approval.
21. Test Matrix
21.1 Unit tests
Test:
fact-status assignment;
demand period calculations;
automatic exclusions;
pending-payment pause;
accepted-payment path closure;
supersession lineage;
trigger predicates;
feature-flag defaults;
audit-event construction;
role permissions;
local-pack state transitions;
version preservation.
21.2 Integration tests
Test:
intake to factual review;
factual review to correction;
correction to owner reconfirmation;
eligibility to draft;
draft to owner release;
service entry to report;
payment event to supersession;
outcome to RiskPath linkage;
local pack to template selection;
source change to suspension.
21.3 E2E tests
Test:
complete eligible matter;
incomplete intake;
disputed ledger;
non-base charge;
unsupported increase;
pending payment;
unsupported jurisdiction;
inactive LA pack;
service issue;
accepted full payment;
accepted partial payment;
owner withdrawal;
possession change;
attorney referral record;
route-out.
21.4 Negative tests
Confirm that:
owner confirmation cannot clear a non-clearable route-out;
non-attorney reviewer cannot assign legal sufficiency;
inactive pack cannot produce local output;
stale source cannot be used;
excluded charges cannot enter demand;
unresolved subsidy cannot proceed;
counsel_route_trigger is not written;
attorney availability is not implied;
prohibited copy does not render;
disabled flags cannot be bypassed.
21.5 Stale-source tests
expired source suspends pack;
checksum mismatch suspends form;
superseded attachment cannot be selected;
existing matter retains prior version;
new matter uses new active version only after activation;
no silent migration.
21.6 Cross-device tests
matter persistence;
draft continuity;
service-record continuity;
owner-confirmation continuity;
audit-history continuity;
recovery after interrupted review;
version mismatch warning.
21.7 Copy tests
Search and fail for:
lawyer reviewed;
legally approved;
legally compliant;
legally verified;
valid notice;
court-ready;
service-ready;
guaranteed;
stay protected;
Proof of Service;
Service Completed;
Legally Served;
Valid Service;
Filing-Ready Service Declaration.
21.8 Role-permission tests
owner may confirm facts;
server may confirm service facts;
reviewer may perform factual correction;
reviewer may not clear legal route-out;
engineer role has no runtime legal authority;
system cannot infer owner/server confirmation.
21.9 No-silent-override tests
every override attempt creates denial and audit event;
no hidden flag bypass;
no direct API bypass;
no stale source override;
no owner-confirmation override of legal block;
no reviewer override of route-out.
21.10 Audit-lineage tests
original values preserved;
corrections linked;
calculations versioned;
supersession linked;
reports versioned;
exports logged;
actor and role recorded;
correlation ID maintained.
21.11 Feature-flag tests
all unresolved flags default off;
environment differences do not silently activate;
production activation requires explicit configuration;
disabled UI paths remain inaccessible by API;
rollback disables consequential behavior.
21.12 Production-gate isolation tests
new neutral observations do not write counsel_route_trigger;
no trigger writes a production gate without approved mapping;
route-out state does not imply attorney referral;
warnings do not create blocks;
factual status does not create legal conclusion.
21.13 Adversarial scenarios
Required scenarios:
disputed ledger;
unsupported rent increase;
non-base charge;
subsidy;
unknown jurisdiction;
stale LA source;
missing attachment;
payment during notice;
accepted partial payment;
payment reversal;
restrictive endorsement;
third-party payment;
service inconsistency;
server-party conflict;
missing server confirmation;
habitability;
retaliation;
fair housing;
settlement request;
owner changes confirmed amount after review;
form version changes before release;
owner attempts to bypass pause;
reviewer attempts to clear legal route-out;
cross-device version mismatch.
22. Current Implementation Mapping
22.1 Verified existing behavior
customer-facing chat intake exists;
structured notice wizard exists;
owner review flow exists;
notice draft production exists;
local draft same-browser restoration exists;
server-side chat-session persistence exists;
Serve & Track route and factual UI exist;
service dates and attempts can be entered;
mailing information can be recorded;
server identity and attestations exist;
printable service logs/reports exist;
Serve & Track empty-state behavior is characterized;
factual service-attempt entry is characterized;
current local draft can permit Serve & Track access;
production and preview environment separation exists in other operational lanes;
repository has test and CI conventions.
22.2 Present but incomplete behavior
jurisdiction routing concepts;
RiskPath structures;
local filing support;
LAHD checklist and filing-record scaffolding;
service notes state scaffolding;
payment-related data and status scaffolding;
outcome-related status scaffolding;
audit structures;
feature flags;
review gates;
BTRM stages implemented but dark;
service-report production;
current legal-risk fields, including production-consumed counsel_route_trigger.
22.3 Absent or not verified
full beta eligibility control layer;
trained non-attorney review workflow for every notice;
complete owner-confirmation event model;
durable service-record persistence;
RiskPath service linkage;
service notes UI;
service-photo upload;
durable photo storage;
photo provenance;
cross-device service recovery;
complete outcome workflows;
payment state machine;
recommendation supersession workflow;
jurisdiction registry;
activated local rule pack;
source registry;
local pack versioning;
checksum-controlled forms;
public-copy control enforcement for all required terms;
neutral observation store separated from production gates;
full audit lineage;
feature-flag activation governance;
end-to-end operational proof.
22.4 Designed but not authorized
California nonpayment eligibility envelope;
demand controls;
trigger architecture;
non-attorney review procedure;
owner-confirmation procedure;
payment-state model;
recommendation supersession;
six factual outcomes;
jurisdiction registry;
local-pack state model;
service declaration lifecycle;
photo controls;
audit model;
test matrix.
22.5 Disabled pending legal validation
free-beta LDA operating boundary;
entity-owner handling;
broker-supervision wording;
attorney-approved-workflow wording;
LA City controls;
owner jurisdiction fallback;
subsidized-rent treatment;
payment revival;
conditional payment conclusions;
restrictive endorsement;
broad cure or waiver;
settlement, release, waiver, surrender, or stipulated-judgment functions;
legal service-sufficiency conclusions.
23. Engineering Classification
23.1 Engineering may prepare, subject to separate authorization
repository-to-spec field mapping;
factual schema proposals;
neutral observation model;
audit event types;
test fixtures;
feature-flag definitions;
non-production design prototypes;
current implementation gap inventory;
source-registry schema;
jurisdiction-registry schema;
copy-string inventory;
reversible implementation sequence.
23.2 Engineering may design but not activate
eligibility controls;
demand gates;
review workflow;
owner confirmation;
route-out logic;
service declaration states;
payment consequences;
recommendation supersession;
Resolve & Record;
local-pack behavior;
source suspension;
public-copy controls.
23.3 Engineering must not implement without separate authority
production-consumed legal triggers;
counsel_route_trigger changes;
LA City activation;
demand blocking;
payment-path closure;
local-pack activation;
settlement functions;
legal sufficiency outputs;
public attorney or broker claims;
jurisdiction fallback;
customer-facing legal consequences.
24. Required Targeted Legal Validation
Before production activation, Janna must validate:
free-beta LDA applicability;
entity versus individual owner handling;
guided workflow boundary;
broker-supervision wording;
attorney-approved-workflow wording;
demand source hierarchy;
subsidized-rent route-out;
payment-state consequences;
partial-payment closure policy;
reversal, dishonor, refund, and revival;
conditional and third-party payment;
service factual prompts;
declaration wording;
service defect routing;
LA City source bundle;
LA attachments and translations;
LAHD filing and refiling;
owner jurisdiction fallback;
public-copy language;
all production legal-trigger consequences.
25. Founder Decision Register
The following remain unresolved Founder decisions:
final beta eligibility envelope;
entity-owner inclusion;
fixed-term inclusion;
final activation authority;
whether broker-supervision wording remains after validation;
settlement-feature sequencing;
service-photo priority;
narrower-than-maximum demand policy;
narrower-than-maximum payment policy;
manual exception policy;
implementation sequence;
rollout authorization;
LA City activation after validation.
This specification does not reopen:
California residential nonpayment as the first vertical;
free limited beta;
Serve & Track as the complete factual service-documentation lane in product scope;
six factual Resolve & Record outcomes;
no on-platform attorney service;
no implication that an attorney is available through OwnerPilot.
26. Specification Readiness
This draft is sufficiently structured for:
Architect verification;
Founder review;
targeted source repair;
focused Janna validation;
engineering impact analysis;
preparation of narrow implementation-authority requests.
It is not ready for:
production activation;
direct code implementation;
LA City activation;
legal-trigger activation;
public-copy publication;
customer-facing use;
canonical adoption;
RCO-001 or DECG-001 integration;
ECAP Phase B.
27. Final Governance Confirmation
This document is a noncanonical draft.
It does not:
create a constitutional doctrine;
create an Enterprise Architecture document;
create an ADR;
create an RPT;
create a CRID;
amend RCO-001;
amend DECG-001;
modify ECAP;
create implementation authority;
create production authority;
activate Los Angeles City;
activate a legal control;
authorize a GitHub change;
authorize a Google Drive publication;
authorize a Supabase change;
authorize a Vercel change;
authorize a production gate;
authorize an attorney workflow;
imply attorney availability through OwnerPilot.
All unresolved controls remain disabled.
