// app/(marketing)/serve-and-track-3-day-notice/page.tsx — SEO landing (Gate T1-0 disposition (a), CTA retargeted
// to the shipped serve surface /notice/3-day/serve).
import { buildMarketingMetadata, serviceJsonLd } from '@/lib/marketing/seo';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SeoLanding } from '@/components/marketing/SeoLanding';

const PATH = '/serve-and-track-3-day-notice';
export const metadata = buildMarketingMetadata({
  title: 'Track Service After a California 3-Day Notice',
  description:
    'Serving a 3-day notice is only the start. Track service attempts, complete the proof of service, and keep an organized record with OwnerPilot.',
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd data={serviceJsonLd({ name: 'Serve & Track a California 3-Day Notice', description: metadata.description as string, path: PATH })} />
      <SeoLanding
        eyebrow="California property owners"
        h1="The Notice Does Not End at Printing"
        intro={[
          'Once the notice is prepared, service is the next step — and how you document it matters. OwnerPilot helps you record service attempts and complete the proof of service.',
          'Everything you record stays organized so you can find it when you need it.',
        ]}
        primaryCta={{ href: '/notice/3-day/serve', label: 'Open Serve & Track', ctaSlug: 'serve_track' }}
        secondaryCta={{ href: '/chat', label: 'Ask OwnerPilot AI', ctaSlug: 'ask_ai' }}
        sections={[
          {
            heading: 'Record each service attempt',
            body: [
              'Personal service, substituted service, and posting-and-mailing each have their own documentation. OwnerPilot helps you record what you did and when.',
            ],
          },
          {
            heading: 'Complete the proof of service',
            body: [
              'The proof of service captures how the notice reached the tenant. OwnerPilot helps you complete and save it alongside the rest of your record.',
            ],
          },
          {
            heading: 'Keep a clean service log',
            body: [
              'A clear, dated log of your service steps is one of the most useful records to keep. OwnerPilot keeps it with the notice so the story stays connected.',
            ],
          },
        ]}
        faqs={[
          { q: 'Does OwnerPilot serve the notice for me?', a: 'No. You serve the notice. OwnerPilot helps you record the attempts and complete the proof of service.' },
          { q: 'What is posting and mailing?', a: 'It is one method of service with specific steps. OwnerPilot helps you record it; for advice on which method fits, consult a California licensed attorney.' },
          { q: 'Where is my record kept?', a: 'Your service log and proof of service are saved to your OwnerPilot records so everything stays in one place.' },
        ]}
      />
    </>
  );
}
