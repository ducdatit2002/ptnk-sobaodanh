function NoticeCard({ isDarkMode }) {
  return (
    <section
      className={`rounded-[2rem] border p-6 backdrop-blur sm:p-8 ${
        isDarkMode
          ? 'border-rose-950/70 bg-[linear-gradient(180deg,_rgba(69,10,10,0.72),_rgba(24,24,27,0.88))] shadow-[0_24px_70px_rgba(127,29,29,0.34)]'
          : 'border-rose-200 bg-rose-50/95 shadow-[0_24px_70px_rgba(244,63,94,0.16)]'
      }`}
    >
      <div
        className={`rounded-3xl border p-6 text-center ${
          isDarkMode
            ? 'border-rose-400/25 bg-[linear-gradient(135deg,_rgba(127,29,29,0.5),_rgba(76,5,25,0.32))]'
            : 'border-rose-200 bg-[linear-gradient(135deg,_#fff1f2,_#ffe4e6)]'
        }`}
      >
        <p
          className={`text-sm font-medium uppercase tracking-[0.22em] ${
            isDarkMode ? 'text-rose-200' : 'text-rose-700'
          }`}
        >
          Thông báo
        </p>
        <h2
          className={`mt-3 text-2xl font-semibold ${
            isDarkMode ? 'text-rose-50' : 'text-rose-800'
          }`}
        >
          Số báo danh và lịch thi sẽ được cung cấp vào 14h ngày 7/5/2026.
        </h2>
        <p
          className={`mx-auto mt-3 max-w-2xl text-sm sm:text-base ${
            isDarkMode ? 'text-rose-100/90' : 'text-rose-700'
          }`}
        >
          Vui lòng quay lại sau thời điểm mở tra cứu để xem số báo danh và lịch thi
          tương ứng với thông tin đã nhập.
        </p>
      </div>
    </section>
  );
}

export default NoticeCard;
