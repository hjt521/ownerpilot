// app/(marketing)/tenant-behind-on-rent-california/page.tsx — SEO landing (Gate T1-0 disposition (a)).
import { buildMarketingMetadata, serviceJsonLd } from '@/lib/marketing/seo';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SeoLanding } from '@/components/marketing/SeoLanding';

const PATH = '/tenant-behind-on-rent-california';
export const metadata = buildMarketingMetadata({
  title: 'Tenant Behind on Rent in California? Start Here',
  description:
    'Tenant behind on rent in California? Start by asking OwnerPilot AI, then move through courtesy reminder, notice preparation, and organized records.',
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd data={serviceJsonLd({ name: 'Tenant Behind on Rent — OwnerPilot Workflow', description: metadata.description as string, path: PATH })} />
      <SeoLanding
        eyebrow="California property owners"
        h1="Tenant Behind on Rent? Start With a Question."
        intro={[
          'When rent is late, the first move is not always a notice. Ask OwnerPilot AI what is happening and let the broker-supervised workflow guide the next step.',
          'Depending on your situation, that might be a courtesy reminder, a 3-day notice, or tracking service after you serve.',
        ]}
        primaryCta={{ href: '/chat', label: 'Ask OwnerPilot AI', ctaSlug: 'ask_ai' }}
        secondaryCta={{ href: '/notice/3-day', label: 'Start a 3-Day Notice', ctaSlug: 'start_notice' }}
        sections={[
          {
            heading: 'Ask first',
            body: [
              'Describe the situation in plain English — rent owed, payment dates, who is on the lease. OwnerPilot asks one question at a time and confirms each detail with you.',
              'You get workflow guidance, not legal advice. OwnerPilot is not a law firm.',
            ],
          },
          {
            heading: 'A courtesy reminder is an option',
            body: [
              'Before a formal notice, some owners send an owner-controlled courtesy reminder. OwnerPilot helps you draft one. It never sends automated messages to your tenant on your behalf.',
            ],
          },
          {
            heading: 'Move into notice preparation when it fits',
            body: [
              'If a 3-day notice is the right next step, OwnerPilot prepares it through a broker-supervised workflow and helps you track service and save the record.',
            ],
          },
        ]}
        faqs={[
          { q: 'Do I have to send a notice right away?', a: 'No. Many owners start with a courtesy reminder. OwnerPilot helps you decide the next step based on your situation.' },
          { q: 'Will OwnerPilot text my tenant?', a: 'No. OwnerPilot only helps you draft owner-controlled reminders. It does not send tenant-facing messages for you.' },
          { q: 'Is this legal advice?', a: 'No. OwnerPilot provides broker-supervised workflow guidance. For legal advice, consult a California licensed attorney.' },
        ]}
      />
    </>
  );
}
