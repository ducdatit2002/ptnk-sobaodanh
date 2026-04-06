import { extractAdmissionTickets } from './admitCard';

const LOOKUP_API_URL =
  process.env.NEXT_PUBLIC_DOWNLOAD_SBD_LOOKUP_API_URL || '/test/api/lookup';

async function readJsonSafely(response) {
  const rawText = await response.text();

  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error('May chu tra ve du lieu khong hop le.');
  }
}

export async function lookupAdmissionTicket({ fullName, citizenId }) {
  const response = await fetch(LOOKUP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName,
      citizenId,
    }),
  });

  const payload = await readJsonSafely(response);

  if (response.status === 404 || payload?.code === 'NOT_FOUND') {
    return null;
  }

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || 'Khong the tra cuu du lieu luc nay.');
  }

  return extractAdmissionTickets(payload);
}
