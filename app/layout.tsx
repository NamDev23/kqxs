import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Phòng nghiên cứu xác suất XSMB',
  description: 'Dashboard nghiên cứu XSMB với dữ liệu hai nguồn, walk-forward, baseline và khoảng tin cậy 95%',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-slate-50">{children}</body>
    </html>
  );
}
