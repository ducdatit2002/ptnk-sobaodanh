export const ADMISSION_CARD_TITLE =
  process.env.NEXT_PUBLIC_DOWNLOAD_SBD_CARD_TITLE || 'GIẤY BÁO THI THỬ';

export const ADMISSION_CARD_ROUND_LABEL =
  process.env.NEXT_PUBLIC_DOWNLOAD_SBD_CARD_ROUND_LABEL || 'Lần 1';

export const ADMISSION_CARD_SUBTITLE =
  process.env.NEXT_PUBLIC_DOWNLOAD_SBD_CARD_SUBTITLE ||
  'Thi thử tuyển sinh vào lớp 10 - Lần 1, năm 2026';

export const DEFAULT_EXAM_SCHEDULE = [
  {
    subject: 'Ngữ Văn (Không chuyên)',
    aliases: ['ngu van khong chuyen', 'ngu van'],
    checkIn: '7g00\n(Thứ 7)\n28/3/26',
  },
  {
    subject: 'Tiếng Anh (Không chuyên)',
    aliases: ['tieng anh khong chuyen'],
    checkIn: '9g30\n(Thứ 7)\n28/3/26',
  },
  {
    subject: 'Toán (Không chuyên)',
    aliases: ['toan khong chuyen'],
    checkIn: '13g00\n(Thứ 7)\n28/3/26',
  },
  {
    subject: 'Tin học Chuyên',
    aliases: ['tin hoc chuyen', 'tin hoc'],
    checkIn: '7g00\n(Chủ Nhật)\n29/3/26',
  },
  {
    subject: 'Vật lý Chuyên',
    aliases: ['vat ly chuyen', 'vat ly'],
    checkIn: '7g00\n(Chủ Nhật)\n29/3/26',
  },
  {
    subject: 'Hóa Học Chuyên',
    aliases: ['hoa hoc chuyen', 'hoa hoc'],
    checkIn: '7g00\n(Chủ Nhật)\n29/3/26',
  },
  {
    subject: 'Sinh học Chuyên',
    aliases: ['sinh hoc chuyen', 'sinh hoc'],
    checkIn: '7g00\n(Chủ Nhật)\n29/3/26',
  },
  {
    subject: 'Tiếng Anh Chuyên',
    aliases: ['tieng anh chuyen'],
    checkIn: '7g00\n(Chủ Nhật)\n29/3/26',
  },
  {
    subject: 'Ngữ Văn Chuyên',
    aliases: ['ngu van chuyen'],
    checkIn: '13g00\n(Chủ Nhật)\n29/3/26',
  },
  {
    subject: 'Toán Chuyên',
    aliases: ['toan chuyen'],
    checkIn: '13g00\n(Chủ Nhật)\n29/3/26',
  },
];

export const EXAM_VENUE_DEFINITIONS = [
  {
    code: 'HCE',
    label:
      'Trường Cao đẳng Kinh tế TP HCM, 33 đường Vĩnh Viễn, phường Vườn Lài, TP.HCM - (HCE)',
  },
  {
    code: 'PTNK',
    label: 'Trường Phổ thông Năng khiếu - ĐHQG-HCM (Cơ sở An Đông), 153 Nguyễn Chí Thanh, phường An Đông, TP. HCM. (PTNK)',
  },
];

function compactLocationText(value) {
  return removeDiacritics(String(value || ''))
    .toLocaleUpperCase('vi-VN')
    .replace(/\s+/g, '')
    .trim();
}

export function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function firstFilledString(...values) {
  const firstValue = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      normalizeText(String(value)).length > 0,
  );

  return firstValue === undefined || firstValue === null
    ? ''
    : String(firstValue);
}

function normalizeScheduleEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const subject = firstFilledString(
    entry.subject,
    entry.name,
    entry.monThi,
    entry.label,
  );
  const checkIn = firstFilledString(
    entry.checkIn,
    entry.time,
    entry.schedule,
    entry.thoiGian,
  );
  const room = firstFilledString(
    entry.room,
    entry.phongThi,
    entry.examRoom,
    entry.phong,
  );

  if (!subject && !checkIn && !room) {
    return null;
  }

  return {
    subject: subject || 'Môn thi thử',
    checkIn,
    room,
  };
}

function normalizeSchedule(rawSchedule) {
  if (Array.isArray(rawSchedule)) {
    return rawSchedule.map(normalizeScheduleEntry).filter(Boolean);
  }

  if (rawSchedule && typeof rawSchedule === 'object') {
    return Object.entries(rawSchedule)
      .map(([subject, value]) => {
        if (value && typeof value === 'object') {
          return normalizeScheduleEntry({
            subject,
            ...value,
          });
        }

        return normalizeScheduleEntry({
          subject,
          room: value,
        });
      })
      .filter(Boolean);
  }

  return [];
}

function removeDiacritics(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function normalizeSubjectKey(value) {
  return removeDiacritics(value)
    .toLocaleLowerCase('vi-VN')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesScheduleTemplate(subjectKey, templateEntry) {
  const normalizedSubject = normalizeSubjectKey(subjectKey);

  if (!normalizedSubject) {
    return false;
  }

  return templateEntry.aliases.some((alias) => {
    const normalizedAlias = normalizeSubjectKey(alias);

    return (
      normalizedSubject === normalizedAlias ||
      normalizedSubject.includes(normalizedAlias) ||
      normalizedAlias.includes(normalizedSubject)
    );
  });
}

export function mergeWithDefaultExamSchedule(rawSchedule) {
  const normalizedSchedule = normalizeSchedule(rawSchedule);
  const mergedSchedule = DEFAULT_EXAM_SCHEDULE.map((entry) => ({
    subject: entry.subject,
    checkIn: entry.checkIn,
    room: '',
  }));
  const extraEntries = [];

  normalizedSchedule.forEach((entry) => {
    const templateIndex = DEFAULT_EXAM_SCHEDULE.findIndex((templateEntry) =>
      matchesScheduleTemplate(entry.subject, templateEntry),
    );

    if (templateIndex === -1) {
      extraEntries.push(entry);
      return;
    }

    mergedSchedule[templateIndex] = {
      subject: DEFAULT_EXAM_SCHEDULE[templateIndex].subject,
      checkIn: entry.checkIn || DEFAULT_EXAM_SCHEDULE[templateIndex].checkIn,
      room: entry.room || '',
    };
  });

  return [...mergedSchedule, ...extraEntries];
}

export function resolveExamLocationFromSchedule(
  rawSchedule,
  fallbackLocation = '',
) {
  const schedule = Array.isArray(rawSchedule)
    ? rawSchedule.map(normalizeScheduleEntry).filter(Boolean)
    : normalizeSchedule(rawSchedule);
  const matchedVenueCodes = new Set();
  const matchedVenues = [];

  schedule.forEach((entry) => {
    const roomCode = removeDiacritics(entry?.room || '').toLocaleUpperCase(
      'vi-VN',
    );

    EXAM_VENUE_DEFINITIONS.forEach((venue) => {
      if (!roomCode.includes(venue.code) || matchedVenueCodes.has(venue.code)) {
        return;
      }

      matchedVenueCodes.add(venue.code);
      matchedVenues.push(venue.label);
    });
  });

  if (matchedVenues.length > 0) {
    return matchedVenues.join('\n');
  }

  return firstFilledString(fallbackLocation);
}

export function splitExamLocationLines(value) {
  const source = String(value || '').trim();

  if (!source) {
    return [];
  }

  const compactValue = compactLocationText(source);
  const matchedVenues = EXAM_VENUE_DEFINITIONS.filter((venue) => {
    const compactVenue = compactLocationText(venue.label);

    return (
      compactValue.includes(compactVenue) || compactValue.includes(`(${venue.code})`)
    );
  });

  if (matchedVenues.length > 1) {
    return matchedVenues.map((venue) => venue.label);
  }

  const splitLines = source
    .split('\n')
    .flatMap((line) =>
      line
        .split(
          /(?<=\(HCE\))(?=Trường)|(?<=\(HCE\))(?=153)|(?<=\(PTNK\))(?=Trường)|(?<=\(PTNK\))(?=153)|(?=Trường Phổ thông Năng khiếu\b)|(?=153 Nguyễn Chí Thanh\b)/g,
        )
        .map((part) => part.trim())
        .filter(Boolean),
    );

  return splitLines.length > 0 ? splitLines : [source];
}

function extractAdmissionTicketFromPayload(payload) {
  const schedule = mergeWithDefaultExamSchedule(
    payload?.schedule || payload?.examSchedule || payload?.subjects,
  );
  const fallbackLocation = firstFilledString(
    payload?.examLocation,
    payload?.location,
    payload?.diaDiemDuThi,
  );

  return {
    sbd: firstFilledString(
      payload?.sbd,
      payload?.studentId,
      payload?.candidateNumber,
    ),
    fullName: firstFilledString(
      payload?.fullName,
      payload?.name,
      payload?.studentName,
    ),
    birthDate: firstFilledString(
      payload?.birthDate,
      payload?.dob,
      payload?.dateOfBirth,
    ),
    citizenId: firstFilledString(
      payload?.citizenId,
      payload?.cccd,
      payload?.idNumber,
    ),
    examLocation: resolveExamLocationFromSchedule(schedule, fallbackLocation),
    schedule,
  };
}

export function extractAdmissionTicket(responsePayload) {
  const payload =
    responsePayload?.data ||
    responsePayload?.result ||
    responsePayload?.student ||
    responsePayload;

  if (Array.isArray(payload)) {
    return extractAdmissionTicketFromPayload(payload[0] || {});
  }

  return extractAdmissionTicketFromPayload(payload || {});
}

export function extractAdmissionTickets(responsePayload) {
  const payload =
    responsePayload?.data ||
    responsePayload?.result ||
    responsePayload?.student ||
    responsePayload;

  if (Array.isArray(payload)) {
    return payload.map((item) => extractAdmissionTicketFromPayload(item));
  }

  return payload ? [extractAdmissionTicketFromPayload(payload)] : [];
}

function toSlug(value) {
  return removeDiacritics(value)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getAdmissionCardHeading() {
  return ADMISSION_CARD_ROUND_LABEL
    ? `${ADMISSION_CARD_TITLE} (${ADMISSION_CARD_ROUND_LABEL})`
    : ADMISSION_CARD_TITLE;
}

export function createAdmissionTicketFileName(result) {
  const namePart = toSlug(result?.fullName || 'thi-sinh') || 'thi-sinh';
  const sbdPart = toSlug(result?.sbd || 'khong-co-sbd') || 'khong-co-sbd';
  const titlePart = toSlug(getAdmissionCardHeading()) || 'giay-bao-thi-thu';

  return `${sbdPart}-${namePart}-${titlePart}-PTNK-HUB`;
}
