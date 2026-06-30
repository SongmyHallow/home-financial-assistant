'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import IpoCalendar from '@/components/ipo/IpoCalendar';
import IpoList from '@/components/ipo/IpoList';
import HkIpoPage from '../hk-ipo/page';

export default function IpoPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [market, setMarket] = useState<'bj' | 'hk'>('bj');

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold">🏦 IPO 管理</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-border-light)] rounded-xl p-0.5">
            <button
              onClick={() => setMarket('bj')}
              className={`px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all ${
                market === 'bj' ? 'bg-white text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted)]'
              }`}
            >
              北交所
            </button>
            <button
              onClick={() => setMarket('hk')}
              className={`px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all ${
                market === 'hk' ? 'bg-white text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted)]'
              }`}
            >
              港股
            </button>
          </div>

          {market === 'bj' && (
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
          )}
        </div>
      </div>
      {market === 'bj' ? (
        view === 'calendar' ? <IpoCalendar /> : <IpoList />
      ) : (
        <HkIpoPage />
      )}
    </div>
  );
}
