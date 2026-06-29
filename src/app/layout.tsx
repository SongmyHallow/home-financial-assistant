import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '家庭金融助手',
  description: '打新 · 提醒 · 记账',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
