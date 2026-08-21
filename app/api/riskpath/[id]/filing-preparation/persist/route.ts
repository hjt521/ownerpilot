import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  invokeFilingPreparationRuntimePersistence,
  type FilingPreparationRuntimePersistenceResult,
  type FilingPreparationRuntimeSupabaseClient,
} from '@/lib/flow/filingPreparationRuntimePersistenceAction';

const noStore = { 'Cache-Control': 'no-store' } as const;

function statusFor(result: FilingPreparationRuntimePersistenceResult): number {
  if (result.status === 'PERSISTED') return 200;
  switch (result.blockReason) {
    case 'INVALID_REQUEST_BODY':
    case 'INVALID_RISKPATH_RECORD_ID':
    case 'INVALID_USER_ID':
      return 400;
    case 'UNAUTHENTICATED':
      return 401;
    case 'RISKPATH_UNAVAILABLE':
      return 404;
    case 'DUPLICATE_RECORD_CONFLICT':
    case 'E2_3_ADMISSION_BLOCKED':
    case 'ROUND_TRIP_ROW_MISSING':
    case 'ROUND_TRIP_ROW_INVALID':
    case 'ROUND_TRIP_IDENTITY_MISMATCH':
    case 'ROUND_TRIP_PAYLOAD_MISMATCH':
    case 'AUTHENTICATED_USER_MISMATCH':
      return 409;
    case 'AUTHENTICATION_FAILED':
    case 'RISKPATH_LOOKUP_FAILED':
    case 'STORE_ERROR':
    default:
      return 503;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestBody = await req.json().catch(() => null);
  const client = await createClient();
  const result = await invokeFilingPreparationRuntimePersistence({
    client: client as unknown as FilingPreparationRuntimeSupabaseClient,
    riskpathRecordId: id,
    requestBody,
  });

  return NextResponse.json(result, { status: statusFor(result), headers: noStore });
}
