// app/(marketing)/california-3-day-notice/page.tsx — SEO landing (Gate T1-0 disposition (a)).
import { buildMarketingMetadata, serviceJsonLd } from '@/lib/marketing/seo';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SeoLanding } from '@/components/marketing/SeoLanding';

const PATH = '/california-3-day-notice';
export const metadata = buildMarketingMetadata({
  title: 'California 3-Day Notice Workflow for Property Owners',
  description:
    'A plain-English look at the California 3-day notice workflow and how OwnerPilot supports broker-supervised notice preparation and recordkeeping.',
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd data={serviceJsonLd({ name: 'California 3-Day Notice Workflow', description: metadata.description as string, path: PATH })} />
      <SeoLanding
        eyebrow="California property owners"
        h1="The California 3-Day Notice Workflow"
        intro={[
          'If a tenant is behind on rent, a 3-day notice is often the first formal step. It tells the tenant the amount owed and the window to pay or move out.',
          'OwnerPilot helps you prepare the notice through a broker-supervised workflow and keep an organized record of what you did and when.',
        ]}
        primaryCta={{ href: '/notice/3-day', label: 'Start a 3-Day Notice', ctaSlug: 'start_notice' }}
        secondaryCta={{ href: '/chat', label: 'Ask OwnerPilot AI', ctaSlug: 'ask_ai' }}
        sections={[
          {
            heading: 'What a 3-day notice is (and is not)',
            body: [
              'A 3-day notice to pay rent or quit is a written notice that states the rent owed and gives the tenant a short window to pay or vacate. It is a workflow step, not a court filing.',
              'OwnerPilot is not a law firm and does not give legal advice. Our templates are designed around California statutory requirements and prepared under broker supervision.',
            ],
          },
          {
            heading: 'Why the documentation matters',
            body: [
              'What you write on the notice, and how you serve it, both matter. Keeping a clear record of the amount claimed, the date prepared, and how the notice was served protects you later.',
              'OwnerPilot saves each step so your record stays organized in one place.',
            ],
          },
          {
            heading: 'How OwnerPilot supports the workflow',
            body: [
              'Answer a few plain-English questions and OwnerPilot prepares the notice, then helps you track service and save the record. If your situation calls for it, OwnerPilot routes you to consult independent counsel.',
            ],
          },
        ]}
        faqs={[
          { q: 'Does OwnerPilot file the notice with the court?', a: 'No. OwnerPilot prepares the notice and helps you keep records. It does not file with the court or serve papers for you.' },
          { q: 'Is OwnerPilot a law firm?', a: 'No. OwnerPilot is a broker-supervised document preparation and recordkeeping platform. For legal advice, consult a California licensed attorney.' },
          { q: 'What amount goes on the notice?', a: 'A 3-day notice generally states base rent owed. If your situation is complex, OwnerPilot routes you to consult independent counsel.' },
        ]}
      />
    </>
  );
}
