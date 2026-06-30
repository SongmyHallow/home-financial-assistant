'use client';
import { useState, useEffect, useMemo } from 'react';
import type { IpoListing } from '@/lib/types';
import IpoCard from '@/components/ipo/IpoCard';

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    days.push(new Date(year, month - 1, d));
  }
  return days;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function IpoCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await fetch(`/api/ipo?status=all`);
      const data = await res.json();
      if (Array.isArray(data)) setIpos(data);
      setLoading(false);
    }
    load();
  }, [year, month]);

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const startDay = days[0]?.getDay() || 0;

  // Group IPOs by date
  const ipoByDate = useMemo(() => {
    const map = new Map<string, IpoListing[]>();
    for (const ipo of ipos) {
      // subscription deadline
      if (ipo.subscription_deadline) {
        const d = ipo.subscription_deadline.slice(0, 10);
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(ipo);
      }
      // expected listing date
      if (ipo.expected_listing_date) {
        const d = ipo.expected_listing_date;
        if (!map.has(d)) map.set(d, []);
        if (!map.get(d)!.some((x) => x.id === ipo.id)) map.get(d)!.push(ipo);
      }
    }
    return map;
  }, [ipos]);

  const selectedIpos = selectedDate ? ipoByDate.get(selectedDate) || [] : [];

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  }

  if (loading) return <div className="text-center py-12 text-[var(--color-muted)]">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">IPO 日历</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="text-sm px-2 py-1 rounded-lg hover:bg-[var(--color-surface-hover)]">◀</button>
          <span className="text-sm font-semibold min-w-[80px] text-center">
            {year}年{month}月
          </span>
          <button onClick={nextMonth} className="text-sm px-2 py-1 rounded-lg hover:bg-[var(--color-surface-hover)]">▶</button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
            className="text-xs text-[var(--color-accent)] px-2 py-1 rounded-lg hover:bg-[var(--color-accent-light)]"
          >
            今天
          </button>
        </div>
      </div>

      {/* 日历网格 */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        {/* 星期头 */}
        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-[11px] font-medium text-[var(--color-muted)]">
              {w}
            </div>
          ))}
        </div>
        {/* 日期格 */}
        <div className="grid grid-cols-7">
          {/* 空白格 */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square border-b border-r border-[var(--color-border-light)] bg-[var(--color-background)]" />
          ))}
          {/* 每天 */}
          {days.map((date) => {
            const dateStr = date.toISOString().slice(0, 10);
            const events = ipoByDate.get(dateStr) || [];
            const isToday = dateStr === today.toISOString().slice(0, 10);
            const isSelected = dateStr === selectedDate;
            const isPast = date < new Date(today.toISOString().slice(0, 10));

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`aspect-square border-b border-r border-[var(--color-border-light)] p-1 cursor-pointer transition-colors hover:bg-[var(--color-accent-light)] ${
                  isSelected ? 'bg-[var(--color-accent-light)] ring-1 ring-[var(--color-accent)]' : ''
                } ${isPast ? 'opacity-40' : ''}`}
              >
                <div className={`text-xs font-medium mb-0.5 ${isToday ? 'bg-[var(--color-accent)] text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-[var(--color-foreground)]'}`}>
                  {date.getDate()}
                </div>
                {events.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {events.slice(0, 3).map((evt, i) => (
                      <span
                        key={i}
                        className={`block w-1.5 h-1.5 rounded-full ${
                          evt.status === '进行中' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted-light)]'
                        }`}
                        title={evt.company_name}
                      />
                    ))}
                    {events.length > 3 && <span className="text-[9px] text-[var(--color-muted-light)]">+{events.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 选中日期的详情 */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-muted)]">
            {selectedDate} {selectedIpos.length > 0 ? `(${selectedIpos.length} 条)` : ''}
          </h3>
          {selectedIpos.length > 0 ? (
            <div className="space-y-3">
              {selectedIpos.map((ipo) => (
                <IpoCard key={ipo.id} ipo={ipo} watched={false} onToggleWatch={() => {}} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-light)] text-center py-4">当天无 IPO 事件</p>
          )}
        </div>
      )}
    </div>
  );
}
