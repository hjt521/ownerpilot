import type { NoticeFlowData } from '@/lib/flow/noticeFlowState';
import { derivePayeeName, formatNoticeDate, formatPropertyLine } from '@/lib/produce/renderNotice';
import { computeCompliancePeriod } from '@/lib/dates/computeCompliancePeriod';
import { getVerifiedHolidaySet } from '@/lib/dates/holidays';
import { getSuccessfulAttempt } from '@/lib/flow/escalation';
import { deriveServiceTaskDisplay, restoreServiceTaskContext } from '@/lib/flow/serviceTaskPresentation';
import { formatUsPhone } from '@/lib/flow/phoneFormat';

const EM_DASH = '\u2014';
const SERVICE_METHOD_LABELS = {
  personal: 'Personal service',
  substituted: 'Substituted service',
  post_and_mail: 'Posting and mailing',
} as const;

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{k}</dt>
      <dd className="mt-0.5 text-sm text-ink">{v || EM_DASH}</dd>
    </div>
  );
}

export function NoticeSummaryPanel({ data }: { data: NoticeFlowData }) {
  const serviceContext = restoreServiceTaskContext(data);
  const face = serviceContext?.noticeData ?? data;
  const tenants = (face.tenantNames ?? [])
    .map((t: string) => t.trim())
    .filter(Boolean)
    .join(', ');
  const periods = (face.rentPeriods ?? []).filter(
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
  const payee = derivePayeeName(face).name;

  let plannedDateText = '';
  let plannedDeadlineText = '';
  if (face.serviceDate && /^\d{4}-\d{2}-\d{2}$/.test(face.serviceDate)) {
    plannedDateText = formatNoticeDate(face.serviceDate);
    if (serviceContext) {
      plannedDeadlineText = formatNoticeDate(serviceContext.artifact.dates.compliancePeriodEndDate);
    } else {
      try {
        const year = Number(face.serviceDate.slice(0, 4));
        const holidays = getVerifiedHolidaySet(year);
        const period = computeCompliancePeriod({
          serviceDate: face.serviceDate,
          serviceMethod: face.serviceMethod ?? 'personal',
          holidays,
        });
        plannedDeadlineText = formatNoticeDate(period.expirationDate);
      } catch {
        plannedDeadlineText = '';
      }
    }
  }

  const attempts = data.serviceAttempts ?? [];
  const success = getSuccessfulAttempt(data);
  const serviceDisplay = deriveServiceTaskDisplay(data);
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : undefined;
  const actualDate = success
    ? (success.method === 'personal' ? success.attemptDate : success.mailingDate ?? success.attemptDate)
    : latestAttempt?.attemptDate;
  const actualText = actualDate && /^\d{4}-\d{2}-\d{2}$/.test(actualDate)
    ? formatNoticeDate(actualDate)
    : '';

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-rule bg-white p-5">
        <h2 className="font-serif text-base font-bold text-brand">Notice Summary</h2>
        <dl className="mt-3 space-y-3">
          <Row k="Type of Notice" v="3-Day Notice to Pay Rent or Quit" />
          <Row k="Purpose" v="Non-payment of rent" />
          <Row k="Property" v={formatPropertyLine(face.propertyAddress ?? '', face.propertyUnit)} />
          <Row k="Tenant(s)" v={tenants} />
          <Row k="Total Demanded" v={totalText} />
          <Row k="Payable To" v={payee} />
          <Row
            k="Payment Phone"
            v={face.landlordContact?.phone ? formatUsPhone(face.landlordContact.phone) : ''}
          />
          <Row k="Service Status" v={serviceDisplay.statusLabel} />
          {attempts.length === 0 ? (
            <>
              <Row k="Planned Service Date" v={plannedDateText} />
              <Row k="If served as planned, pay or vacate by" v={plannedDeadlineText} />
            </>
          ) : success ? (
            <Row
              k="Recorded Service"
              v={`${SERVICE_METHOD_LABELS[success.method]}${actualText ? ` · ${actualText}` : ''}`}
            />
          ) : latestAttempt ? (
            <Row
              k="Latest Attempt"
              v={`${SERVICE_METHOD_LABELS[latestAttempt.method]}${actualText ? ` · ${actualText}` : ''}`}
            />
          ) : null}
          <Row
            k="Service Attempts"
            v={attempts.length === 0 ? 'None yet' : `${attempts.length} recorded`}
          />
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
        {success ? (
          <>
            <h2 className="font-serif text-base font-bold text-brand">Recorded service</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              SERVICE RECORDED. The actual recorded event is now the primary service history for this Notice.
            </p>
          </>
        ) : attempts.length > 0 ? (
          <>
            <h2 className="font-serif text-base font-bold text-brand">Service in progress</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {serviceDisplay.statusLabel}. Return to Serve &amp; Track to record another actual attempt when it happens.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-serif text-base font-bold text-brand">Later: Record Service</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              After the notice is actually served, return to Serve &amp; Track to record what happened and create a Proof of Service. Service logs and proof of service are separate follow-up tools.
            </p>
          </>
        )}
        {attempts.length > 0 && plannedDateText && (
          <p className="mt-3 text-xs text-gray-500">Original plan: {plannedDateText}</p>
        )}
      </section>
    </div>
  );
}
