import './globals.css';

export const metadata = {
  title: 'Tra cứu số báo danh và lịch thi thử PTNK',
  description:
    'Tra cứu số báo danh và lịch thi thử tuyển sinh vào lớp 10 - lần 2, năm 2026.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
