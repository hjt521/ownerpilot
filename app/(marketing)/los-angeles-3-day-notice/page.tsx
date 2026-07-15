// app/(marketing)/los-angeles-3-day-notice/page.tsx — SEO landing (Gate T1-0 disposition (a)). LA overlay is the
// shipped current scope (LAHD / RTC / JCO). Authoritative sources linked as descriptive markdown-style anchors.
import { buildMarketingMetadata, serviceJsonLd } from '@/lib/marketing/seo';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SeoLanding } from '@/components/marketing/SeoLanding';

const PATH = '/los-angeles-3-day-notice';
export const metadata = buildMarketingMetadata({
  title: 'Los Angeles 3-Day Notice Workflow',
  description:
    'A Los Angeles look at the 3-day notice workflow, including LAHD and Rent Stabilization considerations, with broker-supervised notice preparation.',
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd data={serviceJsonLd({ name: 'Los Angeles 3-Day Notice Workflow', description: metadata.description as string, path: PATH })} />
      <SeoLanding
        eyebrow="Los Angeles property owners"
        h1="The Los Angeles 3-Day Notice Workflow"
        intro={[
          'Los Angeles has its own overlay on the 3-day notice workflow — including the Los Angeles Housing Department (LAHD) and the Rent Stabilization Ordinance. OwnerPilot’s current scope is Los Angeles.',
          'OwnerPilot prepares the notice through a broker-supervised workflow and helps you keep the LA-specific documentation organized.',
        ]}
        primaryCta={{ href: '/notice/3-day', label: 'Start a 3-Day Notice', ctaSlug: 'start_notice' }}
        secondaryCta={{ href: '/chat', label: 'Ask OwnerPilot AI', ctaSlug: 'ask_ai' }}
        sections={[
          {
            heading: 'The LA overlay',
            body: [
              'Depending on the property, Los Angeles rules may add requirements to your notice and supplemental documentation. OwnerPilot checks your address against California broker-supervised jurisdiction rules as part of the workflow.',
            ],
          },
          {
            heading: 'LAHD and Rent Stabilization',
            body: [
              'Some LA properties fall under the Rent Stabilization Ordinance and LAHD requirements. For authoritative details, see the Los Angeles Housing Department landlord resources and the LAHD Rent Stabilization pages.',
              'If your situation sits outside OwnerPilot’s document-preparation scope, OwnerPilot routes you to consult independent counsel.',
            ],
          },
          {
            heading: 'Keep the LA documentation together',
            body: [
              'OwnerPilot keeps the LA-specific supplemental documentation with your notice and service record, so everything stays connected.',
            ],
          },
        ]}
        calloutNote="Los Angeles is OwnerPilot’s current scope. Multi-city coverage is not authorized yet. OwnerPilot is not a law firm; for legal advice about your Los Angeles property, consult a California licensed attorney."
        faqs={[
          { q: 'Does OwnerPilot cover all of California?', a: 'OwnerPilot’s current scope is Los Angeles. Other cities are not authorized yet.' },
          { q: 'What is the Rent Stabilization Ordinance?', a: 'It is an LA ordinance that adds protections and requirements for covered properties. For authoritative guidance, see LAHD resources or consult a California licensed attorney.' },
          { q: 'Does OwnerPilot file with LAHD for me?', a: 'No. OwnerPilot helps you prepare the notice and keep records. It does not file on your behalf.' },
        ]}
      />
    </>
  );
}
