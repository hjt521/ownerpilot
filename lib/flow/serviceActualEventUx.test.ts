import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

let passed = 0;
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}

const noticeFlow = readFileSync('components/notice-flow.tsx', 'utf8');
const serveTrack = readFileSync('components/serve-track.tsx', 'utf8');
const summary = readFileSync('components/notice-summary-panel.tsx', 'utf8');

ok(!noticeFlow.includes('htmlFor="signingDate"'), 'Signing Date input is removed from customer UI');
ok(!noticeFlow.includes('This is the &ldquo;Dated:&rdquo; line on the notice itself'), 'obsolete Dated-line helper is removed');
ok(!noticeFlow.includes('Signed ${signed}'), 'Review no longer echoes Signed date');
ok(noticeFlow.includes("title: 'Signer & planned service'"), 'Review uses signer/planned-service label');
ok(noticeFlow.includes("label: 'Signer & Planned Service'"), 'wizard label no longer implies a Signing Date field');
ok(!noticeFlow.includes('Serving it correctly is what makes it'), 'service intro removes sufficiency implication');
ok(noticeFlow.includes("useState<ServiceMethod | ''>('')"), 'new attempt method starts unselected');
ok(noticeFlow.includes("useState<'SUCCESS' | 'FAILED' | ''>('')"), 'new attempt outcome starts unselected');
ok(noticeFlow.includes("const [attemptDate, setAttemptDate] = useState('')"), 'new attempt date starts blank');
ok(noticeFlow.includes("const [mailingDate, setMailingDate] = useState('')"), 'mailing date starts blank');
ok(noticeFlow.includes("const [notes, setNotes] = useState('')"), 'notes start blank');
ok(noticeFlow.includes('Same person as the previous attempt'), 'same-Notice server identity reuse is explicit');
ok(noticeFlow.includes('I confirm this person is 18 or older.'), 'age eligibility must be freshly confirmed');
ok(noticeFlow.includes('I confirm this person is not a party to this Notice.'), 'party eligibility must be freshly confirmed');
ok(noticeFlow.includes("setServerIs18(false)"), 'new attempt resets age confirmation');
ok(noticeFlow.includes("setServerNotParty(false)"), 'new attempt resets party confirmation');
ok(noticeFlow.includes('SERVICE NOT COMPLETED'), 'failed attempt has explicit incomplete task state');
ok(noticeFlow.includes('Service task complete'), 'successful attempt has explicit completed task state');
ok(noticeFlow.includes('SERVICE RECORDED'), 'successful state is factual, not a legal sufficiency claim');
ok(noticeFlow.includes('Next task: Track what happens after service.'), 'post-service outcome is only a future-task seam');
ok(noticeFlow.includes('This created Notice has changed'), 'stale Notice state is customer-facing and fail-closed');
ok(noticeFlow.includes('Review updated Notice'), 'stale Notice CTA returns to the existing recreate path');
ok(serveTrack.includes('restoreServiceTaskContext(data)'), 'Serve & Track requires exact artifact restoration');
ok(serveTrack.includes('serviceContext.serviceData'), 'service/proof projection combines artifact face with current events');
ok(serveTrack.includes('You are recording service for this Notice'), 'Serve & Track establishes exact Notice context');
ok(serveTrack.includes("The exact created Notice isn&apos;t available"), 'missing exact artifact has a distinct fail-closed state');
ok(serveTrack.includes("This Notice hasn&apos;t been created yet"), 'in-progress draft has a distinct not-created state');
ok(serveTrack.includes('No created Notice found on this browser'), 'empty browser state has a distinct no-created-Notice state');
ok(summary.includes('restoreServiceTaskContext(data)'), 'summary uses exact artifact identity once available');
ok(summary.includes('SERVICE RECORDED'), 'summary transitions to recorded service after success');
ok(summary.includes('Original plan'), 'plan becomes secondary after an actual attempt');
ok(!serveTrack.includes('renderNotice({\n        data,'), 'Serve & Track does not render mutable draft face directly');
ok(noticeFlow.includes("const successDateLabel = success?.method === 'personal' ? 'Actual service date' : 'Attempt date';"), 'personal success is labeled Actual service date while non-personal success is labeled Attempt date');
ok(noticeFlow.includes("success.method !== 'personal' && success.mailingDate"), 'mailing-completed row is limited to non-personal successful service');
ok(!noticeFlow.includes('success.mailingDate ?? success.attemptDate'), 'mailing date is not reused as the task-panel actual service date');
ok(summary.includes("const successDateLabel = success?.method === 'personal' ? 'Actual service date' : 'Attempt date';"), 'summary distinguishes personal actual-service date from substituted/posting attempt date');
ok(summary.includes('k={successDateLabel}'), 'summary renders the method-aware successful date label');
ok(summary.includes("success.method !== 'personal' && success.mailingDate"), 'summary renders mailing completed separately for substituted/posting success');
ok(!summary.includes('success.mailingDate ?? success.attemptDate'), 'summary does not collapse mailing date into actual service date');
ok(summary.includes("attempts.length === 0 ? 'Plan' : 'Original plan'"), 'plan heading becomes historical after any actual attempt');
ok(summary.includes('Plan only — no actual service has been recorded yet.'), 'zero-attempt plan helper is factual');
ok(summary.includes('Original plan only — actual service history is recorded below.'), 'post-attempt plan helper is historical and non-contradictory');

console.log(`${passed} Service Actual-Event UX source assertions passed`);
