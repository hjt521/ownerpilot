export const metadata = {
  title: "Our Approach | OwnerPilot AI",
  description:
    "Why OwnerPilot keeps attorney services completely separate from its platform — and why that's good for you.",
};

export default function OurApproachPage() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700 mb-3">
            About Our Approach
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Built for Owners. Separate from Lawyers. On Purpose.
          </h1>
        </header>

        <section className="space-y-6 text-lg text-gray-800 leading-relaxed mb-12">
          <p>
            OwnerPilot AI was built by a California Licensed Real Estate Broker for the people who actually own the property — the long-time homeowners, the accidental landlords, the families with one or two rentals that came along with a parent&apos;s estate. You don&apos;t need another platform that quietly steers you toward services it profits from. You need clear preparation, organized information, and a calm path forward.
          </p>
          <p>
            That&apos;s what we do. And the way we&apos;ve structured the company is part of how we earn your trust.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">What We Do</h2>
          <p className="text-lg text-gray-800 leading-relaxed mb-4">
            OwnerPilot is a preparation platform. We help you:
          </p>
          <ul className="space-y-3 text-lg text-gray-800 leading-relaxed list-disc pl-6 mb-6">
            <li>Get plain-English AI guidance on the questions California property owners actually ask.</li>
            <li>Organize the issues in front of you — what&apos;s urgent, what can wait, what to document.</li>
            <li>Build an evidence and timeline record: dates, notices, photos, communications, all in one place.</li>
            <li>Keep your documents in order so nothing important is missing when you need it.</li>
            <li>Receive broker-reviewed pricing reports so you understand the market position of your property.</li>
          </ul>
          <p className="text-lg text-gray-800 leading-relaxed">
            Think of us as the work you&apos;d want done before any meeting with a professional — the groundwork that turns a confusing situation into a clear one.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">What We Don&apos;t Do</h2>
          <div className="space-y-4 text-lg text-gray-800 leading-relaxed">
            <p>
              OwnerPilot is not a law firm, and nothing on the platform is legal advice, legal representation, or a legal opinion. Our AI is a guidance tool, not an attorney.
            </p>
            <p>
              We also don&apos;t sell, bundle, package, or refer attorney services from inside OwnerPilot. There is no &ldquo;in-house lawyer.&rdquo; There is no partner firm. There is no attorney sitting behind a button on this site.
            </p>
            <p>
              When you need legal help, you choose your own California licensed attorney and engage them directly under a written attorney-client agreement that belongs to the two of you.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Why We Keep It Separate</h2>
          <div className="space-y-4 text-lg text-gray-800 leading-relaxed">
            <p>
              This separation isn&apos;t accidental. It reflects how the legal profession is regulated in California — and, frankly, how we think a trustworthy company should operate.
            </p>
            <p>
              Under the California Rules of Professional Conduct, lawyers may not share legal fees with non-lawyers (Rule 5.4) and may not pay another person or company for recommending or securing their services (Rule 7.2), outside of a few narrow exceptions like State-Bar-certified lawyer referral services. In plain terms: if a technology company is taking a cut of an attorney&apos;s fee, or being paid to send you to a particular lawyer, something is off.
            </p>
            <p>
              We&apos;ve decided not to operate near that line at all. OwnerPilot earns money from owners who use our platform — not from attorneys, not from referrals, not from fee splits, not from kickbacks. The founder&apos;s spouse is a California licensed attorney who runs an entirely separate practice; she is not part of OwnerPilot, doesn&apos;t take referrals through OwnerPilot, and doesn&apos;t share fees with OwnerPilot. The wall is real.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">What This Means For You</h2>
          <div className="space-y-4 text-lg text-gray-800 leading-relaxed">
            <p>
              <strong>Your attorney works for you, not for us. </strong>Because we don&apos;t take a cut, there is no financial reason for us to steer you anywhere.
            </p>
            <p>
              <strong>You choose the lawyer.</strong> When the time comes, you pick a California licensed attorney whose experience and approach fit your situation, and you engage them under your own written agreement.
            </p>
            <p>
              <strong>You arrive prepared.</strong> The timeline, documents, and issue summary you build with OwnerPilot are yours to bring to whichever professional you choose — which usually makes that conversation shorter, clearer, and more useful.
            </p>
            <p>
              <strong>You stay in control.</strong> Of your property, of your information, and of who you hire.
            </p>
            <p>
              That&apos;s the whole idea. We do the preparation well. We stay out of the parts that aren&apos;t ours to do.
            </p>
          </div>
        </section>

        <section className="mt-16 pt-12 border-t border-gray-200 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Ready when you are.</h2>
                   <a 
            href="/chat"
            className="inline-flex items-center px-8 py-4 bg-blue-700 text-white text-lg font-semibold rounded-lg hover:bg-blue-800 transition-colors"
          >
            Ask Your Property Question →
          </a>
        </section>

        <footer className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">
            OwnerPilot AI is not a law firm and does not provide legal advice. For legal matters, consult a California licensed attorney of your choosing.
          </p>
        </footer>
      </article>
    </main>
  );
}
