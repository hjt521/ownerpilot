// components/marketing/JsonLd.tsx
// Marketing Tranche 1 — renders a Schema.org JSON-LD object as a <script type="application/ld+json">.
// Server component. The `data` object is built by the pure helpers in lib/marketing/seo.ts.

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe (no user input; static marketing schema objects).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
