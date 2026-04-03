import crypto from 'node:crypto';
import {
  mergeWithDefaultExamSchedule,
  resolveExamLocationFromSchedule,
} from '../src/utils/admitCard.js';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';
const DEFAULT_CACHE_TTL_MS = 300_000;
const DEFAULT_FETCH_RETRY_COUNT = 3;
const SUBJECT_HINTS = [
  'ngu van',
  'tieng anh',
  'toan',
  'tin hoc',
  'vat ly',
  'hoa hoc',
  'sinh hoc',
  'lich su',
  'dia ly',
  'gdcd',
  'khoa hoc tu nhien',
  'lich su va dia ly',
  'chuyen',
  'khong chuyen',
];

let cachedDataset = null;
let cachedDatasetExpiresAt = 0;
let cachedDatasetPromise = null;

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;
let cachedAccessTokenPromise = null;

function normalizeInput(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function removeDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function normalizeLookupText(value) {
  return removeDiacritics(normalizeInput(value)).toLocaleLowerCase('vi-VN');
}

function normalizeHeader(value) {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/[.:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOptionalEnv(names) {
  return names
    .map((name) => process.env[name])
    .find((value) => Boolean(value));
}

function getRequiredEnv(names) {
  const value = getOptionalEnv(names);

  if (!value) {
    throw new Error(
      `Chua cau hinh bien moi truong ${names.join(' hoac ')}.`,
    );
  }

  return value;
}

function getServiceAccountCredentials() {
  const clientEmail = getRequiredEnv([
    'DOWNLOAD_SBD_GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  ]);
  const privateKey = getRequiredEnv([
    'DOWNLOAD_SBD_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  ]).replace(/\\n/g, '\n');
  const projectId =
    getOptionalEnv([
      'DOWNLOAD_SBD_GOOGLE_SERVICE_ACCOUNT_PROJECT_ID',
      'GOOGLE_SERVICE_ACCOUNT_PROJECT_ID',
    ]) || undefined;

  return {
    clientEmail,
    privateKey,
    projectId,
  };
}

function getSpreadsheetId() {
  return getRequiredEnv([
    'DOWNLOAD_SBD_GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
  ]);
}

function getTargetRange() {
  const range = getOptionalEnv([
    'DOWNLOAD_SBD_GOOGLE_SHEETS_RANGE',
    'DOWNLOAD_SBD_GOOGLE_SHEETS_SHEET_NAME',
    'GOOGLE_SHEETS_RANGE',
    'GOOGLE_SHEETS_SHEET_NAME',
  ]);

  if (!range) {
    throw new Error(
      'Chua cau hinh DOWNLOAD_SBD_GOOGLE_SHEETS_RANGE hoac GOOGLE_SHEETS_RANGE.',
    );
  }

  return range;
}

export function getAdmissionLookupConfigSummary() {
  return {
    spreadsheetConfigured: Boolean(
      getOptionalEnv([
        'DOWNLOAD_SBD_GOOGLE_SHEETS_SPREADSHEET_ID',
        'GOOGLE_SHEETS_SPREADSHEET_ID',
      ]),
    ),
    rangeConfigured: Boolean(
      getOptionalEnv([
        'DOWNLOAD_SBD_GOOGLE_SHEETS_RANGE',
        'DOWNLOAD_SBD_GOOGLE_SHEETS_SHEET_NAME',
        'GOOGLE_SHEETS_RANGE',
        'GOOGLE_SHEETS_SHEET_NAME',
      ]),
    ),
    serviceAccountConfigured: Boolean(
      getOptionalEnv([
        'DOWNLOAD_SBD_GOOGLE_SERVICE_ACCOUNT_EMAIL',
        'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      ]) &&
        getOptionalEnv([
          'DOWNLOAD_SBD_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
          'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
        ]),
    ),
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getFetchRetryCount() {
  const parsed = Number(
    process.env.DOWNLOAD_SBD_GOOGLE_SHEETS_FETCH_RETRY_COUNT ||
      process.env.GOOGLE_SHEETS_FETCH_RETRY_COUNT,
  );

  return Number.isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : DEFAULT_FETCH_RETRY_COUNT;
}

function getCacheTtlMs() {
  const parsed = Number(
    process.env.DOWNLOAD_SBD_GOOGLE_SHEETS_CACHE_TTL_MS ||
      process.env.GOOGLE_SHEETS_CACHE_TTL_MS ||
      DEFAULT_CACHE_TTL_MS,
  );

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CACHE_TTL_MS;
}

function isRetryableError(error) {
  const status = error?.status || error?.code;

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createSignedJwt() {
  const { clientEmail, privateKey } = getServiceAccountCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: TOKEN_AUDIENCE,
    exp: now + 3600,
    iat: now,
  };

  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(
    JSON.stringify(payload),
  )}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(privateKey)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${unsignedToken}.${signature}`;
}

async function fetchAccessTokenOnce() {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: createSignedJwt(),
  });

  const response = await fetch(TOKEN_AUDIENCE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.access_token) {
    const message =
      payload?.error_description ||
      payload?.error ||
      'Khong the xac thuc voi Google.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiresAt =
    Date.now() + Math.max((Number(payload.expires_in) || 3600) - 60, 60) * 1000;

  return cachedAccessToken;
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }

  if (cachedAccessTokenPromise) {
    return cachedAccessTokenPromise;
  }

  cachedAccessTokenPromise = fetchAccessTokenOnce().finally(() => {
    cachedAccessTokenPromise = null;
  });

  return cachedAccessTokenPromise;
}

async function fetchSheetValuesOnce() {
  const accessToken = await getAccessToken();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      getSpreadsheetId(),
    )}/values/${encodeURIComponent(getTargetRange())}`,
  );

  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
  url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message || 'Khong the doc du lieu tu Google Sheets.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload?.values || [];
}

async function fetchSheetValues() {
  const retryCount = getFetchRetryCount();

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fetchSheetValuesOnce();
    } catch (error) {
      if (attempt === retryCount || !isRetryableError(error)) {
        throw error;
      }

      const delayMs =
        Math.min(400 * 2 ** attempt, 3_000) + Math.floor(Math.random() * 250);
      await sleep(delayMs);
    }
  }

  throw new Error('Khong the doc Google Sheets.');
}

function normalizeCitizenId(value) {
  return normalizeInput(value).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function expandYear(value) {
  const raw = String(value || '').trim();

  if (raw.length !== 2) {
    return raw;
  }

  return Number(raw) >= 50 ? `19${raw}` : `20${raw}`;
}

function normalizeDateLookupValue(value) {
  const raw = normalizeInput(value);

  if (!raw) {
    return '';
  }

  const compact = raw.replace(/\s+/g, '');
  const slashSeparated = compact.replace(/[.\-]/g, '/');

  let match = slashSeparated.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (match) {
    return `${pad2(match[1])}/${pad2(match[2])}/${expandYear(match[3])}`;
  }

  match = slashSeparated.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (match) {
    return `${pad2(match[3])}/${pad2(match[2])}/${expandYear(match[1])}`;
  }

  match = compact.match(/^(\d{2})(\d{2})(\d{4})$/);

  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`;
  }

  return slashSeparated;
}

function createLookupKey({ fullName, citizenId, birthDate }) {
  return [
    normalizeLookupText(fullName),
    normalizeCitizenId(citizenId),
    normalizeDateLookupValue(birthDate),
  ].join('|');
}

function createLookupKeyWithoutCitizenId({ fullName, birthDate }) {
  return [
    normalizeLookupText(fullName),
    normalizeDateLookupValue(birthDate),
  ].join('|');
}

function detectColumnIndex(headers, matcher) {
  return headers.findIndex((header) => matcher(normalizeHeader(header), header));
}

function detectScheduleFieldType(normalizedHeader) {
  if (normalizedHeader.includes('lich thi')) {
    return 'schedule';
  }

  if (
    normalizedHeader.includes('thoi gian co mat') ||
    normalizedHeader.includes('gio co mat') ||
    normalizedHeader.includes('gio thi') ||
    normalizedHeader.includes('thoi gian')
  ) {
    return 'time';
  }

  if (normalizedHeader === 'thu' || normalizedHeader.includes('thu ')) {
    return 'weekday';
  }

  if (normalizedHeader.includes('ngay')) {
    return 'date';
  }

  if (normalizedHeader.includes('phong thi') || normalizedHeader === 'phong') {
    return 'room';
  }

  if (
    normalizedHeader === 'mon thi' ||
    /^mon thi \d+$/i.test(normalizedHeader) ||
    /^mon \d+$/i.test(normalizedHeader)
  ) {
    return 'subject';
  }

  return 'value';
}

function isFieldOnlySegment(normalizedSegment) {
  return [
    'mon',
    'mon thi',
    'thoi gian',
    'thoi gian co mat',
    'thoi gian co mat tai phong thi',
    'gio',
    'gio thi',
    'gio co mat',
    'ngay',
    'ngay thi',
    'thu',
    'phong',
    'phong thi',
    'lich thi',
  ].includes(normalizedSegment);
}

function looksLikeSubjectSegment(originalSegment, normalizedSegment) {
  if (!normalizedSegment || isFieldOnlySegment(normalizedSegment)) {
    return false;
  }

  if (/[()]/.test(originalSegment)) {
    return true;
  }

  return SUBJECT_HINTS.some((hint) => normalizedSegment.includes(hint));
}

function extractSubjectLabelFromHeader(originalHeader) {
  const header = normalizeInput(originalHeader);

  if (!header) {
    return '';
  }

  const segments = header
    .split(/\s*[-:–]\s*/)
    .map((segment) => normalizeInput(segment))
    .filter(Boolean);

  if (segments.length > 1) {
    const subjectSegment = segments.find((segment) =>
      looksLikeSubjectSegment(segment, normalizeHeader(segment)),
    );

    if (subjectSegment) {
      return subjectSegment;
    }
  }

  if (looksLikeSubjectSegment(header, normalizeHeader(header))) {
    return header;
  }

  return '';
}

function extractSlotId(normalizedHeader) {
  const match = normalizedHeader.match(/(?:^|\s)(\d{1,2})(?:$|\s)/);
  return match ? match[1] : '';
}

function getScheduleColumns(headers, infoIndices) {
  return headers
    .map((header, index) => {
      if (infoIndices.has(index)) {
        return null;
      }

      const originalHeader = normalizeInput(header);
      const normalizedHeader = normalizeHeader(originalHeader);

      if (!normalizedHeader) {
        return null;
      }

      const subjectLabel = extractSubjectLabelFromHeader(originalHeader);
      const fieldType = detectScheduleFieldType(normalizedHeader);
      const slotId = extractSlotId(normalizedHeader);
      const shouldInclude =
        fieldType !== 'value' ||
        Boolean(subjectLabel) ||
        normalizedHeader === 'lich thi';

      if (!shouldInclude) {
        return null;
      }

      return {
        index,
        order: index,
        fieldType,
        groupKey: subjectLabel
          ? `subject:${normalizeLookupText(subjectLabel)}`
          : slotId
            ? `slot:${slotId}`
            : `col:${index}`,
        subjectLabel,
      };
    })
    .filter(Boolean);
}

function resolveColumns(headers) {
  const sbdIndex = detectColumnIndex(
    headers,
    (header) => header === 'sbd' || header === 'so bao danh',
  );
  const fullNameIndex = detectColumnIndex(
    headers,
    (header) =>
      header.includes('ho va ten hoc sinh') ||
      header === 'ho va ten' ||
      header === 'ho ten',
  );
  const citizenIdIndex = detectColumnIndex(
    headers,
    (header) =>
      header.includes('cccd') ||
      header.includes('can cuoc cong dan') ||
      header.includes('so dinh danh') ||
      header.includes('cmnd'),
  );
  const birthDateIndex = detectColumnIndex(
    headers,
    (header) =>
      header.includes('ngay thang nam sinh') || header.includes('ngay sinh'),
  );
  const examLocationIndex = detectColumnIndex(
    headers,
    (header) => header.includes('dia diem du thi') || header.includes('dia diem'),
  );

  if (fullNameIndex === -1) {
    throw new Error('Khong tim thay cot ho ten trong Google Sheets.');
  }

  if (birthDateIndex === -1) {
    throw new Error('Khong tim thay cot ngay sinh trong Google Sheets.');
  }

  const infoIndices = new Set(
    [sbdIndex, fullNameIndex, citizenIdIndex, birthDateIndex, examLocationIndex].filter(
      (index) => index >= 0,
    ),
  );

  return {
    sbdIndex,
    fullNameIndex,
    citizenIdIndex,
    birthDateIndex,
    examLocationIndex,
    scheduleColumns: getScheduleColumns(headers, infoIndices),
  };
}

function splitCompositeValue(value) {
  return String(value || '')
    .split(/\r?\n|[|;]+/)
    .map((part) => normalizeInput(part))
    .filter(Boolean);
}

function looksLikeRoom(value) {
  const raw = normalizeInput(value);

  if (!raw) {
    return false;
  }

  const normalized = normalizeHeader(raw);

  if (normalized.includes('phong')) {
    return true;
  }

  return (
    /^[A-Za-z0-9][A-Za-z0-9\s/-]{0,24}$/.test(raw) &&
    /[0-9]/.test(raw) &&
    /[A-Za-z]/.test(raw)
  );
}

function looksLikeScheduleDetail(value) {
  const raw = normalizeInput(value);
  const normalized = normalizeHeader(raw);

  return (
    /\b\d{1,2}\s*(?:g|h|:)\s*\d{0,2}\b/i.test(raw) ||
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(raw) ||
    normalized.includes('thu ') ||
    normalized.includes('chu nhat') ||
    normalized.includes('thoi gian') ||
    normalized.includes('ngay')
  );
}

function mergeLines(...values) {
  const seen = new Set();
  const lines = [];

  values.forEach((value) => {
    String(value || '')
      .split(/\r?\n/)
      .map((line) => normalizeInput(line))
      .filter(Boolean)
      .forEach((line) => {
        const key = normalizeLookupText(line);

        if (!seen.has(key)) {
          seen.add(key);
          lines.push(line);
        }
      });
  });

  return lines.join('\n');
}

function cleanRoomValue(value) {
  return normalizeInput(
    String(value || '').replace(/^(phong thi|phong)\s*[:\-]?\s*/i, ''),
  );
}

function applyCompositeScheduleValue(group, value) {
  const parts = splitCompositeValue(value);

  if (parts.length === 0) {
    return;
  }

  const scheduleLines = [];

  parts.forEach((part) => {
    if (!group.room && looksLikeRoom(part) && !looksLikeScheduleDetail(part)) {
      group.room = cleanRoomValue(part);
      return;
    }

    if (looksLikeRoom(part) && normalizeHeader(part).includes('phong')) {
      group.room = cleanRoomValue(part);
      return;
    }

    scheduleLines.push(part);
  });

  if (scheduleLines.length > 0) {
    group.composite = mergeLines(group.composite, scheduleLines.join('\n'));
    return;
  }

  if (!group.room && parts.length === 1) {
    group.room = cleanRoomValue(parts[0]);
  }
}

function buildCheckInText(group) {
  return mergeLines(group.time, group.weekday, group.date, group.composite);
}

function buildScheduleEntries(row, scheduleColumns) {
  const groups = new Map();

  scheduleColumns.forEach((column) => {
    const rawValue = normalizeInput(row[column.index]);

    if (!rawValue) {
      return;
    }

    const group =
      groups.get(column.groupKey) ||
      {
        order: column.order,
        subject: column.subjectLabel,
        time: '',
        weekday: '',
        date: '',
        composite: '',
        room: '',
      };

    groups.set(column.groupKey, group);

    if (column.subjectLabel && !group.subject) {
      group.subject = column.subjectLabel;
    }

    if (column.fieldType === 'subject') {
      group.subject = rawValue;
      return;
    }

    if (column.fieldType === 'time') {
      group.time = mergeLines(group.time, rawValue);
      return;
    }

    if (column.fieldType === 'weekday') {
      group.weekday = mergeLines(group.weekday, rawValue);
      return;
    }

    if (column.fieldType === 'date') {
      group.date = mergeLines(group.date, rawValue);
      return;
    }

    if (column.fieldType === 'room') {
      group.room = mergeLines(group.room, cleanRoomValue(rawValue));
      return;
    }

    applyCompositeScheduleValue(group, rawValue);
  });

  return Array.from(groups.values())
    .sort((left, right) => left.order - right.order)
    .map((group) => {
      const subject = normalizeInput(group.subject);
      const checkIn = buildCheckInText(group);
      const room = normalizeInput(group.room);

      if (!subject && !checkIn && !room) {
        return null;
      }

      return {
        subject: subject || 'Môn thi',
        checkIn,
        room,
      };
    })
    .filter(Boolean);
}

function mapDataset(values) {
  if (values.length === 0) {
    throw new Error('Google Sheets khong co du lieu.');
  }

  const headers = values[0].map((cell) => String(cell || '').trim());
  const rows = values.slice(1);
  const columns = resolveColumns(headers);
  const lookupIndex = new Map();
  const fallbackLookupIndex = new Map();
  const duplicateKeys = new Set();
  const duplicateFallbackKeys = new Set();

  rows.forEach((row) => {
    const key = createLookupKey({
      fullName: row[columns.fullNameIndex],
      citizenId:
        columns.citizenIdIndex === -1 ? '' : row[columns.citizenIdIndex],
      birthDate: row[columns.birthDateIndex],
    });
    const fallbackKey = createLookupKeyWithoutCitizenId({
      fullName: row[columns.fullNameIndex],
      birthDate: row[columns.birthDateIndex],
    });

    if (lookupIndex.has(key)) {
      duplicateKeys.add(key);
    } else {
      lookupIndex.set(key, row);
    }

    if (fallbackLookupIndex.has(fallbackKey)) {
      duplicateFallbackKeys.add(fallbackKey);
    } else {
      fallbackLookupIndex.set(fallbackKey, row);
    }
  });

  return {
    columns,
    duplicateKeys,
    duplicateFallbackKeys,
    fallbackLookupIndex,
    headers,
    lookupIndex,
    rows,
  };
}

function scheduleRefresh() {
  if (cachedDatasetPromise) {
    return cachedDatasetPromise;
  }

  cachedDatasetPromise = fetchSheetValues()
    .then((values) => {
      cachedDataset = mapDataset(values);
      cachedDatasetExpiresAt = Date.now() + getCacheTtlMs();
      return cachedDataset;
    })
    .catch((error) => {
      if (!cachedDataset) {
        throw error;
      }

      console.error('[admit-card] refresh failed, serving stale cache:', error);
      return cachedDataset;
    })
    .finally(() => {
      cachedDatasetPromise = null;
    });

  return cachedDatasetPromise;
}

async function getSheetDataset() {
  const now = Date.now();

  if (cachedDataset && now < cachedDatasetExpiresAt) {
    return cachedDataset;
  }

  if (cachedDataset) {
    scheduleRefresh().catch((error) => {
      console.error('[admit-card] background refresh failed:', error);
    });
    return cachedDataset;
  }

  return scheduleRefresh();
}

function buildAdmissionTicket(row, columns) {
  const schedule = mergeWithDefaultExamSchedule(
    buildScheduleEntries(row, columns.scheduleColumns),
  );
  const examLocation =
    columns.examLocationIndex === -1
      ? ''
      : normalizeInput(row[columns.examLocationIndex]);

  return {
    sbd:
      columns.sbdIndex === -1 ? '' : normalizeInput(row[columns.sbdIndex]),
    fullName: normalizeInput(row[columns.fullNameIndex]),
    citizenId:
      columns.citizenIdIndex === -1
        ? ''
        : normalizeInput(row[columns.citizenIdIndex]),
    birthDate: normalizeInput(row[columns.birthDateIndex]),
    examLocation: resolveExamLocationFromSchedule(schedule, examLocation),
    schedule,
  };
}

export async function lookupAdmissionTicket({
  fullName,
  citizenId,
  birthDate,
}) {
  const dataset = await getSheetDataset();
  const fullKey = createLookupKey({
    fullName,
    citizenId:
      dataset.columns.citizenIdIndex === -1 ? '' : citizenId,
    birthDate,
  });
  const fallbackKey = createLookupKeyWithoutCitizenId({
    fullName,
    birthDate,
  });

  if (dataset.duplicateKeys.has(fullKey)) {
    throw new Error(
      'Du lieu bi trung. Hay xu ly trung ho ten, so dien thoai va ngay sinh trong sheet.',
    );
  }

  if (dataset.duplicateFallbackKeys.has(fallbackKey)) {
    throw new Error(
      'Du lieu bi trung. Hay xu ly trung ho ten va ngay sinh trong sheet.',
    );
  }

  const row =
    dataset.lookupIndex.get(fullKey) ||
    dataset.fallbackLookupIndex.get(fallbackKey);

  if (!row) {
    return null;
  }

  return buildAdmissionTicket(row, dataset.columns);
}
