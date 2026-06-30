// components/marketing/HowItWorks.tsx
// Lane 8 Surface 2 — 3-step chat flow. Copy verbatim from the materialization (not paraphrased).

const STEPS = [
  {
    heading: 'Tell us the situation',
    body: "Walk through what's happening with your tenant in plain English — rent owed, payment dates, who's on the lease, what the unit address is. Our AI asks the questions that matter and confirms each answer with you.",
  },
  {
    heading: 'We check your jurisdiction',
    body: 'California rules vary by city. Once you give us the property address, we identify which jurisdiction governs and match your situation to the right statutory path. If the address sits at a boundary our automated checks can’t resolve, our California licensed real estate broker reviews it personally.',
  },
  {
    heading: 'Get the right notice',
    body: 'We produce the notice that fits your jurisdiction and situation. You review, edit if needed, and download. We do not file with the court and do not serve papers — those steps are yours, and we link to California resources that explain how.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-4xl px-5 py-14">
      <h2 className="text-2xl font-semibold">How it works</h2>
      <ol className="mt-8 grid gap-8 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.heading}>
            <div className="text-sm font-medium text-neutral-500">Step {i + 1}</div>
            <h3 className="mt-1 text-lg font-semibold">{s.heading}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
