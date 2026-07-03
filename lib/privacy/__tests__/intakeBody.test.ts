// lib/privacy/__tests__/intakeBody.test.ts
// Regression: the /api/privacy-request intake must read the body by Content-Type, NOT by relying on
// req.formData() to throw on a JSON body. On Vercel's serverless runtime formData() returns an EMPTY FormData
// instead of throwing, so the old "formData-first, catch → json" pattern read every field as null and rejected
// every request with 400 — CCPA request intake was non-functional in prod. These tests pin the fixed behavior.

import { readIntakeBody } from '@/app/api/privacy-request/route';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// Minimal structural stand-in for a Request/NextRequest.
function fakeReq(opts: {
  contentType: string;
  json?: unknown;
  form?: Record<string, string>;
  formThrows?: boolean;
  // Simulate Vercel: formData() resolves to an EMPTY FormData even though the body is JSON.
  formEmptyOnJson?: boolean;
}) {
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? opts.contentType : null) },
    async json() {
      if (opts.json === undefined) throw new Error('no json body');
      return opts.json;
    },
    async formData() {
      if (opts.formThrows) throw new TypeError('Could not parse content as FormData.');
      const fd = new FormData();
      const src = opts.formEmptyOnJson ? {} : (opts.form ?? {});
      for (const [k, v] of Object.entries(src)) fd.set(k, v);
      return fd;
    },
  };
}

async function run() {
  // 1. JSON body (what the /privacy-request page sends) → fields read correctly.
  {
    const raw = await readIntakeBody(
      fakeReq({ contentType: 'application/json', json: { request_type: 'know', contact_email: 'jack@butlered.com' } }),
    );
    check('json: request_type read', raw.request_type === 'know');
    check('json: contact_email read', raw.contact_email === 'jack@butlered.com');
  }

  // 2. THE REGRESSION: JSON content-type but formData() returns an empty FormData (Vercel behavior). Because we
  //    dispatch on Content-Type, formData() is never consulted → fields still read from JSON, not null.
  {
    const raw = await readIntakeBody(
      fakeReq({
        contentType: 'application/json; charset=utf-8',
        json: { request_type: 'delete', contact_email: 'a@b.com' },
        formEmptyOnJson: true,
      }),
    );
    check('regression: JSON still parsed when formData() would be empty', raw.request_type === 'delete' && raw.contact_email === 'a@b.com');
  }

  // 3. Real multipart form post → fields read from FormData.
  {
    const raw = await readIntakeBody(
      fakeReq({
        contentType: 'multipart/form-data; boundary=x',
        form: { request_type: 'opt_out', contact_email: 'c@d.com', requester_authorization_uploaded: 'true' },
      }),
    );
    check('form: request_type read', raw.request_type === 'opt_out');
    check('form: contact_email read', raw.contact_email === 'c@d.com');
    check('form: auth flag coerced to boolean true', raw.requester_authorization_uploaded === true);
  }

  // 4. urlencoded form post → also read via FormData.
  {
    const raw = await readIntakeBody(
      fakeReq({
        contentType: 'application/x-www-form-urlencoded',
        form: { request_type: 'correct', contact_email: 'e@f.com' },
      }),
    );
    check('urlencoded: fields read', raw.request_type === 'correct' && raw.contact_email === 'e@f.com');
  }

  // 5. Unknown/empty content-type → best-effort JSON, never throws.
  {
    const raw = await readIntakeBody(fakeReq({ contentType: '', json: { request_type: 'limit_sensitive', contact_email: 'g@h.com' } }));
    check('empty content-type: falls back to JSON', raw.request_type === 'limit_sensitive');
  }

  // 6. Garbage body with no parseable JSON → empty object (→ downstream 400), never throws.
  {
    const raw = await readIntakeBody(fakeReq({ contentType: 'application/json' /* json undefined → json() throws */ }));
    check('unparseable JSON → {} (no throw)', typeof raw === 'object' && Object.keys(raw).length === 0);
  }

  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nprivacy intake body: all passed');
}

void run();
