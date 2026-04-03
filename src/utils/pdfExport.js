import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  createAdmissionTicketFileName,
  getAdmissionCardHeading,
  splitExamLocationLines,
} from './admitCard';

const A4_LANDSCAPE = {
  width: 841.89,
  height: 595.28,
};

const BLACK = rgb(0, 0, 0);
const BLUE = rgb(0.1, 0.3, 0.85);
const RED = rgb(0.86, 0.12, 0.12);

let fontsPromise = null;

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch('/fonts/TimesNewRoman.ttf').then((response) =>
        response.arrayBuffer(),
      ),
      fetch('/fonts/TimesNewRomanBold.ttf').then((response) =>
        response.arrayBuffer(),
      ),
    ]);
  }

  return fontsPromise;
}

function splitToWrappedLines(text, font, size, maxWidth) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const nextLine = `${currentLine} ${words[index]}`;

    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = words[index];
  }

  lines.push(currentLine);
  return lines;
}

function buildParagraphLines(text, font, size, maxWidth) {
  return String(text || '')
    .split('\n')
    .flatMap((segment) => splitToWrappedLines(segment, font, size, maxWidth));
}

function drawCenteredText(page, text, centerX, y, font, size, color = BLACK) {
  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: centerX - textWidth / 2,
    y,
    size,
    font,
    color,
  });
}

function drawLeftText(page, text, x, y, font, size, color = BLACK) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawBellIcon(page, x, y) {
  const bellColor = rgb(0.98, 0.74, 0.18);

  page.drawCircle({
    x: x + 8,
    y: y + 1.8,
    size: 2.1,
    color: bellColor,
  });

  page.drawRectangle({
    x: x + 5.2,
    y: y + 4.5,
    width: 5.6,
    height: 1.8,
    color: bellColor,
  });

  page.drawEllipse({
    x: x + 8,
    y: y + 12,
    xScale: 8,
    yScale: 10.5,
    color: bellColor,
    borderColor: bellColor,
    borderWidth: 0.6,
  });

  page.drawRectangle({
    x: x + 1.5,
    y: y + 5,
    width: 13,
    height: 2.4,
    color: rgb(1, 1, 1),
  });
}

function drawEnvelopeIcon(page, x, y) {
  const bodyColor = rgb(0.89, 0.84, 0.93);
  const accentColor = rgb(0.92, 0.18, 0.26);

  page.drawRectangle({
    x,
    y,
    width: 18,
    height: 12.5,
    color: bodyColor,
    borderColor: rgb(0.72, 0.68, 0.79),
    borderWidth: 0.7,
  });

  page.drawLine({
    start: { x, y: y + 12.5 },
    end: { x: x + 9, y: y + 5.5 },
    thickness: 0.7,
    color: rgb(0.72, 0.68, 0.79),
  });
  page.drawLine({
    start: { x: x + 18, y: y + 12.5 },
    end: { x: x + 9, y: y + 5.5 },
    thickness: 0.7,
    color: rgb(0.72, 0.68, 0.79),
  });
  page.drawLine({
    start: { x, y },
    end: { x: x + 7.1, y: y + 6.4 },
    thickness: 0.7,
    color: rgb(0.72, 0.68, 0.79),
  });
  page.drawLine({
    start: { x: x + 18, y },
    end: { x: x + 10.9, y: y + 6.4 },
    thickness: 0.7,
    color: rgb(0.72, 0.68, 0.79),
  });

  page.drawLine({
    start: { x: x + 2.4, y: y + 16 },
    end: { x: x + 6.8, y: y + 20.4 },
    thickness: 1.7,
    color: accentColor,
  });
  page.drawLine({
    start: { x: x + 6.8, y: y + 20.4 },
    end: { x: x + 4.9, y: y + 20.1 },
    thickness: 1.7,
    color: accentColor,
  });
  page.drawLine({
    start: { x: x + 6.8, y: y + 20.4 },
    end: { x: x + 6.5, y: y + 18.5 },
    thickness: 1.7,
    color: accentColor,
  });
}

function drawMultiLineCentered(
  page,
  lines,
  centerX,
  startY,
  font,
  size,
  lineHeight,
  color = BLACK,
) {
  let currentY = startY;

  lines.forEach((line) => {
    drawCenteredText(page, line, centerX, currentY, font, size, color);
    currentY -= lineHeight;
  });

  return currentY;
}

function drawWrappedText(
  page,
  text,
  x,
  y,
  width,
  font,
  size,
  lineHeight,
  color = BLACK,
) {
  const lines = buildParagraphLines(text, font, size, width);
  let currentY = y;

  lines.forEach((line) => {
    drawLeftText(page, line, x, currentY, font, size, color);
    currentY -= lineHeight;
  });

  return currentY;
}

function drawWrappedTextLines(
  page,
  lines,
  x,
  y,
  width,
  font,
  size,
  lineHeight,
  color = BLACK,
) {
  let currentY = y;

  lines.forEach((line) => {
    currentY = drawWrappedText(
      page,
      line,
      x,
      currentY,
      width,
      font,
      size,
      lineHeight,
      color,
    );
  });

  return currentY;
}

function drawCellText(page, text, rect, font, size, lineHeight, color = BLACK) {
  const rawLines = String(text || '')
    .split('\n')
    .flatMap((segment) => splitToWrappedLines(segment, font, size, rect.width - 8));
  const lines = rawLines.length > 0 ? rawLines : [''];
  const totalHeight = lines.length * lineHeight;
  let currentY = rect.top - (rect.height - totalHeight) / 2 - size + 4;

  lines.forEach((line) => {
    const textWidth = font.widthOfTextAtSize(line, size);

    page.drawText(line, {
      x: rect.x + (rect.width - textWidth) / 2,
      y: currentY,
      size,
      font,
      color,
    });
    currentY -= lineHeight;
  });
}

function formatRoomForPdf(room) {
  const normalized = normalizeText(room);

  if (!normalized) {
    return '--';
  }

  if (normalized.includes('\n')) {
    return normalized;
  }

  const hyphenIndex = normalized.indexOf('-');

  if (hyphenIndex === -1) {
    return normalized;
  }

  return `${normalized.slice(0, hyphenIndex + 1)}\n${normalized.slice(hyphenIndex + 1)}`;
}

function drawPageOne(page, result, regularFont, boldFont) {
  const leftCenterX = 192;
  const rightCenterX = A4_LANDSCAPE.width - 192;

  const leftHeaderBottom = drawMultiLineCentered(
    page,
    [
      'TRƯỜNG PHỔ THÔNG NĂNG KHIẾU',
      'TRUNG TÂM PHÁT TRIỂN NĂNG LỰC',
      'NGƯỜI HỌC (PTNK-Hub)',
    ],
    leftCenterX,
    542,
    boldFont,
    15.1,
    19.5,
  );

  drawMultiLineCentered(
    page,
    [
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      '*****',
    ],
    rightCenterX,
    542,
    boldFont,
    14.3,
    19,
  );

  page.drawLine({
    start: { x: leftCenterX - 42, y: leftHeaderBottom + 8 },
    end: { x: leftCenterX + 42, y: leftHeaderBottom + 8 },
    thickness: 1.25,
    color: BLUE,
  });

  drawCenteredText(
    page,
    getAdmissionCardHeading(),
    A4_LANDSCAPE.width / 2,
    434,
    boldFont,
    21.8,
  );

  drawLeftText(
    page,
    'Trung tâm Phát triển Năng lực Người học (PTNK-Hub) thông báo:',
    50,
    387,
    regularFont,
    12.5,
  );

  drawLeftText(page, 'Thí sinh:', 50, 352, regularFont, 14);
  drawLeftText(page, result.fullName || '--', 110, 352, boldFont, 14);

  drawLeftText(page, 'Số báo danh:', 575, 352, regularFont, 14);
  drawLeftText(page, result.sbd || '--', 662, 352, boldFont, 14);

  drawLeftText(page, 'Ngày sinh:', 50, 320, regularFont, 14);
  drawLeftText(page, result.birthDate || '--', 120, 320, boldFont, 14);

  drawLeftText(
    page,
    'Có mặt tại địa điểm sau để dự thi:',
    50,
    285,
    regularFont,
    12.4,
  );
  drawWrappedTextLines(
    page,
    splitExamLocationLines(result.examLocation || '--'),
    50,
    268,
    742,
    regularFont,
    11.2,
    14.2,
  );

  const tableX = 48;
  const tableTop = 243;
  const firstColumnWidth = 92;
  const otherColumnWidth = 65.2;
  const rowHeights = [70, 68, 54];

  let currentY = tableTop;
  rowHeights.forEach((rowHeight, rowIndex) => {
    const y = currentY - rowHeight;

    page.drawRectangle({
      x: tableX,
      y,
      width: firstColumnWidth,
      height: rowHeight,
      borderWidth: 1,
      borderColor: BLACK,
    });

    for (let columnIndex = 0; columnIndex < 10; columnIndex += 1) {
      page.drawRectangle({
        x: tableX + firstColumnWidth + columnIndex * otherColumnWidth,
        y,
        width: otherColumnWidth,
        height: rowHeight,
        borderWidth: 1,
        borderColor: BLACK,
      });
    }

    currentY = y;
  });

  const rowLabels = [
    'Môn thi',
    'Thời gian\ncó mặt tại\nPhòng thi',
    'Phòng thi',
  ];

  let rowTop = tableTop;
  rowLabels.forEach((label, rowIndex) => {
    drawCellText(
      page,
      label,
      {
        x: tableX,
        top: rowTop,
        width: firstColumnWidth,
        height: rowHeights[rowIndex],
      },
      boldFont,
      rowIndex === 0 ? 10.1 : 9.8,
      12.1,
    );
    rowTop -= rowHeights[rowIndex];
  });

  result.schedule.slice(0, 10).forEach((entry, index) => {
    const cellX = tableX + firstColumnWidth + index * otherColumnWidth;
    const subjectRect = {
      x: cellX,
      top: tableTop,
      width: otherColumnWidth,
      height: rowHeights[0],
    };
    const timeRect = {
      x: cellX,
      top: tableTop - rowHeights[0],
      width: otherColumnWidth,
      height: rowHeights[1],
    };
    const roomRect = {
      x: cellX,
      top: tableTop - rowHeights[0] - rowHeights[1],
      width: otherColumnWidth,
      height: rowHeights[2],
    };

    drawCellText(page, entry.subject || '--', subjectRect, boldFont, 10.15, 11.6);
    drawCellText(
      page,
      entry.checkIn || '--',
      timeRect,
      regularFont,
      9.35,
      11.2,
    );
    drawCellText(
      page,
      formatRoomForPdf(entry.room),
      roomRect,
      boldFont,
      10.55,
      12,
    );
  });
}

function drawPageTwo(page, regularFont, boldFont) {
  // drawBellIcon(page, 30, 508);
  drawLeftText(page, 'LƯU Ý QUAN TRỌNG', 52, 520, boldFont, 24);

  const paragraphs = [
    [
      { text: '- Thí sinh vui lòng in ', bold: false },
      { text: 'GIẤY BÁO THI THỬ', bold: true },
      { text: ' và mang theo khi đi thi.', bold: false },
    ],
    [
      { text: '- Để đảm bảo kỳ thi diễn ra suôn sẻ, thí sinh cần có mặt ', bold: false },
      { text: 'trước giờ thi ít nhất 30 phút', bold: true },
      { text: ', mang theo ', bold: false },
      { text: 'giấy báo thi thử', bold: false, color: RED },
      { text: '.', bold: false },
    ],
    [
      { text: '- Thí sinh có đăng ký dự thi môn Tiếng Anh ', bold: false },
      { text: '(Chuyên và Không chuyên)', bold: false, color: RED },
      { text: ': cần mang theo ', bold: false },
      { text: 'bút chì 2B', bold: true },
      { text: ' để tô đáp án phần Trắc nghiệm.', bold: false },
    ],
    [
      { text: '- Đề thi, đáp án và kết quả sẽ được công bố ', bold: false },
      {
        text: 'trong vòng 10 ngày làm việc kể từ ngày kết thúc kỳ thi',
        bold: true,
      },
      {
        text: ', tại Fanpage Trung tâm Phát triển Năng lực Người học (PTNK-Hub): ',
        bold: false,
      },
      {
        text: 'https://www.facebook.com/PTNKHUB',
        bold: true,
        color: BLUE,
      },
    ],
  ];

  let currentY = 470;

  paragraphs.forEach((segments) => {
    currentY = drawStyledParagraph(
      page,
      segments,
      48,
      currentY,
      750,
      regularFont,
      boldFont,
      16,
      25,
    );
    currentY -= 8;
  });

  currentY -= 22;

  currentY = drawWrappedText(
    page,
    '- Phụ huynh và học sinh có thể đến nhận lại bài thi trong vòng 03 ngày: 8g00-20g00 ngày 10, 11 và 12/4/2026. Trung tâm không giải quyết các trường hợp nhận lại bài thi ngoài khung thời gian trên.',
    48,
    currentY,
    740,
    regularFont,
    16,
    25,
  );

  currentY -= 18;
  drawEnvelopeIcon(page, 49, currentY - 8);
  drawLeftText(
    page,
    'Mọi thắc mắc hoặc cần hỗ trợ thông tin, vui lòng liên hệ:',
    78,
    currentY,
    boldFont,
    17,
  );

  currentY -= 38;
  const contacts = [
    ['Hotline/Zalo: ', '0973.638.631'],
    ['Email: ', 'ptnk-hub@ptnk.edu.vn'],
    ['Fanpage: ', 'https://www.facebook.com/PTNKHUB'],
  ];

  contacts.forEach(([label, value], index) => {
    drawLeftText(page, '•', 72, currentY, boldFont, 18);
    drawLeftText(page, label, 102, currentY, regularFont, 16);
    drawLeftText(
      page,
      value,
      label === 'Fanpage: '
        ? 168
        : label === 'Email: '
          ? 145
          : 185,
      currentY,
      label === 'Fanpage: ' ? regularFont : boldFont,
      16,
      label === 'Fanpage: ' ? BLUE : BLACK,
    );

    currentY -= 34;
  });
}

function drawStyledParagraph(
  page,
  segments,
  x,
  y,
  width,
  regularFont,
  boldFont,
  size,
  lineHeight,
) {
  const spaceWidth = regularFont.widthOfTextAtSize(' ', size);
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  segments.forEach((segment) => {
    const font = segment.bold ? boldFont : regularFont;
    const words = segment.text.split(' ');

    words.forEach((word, index) => {
      const token = index === words.length - 1 ? word : `${word} `;
      const tokenWidth = font.widthOfTextAtSize(token, size);

      if (currentWidth + tokenWidth > width && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }

      currentLine.push({
        text: token,
        font,
        color: segment.color || BLACK,
      });
      currentWidth += tokenWidth || spaceWidth;
    });
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  let currentY = y;

  lines.forEach((line) => {
    let currentX = x;

    line.forEach((piece) => {
      page.drawText(piece.text, {
        x: currentX,
        y: currentY,
        size,
        font: piece.font,
        color: piece.color,
      });

      currentX += piece.font.widthOfTextAtSize(piece.text, size);
    });

    currentY -= lineHeight;
  });

  return currentY;
}

export async function exportAdmissionTicketPdf(result) {
  const [regularFontBytes, boldFontBytes] = await loadFonts();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regularFont = await pdfDoc.embedFont(regularFontBytes, {
    subset: true,
  });
  const boldFont = await pdfDoc.embedFont(boldFontBytes, {
    subset: true,
  });

  const firstPage = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
  drawPageOne(firstPage, result, regularFont, boldFont);

  const secondPage = pdfDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
  drawPageTwo(secondPage, regularFont, boldFont);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const fileName = `${createAdmissionTicketFileName(result)}.pdf`;

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}
