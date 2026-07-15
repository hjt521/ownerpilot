// app/(marketing)/photo-proof-of-posting/page.tsx — SEO landing (Gate T1-0 disposition (a) REFRAMED, Ruling 2).
// IMPORTANT: OwnerPilot does NOT ship a timestamped-photo-capture product feature. This page educates on service
// documentation and on keeping posting photos in your OWN records (phone timestamps are ordinary phone
// functionality, not an OwnerPilot capability). It never claims OwnerPilot captures, stores, or "verifies" photos.
// CTA points to the shipped Serve & Track surface (proof of service + service log).
import { buildMarketingMetadata, serviceJsonLd } from '@/lib/marketing/seo';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SeoLanding } from '@/components/marketing/SeoLanding';

const PATH = '/photo-proof-of-posting';
export const metadata = buildMarketingMetadata({
  title: 'Posting Photos and Your Owner Records',
  description:
    'Wondering whether a posting photo is enough? A plain-English look at documenting service of a California 3-day notice and keeping your own records.',
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd data={serviceJsonLd({ name: 'Documenting Service of a 3-Day Notice', description: metadata.description as string, path: PATH })} />
      <SeoLanding
        eyebrow="California property owners"
        h1="Posting Photos and Your Owner Records"
        intro={[
          'After posting a notice, many owners take a photo for their own records. A phone photo generally carries the date and time the phone recorded — that is ordinary phone functionality, and it is yours to keep.',
          'What matters most for your file is documenting how service happened. OwnerPilot helps you complete the proof of service and keep a clean service log.',
        ]}
        primaryCta={{ href: '/notice/3-day/serve', label: 'Track Service', ctaSlug: 'serve_track' }}
        secondaryCta={{ href: '/chat', label: 'Ask OwnerPilot AI', ctaSlug: 'ask_ai' }}
        sections={[
          {
            heading: 'A photo is one part of your record',
            body: [
              'A posting photo can support your own records, but it does not replace documenting the method of service. Keep your photos with your file, and complete the proof of service for the notice.',
              'OwnerPilot does not capture or store photos for you. It helps you complete and save the proof of service and the service log.',
            ],
          },
          {
            heading: 'Document the method of service',
            body: [
              'How the notice reached the tenant — personal, substituted, or posting-and-mailing — is what the proof of service records. OwnerPilot helps you complete it.',
            ],
          },
          {
            heading: 'Keep everything together',
            body: [
              'Your proof of service and service log stay in your OwnerPilot records, so your documentation is organized in one place.',
            ],
          },
        ]}
        faqs={[
          { q: 'Is a posting photo enough on its own?', a: 'A photo supports your own records but does not replace documenting the method of service. Complete the proof of service, and consult a California licensed attorney for advice on your situation.' },
          { q: 'Does OwnerPilot store my photos?', a: 'No. OwnerPilot helps you complete the proof of service and service log. Keep your photos with your own records.' },
          { q: 'Do phone photos include a timestamp?', a: 'Phones generally record the date and time with a photo. That is ordinary phone functionality, not an OwnerPilot feature.' },
        ]}
      />
    </>
  );
}
