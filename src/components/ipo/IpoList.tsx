'use client';
import { useState, useEffect, useMemo } from 'react';
import type { IpoListing } from '@/lib/types';
import { useRouter } from 'next/navigation';

const TYPE_FILTERS = ['全部', '申购', '发行结果公告', '上市'] as const;
const TYPE_COLORS: Record<string, string> = {
  '申购': 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  '发行结果公告': 'bg-amber-50 text-amber-700',
  '上市': 'bg-blue-50 text-blue-700',
};

interface EventRow {
  ipo: IpoListing;
  type: string;
  date: string;
}

export default function IpoList() {
  const router = useRouter();
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch('/api/ipo?status=all');
      const data = await res.json();
      if (Array.isArray(data)) setIpos(data);
      setLoading(false);
    }
    load();
  }, []);

  // 生成事件行：每只股票的每个日期类型生成一行
  const events = useMemo(() => {
    const rows: EventRow[] = [];
    for (const ipo of ipos) {
      if (ipo.subscription_deadline) {
        rows.push({ ipo, type: '申购', date: ipo.subscription_deadline.slice(0, 10) });
      }
      if (ipo.ballot_date) {
        rows.push({ ipo, type: '发行结果公告', date: ipo.ballot_date });
      }
      if (ipo.expected_listing_date) {
        rows.push({ ipo, type: '上市', date: ipo.expected_listing_date });
      }
    }
    // 按日期倒序
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [ipos]);

  const filteredEvents = useMemo(() => {
    if (typeFilter === '全部') return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-[var(--color-border-light)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  function createReminder(ipo: IpoListing) {
    const params = new URLSearchParams({
      template: '申购',
      title: `申购${ipo.company_name}`,
      desc: `代码 ${ipo.subscription_code}，一手 ¥${ipo.lot_amount?.toLocaleString() ?? '-'}`,
      deadline: ipo.subscription_deadline || '',
    });
    router.push(`/dashboard/reminders?${params.toString()}`);
  }

  return (
    <div>
      {/* 类型筛选 */}
      <div className="flex gap-1.5 mb-4 bg-[var(--color-border-light)] rounded-xl p-1 w-fit">
        {TYPE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
              typeFilter === t
                ? 'bg-white text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-muted)] text-sm">暂无数据</p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">日期</th>
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">类型</th>
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">代码</th>
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">简称</th>
                <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">发行价</th>
                <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">一手</th>
                <th className="px-3 py-2.5 text-center text-xs text-[var(--color-muted)] font-medium">详情</th>
                <th className="px-3 py-2.5 text-center text-xs text-[var(--color-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt, i) => {
                const ipo = evt.ipo;
                return (
                <tr key={`${ipo.id}-${evt.type}`} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="px-3 py-2.5 text-xs text-[var(--color-foreground)] whitespace-nowrap">{evt.date}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TYPE_COLORS[evt.type] || ''}`}>{evt.type}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--color-muted)]">{ipo.subscription_code || '—'}</td>
                  <td className="px-3 py-2.5 font-medium text-[var(--color-foreground)]">{ipo.company_name}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {ipo.price_low ? `¥${ipo.price_low}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {ipo.lot_amount ? `¥${ipo.lot_amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {ipo.subscription_code ? (
                      <a href={`https://www.bse.cn/newshare/company/${ipo.subscription_code}.html`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--color-accent)] hover:underline whitespace-nowrap">北交所 ↗</a>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => createReminder(ipo)}
                      className="text-[11px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 py-1 rounded-lg whitespace-nowrap transition-colors"
                    >
                      创建提醒
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-muted-light)] mt-2 text-right">
        数据来源：东方财富 · 北交所官网
      </p>
    </div>
  );
}
