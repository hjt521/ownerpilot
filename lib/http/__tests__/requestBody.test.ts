// lib/http/__tests__/requestBody.test.ts
// Regression (recurred #139 → waitlist): readRequestBody dispatches on Content-Type and never relies on
// req.formData() throwing on a JSON body. On Vercel formData() returns an EMPTY FormData for a JSON body, so the
// old "formData-first, catch → json" pattern read every field as null → 400. These tests pin the fixed behavior.

import { readRequestBody } from '../requestBody';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

function fakeReq(opts: {
  contentType: string;
  json?: unknown;
  form?: Record<string, string>;
  formEmptyOnJson?: boolean; // simulate Vercel: formData() resolves empty even for a JSON body
}) {
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? opts.contentType : null) },
    async json() { if (opts.json === undefined) throw new Error('no json'); return opts.json; },
    async formData() {
      const fd = new FormData();
      const src = opts.formEmptyOnJson ? {} : (opts.form ?? {});
      for (const [k, v] of Object.entries(src)) fd.set(k, v);
      return fd;
    },
  };
}

async function run() {
  // 1. JSON body → fields read.
  {
    const raw = await readRequestBody(fakeReq({ contentType: 'application/json', json: { email: 'a@b.com', city: 'LA' } }));
    check('json: email read', raw.email === 'a@b.com');
    check('json: city read', raw.city === 'LA');
  }
  // 2. THE REGRESSION: JSON content-type but formData() returns empty (Vercel) → still parsed from JSON.
  {
    const raw = await readRequestBody(fakeReq({
      contentType: 'application/json; charset=utf-8',
      json: { email: 'x@y.com' },
      formEmptyOnJson: true,
    }));
    check('regression: JSON parsed even when formData() would be empty', raw.email === 'x@y.com');
  }
  // 3. multipart form → entries read as strings.
  {
    const raw = await readRequestBody(fakeReq({ contentType: 'multipart/form-data; boundary=x', form: { email: 'c@d.com', city: 'SF' } }));
    check('form: email read', raw.email === 'c@d.com');
    check('form: city read', raw.city === 'SF');
  }
  // 4. urlencoded → read.
  {
    const raw = await readRequestBody(fakeReq({ contentType: 'application/x-www-form-urlencoded', form: { email: 'e@f.com' } }));
    check('urlencoded: email read', raw.email === 'e@f.com');
  }
  // 5. empty content-type → best-effort JSON.
  {
    const raw = await readRequestBody(fakeReq({ contentType: '', json: { email: 'g@h.com' } }));
    check('empty content-type → JSON', raw.email === 'g@h.com');
  }
  // 6. unparseable JSON → {} (→ downstream 400, never a 500 throw).
  {
    const raw = await readRequestBody(fakeReq({ contentType: 'application/json' }));
    check('unparseable JSON → {}', typeof raw === 'object' && Object.keys(raw).length === 0);
  }

  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nrequest body reader: all passed');
}

void run();
