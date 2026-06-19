# CA Local Jurisdiction 3-Day Notice Supplemental Documentation Matrix — Broker Determination

**File:** `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`
**Date:** 2026-06-18
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE **B9445457**
**Authority:** Broker scope under Bus. & Prof. Code § 10131(b); Broker Blanket Authorization §§ 1–7 (2026-06-15)
**Lineage:** Companion to `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` and builds on `ownerpilot_la_rtc_citation_pull_attorney_signoff.md`
**Posture:** Required-but-pending. The geocode-confirmation logic and per-city jurisdiction-resolution gates are upstream dependencies. Until those land, this matrix governs which jurisdictions can be unblocked and in what order.

---

## §0 Scope

This determination maps **California cities with supplemental documentation requirements** that attach to a 3-day pay-or-quit notice (CCP § 1161(2)) above and beyond the statewide requirements in CCP §§ 1161, 1162, 1167, 1174, and Civ. Code §§ 1946.1, 1947.3.

The matrix covers two categories of supplemental obligations:

1. **Pre-service attachments / posted notices** — documents that must be served with the notice or posted on the property.
2. **Post-service filings** — copies of the notice that must be filed with a city housing department, rent board, or rent stabilization program within a specified deadline after service on the tenant.

It does **not** cover:

- Just-cause grounds language on the face of the notice (statewide AB 1482 plus city-specific just-cause text — covered by separate workflow).
- Rent-increase notice filing requirements (different notice type, different rule set).
- Ellis Act, owner-move-in, no-fault, or relocation-assistance procedures (different notice types).

This matrix is the broker's operational determination on which jurisdiction overlays the product must implement. Each row is a buildable rule. The matrix does not constitute legal advice to the user; it is the system's internal source of truth for which workflow branches execute when a property is geocoded to a given city.

---

## §1 Headline Ruling

OwnerPilot AI's 3-day notice workflow attaches the following supplemental obligations on a per-city basis:

- **City of Los Angeles** is the only California jurisdiction that requires both (a) a Renter Protections / Right-to-Counsel attachment served *with* the 3-day pay-or-quit, in the tenant's primary language from the LAHD-published set of nine, **and** (b) a post-service filing of the notice with the housing department within 3 business days.
- **San Jose, Mountain View, Inglewood, Richmond, Pasadena, Concord, East Palo Alto, Hayward, and West Hollywood** require post-service filing of all eviction notices (including 3-day pay-or-quit) with the local rent board or housing department within a city-specific deadline. Filing windows range from 2 business days (Richmond) to 30 calendar days (Hayward).
- **San Francisco** does **not** require Rent Board filing of 3-day notices for nonpayment of rent (Admin. Code § 37.9(c) carve-out). The 10-day pre-eviction warning ordinance (Ord. 18-22) was struck down by the Court of Appeal in September 2024 as preempted by state law. A new SF ordinance (File #251216, passed unanimously June 2026) appears to revive a 10-day warning rule but its effective date is unconfirmed at the date of this determination and it likely faces the same preemption challenge — treat as required-but-pending and do not implement until effective and survives challenge.
- **Santa Monica, Beverly Hills, Long Beach, Glendale, Antioch, Bell Gardens, Baldwin Park, Healdsburg, and Sacramento** do not require post-service filing of the 3-day pay-or-quit for nonpayment of rent specifically, though several require filings for other notice types (rent increases, owner move-in, Ellis Act, termination for no-fault).
- **Baldwin Park** has a unique 15-day cure period for nonpayment (in lieu of the state 3-day) that the product must honor when the property is geocoded to Baldwin Park.
- Every city overlay is **additive** to the statewide CCP § 1161(2) requirements — local rules cannot extend the state 3-day timeline (per *San Francisco Apartment Assoc. v. CCSF*, A166228, Sept. 11, 2024) but they can add documentation and filing obligations.

The product implements these overlays as a geocode-keyed dispatch: jurisdiction resolves → matrix row applies → overlay attaches. Jurisdictions not in the matrix default to statewide-only requirements (CCP §§ 1161, 1162, 1167, 1174; Civ. Code §§ 1946.1, 1947.3).

---

## §2 The Matrix

Legend:
- **Pre-service**: documents that must be served with the 3-day notice or posted on the property.
- **Post-service**: copies of the notice that must be filed after service.
- **Branch state**: `LIVE` = ready to implement; `REQUIRED-BUT-PENDING` = rule confirmed but blocked on geocode/calendar/form-refresh dependency; `MONITOR` = ordinance passed but effective date or legal validity uncertain.

### §2.1 City of Los Angeles

| Field | Value |
|---|---|
| **Authority** | LAMC § 151.09.C.9; LAMC § 165.05.B.5; Ordinance 188,681 (eff. 8/20/2025) |
| **Applies to** | All rental units in City of LA, regardless of RSO/JCO coverage |
| **Pre-service attachments** | (1) LAHD Renter Protections / Right-to-Counsel notice in tenant's primary language (9 LAHD-published languages; English fallback if not among the 9); (2) Renter Protections Notice posted in accessible common area of property |
| **Post-service filing** | File copy of the 3-day notice with LAHD within **3 business days** of service on tenant. LA city business-day calendar (not judicial-holiday calendar). Three filing channels: online portal, mail, in person |
| **Consequence of non-filing** | Tenant may raise as affirmative defense in unlawful detainer |
| **Sources** | [housing.lacity.gov/rtc](https://housing.lacity.gov/rtc); [housing.lacity.gov/renter-protections-2](https://housing.lacity.gov/renter-protections-2); [housing.lacity.gov/eviction-notices](https://housing.lacity.gov/eviction-notices) |
| **Branch state** | REQUIRED-BUT-PENDING — three dependencies (geocode confirmation, LA city business-day calendar, RTC form refresh job) must land first per `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` Resolution sections 3 and 5 |

### §2.2 San Francisco (City and County of)

| Field | Value |
|---|---|
| **Authority** | SF Admin. Code § 37.9(c); 1st Dist. Court of Appeal A166228 (Sept. 11, 2024); File #251216 (June 2026, effective date TBD) |
| **Applies to** | Rent-controlled units in CCSF |
| **Pre-service attachments** | SF Rent Board Form 1007 ("Notice to Tenant Required by Rent Ordinance") historically required with all termination notices including 3-day pay-or-quit per local custom; conservative implementation includes it |
| **Post-service filing** | **NOT required for 3-day pay-or-quit for nonpayment of rent.** SF Admin. Code § 37.9(c) explicitly excludes "three-day notices to pay rent or quit" from the Rent Board filing requirement that applies to other termination notices |
| **10-day pre-eviction warning** | Ord. 18-22 (eff. 3/14/2022, mandating 10-day warning before 3-day notice for at-fault grounds) was struck down by the Court of Appeal Sept. 11, 2024 as preempted by state law (San Francisco Apartment Assoc. et al. v. CCSF, A166228). **Do not implement.** A new ordinance under File #251216 was passed unanimously by the SF Board of Supervisors in June 2026; effective date and legal viability are not yet confirmed |
| **Sources** | [sf.gov news 9/12/2024](https://www.sf.gov/news/court-appeal-invalidates-10-day-warning-notice-legislation-update-3); [sfrb.org § 37.9](https://sfrb.org/node/520); [sfgov.legistar.com File 251216](https://sfgov.legistar.com/LegislationDetail.aspx?ID=7781525&GUID=7D7F35C5-6EFA-44BE-A09A-6A7318EF527A) |
| **Branch state** | LIVE for Form 1007 attachment; MONITOR for File #251216 — do not implement the new warning ordinance until effective date is confirmed and it has survived (or avoided) preemption challenge |

### §2.3 City of San Jose

| Field | Value |
|---|---|
| **Authority** | San Jose Municipal Code (Apartment Rent Ordinance / Tenant Protection Ordinance); ARO § 17.23.1240 et seq. |
| **Applies to** | Apartments built before September 1979 covered by ARO; TPO covers most other rental units city-wide |
| **Pre-service attachments** | TPO Required Posting and copy of Resources and References must be provided to tenants generally |
| **Post-service filing** | File copy of the 3-day notice with the city through the **Rent Stabilization Program online portal** within **3 days** of service on tenant. If an unlawful detainer is filed, copy of summons and complaint must also be filed within 3 days |
| **Consequence of non-filing** | Can affect the eviction's validity |
| **Sources** | [hdnalaw.com/san-jose-eviction-laws](https://hdnalaw.com/san-jose-eviction-laws/); [calwestrents.com San Jose Rent Control Guide](https://www.calwestrents.com/pdf/San-Jose-Rent-Control-Guide_Interim-Ordinance.pdf) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation and verification whether "3 days" runs on calendar days, business days, or court days |

### §2.4 Mountain View

| Field | Value |
|---|---|
| **Authority** | CSFRA (Community Stabilization and Fair Rent Act); Mountain View Municipal Code Ch. 17.55 |
| **Applies to** | CSFRA-covered units (most multi-family buildings built before Feb. 1, 1995) |
| **Post-service filing** | File copy of termination notice (including 3-day pay-or-quit) with the city within **3 days** of service via the city's online portal (`mbren.mountainview.gov`) or by other means |
| **Sources** | [Mountain View Eviction Protections](https://www.mountainview.gov/our-city/departments/housing/rent-stabilization/eviction-protections); [Nov. 2025 landlord compliance YouTube](https://www.youtube.com/watch?v=XaHeyCAXF8U) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.5 City of Richmond

| Field | Value |
|---|---|
| **Authority** | Richmond Municipal Code § 11.100.060(s)(1); Rent Board Regulation 17-10 |
| **Applies to** | All rental units in Richmond (not just rent-controlled) |
| **Post-service filing** | File copy of **all** termination notices, **including 3-day notices to pay rent or quit and notices to perform covenant or quit**, with the Rent Board within **2 business days** of service. Proof of service with time and date must accompany |
| **Consequence of non-filing** | "Failure to do so is a defense to an Eviction Lawsuit" |
| **Sources** | [richmondca.gov Form Center](https://www.ci.richmond.ca.us/FormCenter/Rent-Program-9/File-a-Notice-of-Termination-of-Tenancy--208); [Richmond Rights and Responsibilities](https://www.ci.richmond.ca.us/DocumentCenter/View/48232/Final-Rights-and-Responsibilities-for-Tenants-Presentation_English) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.6 City of Pasadena

| Field | Value |
|---|---|
| **Authority** | Pasadena Charter Amendment § 1806(k) (Tenant Protection / Rent Stabilization) |
| **Applies to** | Units covered by the Pasadena Rent Stabilization Ordinance |
| **Post-service filing** | File copy of termination notice with the Rent Stabilization Department within **3 days** of service. Email filings to rentalboard@cityofpasadena.net are accepted |
| **Sources** | [cityofpasadena.net Rent Stabilization Landlord FAQs](https://www.cityofpasadena.net/rent-stabilization/faqs-landlords/) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.7 City of Inglewood

| Field | Value |
|---|---|
| **Authority** | Inglewood Municipal Code §§ 8-121, 8-122 (Housing Protection Ordinance) |
| **Applies to** | Rental units subject to the Inglewood Housing Protection Ordinance |
| **Pre-service attachments** | Tenant must have received Inglewood notice of rights at the start of tenancy (12-point type; addendum or signed notice) |
| **Post-service filing** | File copy of termination notice (including 3-day notice to cure or quit) with the Inglewood Housing Protection Department within **3 days** of service. **The 3-day pay-or-quit for nonpayment is included in this rule per IMC § 8-122 as applied to "any notice to terminate a tenancy"** |
| **Sources** | [astanehelaw.com Inglewood Rent Ordinance](https://astanehelaw.com/tenants-rights/wrongful-eviction/inglewood-rent-ordinance/); [yourlegalcorner.com Inglewood Housing Protection](https://www.yourlegalcorner.com/articles.asp?cat=land&id=194&ttl=inglewood-housing-protection-ordinance) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.8 City of Concord

| Field | Value |
|---|---|
| **Authority** | Concord Municipal Code § 19.40.060(e) (Residential Tenant Protection) |
| **Applies to** | Covered units under Concord's Residential Tenant Protection Program |
| **Post-service filing** | File copy of termination notice through the **City's Rent Registry portal** within **7 calendar days** of service |
| **Sources** | [cityofconcord.org Rent Stabilization](https://www.cityofconcord.org/1172/Rent-Stabilization-and-Just-Cause-for-Ev); [codepublishing.com Concord 19.40](https://www.codepublishing.com/CA/Concord/html/Concord19/Concord1940.html) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.9 City of East Palo Alto

| Field | Value |
|---|---|
| **Authority** | East Palo Alto Rent Stabilization and Just Cause for Eviction Ordinance of 2010 |
| **Applies to** | Rent-stabilized units |
| **Post-service filing** | File copy of any notice to quit or summons/complaint in unlawful detainer with the Rent Stabilization Board within **5 days** of service on tenant |
| **Sources** | [East Palo Alto Rent Stabilization and Just Cause Guide](https://www.cityofepa.org/sites/default/files/fileattachments/rent_stabilization/page/10871/rsp_booklet_-_english_-_january_2017.pdf) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.10 City of Hayward

| Field | Value |
|---|---|
| **Authority** | Hayward Residential Rent Stabilization and Tenant Protection Ordinance |
| **Applies to** | All rental units in Hayward (per the city's published landlord guidance — note the broad scope including notices of termination) |
| **Post-service filing** | File copy of termination notice and rent-increase notice with the city within **30 days** of giving notice to tenant. Channels: mail, in person, or email to RentalNotifications@hayward-ca.gov |
| **Consequence of non-filing** | City may issue citation for each violation |
| **Sources** | [Hayward Tenant and Landlord Resources](https://www.hayward-ca.gov/residents/housing/resources-documents-and-forms-for-tenants-and-landlords) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.11 City of West Hollywood

| Field | Value |
|---|---|
| **Authority** | West Hollywood Municipal Code Title 17 (Rent Stabilization); §§ 17.28.060, 17.52.010 |
| **Applies to** | Rent-stabilized units |
| **Pre-service attachments** | At lease commencement: written notice of tenant rights + copy of ordinance. With any rent increase: same notice |
| **Post-service filing** | File copy of eviction notice with the **West Hollywood Rent Stabilization Commission** within **5 days** of serving the tenant. If unlawful detainer is filed, copy of summons and complaint also within 5 days |
| **Just-cause grounds on face** | Notice must cite the specific subsection of WHMC § 17.52.010 under which the landlord is proceeding |
| **Sources** | [kohan-law.com West Hollywood Eviction Lawyer](https://kohan-law.com/locations/west-hollywood-eviction-lawyer/); [bhrealestatelaw.com West Hollywood Rent Stabilization Guide](https://bhrealestatelaw.com/2026/05/14/west-hollywood-rent-stabilization-landlord-guide/); [tobenerlaw.com West Hollywood](https://www.tobenerlaw.com/rent-control-west-hollywood/) |
| **Branch state** | REQUIRED-BUT-PENDING — needs geocode confirmation |

### §2.12 City of Santa Monica

| Field | Value |
|---|---|
| **Authority** | Santa Monica Charter Amendment § 1806(e) (Rent Control) |
| **Applies to** | Rent-controlled units |
| **Pre-service attachments** | Rent Control Information Sheet must have been provided to new tenants since 7/31/2017 (tenancy-onset requirement, not 3-day-notice-specific) |
| **Post-service filing** | File copy of termination notice with the Rent Control Board within **3 days** of service. **Does NOT apply to 3-day notices for nonpayment of rent.** Applies to other termination grounds |
| **Just-cause grounds** | Must be cited on face of notice |
| **Sources** | [Santa Monica Rent Control Information Sheet 2025](https://www.santamonica.gov/media/Document%20Library/Topic%20Explainers/Rent%20Control%20Information%20by%20Subject/Rent_Control_Information_Sheet_2025.pdf); [kohan-law.com Santa Monica](https://kohan-law.com/locations/santa-monica-rent-control-eviction-lawyer/); [santamonica.gov Evictions Reg](https://www.santamonica.gov/media/Document%20Library/Detail/Rent%20Control%20Charter%20Amendment%20&%20Regulations/09,%20Evictions.pdf) |
| **Branch state** | LIVE — no filing required for 3-day pay-or-quit for nonpayment; just-cause grounds language on face required for non-nonpayment grounds |

### §2.13 City of Beverly Hills

| Field | Value |
|---|---|
| **Authority** | Beverly Hills Municipal Code Ch. 6 (RSO) and Ch. 5; BHMC § 4-6-6 (Evictions) |
| **Applies to** | Pre-1978/1986 multi-family units |
| **Pre-service attachments** | Tenant Landlord Handbook must have been provided 24 hours before lease execution (tenancy-onset requirement) |
| **Post-service filing** | For 90-day termination notices under BHMC § 4-6-6: notice must be filed with city's rent stabilization program **BEFORE** service on tenant, with $100 processing fee. For 3-day pay-or-quit specifically (CCP § 1161(2)): no separate filing required |
| **Sources** | [BHMC § 4-6-6 codelibrary.amlegal.com](https://codelibrary.amlegal.com/codes/beverlyhillsca/latest/beverlyhills_ca/0-0-0-4682); [Beverly Hills Rent Stabilization](https://www.beverlyhills.org/1098/Rent-Stabilization-Ordinance) |
| **Branch state** | LIVE for 3-day pay-or-quit; REQUIRED-BUT-PENDING for 90-day termination flow |

### §2.14 City of Glendale

| Field | Value |
|---|---|
| **Authority** | Glendale Municipal Code Ch. 9.30 (Just Cause and Retaliatory Eviction Ordinance) |
| **Applies to** | Rental units in Glendale (just-cause-coverage scope) |
| **Pre-service attachments** | With every rent increase notice, notice of availability of Rent Review and the city-provided form |
| **Post-service filing** | Termination notice must state just cause grounds; no specific city-filing rule for 3-day pay-or-quit for nonpayment of rent — CCP § 1161 controls |
| **Sources** | [Glendale Just Cause GMC Ch. 9.30](https://ecode360.com/43347753); [tobenerlaw.com Glendale](https://www.tobenerlaw.com/city-of-glendale-just-cause-and-retaliatory-eviction-ordinance/) |
| **Branch state** | LIVE — just-cause grounds language on face for non-nonpayment terminations; no special 3-day pay-or-quit filing |

### §2.15 City of Long Beach

| Field | Value |
|---|---|
| **Authority** | Long Beach Tenant Relocation Assistance Ordinance; CCP §§ 1161, 1161.1, 1162 |
| **Applies to** | Most rental units in Long Beach |
| **Post-service filing** | No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent. Tenant Relocation Assistance applies to no-fault terminations and 10%+ rent increases (separate workflow) |
| **Sources** | [tobenerlaw.com Long Beach](https://www.tobenerlaw.com/long-beach-tenant-rights/); [Long Beach Memo Apr 2023](https://www.longbeach.gov/globalassets/city-manager/media-library/documents/memos-to-the-mayor-tabbed-file-list-folders/2023/april-11--2023---overview-of-rental-assistance-programs-and-resources) |
| **Branch state** | LIVE — statewide-only for 3-day pay-or-quit |

### §2.16 City of Antioch

| Field | Value |
|---|---|
| **Authority** | Antioch Municipal Code Title 11 Ch. 1 (Rent Stabilization); Ordinance 2219-C-S |
| **Applies to** | Covered rental units |
| **Pre-service attachments** | City-provided notice at tenancy commencement and with rent-increase notices |
| **Post-service filing** | No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent in the current published RSO |
| **Sources** | [Antioch RSO Ordinance 2219-C-S](https://www.antiochca.gov/fc/administration/rent-stabilization/Rent-Stabilization-Ordinance.pdf); [AMC 11-6.04](https://codelibrary.amlegal.com/codes/antioch/latest/antioch_ca/0-0-0-41461) |
| **Branch state** | LIVE — statewide-only for 3-day pay-or-quit |

### §2.17 City of Bell Gardens

| Field | Value |
|---|---|
| **Authority** | Bell Gardens Municipal Code Ch. 5.62 (Rent Stabilization); Ch. 5.63 (Tenant Eviction Protections); Ordinance 925 (eff. 10/12/2022) |
| **Applies to** | Covered rental units (built before 2/1/1995, excluding single-family homes, condos, townhomes, owner-occupied 4-or-fewer-unit buildings) |
| **Pre-service attachments** | Notice of tenant rights at start of tenancy |
| **Post-service filing** | No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent in Ord. 925 |
| **Sources** | [Bell Gardens FAQs](https://www.bellgardens.org/government/city-departments/community-development/faqs); [Bell Gardens Ord. 925](https://agenda.bellgardens.org/AgendaPublic/AttachmentViewer.ashx?AttachmentID=7158&ItemID=3704); [BGMC 5.63 codepublishing.com](https://www.codepublishing.com/CA/BellGardens/html/BellGardens05/BellGardens0563.html) |
| **Branch state** | LIVE — statewide-only for 3-day pay-or-quit |

### §2.18 City of Baldwin Park

| Field | Value |
|---|---|
| **Authority** | Baldwin Park Municipal Code Ch. 117 (Rental Rate Increases / Rent Stabilization) |
| **Applies to** | Rent-controlled units (built before 2/1/1995, multi-family) |
| **Pre-service attachments** | Maximum allowable rent must be posted in prominent place |
| **Cure period extension** | **Baldwin Park MMC indicates tenant entitled to 15 days' notice before eviction for non-payment of rent**, which appears to extend the CCP § 1161(2) 3-day window. **CONFIRM with current code text before implementing — this could be either (a) a 15-day pre-eviction warning period required *before* serving a 3-day pay-or-quit, or (b) a 15-day cure period replacing the 3-day. If it is (a), it is at risk under the same preemption doctrine that invalidated SF Ord. 18-22.** |
| **Post-service filing** | File copy of termination notice within 3 days, **except for 3-day notices to pay rent or quit** |
| **Sources** | [baldwinpark.com Rent Control PDF](https://www.baldwinpark.com/DocumentCenter/View/426/Rent-Control-PDF); [tobenerlaw.com Baldwin Park](https://www.tobenerlaw.com/the-city-of-baldwin-park-rent-ordinance/) |
| **Branch state** | REQUIRED-BUT-PENDING — Baldwin Park 15-day rule is the only known unresolved item in this matrix. Need a citation pull on BPMC Ch. 117 latest text before unblocking |

### §2.19 City of Healdsburg

| Field | Value |
|---|---|
| **Authority** | Healdsburg Municipal Code Ch. 2.56 (Mobile Home Park Space Rent Stabilization) |
| **Applies to** | Mobile home park spaces only — NOT general residential rentals |
| **Post-service filing** | No 3-day pay-or-quit filing rule for residential rentals. Mobile home rent-increase notices require 90-day advance written notice |
| **Sources** | [HMC 2.56](https://www.codepublishing.com/CA/Healdsburg/html/Healdsburg02/Healdsburg0256.html); [Healdsburg Rent Advisory](https://healdsburg.gov/680/Rent-Advisory) |
| **Branch state** | LIVE — statewide-only for general residential 3-day pay-or-quit |

### §2.20 City of Sacramento

| Field | Value |
|---|---|
| **Authority** | Sacramento City Code Ch. 5.156 (Tenant Protection); Ordinance 2019-0025 (Tenant Protection and Relief Act) |
| **Applies to** | Units built on or before 2/1/1995; just-cause requires 12+ months tenancy |
| **Post-service filing** | No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent. Owner-move-in and Notice of Intent to Withdraw have separate filing rules (30-day window for owner-move-in copy filing) |
| **Sources** | [Sacramento City Code Ch. 5.156](https://www.cityofsacramento.gov/content/dam/portal/cdd/Code-Compliance/TPP/Sacramento-City-Code-Chapter-5156--Tenant-Protection.pdf); [Sacramento TPP Admin Procedures](https://www.cityofsacramento.org/-/media/Corporate/Files/CDD/Code-Compliance/TPP/TPP-Final-Admin-Procedures.pdf?la=en) |
| **Branch state** | LIVE — statewide-only for 3-day pay-or-quit |

### §2.21 City of Berkeley

| Field | Value |
|---|---|
| **Authority** | Berkeley Municipal Code Ch. 13.76 (Good Cause for Eviction Ordinance) |
| **Applies to** | Most rental units in Berkeley |
| **Pre-service attachments** | Rent Stabilization Board registration must be current. Tenant must have received tenant-rights notice |
| **Post-service filing** | File copy of all termination notices with the Rent Stabilization Board (per Berkeley's published landlord guidance — windows vary by notice type) |
| **Effect of non-registration** | Non-registration affects eviction eligibility and can be raised as affirmative defense |
| **Branch state** | REQUIRED-BUT-PENDING — needs a Berkeley-specific citation pull to confirm 3-day pay-or-quit filing window and rules |

### §2.22 City of Oakland

| Field | Value |
|---|---|
| **Authority** | Oakland Just Cause for Eviction Ordinance (OMC Ch. 8.22); Rent Adjustment Program |
| **Applies to** | Covered units under JCFEO |
| **Pre-service attachments** | Rent Registry registration must be current (annual, due March 1) |
| **Post-service filing** | Business Tax Certificate attached to **rent increase notices** since April 15, 2025 — does NOT apply to 3-day pay-or-quit. No separate post-service filing rule for 3-day pay-or-quit for nonpayment of rent |
| **Effect of non-registration** | Unregistered landlords can have failure-to-register raised as affirmative defense |
| **Branch state** | REQUIRED-BUT-PENDING — needs an Oakland-specific citation pull to confirm |

### §2.23 Other CA jurisdictions

The following jurisdictions are either covered only by AB 1482 statewide just-cause (no additional 3-day-notice supplemental rules at the city level that the broker has been able to confirm), or have rent ordinances limited to rent-increase-related obligations:

| City | Notes |
|---|---|
| Culver City | Rent stabilization + just-cause overlay; no city-specific 3-day pay-or-quit filing rule confirmed |
| Pomona | Rent Stabilization Ordinance; CCP § 1161 controls 3-day pay-or-quit |
| Alameda | Rent Review Ordinance; no city-specific 3-day pay-or-quit filing rule confirmed |
| Fremont | Rent Review Ordinance; no city-specific 3-day pay-or-quit filing rule confirmed |
| Maywood | Local rent stabilization scope unclear; needs citation pull |
| Commerce | Local rent stabilization scope unclear; needs citation pull |
| Mountain View Mobile Home Rent Stabilization Ordinance (MHRSO) | Mobile-home specific; separate workflow |
| Wheatland | No known rent stabilization ordinance |
| Altadena (unincorporated LA County) | LA County RSO/RSTPO governs; County DCBA filing rules differ from City of LA. Needs unincorporated-County citation pull (June 17, 2026 ordinance flagged in cron context) |

These are not blockers to launching the LA-area or Bay Area overlays. They are tracked here so the matrix can be incrementally expanded without re-doing this determination.

---

## §3 Statewide Statutory Anchor (applies to every city above)

- **CCP § 1161(2)** — content requirements for the 3-day pay-or-quit (amount due, payee identity and contact, payment methods, etc.)
- **CCP § 1161.1** — commercial 3-day notice variant
- **CCP § 1162** — service methods (personal / substituted / posting-and-mailing)
- **CCP § 1167** — tenant UD response deadline (10 court days, per AB 2347 eff. 1/1/2025)
- **CCP § 1174** — forfeiture election and judgment language
- **CCP §§ 12, 12a, 135** — day-counting general rule, holiday extensions, judicial holidays
- **Civ. Code § 1946.1** — 30/60/90-day termination of tenancy
- **Civ. Code § 1947.3** — cash-only / EFT-only payment prohibition
- **AB 1482 (2019)** — statewide just-cause for tenancies of 12+ months
- ***Eshagian v. Cepeda* (2025)** — notice must include specific start AND expiration dates on the face

Local ordinances are additive but cannot extend the state 3-day timeline. Per **San Francisco Apartment Assoc. et al. v. CCSF**, 1st Dist. Court of Appeal No. A166228 (Sept. 11, 2024), state CCP § 1161 procedural timing is not subject to local elongation; local ordinances purporting to extend the 3-day period are preempted.

---

## §4 Geocode Resolution Gate

Every overlay row in §2 above is conditioned on the geocode-confirmation system resolving the property to the correct jurisdiction. The rule of dispatch is:

```
jurisdictionResolved -> apply overlay row
NEEDS_CONFIRMATION  -> block production, surface user prompt
UNKNOWN_OR_OUTSIDE  -> apply statewide-only requirements
```

Critical: "Los Angeles, CA" in a mailing address does **not** mean City of LA. Many such addresses are in unincorporated LA County, West Hollywood, Culver City, Santa Monica, Beverly Hills, etc. Geocode must hit an authoritative city-boundary dataset (LA City GIS for LA; equivalent municipal boundary datasets for each city in §2) and the user must confirm before any city overlay attaches. This dependency is tracked in `ownerpilot_geocode_dependency_attorney_review.md` and is a hard blocker for unblocking the City of LA overlay.

The same boundary-disambiguation discipline applies to every Bay Area jurisdiction in §2: "Oakland, CA" mailing addresses can be in Piedmont, Emeryville, or Alameda; "Concord, CA" addresses can be in Pleasant Hill or unincorporated Contra Costa County; "San Jose, CA" can be in Campbell, Santa Clara, or Cupertino. Geocode-and-confirm before applying any overlay.

---

## §5 Build-Side Checklist

- [MUST FIX §5.1] Implement the matrix in §2 as a typed `jurisdictionOverlays` table in the rules engine. Each row maps jurisdiction → pre-service attachments → post-service filing rule → branch state.
- [MUST FIX §5.2] Gate every overlay on geocode confirmation. NEEDS_CONFIRMATION must block production, not silently default.
- [MUST FIX §5.3] City of LA overlay is the priority unblock — see `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` for the LAHD filing prompt strings.
- [MUST FIX §5.4] Do NOT implement SF Ord. 18-22's 10-day warning rule under any circumstance — it is judicially invalidated. Do NOT implement File #251216 until effective date is confirmed and the ordinance has survived (or avoided) preemption challenge. Treat as MONITOR.
- [SHOULD FIX §5.5] For each jurisdiction in §2.1–§2.13 with REQUIRED-BUT-PENDING status, schedule a citation pull to verify the rule text against the city's current published code before activating the overlay.
- [SHOULD FIX §5.6] For Baldwin Park §2.18, schedule a priority citation pull on the 15-day rule before the Baldwin Park overlay is activated.
- [SHOULD FIX §5.7] For Berkeley §2.21, Oakland §2.22, and the unincorporated LA County rule (June 17, 2026 ordinance), schedule citation pulls before activating those overlays.
- [SHOULD FIX §5.8] The CA 3-day statute watch cron (`2a58382e`) covers statewide statute changes. It does NOT cover city ordinance changes. Schedule a separate twice-yearly watch (Jan 1 + Sep 1 cadence to match) for material changes in each city's ordinance, keyed to each city housing department's news/announcements feed.
- [CONSIDER §5.9] When a new ordinance is enacted in a city already in §2, capture it as a new row revision dated to the effective date, not a replacement of the existing row. Audit trail matters for notices produced under the prior rule.
- [CONSIDER §5.10] User-facing UI on the produce wizard should display jurisdiction-specific obligations in a "for your property location" section after geocode confirms, so the user understands which overlays apply before producing the notice.

---

## §6 Open Items

- Baldwin Park 15-day rule (§2.18) — citation pull needed.
- Berkeley filing rule for 3-day pay-or-quit (§2.21) — citation pull needed.
- Oakland filing rule for 3-day pay-or-quit (§2.22) — citation pull needed.
- Unincorporated LA County rule from June 17, 2026 (referenced in cron 2a58382e context) — citation pull needed; Altadena and similar addresses are downstream.
- SF File #251216 effective date and post-passage legal status — monitor; do not implement.
- LA city business-day calendar pull — blocker for the LAHD-filing-deadline calendar computation in `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`.
- LAHD RTC form refresh job — quarterly hash check per `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` Resolution 3.
- City-level ordinance-change cron — to complement statewide cron 2a58382e.

---

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-18

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
