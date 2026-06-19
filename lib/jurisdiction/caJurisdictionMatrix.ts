/**
 * CA local-jurisdiction supplemental-documentation matrix (Phase 1, data only).
 *
 * Source: docs/compliance/ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md
 * All row content fields (authority, appliesTo, postServiceFiling, consequence,
 * sources, notes) are transcribed VERBATIM from that committed broker
 * determination at commit f46bebf. This module authors no legal content; it is a
 * typed transcription of the broker source. Branch state is the governing field.
 *
 * Routing authority: this matrix is NEVER the authority on jurisdiction. The
 * authority on whether a property is production-authorized is detectJurisdiction
 * (string stub today; authoritative geocode later). The matrix's `branchState`
 * is the legal-research finding; it is independently recorded and ships dark
 * until each jurisdiction graduates via its own broker determination.
 *
 * Phase 1 ships zero user-visible UI. This is data + a routing boolean only.
 */

/** The committed matrix's governing field. Supersedes the implementation
 *  prompt's promptKey/citationPullStatus vocabulary per the Phase 1 ruling §4. */
export type BranchState = 'LIVE' | 'REQUIRED_BUT_PENDING' | 'MONITOR';

export interface JurisdictionSource {
  label: string;
  url: string;
}

export interface JurisdictionOverlayRow {
  /** Stable slug. */
  jurisdictionId: string;
  /** Verbatim jurisdiction display name from the matrix header. */
  displayName: string;
  /** Governing branch state for the 3-day-pay-or-quit scope of this product. */
  branchState: BranchState;
  /** Verbatim "Authority" cell. */
  authority: string;
  /** Verbatim "Applies to" cell (empty string where the source omits it). */
  appliesTo: string;
  /** Verbatim "Post-service filing" cell. */
  postServiceFiling: string;
  /** Verbatim "Consequence of non-filing" cell, when present. */
  consequence?: string;
  /** Sources (labels/urls as listed in the source row). */
  sources: JurisdictionSource[];
  /** Verbatim qualifiers / off-scope sub-states (e.g. SF MONITOR, BH 90-day). */
  notes?: string;
  /**
   * Runtime-routing shortcut derived from the "Post-service filing" cell: does a
   * supplemental city filing attach for the 3-day-pay-or-quit-for-nonpayment
   * scope this product produces? Derived, not authored; the verbatim cell is the
   * source of truth and is preserved alongside.
   */
  supplementalFilingRequired: boolean;
  /**
   * True for the §2.23 named statewide-only cities that resolve to the same
   * routing as the synthetic DEFAULT row, listed explicitly so the matrix data
   * byte-matches the committed source and graduation can target one city.
   */
  pointsAtDefault?: boolean;
}

/**
 * The matrix. 32 rows: §§2.1–2.22 (22 rows; SF and Beverly Hills are split-state
 * single rows with the off-scope sub-state in `notes`) + §2.23 (10 rows: 1
 * synthetic DEFAULT + 8 named statewide-only + 1 Altadena pending).
 */
export const CA_JURISDICTION_MATRIX: readonly JurisdictionOverlayRow[] = [
  // ----- §2.1 -----
  {
    jurisdictionId: 'ca-los-angeles-city',
    displayName: 'City of Los Angeles',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'LAMC § 151.09.C.9; LAMC § 165.05.B.5; Ordinance 188,681 (eff. 8/20/2025)',
    appliesTo: 'All rental units in City of LA, regardless of RSO/JCO coverage',
    postServiceFiling:
      'File copy of the 3-day notice with LAHD within **3 business days** of service on tenant. LA city business-day calendar (not judicial-holiday calendar). Three filing channels: online portal, mail, in person',
    sources: [
      { label: 'housing.lacity.gov/rtc', url: 'https://housing.lacity.gov/rtc' },
      { label: 'housing.lacity.gov/renter-protections-2', url: 'https://housing.lacity.gov/renter-protections-2' },
      { label: 'housing.lacity.gov/eviction-notices', url: 'https://housing.lacity.gov/eviction-notices' },
    ],
    // Verbatim broker-source transcription from the committed matrix at f46bebf.
    // This `notes` value is byte-for-byte broker-source content — build did not
    // author it; do not edit it. Its contents are exempt from the
    // build-authored-text token rule (verbatim broker-source citation); see the
    // PR description for the governing rulings and the post-Phase-1 attribution
    // reconciliation scope.
    notes:
      'REQUIRED-BUT-PENDING — three dependencies (geocode confirmation, LA city business-day calendar, RTC form refresh job) must land first per `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` Resolution sections 3 and 5',
    supplementalFilingRequired: true,
  },
  // ----- §2.2 (split: LIVE Form 1007 + MONITOR File #251216) -----
  {
    jurisdictionId: 'ca-san-francisco-city-county',
    displayName: 'San Francisco (City and County of)',
    branchState: 'LIVE',
    authority:
      'SF Admin. Code § 37.9(c); 1st Dist. Court of Appeal A166228 (Sept. 11, 2024); File #251216 (June 2026, effective date TBD)',
    appliesTo: 'Rent-controlled units in CCSF',
    postServiceFiling:
      '**NOT required for 3-day pay-or-quit for nonpayment of rent.** SF Admin. Code § 37.9(c) explicitly excludes "three-day notices to pay rent or quit" from the Rent Board filing requirement that applies to other termination notices',
    sources: [
      { label: 'sf.gov news 9/12/2024', url: 'https://www.sf.gov/news/court-appeal-invalidates-10-day-warning-notice-legislation-update-3' },
      { label: 'sfrb.org § 37.9', url: 'https://sfrb.org/node/520' },
      { label: 'sfgov.legistar.com File 251216', url: 'https://sfgov.legistar.com/LegislationDetail.aspx?ID=7781525&GUID=7D7F35C5-6EFA-44BE-A09A-6A7318EF527A' },
    ],
    notes:
      'Branch state (verbatim): LIVE for Form 1007 attachment; MONITOR for File #251216 — do not implement the new warning ordinance until effective date is confirmed and it has survived (or avoided) preemption challenge',
    supplementalFilingRequired: false,
  },
  // ----- §2.3 -----
  {
    jurisdictionId: 'ca-san-jose-city',
    displayName: 'City of San Jose',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'San Jose Municipal Code (Apartment Rent Ordinance / Tenant Protection Ordinance); ARO § 17.23.1240 et seq.',
    appliesTo: 'Apartments built before September 1979 covered by ARO; TPO covers most other rental units city-wide',
    postServiceFiling:
      'File copy of the 3-day notice with the city through the **Rent Stabilization Program online portal** within **3 days** of service on tenant. If an unlawful detainer is filed, copy of summons and complaint must also be filed within 3 days',
    sources: [
      { label: 'hdnalaw.com/san-jose-eviction-laws', url: 'https://hdnalaw.com/san-jose-eviction-laws/' },
      { label: 'calwestrents.com San Jose Rent Control Guide', url: 'https://www.calwestrents.com/pdf/San-Jose-Rent-Control-Guide_Interim-Ordinance.pdf' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation and verification whether "3 days" runs on calendar days, business days, or court days',
    supplementalFilingRequired: true,
  },
  // ----- §2.4 -----
  {
    jurisdictionId: 'ca-mountain-view-city',
    displayName: 'Mountain View',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'CSFRA (Community Stabilization and Fair Rent Act); Mountain View Municipal Code Ch. 17.55',
    appliesTo: 'CSFRA-covered units (most multi-family buildings built before Feb. 1, 1995)',
    postServiceFiling:
      "File copy of termination notice (including 3-day pay-or-quit) with the city within **3 days** of service via the city's online portal (`mbren.mountainview.gov`) or by other means",
    sources: [
      { label: 'Mountain View Eviction Protections', url: 'https://www.mountainview.gov/our-city/departments/housing/rent-stabilization/eviction-protections' },
      { label: 'Nov. 2025 landlord compliance YouTube', url: 'https://www.youtube.com/watch?v=XaHeyCAXF8U' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.5 -----
  {
    jurisdictionId: 'ca-richmond-city',
    displayName: 'City of Richmond',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Richmond Municipal Code § 11.100.060(s)(1); Rent Board Regulation 17-10',
    appliesTo: 'All rental units in Richmond (not just rent-controlled)',
    postServiceFiling:
      'File copy of **all** termination notices, **including 3-day notices to pay rent or quit and notices to perform covenant or quit**, with the Rent Board within **2 business days** of service. Proof of service with time and date must accompany',
    consequence: '"Failure to do so is a defense to an Eviction Lawsuit"',
    sources: [
      { label: 'richmondca.gov Form Center', url: 'https://www.ci.richmond.ca.us/FormCenter/Rent-Program-9/File-a-Notice-of-Termination-of-Tenancy--208' },
      { label: 'Richmond Rights and Responsibilities', url: 'https://www.ci.richmond.ca.us/DocumentCenter/View/48232/Final-Rights-and-Responsibilities-for-Tenants-Presentation_English' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.6 -----
  {
    jurisdictionId: 'ca-pasadena-city',
    displayName: 'City of Pasadena',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Pasadena Charter Amendment § 1806(k) (Tenant Protection / Rent Stabilization)',
    appliesTo: 'Units covered by the Pasadena Rent Stabilization Ordinance',
    postServiceFiling:
      'File copy of termination notice with the Rent Stabilization Department within **3 days** of service. Email filings to rentalboard@cityofpasadena.net are accepted',
    sources: [
      { label: 'cityofpasadena.net Rent Stabilization Landlord FAQs', url: 'https://www.cityofpasadena.net/rent-stabilization/faqs-landlords/' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.7 -----
  {
    jurisdictionId: 'ca-inglewood-city',
    displayName: 'City of Inglewood',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Inglewood Municipal Code §§ 8-121, 8-122 (Housing Protection Ordinance)',
    appliesTo: 'Rental units subject to the Inglewood Housing Protection Ordinance',
    postServiceFiling:
      'File copy of termination notice (including 3-day notice to cure or quit) with the Inglewood Housing Protection Department within **3 days** of service. **The 3-day pay-or-quit for nonpayment is included in this rule per IMC § 8-122 as applied to "any notice to terminate a tenancy"**',
    sources: [
      { label: 'astanehelaw.com Inglewood Rent Ordinance', url: 'https://astanehelaw.com/tenants-rights/wrongful-eviction/inglewood-rent-ordinance/' },
      { label: 'yourlegalcorner.com Inglewood Housing Protection', url: 'https://www.yourlegalcorner.com/articles.asp?cat=land&id=194&ttl=inglewood-housing-protection-ordinance' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.8 -----
  {
    jurisdictionId: 'ca-concord-city',
    displayName: 'City of Concord',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Concord Municipal Code § 19.40.060(e) (Residential Tenant Protection)',
    appliesTo: "Covered units under Concord's Residential Tenant Protection Program",
    postServiceFiling:
      "File copy of termination notice through the **City's Rent Registry portal** within **7 calendar days** of service",
    sources: [
      { label: 'cityofconcord.org Rent Stabilization', url: 'https://www.cityofconcord.org/1172/Rent-Stabilization-and-Just-Cause-for-Ev' },
      { label: 'codepublishing.com Concord 19.40', url: 'https://www.codepublishing.com/CA/Concord/html/Concord19/Concord1940.html' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.9 -----
  {
    jurisdictionId: 'ca-east-palo-alto-city',
    displayName: 'City of East Palo Alto',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'East Palo Alto Rent Stabilization and Just Cause for Eviction Ordinance of 2010',
    appliesTo: 'Rent-stabilized units',
    postServiceFiling:
      'File copy of any notice to quit or summons/complaint in unlawful detainer with the Rent Stabilization Board within **5 days** of service on tenant',
    sources: [
      { label: 'East Palo Alto Rent Stabilization and Just Cause Guide', url: 'https://www.cityofepa.org/sites/default/files/fileattachments/rent_stabilization/page/10871/rsp_booklet_-_english_-_january_2017.pdf' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.10 -----
  {
    jurisdictionId: 'ca-hayward-city',
    displayName: 'City of Hayward',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Hayward Residential Rent Stabilization and Tenant Protection Ordinance',
    appliesTo: "All rental units in Hayward (per the city's published landlord guidance — note the broad scope including notices of termination)",
    postServiceFiling:
      'File copy of termination notice and rent-increase notice with the city within **30 days** of giving notice to tenant. Channels: mail, in person, or email to RentalNotifications@hayward-ca.gov',
    consequence: 'City may issue citation for each violation',
    sources: [
      { label: 'Hayward Tenant and Landlord Resources', url: 'https://www.hayward-ca.gov/residents/housing/resources-documents-and-forms-for-tenants-and-landlords' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.11 -----
  {
    jurisdictionId: 'ca-west-hollywood-city',
    displayName: 'City of West Hollywood',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'West Hollywood Municipal Code Title 17 (Rent Stabilization); §§ 17.28.060, 17.52.010',
    appliesTo: 'Rent-stabilized units',
    postServiceFiling:
      'File copy of eviction notice with the **West Hollywood Rent Stabilization Commission** within **5 days** of serving the tenant. If unlawful detainer is filed, copy of summons and complaint also within 5 days',
    sources: [
      { label: 'kohan-law.com West Hollywood Eviction Lawyer', url: 'https://kohan-law.com/locations/west-hollywood-eviction-lawyer/' },
      { label: 'bhrealestatelaw.com West Hollywood Rent Stabilization Guide', url: 'https://bhrealestatelaw.com/2026/05/14/west-hollywood-rent-stabilization-landlord-guide/' },
      { label: 'tobenerlaw.com West Hollywood', url: 'https://www.tobenerlaw.com/rent-control-west-hollywood/' },
    ],
    notes: 'REQUIRED-BUT-PENDING — needs geocode confirmation',
    supplementalFilingRequired: true,
  },
  // ----- §2.12 -----
  {
    jurisdictionId: 'ca-santa-monica-city',
    displayName: 'City of Santa Monica',
    branchState: 'LIVE',
    authority: 'Santa Monica Charter Amendment § 1806(e) (Rent Control)',
    appliesTo: 'Rent-controlled units',
    postServiceFiling:
      'File copy of termination notice with the Rent Control Board within **3 days** of service. **Does NOT apply to 3-day notices for nonpayment of rent.** Applies to other termination grounds',
    sources: [
      { label: 'Santa Monica Rent Control Information Sheet 2025', url: 'https://www.santamonica.gov/media/Document%20Library/Topic%20Explainers/Rent%20Control%20Information%20by%20Subject/Rent_Control_Information_Sheet_2025.pdf' },
      { label: 'kohan-law.com Santa Monica', url: 'https://kohan-law.com/locations/santa-monica-rent-control-eviction-lawyer/' },
      { label: 'santamonica.gov Evictions Reg', url: 'https://www.santamonica.gov/media/Document%20Library/Detail/Rent%20Control%20Charter%20Amendment%20&%20Regulations/09,%20Evictions.pdf' },
    ],
    notes: 'Branch state (verbatim): LIVE — no filing required for 3-day pay-or-quit for nonpayment; just-cause grounds language on face required for non-nonpayment grounds',
    supplementalFilingRequired: false,
  },
  // ----- §2.13 (split: LIVE 3-day p-o-q + REQUIRED-BUT-PENDING 90-day) -----
  {
    jurisdictionId: 'ca-beverly-hills-city',
    displayName: 'City of Beverly Hills',
    branchState: 'LIVE',
    authority: 'Beverly Hills Municipal Code Ch. 6 (RSO) and Ch. 5; BHMC § 4-6-6 (Evictions)',
    appliesTo: 'Pre-1978/1986 multi-family units',
    postServiceFiling:
      "For 90-day termination notices under BHMC § 4-6-6: notice must be filed with city's rent stabilization program **BEFORE** service on tenant, with $100 processing fee. For 3-day pay-or-quit specifically (CCP § 1161(2)): no separate filing required",
    sources: [
      { label: 'BHMC § 4-6-6 codelibrary.amlegal.com', url: 'https://codelibrary.amlegal.com/codes/beverlyhillsca/latest/beverlyhills_ca/0-0-0-4682' },
      { label: 'Beverly Hills Rent Stabilization', url: 'https://www.beverlyhills.org/1098/Rent-Stabilization-Ordinance' },
    ],
    notes: 'Branch state (verbatim): LIVE for 3-day pay-or-quit; REQUIRED-BUT-PENDING for 90-day termination flow',
    supplementalFilingRequired: false,
  },
  // ----- §2.14 -----
  {
    jurisdictionId: 'ca-glendale-city',
    displayName: 'City of Glendale',
    branchState: 'LIVE',
    authority: 'Glendale Municipal Code Ch. 9.30 (Just Cause and Retaliatory Eviction Ordinance)',
    appliesTo: 'Rental units in Glendale (just-cause-coverage scope)',
    postServiceFiling:
      'Termination notice must state just cause grounds; no specific city-filing rule for 3-day pay-or-quit for nonpayment of rent — CCP § 1161 controls',
    sources: [
      { label: 'Glendale Just Cause GMC Ch. 9.30', url: 'https://ecode360.com/43347753' },
      { label: 'tobenerlaw.com Glendale', url: 'https://www.tobenerlaw.com/city-of-glendale-just-cause-and-retaliatory-eviction-ordinance/' },
    ],
    notes: 'Branch state (verbatim): LIVE — just-cause grounds language on face for non-nonpayment terminations; no special 3-day pay-or-quit filing',
    supplementalFilingRequired: false,
  },
  // ----- §2.15 -----
  {
    jurisdictionId: 'ca-long-beach-city',
    displayName: 'City of Long Beach',
    branchState: 'LIVE',
    authority: 'Long Beach Tenant Relocation Assistance Ordinance; CCP §§ 1161, 1161.1, 1162',
    appliesTo: 'Most rental units in Long Beach',
    postServiceFiling:
      'No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent. Tenant Relocation Assistance applies to no-fault terminations and 10%+ rent increases (separate workflow)',
    sources: [
      { label: 'tobenerlaw.com Long Beach', url: 'https://www.tobenerlaw.com/long-beach-tenant-rights/' },
      { label: 'Long Beach Memo Apr 2023', url: 'https://www.longbeach.gov/globalassets/city-manager/media-library/documents/memos-to-the-mayor-tabbed-file-list-folders/2023/april-11--2023---overview-of-rental-assistance-programs-and-resources' },
    ],
    notes: 'Branch state (verbatim): LIVE — statewide-only for 3-day pay-or-quit',
    supplementalFilingRequired: false,
  },
  // ----- §2.16 -----
  {
    jurisdictionId: 'ca-antioch-city',
    displayName: 'City of Antioch',
    branchState: 'LIVE',
    authority: 'Antioch Municipal Code Title 11 Ch. 1 (Rent Stabilization); Ordinance 2219-C-S',
    appliesTo: 'Covered rental units',
    postServiceFiling: 'No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent in the current published RSO',
    sources: [
      { label: 'Antioch RSO Ordinance 2219-C-S', url: 'https://www.antiochca.gov/fc/administration/rent-stabilization/Rent-Stabilization-Ordinance.pdf' },
      { label: 'AMC 11-6.04', url: 'https://codelibrary.amlegal.com/codes/antioch/latest/antioch_ca/0-0-0-41461' },
    ],
    notes: 'Branch state (verbatim): LIVE — statewide-only for 3-day pay-or-quit',
    supplementalFilingRequired: false,
  },
  // ----- §2.17 -----
  {
    jurisdictionId: 'ca-bell-gardens-city',
    displayName: 'City of Bell Gardens',
    branchState: 'LIVE',
    authority: 'Bell Gardens Municipal Code Ch. 5.62 (Rent Stabilization); Ch. 5.63 (Tenant Eviction Protections); Ordinance 925 (eff. 10/12/2022)',
    appliesTo: 'Covered rental units (built before 2/1/1995, excluding single-family homes, condos, townhomes, owner-occupied 4-or-fewer-unit buildings)',
    postServiceFiling: 'No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent in Ord. 925',
    sources: [
      { label: 'Bell Gardens FAQs', url: 'https://www.bellgardens.org/government/city-departments/community-development/faqs' },
      { label: 'Bell Gardens Ord. 925', url: 'https://agenda.bellgardens.org/AgendaPublic/AttachmentViewer.ashx?AttachmentID=7158&ItemID=3704' },
      { label: 'BGMC 5.63 codepublishing.com', url: 'https://www.codepublishing.com/CA/BellGardens/html/BellGardens05/BellGardens0563.html' },
    ],
    notes: 'Branch state (verbatim): LIVE — statewide-only for 3-day pay-or-quit',
    supplementalFilingRequired: false,
  },
  // ----- §2.18 -----
  {
    jurisdictionId: 'ca-baldwin-park-city',
    displayName: 'City of Baldwin Park',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Baldwin Park Municipal Code Ch. 117 (Rental Rate Increases / Rent Stabilization)',
    appliesTo: 'Rent-controlled units (built before 2/1/1995, multi-family)',
    postServiceFiling: 'File copy of termination notice within 3 days, **except for 3-day notices to pay rent or quit**',
    sources: [
      { label: 'baldwinpark.com Rent Control PDF', url: 'https://www.baldwinpark.com/DocumentCenter/View/426/Rent-Control-PDF' },
      { label: 'tobenerlaw.com Baldwin Park', url: 'https://www.tobenerlaw.com/the-city-of-baldwin-park-rent-ordinance/' },
    ],
    notes: 'REQUIRED-BUT-PENDING — Baldwin Park 15-day rule is the only known unresolved item in this matrix. Need a citation pull on BPMC Ch. 117 latest text before unblocking',
    supplementalFilingRequired: false,
  },
  // ----- §2.19 -----
  {
    jurisdictionId: 'ca-healdsburg-city',
    displayName: 'City of Healdsburg',
    branchState: 'LIVE',
    authority: 'Healdsburg Municipal Code Ch. 2.56 (Mobile Home Park Space Rent Stabilization)',
    appliesTo: 'Mobile home park spaces only — NOT general residential rentals',
    postServiceFiling: 'No 3-day pay-or-quit filing rule for residential rentals. Mobile home rent-increase notices require 90-day advance written notice',
    sources: [
      { label: 'HMC 2.56', url: 'https://www.codepublishing.com/CA/Healdsburg/html/Healdsburg02/Healdsburg0256.html' },
      { label: 'Healdsburg Rent Advisory', url: 'https://healdsburg.gov/680/Rent-Advisory' },
    ],
    notes: 'Branch state (verbatim): LIVE — statewide-only for general residential 3-day pay-or-quit',
    supplementalFilingRequired: false,
  },
  // ----- §2.20 -----
  {
    jurisdictionId: 'ca-sacramento-city',
    displayName: 'City of Sacramento',
    branchState: 'LIVE',
    authority: 'Sacramento City Code Ch. 5.156 (Tenant Protection); Ordinance 2019-0025 (Tenant Protection and Relief Act)',
    appliesTo: 'Units built on or before 2/1/1995; just-cause requires 12+ months tenancy',
    postServiceFiling:
      'No specific city-filing rule for 3-day pay-or-quit for nonpayment of rent. Owner-move-in and Notice of Intent to Withdraw have separate filing rules (30-day window for owner-move-in copy filing)',
    sources: [
      { label: 'Sacramento City Code Ch. 5.156', url: 'https://www.cityofsacramento.gov/content/dam/portal/cdd/Code-Compliance/TPP/Sacramento-City-Code-Chapter-5156--Tenant-Protection.pdf' },
      { label: 'Sacramento TPP Admin Procedures', url: 'https://www.cityofsacramento.org/-/media/Corporate/Files/CDD/Code-Compliance/TPP/TPP-Final-Admin-Procedures.pdf?la=en' },
    ],
    notes: 'Branch state (verbatim): LIVE — statewide-only for 3-day pay-or-quit',
    supplementalFilingRequired: false,
  },
  // ----- §2.21 -----
  {
    jurisdictionId: 'ca-berkeley-city',
    displayName: 'City of Berkeley',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Berkeley Municipal Code Ch. 13.76 (Good Cause for Eviction Ordinance)',
    appliesTo: 'Most rental units in Berkeley',
    postServiceFiling:
      "File copy of all termination notices with the Rent Stabilization Board (per Berkeley's published landlord guidance — windows vary by notice type)",
    sources: [],
    notes: 'REQUIRED-BUT-PENDING — needs a Berkeley-specific citation pull to confirm 3-day pay-or-quit filing window and rules',
    supplementalFilingRequired: true,
  },
  // ----- §2.22 -----
  {
    jurisdictionId: 'ca-oakland-city',
    displayName: 'City of Oakland',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'Oakland Just Cause for Eviction Ordinance (OMC Ch. 8.22); Rent Adjustment Program',
    appliesTo: 'Covered units under JCFEO',
    postServiceFiling:
      'Business Tax Certificate attached to **rent increase notices** since April 15, 2025 — does NOT apply to 3-day pay-or-quit. No separate post-service filing rule for 3-day pay-or-quit for nonpayment of rent',
    sources: [],
    notes: 'REQUIRED-BUT-PENDING — needs an Oakland-specific citation pull to confirm',
    supplementalFilingRequired: false,
  },
  // ----- §2.23 DEFAULT + named statewide-only + Altadena -----
  {
    jurisdictionId: 'ca-default-statewide',
    displayName: 'Other CA (statewide-only default)',
    branchState: 'LIVE',
    authority: 'CCP § 1161 et seq. (statewide 3-day pay-or-quit baseline)',
    appliesTo: 'CA rental properties with no confirmed local supplemental 3-day-notice filing rule',
    postServiceFiling: 'No local supplemental filing. CCP § 1161 controls.',
    sources: [],
    notes: 'Synthetic DEFAULT row. Returned from the NO_KNOWN_OVERLAY branch of detectJurisdiction.',
    supplementalFilingRequired: false,
  },
  {
    jurisdictionId: 'ca-culver-city',
    displayName: 'Culver City',
    branchState: 'LIVE',
    authority: 'AB 1482 statewide just-cause overlay (no confirmed city-specific 3-day filing rule)',
    appliesTo: 'Culver City rentals',
    postServiceFiling: 'Rent stabilization + just-cause overlay; no city-specific 3-day pay-or-quit filing rule confirmed',
    sources: [],
    notes: 'Branch state (verbatim §2.23): no city-specific 3-day pay-or-quit filing rule confirmed.',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-pomona-city',
    displayName: 'Pomona',
    branchState: 'LIVE',
    authority: 'Pomona Rent Stabilization Ordinance; CCP § 1161 controls 3-day pay-or-quit',
    appliesTo: 'Pomona rentals',
    postServiceFiling: 'Rent Stabilization Ordinance; CCP § 1161 controls 3-day pay-or-quit',
    sources: [],
    notes: 'Branch state (verbatim §2.23): CCP § 1161 controls 3-day pay-or-quit.',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-alameda-city',
    displayName: 'Alameda',
    branchState: 'LIVE',
    authority: 'Alameda Rent Review Ordinance (no confirmed city-specific 3-day filing rule)',
    appliesTo: 'Alameda rentals',
    postServiceFiling: 'Rent Review Ordinance; no city-specific 3-day pay-or-quit filing rule confirmed',
    sources: [],
    notes: 'Branch state (verbatim §2.23): no city-specific 3-day pay-or-quit filing rule confirmed.',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-fremont-city',
    displayName: 'Fremont',
    branchState: 'LIVE',
    authority: 'Fremont Rent Review Ordinance (no confirmed city-specific 3-day filing rule)',
    appliesTo: 'Fremont rentals',
    postServiceFiling: 'Rent Review Ordinance; no city-specific 3-day pay-or-quit filing rule confirmed',
    sources: [],
    notes: 'Branch state (verbatim §2.23): no city-specific 3-day pay-or-quit filing rule confirmed.',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-maywood-city',
    displayName: 'Maywood',
    branchState: 'LIVE',
    authority: 'Local rent stabilization scope unclear',
    appliesTo: 'Maywood rentals',
    postServiceFiling: 'Local rent stabilization scope unclear; needs citation pull',
    sources: [],
    notes: 'Branch state (verbatim §2.23): Local rent stabilization scope unclear; needs citation pull',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-commerce-city',
    displayName: 'Commerce',
    branchState: 'LIVE',
    authority: 'Local rent stabilization scope unclear',
    appliesTo: 'Commerce rentals',
    postServiceFiling: 'Local rent stabilization scope unclear; needs citation pull',
    sources: [],
    notes: 'Branch state (verbatim §2.23): Local rent stabilization scope unclear; needs citation pull',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-mountain-view-mhrso',
    displayName: 'Mountain View Mobile Home Rent Stabilization Ordinance (MHRSO)',
    branchState: 'LIVE',
    authority: 'Mountain View Manufactured-Home Rent Stabilization Ordinance (MHRSO)',
    appliesTo: 'Mobile-home spaces in Mountain View (distinct from §2.4 general residential rent ordinance)',
    postServiceFiling: 'Mobile-home specific; separate workflow',
    sources: [],
    notes: 'Branch state (verbatim §2.23): Mobile-home specific; separate workflow. Distinct jurisdictionId from ca-mountain-view-city per Phase 1 ruling §2.',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'ca-wheatland-city',
    displayName: 'Wheatland',
    branchState: 'LIVE',
    authority: 'No known rent stabilization ordinance',
    appliesTo: 'Wheatland rentals',
    postServiceFiling: 'No known rent stabilization ordinance',
    sources: [],
    notes: 'Branch state (verbatim §2.23): No known rent stabilization ordinance',
    supplementalFilingRequired: false,
    pointsAtDefault: true,
  },
  {
    jurisdictionId: 'altadena-unincorporated-la-county',
    displayName: 'Altadena (unincorporated LA County)',
    branchState: 'REQUIRED_BUT_PENDING',
    authority: 'LA County RSO/RSTPO governs; County DCBA filing rules differ from City of LA',
    appliesTo: 'Unincorporated LA County rentals (e.g., Altadena)',
    postServiceFiling:
      'LA County RSO/RSTPO governs; County DCBA filing rules differ from City of LA. Needs unincorporated-County citation pull (June 17, 2026 ordinance flagged in cron context)',
    sources: [],
    notes: 'Branch state (verbatim §2.23): needs unincorporated-County citation pull; routes pending, not DEFAULT.',
    supplementalFilingRequired: true,
  },
];

/** The synthetic DEFAULT row, for the NO_KNOWN_OVERLAY branch. */
export const CA_JURISDICTION_DEFAULT: JurisdictionOverlayRow =
  CA_JURISDICTION_MATRIX.find((r) => r.jurisdictionId === 'ca-default-statewide')!;
