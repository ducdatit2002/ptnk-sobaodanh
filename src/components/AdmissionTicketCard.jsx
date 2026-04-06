import {
  getAdmissionCardHeading,
  splitExamLocationLines,
} from '../utils/admitCard';

function AdmissionTicketCard({
  result,
  currentResultIndex = 0,
  totalResults = 0,
  onNextResult,
  status,
  isDarkMode,
  onPrint,
  exportingPdf = false,
}) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'not-found') {
    return (
      <section
        className={`rounded-[2rem] border p-6 backdrop-blur sm:p-8 ${
          isDarkMode
            ? 'border-slate-800 bg-slate-950/75 shadow-[0_24px_70px_rgba(15,23,42,0.35)]'
            : 'border-sky-100 bg-sky-50/90 shadow-[0_24px_70px_rgba(125,211,252,0.16)]'
        }`}
      >
        <div
          className={`rounded-3xl border p-6 text-center ${
            isDarkMode
              ? 'border-amber-500/20 bg-[linear-gradient(135deg,_rgba(69,26,3,0.72),_rgba(120,53,15,0.45))]'
              : 'border-amber-100 bg-[linear-gradient(135deg,_#fffdf3,_#fff7dd)]'
          }`}
        >
          <p
            className={`text-lg font-semibold ${
              isDarkMode ? 'text-amber-100' : 'text-amber-900'
            }`}
          >
            Không tìm thấy giấy báo thi thử
          </p>
          <p
            className={`mt-2 text-sm ${
              isDarkMode ? 'text-amber-200' : 'text-amber-700'
            }`}
          >
            Vui lòng kiểm tra lại họ tên và số điện thoại trước khi tra cứu lại.
          </p>
        </div>
      </section>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <section
      className={`ticket-print-root rounded-[2rem] border p-6 backdrop-blur sm:p-8 ${
        isDarkMode
          ? 'border-slate-800 bg-slate-950/75 shadow-[0_24px_70px_rgba(15,23,42,0.35)]'
          : 'border-sky-100 bg-sky-50/90 shadow-[0_24px_70px_rgba(125,211,252,0.16)]'
      }`}
    >
      <div className="screen-only mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p
            className={`text-sm font-semibold uppercase tracking-[0.24em] ${
              isDarkMode ? 'text-cyan-300' : 'text-cyan-700'
            }`}
          >
            Kết quả tra cứu
          </p>
          <h2
            className={`text-2xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {result.fullName || 'Chưa có họ tên'}
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <InfoPill label="SBD" value={result.sbd || '--'} isDarkMode={isDarkMode} />
          {totalResults > 1 ? (
            <InfoPill
              label="Hồ sơ"
              value={`${currentResultIndex + 1}/${totalResults}`}
              isDarkMode={isDarkMode}
            />
          ) : null}
          {totalResults > 1 ? (
            <button
              type="button"
              onClick={onNextResult}
              className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                isDarkMode
                  ? 'border border-slate-700 bg-slate-900/75 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.22)]'
                  : 'border border-sky-100 bg-white/90 text-sky-800 shadow-[0_18px_40px_rgba(125,211,252,0.16)]'
              }`}
            >
              Next
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrint}
            disabled={exportingPdf}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
              isDarkMode
                ? 'bg-[linear-gradient(135deg,_#0891b2,_#2563eb)] shadow-[0_18px_40px_rgba(37,99,235,0.28)]'
                : 'bg-[linear-gradient(135deg,_#22d3ee,_#2492ff)] shadow-[0_18px_40px_rgba(34,211,238,0.28)]'
            } ${exportingPdf ? 'cursor-wait opacity-70' : ''}`}
          >
            {exportingPdf ? 'Đang tải xuống...' : 'Tải giấy báo thi thử'}
          </button>
        </div>
      </div>

      <div className="ticket-print-area ticket-print-stack">
        <article className="ticket-sheet ticket-sheet-first">
          <header className="ticket-doc-header">
            <div className="ticket-doc-col">
              <p>TRƯỜNG PHỔ THÔNG NĂNG KHIẾU</p>
              <p>TRUNG TÂM PHÁT TRIỂN NĂNG LỰC</p>
              <p>NGƯỜI HỌC (PTNK-Hub)</p>
              <span className="ticket-doc-underline" aria-hidden="true" />
            </div>

            <div className="ticket-doc-col">
              <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p>Độc lập - Tự do - Hạnh phúc</p>
              <p>*****</p>
            </div>
          </header>

          <div className="ticket-doc-title">
            <h3>{getAdmissionCardHeading()}</h3>
          </div>

          <div className="ticket-doc-body">
            <p>Trung tâm Phát triển Năng lực Người học (PTNK-Hub) thông báo:</p>

            <div className="ticket-meta-row">
              <p>
                Thí sinh: <strong>{result.fullName || '--'}</strong>
              </p>
              <p>
                Số báo danh: <strong>{result.sbd || '--'}</strong>
              </p>
            </div>

            <p>
              Ngày sinh: <strong>{result.birthDate || '--'}</strong>
            </p>

            <div className="ticket-location-block">
              <p>Có mặt tại địa điểm sau để dự thi thử:</p>
              <strong className="ticket-exam-location">
                {renderLocationLines(result.examLocation)}
              </strong>
            </div>

          </div>

          <div className="ticket-table-wrap">
            <table className="ticket-table">
              <tbody>
                <tr>
                  <th className="ticket-row-label" scope="row">
                    Môn thi thử
                  </th>
                  {result.schedule.map((entry, index) => (
                    <th key={`subject-${index}`} scope="col">
                      {entry.subject || '--'}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="ticket-row-label" scope="row">
                    Thời gian có mặt tại Phòng thi thử
                  </th>
                  {result.schedule.map((entry, index) => (
                    <td
                      key={`check-in-${index}`}
                      className="ticket-cell-preline"
                    >
                      {entry.checkIn || '--'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="ticket-row-label" scope="row">
                    Phòng thi thử
                  </th>
                  {result.schedule.map((entry, index) => (
                    <td key={`room-${index}`} className="ticket-room-cell">
                      {entry.room || '--'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="ticket-sheet ticket-notes-sheet">
          <section className="ticket-note-section">
            <h3 className="ticket-notes-title">
              <span className="ticket-note-title-icon" aria-hidden="true">
                🔔
              </span>
              <span>LƯU Ý QUAN TRỌNG</span>
            </h3>

            <div className="ticket-note-list">
              <p>
                - Thí sinh vui lòng in <strong>GIẤY BÁO THI THỬ</strong> và mang
                theo khi đi thi thử.
              </p>
              <p>
                - Để đảm bảo kỳ thi thử diễn ra suôn sẻ, thí sinh cần có mặt{' '}
                <strong>trước giờ thi thử ít nhất 30 phút</strong>, mang theo{' '}
                <span className="ticket-note-emphasis">giấy báo thi thử</span>.
              </p>
              <p>
                - Thí sinh có đăng ký dự thi thử môn Tiếng Anh{' '}
                <span className="ticket-note-emphasis">
                  (Chuyên và Không chuyên)
                </span>
                : cần mang theo <strong>bút chì 2B</strong> để tô đáp án phần Trắc
                nghiệm.
              </p>
              <p>
                - Đề thi thử, đáp án và kết quả sẽ được công bố{' '}
                <strong>
                  trong vòng 10 ngày làm việc kể từ ngày kết thúc kỳ thi thử
                </strong>
                , tại Fanpage Trung tâm Phát triển Năng lực Người học (PTNK-Hub):{' '}
                <a
                  className="ticket-inline-link"
                  href="https://www.facebook.com/PTNKHUB"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://www.facebook.com/PTNKHUB
                </a>
              </p>
              <p>
                - Phụ huynh và học sinh có thể đến nhận lại bài thi thử trong
                vòng 03 ngày: 8g00-20g00 ngày 10, 11 và 12/4/2026. Trung tâm
                không giải quyết các trường hợp nhận lại bài thi thử ngoài khung
                thời gian trên.
              </p>
            </div>

            <div className="ticket-contact-block">
              <h4>
                <span className="ticket-contact-heading-icon" aria-hidden="true">
                  📩
                </span>{' '}
                Mọi thắc mắc hoặc cần hỗ trợ thông tin, vui lòng liên hệ:
              </h4>
              <ul className="ticket-contact-list">
                <li>
                  <span className="ticket-contact-bullet" aria-hidden="true">
                    &bull;
                  </span>
                  <span className="ticket-contact-item-icon" aria-hidden="true">
                    📞
                  </span>
                  <span>
                    Hotline/Zalo: <strong>0973.638.631</strong>
                  </span>
                </li>
                <li>
                  <span className="ticket-contact-bullet" aria-hidden="true">
                    &bull;
                  </span>
                  <span className="ticket-contact-item-icon" aria-hidden="true">
                    📧
                  </span>
                  <span>
                    Email: <strong>ptnk-hub@ptnk.edu.vn</strong>
                  </span>
                </li>
                <li>
                  <span className="ticket-contact-bullet" aria-hidden="true">
                    &bull;
                  </span>
                  <span className="ticket-contact-item-icon" aria-hidden="true">
                    🌐
                  </span>
                  <span>
                    Fanpage:{' '}
                    <a
                      href="https://www.facebook.com/PTNKHUB"
                      target="_blank"
                      rel="noreferrer"
                    >
                      PTNK-Hub
                    </a>
                  </span>
                </li>
              </ul>
            </div>
          </section>
        </article>
      </div>
    </section>
  );
}

function InfoPill({ label, value, isDarkMode }) {
  return (
    <div
      className={`min-w-[132px] rounded-2xl border px-4 py-3 ${
        isDarkMode
          ? 'border-slate-800 bg-[linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(17,24,39,0.82))]'
          : 'border-sky-100 bg-[linear-gradient(135deg,_#f8fdff,_#e7f7ff)]'
      }`}
    >
      <p
        className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-semibold ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function renderLocationLines(value) {
  const lines = splitExamLocationLines(value);

  if (lines.length === 0) {
    return '--';
  }

  return lines.map((line, index) => (
    <span key={`${line}-${index}`} className="ticket-exam-location-line">
      {line}
    </span>
  ));
}

export default AdmissionTicketCard;
