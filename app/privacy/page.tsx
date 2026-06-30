// app/privacy/page.tsx
// Lane 6 / Lane 8 Surface 7 — privacy-policy sections. Broker-authored prose, wired VERBATIM (not paraphrased).
// Source: lane8_marketing_copy_materialized_2026-06-29.md Surface 7. These three sections are added to the
// existing privacy policy; if a privacy page already exists in prod, merge these sections into it instead.

export const metadata = { title: 'Privacy Policy — OwnerPilot' };

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 prose prose-neutral">
      <h1>Privacy Policy</h1>

      <h2>Broker-Confirm Requests</h2>
      <p>
        If you request manual review of your property&apos;s jurisdiction, we collect: the address you
        provided, the reason our automated check was inconclusive, and (optionally) your email address.
        The address is used to resolve your jurisdiction. The email, if provided, is used only to notify
        you when review is complete. We delete the email 90 days after your request is resolved. We never
        share it. The address remains in our records for audit and compliance purposes.
      </p>

      <h2>Analytics &amp; Cookies</h2>
      <p>
        We use Google Analytics 4 to measure how visitors use our site. We use Cookiebot to manage consent:
        no analytics cookies fire until you choose to accept them. We have disabled Google Signals and
        enabled IP anonymization on our GA4 property. We retain analytics data for 14 months. We never sell
        your information. To exercise CCPA rights, see the &ldquo;Do Not Sell or Share My Personal
        Information&rdquo; link in our footer.
      </p>

      <h2>Server-Side Events</h2>
      <p>
        For certain operational events (notice generated, intake completed, broker-confirm submitted), we
        record the event server-side via Google&apos;s Measurement Protocol. These records never contain your
        address, name, email, tenant information, payment account numbers, or any other personally identifying
        detail — only the type of event, anonymous request IDs, and aggregate counts.
      </p>
    </main>
  );
}
