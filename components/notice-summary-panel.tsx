import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { derivePayeeName, formatNoticeDate, formatPropertyLine } from '@/lib/produce/renderNotice';
import { computeCompliancePeriod } from '@/lib/dates/computeCompliancePeriod';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import { getSuccessfulAttempt } from '@/lib/flow/escalation';

/**
 * NoticeSummaryPanel — R1b (Concept #1). Live, read-only mirror of the flow
 * data for the wizard's right column. Derivations reuse the SAME helpers the
 * renderer uses (derivePayeeName); nothing here feeds the document. The
 * compliance badge cites California Code of Civil Procedure § 1161(2),
 * matching the locked notice meta (the concept mock's "Civil Code" was
 * corrected — wrong code).
 */

const EM_DASH = '\u2014';

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{k}</dt>
      <dd className="mt-0.5 text-sm text-ink">{v || EM_DASH}</dd>
    </div>
  );
}

export function NoticeSummaryPanel({ data }: { data: NoticeFlowData }) {
  const tenants = (data.tenantNames ?? [])
    .map((t: string) => t.trim())
    .filter(Boolean)
    .join(', ');
  const periods = (data.rentPeriods ?? []).filter(
    (p) => p.periodStartDate && p.periodEndDate,
  );
  const total = periods.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalText =
    total > 0
      ? `$${total.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : '';
  const payee = derivePayeeName(data).name;
  // Deadline mirror: same engine call as the produce gate and the Step-3
  // preview. Method-independent for the face (engine invariant; broker
  // determination 2026-06-12), so the pre-selection fallback is safe.
  let serviceDateText = '';
  let deadlineText = '';
  if (data.serviceDate && /^\d{4}-\d{2}-\d{2}$/.test(data.serviceDate)) {
    serviceDateText = formatNoticeDate(data.serviceDate);
    try {
      const year = Number(data.serviceDate.slice(0, 4));
      const holidays = getVerifiedHolidaySet(year);
      const period = computeCompliancePeriod({
        serviceDate: data.serviceDate,
        serviceMethod: data.serviceMethod ?? 'personal',
        holidays,
      });
      deadlineText = formatNoticeDate(period.expirationDate);
    } catch {
      deadlineText = '';
    }
  }
  // Service attempts summary: None yet / N logged / Served {date}.
  const attempts = data.serviceAttempts ?? [];
  const success = getSuccessfulAttempt(data);
  let attemptsText = 'None yet';
  if (success) {
    const servedISO =
      success.method === 'personal' ? success.attemptDate : success.mailingDate;
    attemptsText =
      servedISO && /^\d{4}-\d{2}-\d{2}$/.test(servedISO)
        ? `Served ${formatNoticeDate(servedISO)}`
        : 'Served';
  } else if (attempts.length > 0) {
    attemptsText = `${attempts.length} attempt${attempts.length === 1 ? '' : 's'} logged`;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-rule bg-white p-5">
        <h2 className="font-serif text-base font-bold text-brand">Notice Summary</h2>
        <dl className="mt-3 space-y-3">
          <Row k="Type of Notice" v="3-Day Notice to Pay Rent or Quit" />
          <Row k="Purpose" v="Non-payment of rent" />
          <Row k="Property" v={formatPropertyLine(data.propertyAddress ?? '', data.propertyUnit)} />
          <Row k="Tenant(s)" v={tenants} />
          <Row k="Total Demanded" v={totalText} />
          <Row k="Payable To" v={payee} />
          <Row k="Intended Service Date" v={serviceDateText} />
          <Row k="Pay or Vacate By" v={deadlineText} />
          <Row k="Service Attempts" v={attemptsText} />
        </dl>
        <div className="mt-4 rounded-md bg-tint px-3 py-2.5">
          <p className="text-xs font-semibold text-brand">California 3-Day Notice Workflow</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Built around California Code of Civil Procedure § 1161(2) and § 1162.
            Broker-prepared. Not legal advice.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-rule bg-white p-5">
        <h2 className="font-serif text-base font-bold text-brand">
          Next: Serve &amp; Track
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          After generating your notice, you can use OwnerPilot AI to track
          service attempts and create a Proof of Service. Service logs and
          proof of service are separate follow-up tools.
        </p>
      </section>
    </div>
  );
}
