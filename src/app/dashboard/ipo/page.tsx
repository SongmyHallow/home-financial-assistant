'use client';
import { useState } from 'react';
import IpoCalendar from '@/components/ipo/IpoCalendar';
import IpoList from '@/components/ipo/IpoList';

export default function IpoPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🏦 IPO 管理</h2>
        <div className="flex bg-[var(--color-border-light)] rounded-xl p-0.5">
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all ${
              view === 'calendar' ? 'bg-white text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted)]'
            }`}
          >
            📅 日历
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all ${
              view === 'list' ? 'bg-white text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted)]'
            }`}
          >
            📋 列表
          </button>
        </div>
      </div>
      {view === 'calendar' ? <IpoCalendar /> : <IpoList />}
    </div>
  );
}
