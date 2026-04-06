'use client';

import { useEffect, useState } from 'react';
import AdmissionTicketCard from './components/AdmissionTicketCard';
import SchoolBanner from './components/SchoolBanner';
import SearchForm from './components/SearchForm';
import ThemeToggle from './components/ThemeToggle';
import { ADMISSION_CARD_SUBTITLE } from './utils/admitCard';
import { lookupAdmissionTicket } from './utils/admitCardApi';
import { exportAdmissionTicketPdf } from './utils/pdfExport';

const THEME_STORAGE_KEY = 'ptnk-download-sbd-theme';

function getPreferredTheme() {
  if (typeof window === 'undefined') {
    return false;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === 'dark') {
    return true;
  }

  if (savedTheme === 'light') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getReadableErrorMessage(error) {
  if (!(error instanceof Error)) {
    return 'Da co loi xay ra. Vui long thu lai.';
  }

  if (error instanceof TypeError) {
    return 'Khong the ket noi toi dich vu tra cuu. Vui long kiem tra backend va thu lai.';
  }

  return error.message || 'Da co loi xay ra. Vui long thu lai.';
}

function TestApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [status, setStatus] = useState('idle');
  const [hasMounted, setHasMounted] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const result = results[activeResultIndex] || null;

  useEffect(() => {
    setIsDarkMode(getPreferredTheme());
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    document.documentElement.classList.toggle('theme-dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkMode ? 'dark' : 'light',
    );
  }, [hasMounted, isDarkMode]);

  const handleSearch = async (values) => {
    setLoading(true);
    setError('');
    setResults([]);
    setActiveResultIndex(0);
    setStatus('idle');

    try {
      const tickets = await lookupAdmissionTicket(values);

      if (tickets && tickets.length > 0) {
        setResults(tickets);
        setActiveResultIndex(0);
        setStatus('success');
        return;
      }

      setStatus('not-found');
    } catch (requestError) {
      setError(getReadableErrorMessage(requestError));
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleNextResult = () => {
    if (results.length <= 1) {
      return;
    }

    setActiveResultIndex((currentIndex) => (currentIndex + 1) % results.length);
  };

  const handlePrint = async () => {
    if (!result || typeof window === 'undefined') {
      return;
    }

    setExportingPdf(true);

    try {
      await exportAdmissionTicketPdf(result);
    } catch (error) {
      setError(getReadableErrorMessage(error));
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="screen-only">
          <SchoolBanner isDarkMode={isDarkMode} />
        </div>

        <div className="screen-only">
          <section
            className={`overflow-hidden rounded-[2rem] border backdrop-blur ${
              isDarkMode
                ? 'border-slate-800 bg-slate-950/72 shadow-[0_28px_90px_rgba(15,23,42,0.4)]'
                : 'border-sky-100 bg-sky-50/88 shadow-[0_28px_90px_rgba(34,211,238,0.14)]'
            }`}
          >
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_0.92fr] lg:p-10">
              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold ${
                        isDarkMode
                          ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                          : 'border-sky-200 bg-sky-100/80 text-sky-700'
                      }`}
                    >
                      Hệ thống tra cứu giấy báo thi thử
                    </span>
                    <ThemeToggle
                      isDarkMode={isDarkMode}
                      onToggle={() => setIsDarkMode((current) => !current)}
                    />
                  </div>

                  <p
                    className={`text-base font-semibold sm:text-lg ${
                      isDarkMode ? 'text-sky-300' : 'text-sky-700'
                    }`}
                  >
                    {ADMISSION_CARD_SUBTITLE}
                  </p>

                  <div className="space-y-3">
                    <h1
                      className={`max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.8rem] ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Tra cứu phiếu báo danh và giấy báo thi thử.
                    </h1>
                    <p
                      className={`max-w-xl text-base leading-7 sm:text-lg ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Nhập đúng họ tên và số điện thoại nếu đã có dữ liệu trong
                      Google Sheets để hiển thị giấy báo thi thử và tải xuống
                      theo mẫu.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div
                    className={`rounded-[1.6rem] border p-5 ${
                      isDarkMode
                        ? 'border-slate-800 bg-[linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(17,24,39,0.85))]'
                        : 'border-sky-100 bg-[linear-gradient(135deg,_#f7fdff,_#dff4ff)]'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Tra cứu theo
                    </p>
                    <p
                      className={`mt-2 text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Họ tên + Số điện thoại (nếu có)
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-[1.85rem] border p-1 ${
                  isDarkMode
                    ? 'border-slate-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(17,24,39,0.96)_50%,_rgba(30,41,59,0.92))] shadow-[0_24px_64px_rgba(15,23,42,0.36)]'
                    : 'border-sky-100 bg-[linear-gradient(180deg,_rgba(244,252,255,0.98),_rgba(221,244,255,0.96)_50%,_rgba(230,245,255,0.96))] shadow-[0_24px_64px_rgba(125,211,252,0.26)]'
                }`}
              >
                <div
                  className={`rounded-[1.55rem] border p-6 sm:p-7 ${
                    isDarkMode
                      ? 'border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,0.94),_rgba(17,24,39,0.98))]'
                      : 'border-sky-100/80 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_42%),linear-gradient(180deg,_rgba(246,253,255,0.94),_rgba(231,246,255,0.98))]'
                  }`}
                >
                  <SearchForm
                    loading={loading}
                    onSubmit={handleSearch}
                    isDarkMode={isDarkMode}
                    submitLabel="Tra cứu giấy báo thi thử"
                  />

                  {error ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                        isDarkMode
                          ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                      role="alert"
                    >
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        <AdmissionTicketCard
          result={result}
          currentResultIndex={activeResultIndex}
          totalResults={results.length}
          onNextResult={handleNextResult}
          status={status}
          isDarkMode={isDarkMode}
          onPrint={handlePrint}
          exportingPdf={exportingPdf}
        />
      </div>
    </main>
  );
}

export default TestApp;
