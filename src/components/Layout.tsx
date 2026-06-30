'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { path: '/dashboard/overview', label: '看板', icon: '📊' },
  { path: '/dashboard/ledger', label: '台账', icon: '📈' },
  { path: '/dashboard/ipo', label: 'IPO', icon: '🏦' },
  { path: '/dashboard/reminders', label: '提醒', icon: '🔔' },
  { path: '/dashboard/settings', label: '设置', icon: '⚙' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLedger = pathname.startsWith('/dashboard/ledger');

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-20 md:pb-16">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10 backdrop-blur-sm bg-[var(--color-surface)]/90">
        <div className="px-6 py-3 flex items-center justify-between max-w-[100rem] mx-auto">
          <h1 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
            家庭金融助手
          </h1>
          <span className="text-[11px] text-[var(--color-muted-light)]">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
      </header>

      <main className={isLedger ? 'px-4 py-4' : 'max-w-[100rem] mx-auto px-6 py-5'}>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-[var(--color-surface)]/95 backdrop-blur-sm border-t border-[var(--color-border)]">
        <div className="max-w-xl mx-auto flex justify-around py-1">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors duration-150 ${
                  active
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-muted-light)] hover:text-[var(--color-muted)]'
                }`}
              >
                <span className={`text-lg transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
