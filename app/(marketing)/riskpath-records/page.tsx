// app/(marketing)/riskpath-records/page.tsx — SEO landing (Gate T1-0 disposition (a); RiskPath is claimed-only,
// so the cold-traffic CTA routes to /chat to start, not directly to the claimed dashboard).
import { buildMarketingMetadata, serviceJsonLd } from '@/lib/marketing/seo';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SeoLanding } from '@/components/marketing/SeoLanding';

const PATH = '/riskpath-records';
export const metadata = buildMarketingMetadata({
  title: 'RiskPath Records for California Property Owners',
  description:
    'RiskPath keeps your notice, service log, and next steps organized in one connected record. See how OwnerPilot supports owner recordkeeping.',
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd data={serviceJsonLd({ name: 'OwnerPilot RiskPath Records', description: metadata.description as string, path: PATH })} />
      <SeoLanding
        eyebrow="California property owners"
        h1="RiskPath: Your Records in One Place"
        intro={[
          'RiskPath is OwnerPilot’s broker-supervised recordkeeping surface. It keeps the pieces of your workflow — the notice you prepared, your service log, and your next steps — organized in one connected record.',
          'It is a recordkeeping tool, not a legal record or legal advice.',
        ]}
        primaryCta={{ href: '/chat', label: 'Ask OwnerPilot AI', ctaSlug: 'ask_ai' }}
        sections={[
          {
            heading: 'What RiskPath keeps',
            body: [
              'Your prepared notice, the service log and proof of service, and the next steps in your workflow stay together, so you are not stitching a paper trail from memory.',
            ],
          },
          {
            heading: 'How you get a RiskPath record',
            body: [
              'Start in chat and prepare a notice. When you claim your session, your work is saved to your RiskPath records so you can return to it.',
            ],
          },
          {
            heading: 'Recordkeeping, not legal conclusions',
            body: [
              'RiskPath organizes what you did and when. OwnerPilot is not a law firm and does not provide legal advice. For legal advice, consult a California licensed attorney.',
            ],
          },
        ]}
        faqs={[
          { q: 'Is RiskPath a legal record?', a: 'No. RiskPath is a recordkeeping tool that keeps your workflow organized. It is not a legal record or legal advice.' },
          { q: 'How do I start a RiskPath record?', a: 'Start in chat and prepare a notice, then claim your session. Your work saves to your RiskPath records.' },
          { q: 'What does RiskPath store?', a: 'Your prepared notice, service log, proof of service, and next steps — connected in one record.' },
        ]}
      />
    </>
  );
}
