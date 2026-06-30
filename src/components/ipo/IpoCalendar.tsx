'use client';
import { useState, useEffect, useMemo } from 'react';
import type { IpoListing, AccountV2 } from '@/lib/types';

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
      if (ipo.subscription_deadline) {
        const d = ipo.subscription_deadline.slice(0, 10);
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(ipo);
      }
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
        <span className="text-[11px] text-[var(--color-muted-light)]">
          数据来源：东方财富 · 北交所官网
        </span>
      </div>

      {/* 日历网格 */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-[11px] font-medium text-[var(--color-muted)]">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square border-b border-r border-[var(--color-border-light)] bg-[var(--color-background)]" />
          ))}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 选中日期的北交所格式表格 */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-muted)]">
            {selectedDate} {selectedIpos.length > 0 ? `· ${selectedIpos.length} 只新股` : ''}
          </h3>
          {selectedIpos.length > 0 ? (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
                    <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">代码</th>
                    <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">简称</th>
                    <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">发行价格</th>
                    <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">发行市盈率</th>
                    <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">申购日</th>
                    <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">上市日</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIpos.map((ipo, i) => (
                    <tr key={ipo.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)]">
                      <td className="px-3 py-2.5 font-mono text-[var(--color-muted)]">{ipo.subscription_code || '—'}</td>
                      <td className="px-3 py-2.5 font-medium">{ipo.company_name}</td>
                      <td className="px-3 py-2.5 text-right">
                        {ipo.price_low ? `¥${ipo.price_low}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">—</td>
                      <td className="px-3 py-2.5 text-right">
                        {ipo.subscription_deadline?.slice(0, 10) || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {ipo.expected_listing_date || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-light)] text-center py-4">当天无 IPO 事件</p>
          )}
        </div>
      )}
    </div>
  );
}
