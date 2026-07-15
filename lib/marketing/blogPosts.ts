// lib/marketing/blogPosts.ts
// Marketing Tranche 1 slice 2 — blog content as data (banned-terms-scanned as a .ts file under lib/). Each post is
// plain-English workflow EDUCATION, never legal advice. Internal links point ONLY to shipped routes. Posts 8/9/10
// are de-producted per the Gate T1-0 inventory (no link to an unshipped Resolve & Document / Move-Out Agreement
// surface — education only). Every post's CTA is "Ask OwnerPilot AI first" → /chat. Copy is a Tranche-1 draft;
// Tranche 2 does the word-by-word review + expansion.

export interface BlogSection {
  heading: string;
  body: string[];
}
export interface BlogFaq {
  q: string;
  a: string;
}
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  intro: string[];
  sections: BlogSection[];
  faqs: BlogFaq[];
}

const DISCLAIMER_LINE =
  'OwnerPilot is not a law firm and does not provide legal advice. For legal advice about your situation, consult a California licensed attorney.';

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'california-landlord-rent-late',
    title: 'What Should a California Landlord Do When Rent Is Late?',
    description: 'A plain-English look at the steps a California property owner can take when rent is late — from a courtesy reminder to notice preparation and organized records.',
    intro: [
      'When rent is late, the first step is not always a formal notice. This is a plain-English overview of the workflow — not legal advice.',
    ],
    sections: [
      { heading: 'Start with the facts', body: ['Review the lease and confirm the amount owed and the dates. Getting the numbers right early protects you later.'] },
      { heading: 'Consider a courtesy reminder', body: ['Some owners send an owner-controlled courtesy reminder before anything formal. OwnerPilot helps you draft one; it never messages your tenant for you.'] },
      { heading: 'Move to a 3-day notice if needed', body: ['If a notice is the right step, OwnerPilot prepares it through a broker-supervised workflow, then helps you track service and save the record.'] },
    ],
    faqs: [
      { q: 'Do I have to serve a notice immediately?', a: 'No. Many owners begin with a courtesy reminder. The right step depends on your situation.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
      { q: 'Where do I start?', a: 'Ask OwnerPilot AI to talk through your situation and the next step.' },
    ],
  },
  {
    slug: 'what-is-3-day-notice-pay-or-quit',
    title: 'What Is a 3-Day Notice to Pay Rent or Quit in California?',
    description: 'A plain-English explanation of the purpose and mechanism of a California 3-day notice to pay rent or quit — as a workflow step, not legal advice.',
    intro: [
      'A 3-day notice to pay rent or quit is a written notice stating the rent owed and a short window to pay or move out. This explains it as a workflow step.',
    ],
    sections: [
      { heading: 'What the notice does', body: ['It puts the rent claim in writing and starts a defined window. It is a workflow step, not a court filing.'] },
      { heading: 'What generally goes on it', body: ['A 3-day notice generally states base rent owed. California Code of Civil Procedure section 1161 addresses these notices; for how it applies to you, consult independent counsel.'] },
      { heading: 'How OwnerPilot helps', body: ['OwnerPilot prepares the notice with templates designed around California statutory requirements, under broker supervision.'] },
    ],
    faqs: [
      { q: 'Is a 3-day notice a court case?', a: 'No. It is a written notice, not a court filing. OwnerPilot does not file with the court.' },
      { q: 'What amount goes on the notice?', a: 'Generally base rent owed. For complex situations, OwnerPilot routes you to consult independent counsel.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'late-fees-in-3-day-notice',
    title: 'Can Late Fees Be Included in a California 3-Day Notice?',
    description: 'A workflow-level look at the base-rent question for California 3-day notices, and why complex cases belong with independent counsel.',
    intro: [
      'Owners often ask whether late fees belong on a 3-day notice. This is a workflow-level overview, not legal advice.',
    ],
    sections: [
      { heading: 'The base-rent question', body: ['A 3-day notice to pay rent or quit generally concerns base rent owed. Adding other amounts can complicate the notice.'] },
      { heading: 'When to get advice', body: ['If your situation involves late fees, partial payments, or disputed amounts, OwnerPilot routes you to consult independent counsel rather than guess.'] },
    ],
    faqs: [
      { q: 'Can I add late fees to the notice?', a: 'This is a fact-specific question. OwnerPilot keeps the workflow to base rent and routes complex amounts to independent counsel.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
      { q: 'What if the tenant made a partial payment?', a: 'Partial payments can affect a notice. Ask OwnerPilot AI, and consult independent counsel for advice.' },
    ],
  },
  {
    slug: 'what-happens-after-3-day-notice-served',
    title: 'What Happens After a 3-Day Notice Is Served?',
    description: 'The notice does not end at printing. A plain-English look at service tracking, posting photos, and keeping a service log.',
    intro: [
      'Preparing the notice is only the start. What happens next — service and documentation — is where many owners lose the thread.',
    ],
    sections: [
      { heading: 'Serve and track', body: ['After the notice is prepared, you serve it and record how. OwnerPilot helps you track service attempts and complete the proof of service.'] },
      { heading: 'Keep your records', body: ['A dated service log and completed proof of service keep your file organized. OwnerPilot saves them with the notice.'] },
    ],
    faqs: [
      { q: 'Does OwnerPilot serve the notice?', a: 'No. You serve it; OwnerPilot helps you record the attempts and complete the proof of service.' },
      { q: 'What is a service log?', a: 'A dated record of your service steps, kept with your notice in OwnerPilot.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'document-service-of-3-day-notice',
    title: 'How Do Landlords Document Service of a 3-Day Notice?',
    description: 'Personal service, substituted service, and posting-and-mailing — a plain-English look at documenting service of a California 3-day notice.',
    intro: [
      'How a notice reaches the tenant, and how you document it, both matter. This is a workflow overview, not legal advice.',
    ],
    sections: [
      { heading: 'Methods of service', body: ['Personal service, substituted service, and posting-and-mailing each have their own steps. OwnerPilot helps you record which you used and when.'] },
      { heading: 'Complete the proof of service', body: ['The proof of service captures how the notice reached the tenant. OwnerPilot helps you complete and save it.'] },
    ],
    faqs: [
      { q: 'Which method should I use?', a: 'That is a fact-specific question — consult independent counsel. OwnerPilot helps you document whichever method you use.' },
      { q: 'Is a posting photo enough?', a: 'A photo supports your own records but does not replace documenting the method of service.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'posting-and-mailing-3-day-notice',
    title: 'What Is Posting and Mailing a 3-Day Notice?',
    description: 'The posting-and-mailing pathway explained as a workflow, not as legal advice — with OwnerPilot support for recording your steps.',
    intro: [
      'Posting and mailing is one method of serving a notice. This explains it as a workflow; for whether it fits your case, consult independent counsel.',
    ],
    sections: [
      { heading: 'The pathway', body: ['California Code of Civil Procedure section 1162 addresses methods of service including posting and mailing. OwnerPilot helps you record the steps you take.'] },
      { heading: 'Documenting it', body: ['Record the posting and the mailing, and complete the proof of service. OwnerPilot keeps it with your notice.'] },
    ],
    faqs: [
      { q: 'When is posting and mailing used?', a: 'It applies in specific situations. For whether it fits your case, consult independent counsel.' },
      { q: 'Does OwnerPilot mail the notice?', a: 'No. You carry out service; OwnerPilot helps you document it.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'why-keep-a-service-log',
    title: 'Why Landlords Should Keep a Service Log After Notice Service',
    description: 'Owner recordkeeping discipline: why a dated service log matters after serving a notice, and how OwnerPilot RiskPath keeps it connected.',
    intro: [
      'A clear, dated log of your service steps is one of the most useful records to keep. Here is why, in plain English.',
    ],
    sections: [
      { heading: 'What a service log captures', body: ['Each attempt, the date, and the method — recorded as you go, not reconstructed from memory later.'] },
      { heading: 'Keep it connected', body: ['OwnerPilot RiskPath keeps your service log with the notice and the rest of your record, so the story stays connected.'] },
    ],
    faqs: [
      { q: 'What should the log include?', a: 'The date, method, and outcome of each service attempt.' },
      { q: 'Where is my log kept?', a: 'In your OwnerPilot RiskPath records, alongside the notice.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'document-tenant-payment-after-notice',
    title: 'What Should a Landlord Document If the Tenant Pays After Notice?',
    description: 'Recordkeeping after a tenant pays following a notice — amount, date, method — as owner documentation, not legal advice.',
    intro: [
      'If a tenant pays after a notice, what you record matters. This is a recordkeeping overview, not legal advice.',
    ],
    sections: [
      { heading: 'What to record', body: ['Record the amount paid, the date, the method, and any confirmation. Keeping this straight protects you if questions come up later.'] },
      { heading: 'Decide the next step', body: ['Whether the notice is closed depends on your situation. Ask OwnerPilot AI to talk it through, and consult independent counsel for advice.'] },
    ],
    faqs: [
      { q: 'What should I record after payment?', a: 'Amount, date, method, and any confirmation — kept with your records.' },
      { q: 'Is the notice closed once they pay?', a: 'That depends on your situation. Consult independent counsel; OwnerPilot helps you keep the record.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'tenant-payment-plan-after-notice',
    title: 'What If a Tenant Wants a Payment Plan After Notice Service?',
    description: 'A plain-English look at documenting a payment arrangement after notice service — write it down, keep the record.',
    intro: [
      'If a tenant proposes a payment plan after a notice, documentation matters. This is a recordkeeping overview, not legal advice.',
    ],
    sections: [
      { heading: 'Put it in writing', body: ['A written record of any arrangement — amounts, dates, terms — is far more useful than a verbal understanding.'] },
      { heading: 'Keep the record', body: ['OwnerPilot helps you keep your notes and record organized in one place. For whether an arrangement is right for you, consult independent counsel.'] },
    ],
    faqs: [
      { q: 'Should a payment plan be in writing?', a: 'A written record is generally clearer than a verbal one. Consult independent counsel on terms.' },
      { q: 'Does OwnerPilot create the agreement?', a: 'OwnerPilot helps you keep your record organized. For agreement terms, consult independent counsel.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'move-out-agreement-after-3-day-notice',
    title: 'What Is a Move-Out Agreement After a 3-Day Notice?',
    description: 'A plain-English look at written move-out arrangements after notice service — why written beats verbal, with the unlawful-detainer caution.',
    intro: [
      'If a tenant agrees to move out after a notice, a written record matters. This is educational, not legal advice.',
    ],
    sections: [
      { heading: 'Do not rely on a verbal agreement', body: ['A written record of a move-out arrangement — date, key return, terms — is clearer and more durable than a verbal understanding.'] },
      { heading: 'If an unlawful detainer is already filed', body: ['If an unlawful detainer case has already been filed, do not rely on a pre-litigation move-out arrangement. Consult independent counsel.'] },
    ],
    faqs: [
      { q: 'Should a move-out arrangement be written?', a: 'A written record is generally clearer than verbal. For terms, consult independent counsel.' },
      { q: 'What if a court case is already filed?', a: 'If an unlawful detainer is filed, consult independent counsel before relying on a pre-litigation arrangement.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'keep-landlord-records-organized',
    title: 'How to Keep Landlord Records Organized After Serving a Notice',
    description: 'Owner recordkeeping after serving a notice — what to save and how OwnerPilot RiskPath keeps it connected in one record.',
    intro: [
      'After serving a notice, the pieces of your workflow are easy to scatter. Here is a plain-English approach to keeping them together.',
    ],
    sections: [
      { heading: 'What to save', body: ['The prepared notice, the service log and proof of service, any payment records, and your next steps.'] },
      { heading: 'Keep it in one place', body: ['OwnerPilot RiskPath keeps these connected in one record, so you are not stitching a paper trail from memory.'] },
    ],
    faqs: [
      { q: 'What should I keep?', a: 'Your notice, service log, proof of service, payment records, and next steps.' },
      { q: 'Where does OwnerPilot keep them?', a: 'In your RiskPath records, connected in one place.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
  {
    slug: 'what-is-ownerpilot-riskpath',
    title: 'What Is OwnerPilot RiskPath?',
    description: 'A product explainer for OwnerPilot RiskPath — the broker-supervised recordkeeping surface that keeps your workflow connected.',
    intro: [
      'RiskPath is OwnerPilot’s broker-supervised recordkeeping surface. Here is what it is and what it keeps.',
    ],
    sections: [
      { heading: 'A connected record', body: ['RiskPath keeps your prepared notice, service log, proof of service, and next steps together in one connected record.'] },
      { heading: 'Recordkeeping, not legal conclusions', body: ['RiskPath organizes what you did and when. It is a recordkeeping tool, not a legal record or legal advice.'] },
    ],
    faqs: [
      { q: 'Is RiskPath a legal record?', a: 'No. It is a recordkeeping tool that keeps your workflow organized.' },
      { q: 'How do I start one?', a: 'Start in chat and prepare a notice, then claim your session to save it to RiskPath.' },
      { q: 'Is this legal advice?', a: DISCLAIMER_LINE },
    ],
  },
];

export function blogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
