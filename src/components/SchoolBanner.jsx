function SchoolBanner({ isDarkMode }) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border p-4 backdrop-blur sm:p-6 ${
        isDarkMode
          ? 'border-slate-800 bg-slate-950/80 shadow-[0_28px_80px_rgba(15,23,42,0.4)]'
          : 'border-sky-100 bg-sky-50/90 shadow-[0_28px_80px_rgba(56,189,248,0.16)]'
      }`}
    >
      <div
        className={`rounded-[1.6rem] p-4 sm:p-5 ${
          isDarkMode
            ? 'bg-[linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(17,24,39,0.96)_40%,_rgba(30,41,59,0.94))]'
            : 'bg-[linear-gradient(135deg,_rgba(245,252,255,0.98),_rgba(225,245,255,0.96)_45%,_rgba(216,240,255,0.94))]'
        }`}
      >
        <img
          src="/logo-ptnk-hub.jpg"
          alt="PTNK HUB"
          className={`h-auto w-full object-contain ${
            isDarkMode ? 'rounded-[1rem] bg-white/96 p-2' : ''
          }`}
        />
      </div>
    </section>
  );
}

export default SchoolBanner;
