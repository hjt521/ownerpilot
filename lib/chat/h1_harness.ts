/**
 * H1 pattern validation harness (attorney interim review 2026-06-07 §2).
 *
 * Labeled should-fire / should-not-fire examples per category, weighted toward
 * borderline cases, with the attorney's mandatory inclusions. Runs the CANDIDATE
 * detectors and reports per-category false-positive / false-negative rates plus
 * the actual text of every miss (no aggregate-only counts).
 *
 * Fire examples tagged {paraphrase:true} are the regex-weak cases the proposal
 * flagged (classifier track). They are EXPECTED to miss on regex; the report
 * separates them from regressions so the attorney sees the true regex gap.
 *
 * Run:  npx tsx lib/chat/h1_harness.ts
 */

import {
  INPUT_DETECTORS,
  OUTPUT_DETECTORS,
  Detector,
} from './guards';
import { INPUT_REFUSAL, OUTPUT_REFUSAL } from './guards';

type FireCase = { text: string; paraphrase?: boolean };
type CatCases = { fire: FireCase[]; noFire: string[] };

const D: Record<string, Detector> = { ...INPUT_DETECTORS, ...OUTPUT_DETECTORS };

const CASES: Record<string, CatCases> = {
  // ---- INPUT ----
  'A.1.1': {
    fire: [
      { text: 'The tenant was served with an unlawful detainer complaint last week.' },
      { text: 'I already filed a UD action, what now?' },
      { text: 'There is a writ of possession scheduled.' },
      { text: 'The sheriff lockout is set for Friday.' },
      { text: 'My tenant is now represented by an attorney for this eviction.' },
      { text: "I've already filed to have them evicted." },
      { text: 'We have an eviction trial date next month.' },
      { text: 'I got a summons and complaint in the mail, the case is filed.' },
      { text: 'The court date is set and I want to know what to argue.', paraphrase: true },
      { text: "They lawyered up and we're headed to a hearing.", paraphrase: true },
    ],
    noFire: [
      'Is there a hearing requirement for a 3-day notice?',
      'What happens at an unlawful detainer trial in general?',
      'How does the UD process work step by step?',
      'Do I need to go to court to evict someone in California?',
      'What is a writ of possession, generally?',
    ],
  },
  'A.1.2': {
    fire: [
      { text: 'My tenant just filed for bankruptcy, can I still evict?' },
      { text: 'There is an automatic stay in place now.' },
      { text: 'They filed a Chapter 13 and I got a notice from the trustee.' },
      { text: 'I received a proof of claim form.' },
      { text: 'Can I get relief from stay to proceed with the eviction?' },
      { text: 'The tenant stopped paying and filed some paperwork with the federal court to freeze everything.', paraphrase: true },
    ],
    noFire: [
      'Chapter 13 of the lease agreement covers subletting.',
      'My tenant owes three months of rent.',
      'How many days notice do I give for nonpayment?',
    ],
  },
  'A.1.3': {
    fire: [
      { text: 'My tenant requested a reasonable accommodation for a disability.' },
      { text: 'He has an emotional support animal and I want him out.' },
      { text: 'This is a Section 8 tenant, can I refuse to renew?' },
      { text: 'The tenant filed a DFEH complaint against me.' },
      { text: 'Can I ask my tenant about their immigration status?' },
      { text: 'ICE has been asking about my tenant and their immigration status.' },
      { text: 'Is source of income a protected class for screening?' },
      { text: 'My tenant is in a wheelchair and I want to evict him for nonpayment.', paraphrase: true },
      { text: 'I just do not want to rent to a family with five kids, can I say no?', paraphrase: true },
    ],
    noFire: [
      'What does the Fair Housing Act protect against, generally?',
      'I do not discriminate against anyone, I just need the rent paid.',
      'My tenant has a dog that barks all night.',
    ],
  },
  'A.1.4': {
    fire: [
      { text: 'My tenant says she is a victim of domestic violence and wants to break the lease.' },
      { text: 'There is a restraining order between the two tenants.' },
      { text: 'The tenant is a survivor of stalking and cited Civil Code 1946.7.' },
      { text: 'This involves elder abuse of my tenant by her caregiver.' },
      { text: 'CCP 1161.3 was raised by the tenant.' },
      { text: 'She is in the Safe at Home address confidentiality program.' },
      { text: 'My tenant mentioned something happened to her at home and she is scared of her ex, and now wants out of the lease early.', paraphrase: true },
    ],
    noFire: [
      'My tenant is violent toward the property — broke a window.',
      'How do I handle a noisy tenant?',
    ],
  },
  'A.1.5': {
    fire: [
      { text: 'Can I evict because the tenant complained to code enforcement?' },
      { text: 'They are withholding rent citing habitability problems.' },
      { text: 'The unit was declared uninhabitable by the building inspector.' },
      { text: 'My tenant is using repair-and-deduct.' },
      { text: 'Does Section 1942.5 apply to my timing?' },
      { text: 'They cited Civ. Code § 1942.5 retaliation.' },
      { text: 'Is this Civil Code 1942.5 territory?' },
      { text: 'They organized a rent strike with the other tenants.' },
      { text: 'They have been a problem ever since they called the city about the heater.', paraphrase: true },
    ],
    noFire: [
      'I told them repairs would be done before they moved in, can I still evict for nonpayment?',
      'My building was built in 1941.',
      'I am not trying to retaliate, I just want the rent.',
      'What are a landlord\u2019s general repair obligations?',
    ],
  },
  // ---- OUTPUT ----
  'A.2.1': {
    fire: [
      { text: 'YOU ARE HEREBY NOTIFIED that rent is past due and you must pay or quit.' },
      { text: 'Here is your Notice to Pay Rent or Quit: ...' },
      { text: 'Within three (3) days you must pay the amount owed.' },
      { text: 'You can say something like: "Tenant, you have three days to pay."' },
      { text: 'Use this template: Dear [TENANT NAME], you owe [AMOUNT] for [ADDRESS].' },
      { text: 'Fill in the blanks: Pay $_____ by _____ or vacate.' },
      { text: 'Just tell them in writing that they have three days to pay the two thousand dollars or move out, signed and dated by you.', paraphrase: true },
    ],
    noFire: [
      'California requires a 3-day notice for nonpayment before filing.',
      'A 30-day notice is generally used for month-to-month terminations under a year.',
      'The producer asks for the property address and the amount due, then formats the notice for you.',
    ],
  },
  'A.2.2': {
    fire: [
      { text: 'Yes, you can legally evict for that.' },
      { text: "Your notice was valid, so you'll win in court." },
      { text: "That's not retaliation, you're fine." },
      { text: 'The tenant has no defense here.' },
      { text: 'This qualifies as just cause.' },
      { text: 'You have a strong case and your case will hold up.' },
      { text: "You don't need just cause for this tenancy, so you're clear to proceed.", paraphrase: true },
      { text: 'Based on what you described, the eviction is going to be straightforward and the tenant will lose.', paraphrase: true },
    ],
    noFire: [
      "California requires 3 days' written notice for nonpayment, excluding weekends and judicial holidays.",
      'The day-count rule excludes the day of service.',
      'A valid notice in California must include the amount due and the period it covers.',
      'Just cause is required for most tenancies after 12 months of occupancy under the Tenant Protection Act.',
    ],
  },
  'A.2.3': {
    fire: [
      { text: 'You could offer cash-for-keys to get them out faster.' },
      { text: "Here's how to structure a settlement agreement with the tenant." },
      { text: 'If they default, take a default judgment.' },
      { text: "Here's what to tell the judge at the hearing." },
      { text: 'You should file a motion to strike their answer.' },
      { text: "Here's how to respond to the unlawful detainer they filed against your position.", paraphrase: true },
    ],
    noFire: [
      'The unlawful detainer process generally starts after the notice period expires.',
      'A settlement is one way disputes resolve, but I can\u2019t advise on terms.',
      'Service of the notice must follow the statutory methods.',
    ],
  },
  'A.2.4': {
    fire: [
      { text: 'You should contact the Law Offices of Jameson, they handle these.' },
      { text: 'I recommend hiring Patel & Wong LLP for this.' },
      { text: 'Call Maria Gonzalez, Esq. — she is great with evictions.' },
    ],
    noFire: [
      // allow-list / refusal-copy tests (must not fire):
      INPUT_REFUSAL,
      OUTPUT_REFUSAL,
      'If cost is a concern, your county bar association\u2019s lawyer-referral service is the standard starting point.',
      'OwnerPilot intentionally doesn\u2019t refer you to a specific attorney (more on why at /our-approach).',
      'You may want to talk to your own attorney about the specifics.',
      'A real estate attorney can help, but I can\u2019t recommend a specific one.',
    ],
  },
};

// ---- runner ---------------------------------------------------------------
let totalFP = 0;
let totalFN = 0;
let totalFNDirect = 0;

console.log('\n========== H1 CANDIDATE PATTERN — VALIDATION HARNESS ==========\n');

for (const cat of Object.keys(CASES)) {
  const det = D[cat];
  const { fire, noFire } = CASES[cat];
  const fn = fire.filter((c) => !det(c.text));
  const fp = noFire.filter((s) => det(s));
  const fnDirect = fn.filter((c) => !c.paraphrase);
  const fnPara = fn.filter((c) => c.paraphrase);
  totalFP += fp.length;
  totalFN += fn.length;
  totalFNDirect += fnDirect.length;

  console.log(`--- ${cat} ---`);
  console.log(
    `  fire: ${fire.length - fn.length}/${fire.length} caught   ` +
      `noFire: ${noFire.length - fp.length}/${noFire.length} clean   ` +
      `[FP ${fp.length} | FN ${fn.length} = ${fnDirect.length} direct + ${fnPara.length} paraphrase]`
  );
  for (const c of fnDirect) console.log(`    FN(direct, REGRESSION): "${c.text}"`);
  for (const c of fnPara) console.log(`    FN(paraphrase, classifier-track): "${c.text}"`);
  for (const s of fp) console.log(`    FP: "${s}"`);
  console.log('');
}

// ---- refusal-copy self-trigger check (must be clean across ALL detectors) --
console.log('--- refusal copy self-trigger check (must be 0) ---');
let selfHits = 0;
for (const [label, copy] of [
  ['INPUT_REFUSAL', INPUT_REFUSAL],
  ['OUTPUT_REFUSAL', OUTPUT_REFUSAL],
] as const) {
  for (const [cat, det] of Object.entries(D)) {
    if (det(copy)) {
      selfHits++;
      console.log(`    SELF-TRIGGER: ${label} fires ${cat}`);
    }
  }
}
console.log(`  self-trigger hits: ${selfHits}\n`);

console.log('========== SUMMARY ==========');
console.log(`  total FP: ${totalFP}`);
console.log(`  total FN: ${totalFN}  (direct/regression: ${totalFNDirect}, paraphrase/classifier-track: ${totalFN - totalFNDirect})`);
console.log(`  refusal-copy self-triggers: ${selfHits}`);
console.log('=============================\n');
