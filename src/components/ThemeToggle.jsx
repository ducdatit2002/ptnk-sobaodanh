function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDarkMode}
      aria-label={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        isDarkMode
          ? 'border-cyan-400/20 bg-slate-900/70 text-cyan-100 hover:bg-slate-900'
          : 'border-cyan-200 bg-white/90 text-cyan-700 hover:bg-cyan-50'
      }`}
    >
      <span
        className={`relative flex h-6 w-11 items-center rounded-full p-1 transition ${
          isDarkMode ? 'bg-cyan-400/20' : 'bg-cyan-100'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full transition ${
            isDarkMode
              ? 'translate-x-5 bg-cyan-300'
              : 'translate-x-0 bg-white shadow-[0_2px_8px_rgba(14,165,233,0.22)]'
          }`}
        />
      </span>
      <span>{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
}

export default ThemeToggle;
