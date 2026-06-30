import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: '家庭金融助手',
  description: '打新 · 提醒 · 记账',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && 'Notification' in window) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
