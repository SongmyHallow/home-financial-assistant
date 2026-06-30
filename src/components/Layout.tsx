'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

const tabs = [
  { path: '/dashboard/overview', label: '资产看板', icon: '📊' },
  { path: '/dashboard/ledger', label: '资产台账', icon: '📈' },
  { path: '/dashboard/ipo', label: 'IPO 管理', icon: '🏦' },
  { path: '/dashboard/reminders', label: '提醒中心', icon: '🔔' },
  { path: '/dashboard/annual', label: '年度收益', icon: '📈' },
  { path: '/dashboard/settings', label: '系统设置', icon: '⚙' },
  { path: '/dashboard/changelog', label: '更新日志', icon: '📋' },
];

import { useState, useEffect } from 'react';

// ... keep tabs, etc.

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLedger = pathname.startsWith('/dashboard/ledger');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">

      {/* ====== PC 端：左侧边栏 ====== */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-col z-20">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h1 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
            家庭金融助手
          </h1>
          <p className="text-[11px] text-[var(--color-muted-light)] mt-0.5">{dateStr}</p>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
              </Link>
            );
          })}
        </nav>

        {/* 底部：退出 */}
        <div className="px-3 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[var(--color-muted-light)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] transition-all duration-150"
          >
            <span className="text-base">🚪</span>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* ====== 主内容区 ====== */}
      <div className="md:ml-56 pb-20 md:pb-8">
        {/* 移动端顶部栏 */}
        <header className="md:hidden bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10 backdrop-blur-sm bg-[var(--color-surface)]/90">
          <div className="px-5 py-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              家庭金融助手
            </h1>
            <span className="text-[11px] text-[var(--color-muted-light)]">{dateStr}</span>
          </div>
        </header>

        {/* PC 端页面标题栏 */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-[var(--color-border-light)]">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            {tabs.find(t => pathname.startsWith(t.path))?.label || ''}
          </h2>
        </div>

        <main className={isLedger ? 'p-4' : 'max-w-[1200px] mx-auto px-8 py-6'}>
          {children}
        </main>
      </div>

      {/* ====== 移动端：底部 Tab ====== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-[var(--color-surface)]/95 backdrop-blur-sm border-t border-[var(--color-border)]">
        <div className="flex justify-around py-1">
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors duration-150 ${
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
