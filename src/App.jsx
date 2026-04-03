'use client';

import { useEffect, useState } from 'react';
import NoticeCard from './components/NoticeCard';
import SchoolBanner from './components/SchoolBanner';
import SearchForm from './components/SearchForm';
import ThemeToggle from './components/ThemeToggle';

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

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

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

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <SchoolBanner isDarkMode={isDarkMode} />
        <NoticeCard isDarkMode={isDarkMode} />

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
                    Hệ thống tra cứu số báo danh và lịch thi
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
                  Thi thử tuyển sinh vào lớp 10 – Lần 2, năm 2026
                </p>

                <div className="space-y-3">
                  <h1
                    className={`max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.8rem] ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Tra cứu số báo danh và lịch thi.
                  </h1>
                  <p
                    className={`max-w-xl text-base leading-7 sm:text-lg ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Nhập đúng họ tên, Số điện thoại, và ngày sinh để kiểm tra thông tin khi hệ
                    thống mở tra cứu.
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
                    Họ tên + Số điện thoại + Ngày sinh
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
                  isDarkMode={isDarkMode}
                  isLocked
                  onSubmit={() => Promise.resolve()}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
