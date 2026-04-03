import { NextResponse } from 'next/server';
import {
  getAdmissionLookupConfigSummary,
  lookupAdmissionTicket,
} from '../../../../lib/google-sheets-admit-card.js';
import {
  getLookupLimiterStats,
  QueueFullError,
  QueueTimeoutError,
  withLookupCapacity,
} from '../../../../lib/request-limiter.js';

export const runtime = 'nodejs';

function json(payload, init) {
  return NextResponse.json(payload, init);
}

export async function GET() {
  return json({
    ok: true,
    service: 'download-sbd-google-sheets-route',
    ...getAdmissionLookupConfigSummary(),
    limiter: getLookupLimiterStats(),
  });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Body JSON khong hop le.',
      },
      { status: 400 },
    );
  }

  const fullName = String(body?.fullName || '')
    .trim()
    .replace(/\s+/g, ' ');
  const citizenId = String(body?.citizenId || '')
    .trim()
    .replace(/\s+/g, ' ');
  const birthDate = String(body?.birthDate || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!fullName || !birthDate) {
    return json(
      {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Ho ten va ngay sinh khong duoc de trong.',
      },
      { status: 400 },
    );
  }

  try {
    const student = await withLookupCapacity(() =>
      lookupAdmissionTicket({
        fullName,
        citizenId,
        birthDate,
      }),
    );

    if (!student) {
      return json(
        {
          ok: false,
          code: 'NOT_FOUND',
          message: 'Khong tim thay thong tin thi sinh.',
        },
        { status: 404 },
      );
    }

    return json({
      ok: true,
      data: student,
    });
  } catch (error) {
    if (error instanceof QueueFullError || error instanceof QueueTimeoutError) {
      return json(
        {
          ok: false,
          code: error.code,
          message: error.message,
        },
        {
          status: 503,
          headers: {
            'Retry-After': '3',
          },
        },
      );
    }

    return json(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Da co loi xay ra khi doc Google Sheets.',
      },
      { status: 500 },
    );
  }
}
