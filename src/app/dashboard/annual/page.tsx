'use client';
import { useState, useEffect } from 'react';

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface MonthSummary {
  month: string;
  totalAvg: number;
  totalTarget: number;
  gap: number;
  activityCount: number;
}

export default function AnnualPage() {
  const year = new Date().getFullYear();
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const months: MonthSummary[] = [];
      for (let m = 1; m <= 12; m++) {
        const month = `${year}-${String(m).padStart(2, '0')}`;
        try {
          const [actRes, balRes, accRes] = await Promise.all([
            fetch(`/api/activities?month=${month}`),
            fetch(`/api/balances?month=${month}`),
            fetch('/api/accounts'),
          ]);
          const activities = await actRes.json();
          const balances = await balRes.json();
          const accounts = await accRes.json();

          if (!Array.isArray(balances) || !Array.isArray(accounts)) {
            months.push({ month, totalAvg: 0, totalTarget: 0, gap: 0, activityCount: 0 });
            continue;
          }

          const daysInMonth = new Date(year, m, 0).getDate();
          const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
          const monthBalances = balances.filter((b: any) => b.date <= monthEnd);
          const totalSum = monthBalances.reduce((s: number, b: any) => s + (b.balance || 0), 0);
          const totalAvg = daysInMonth > 0 ? totalSum / daysInMonth : 0;

          const actArr = Array.isArray(activities) ? activities : [];
          const totalTarget = actArr.reduce((s: number, a: any) => s + (a.target_daily_avg || a.base_daily_avg || 0), 0);

          months.push({
            month,
            totalAvg,
            totalTarget,
            gap: totalTarget > 0 ? totalAvg - totalTarget : 0,
            activityCount: actArr.length,
          });
        } catch {
          months.push({ month, totalAvg: 0, totalTarget: 0, gap: 0, activityCount: 0 });
        }
      }
      setSummaries(months);
      setLoading(false);
    }
    load();
  }, [year]);

  const yearTotal = summaries.reduce((s, m) => s + m.totalAvg, 0);
  const yearAvg = summaries.filter((m) => m.totalAvg > 0).length > 0
    ? yearTotal / summaries.filter((m) => m.totalAvg > 0).length
    : 0;

  if (loading) return <div className="text-center py-12 text-[var(--color-muted)]">加载中...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">📈 {year} 年度收益率</h2>

      {/* 年度概览 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">年度月均资产</p>
          <p className="text-2xl font-semibold mt-1">¥{fmt(yearAvg)}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">已报活动月数</p>
          <p className="text-2xl font-semibold mt-1">{summaries.filter((m) => m.activityCount > 0).length} / 12</p>
        </div>
      </div>

      {/* 月度明细 */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <th className="px-4 py-2 text-left text-xs text-[var(--color-muted)]">月份</th>
              <th className="px-4 py-2 text-right text-xs text-[var(--color-muted)]">日均资产</th>
              <th className="px-4 py-2 text-right text-xs text-[var(--color-muted)]">目标</th>
              <th className="px-4 py-2 text-right text-xs text-[var(--color-muted)]">差额</th>
              <th className="px-4 py-2 text-center text-xs text-[var(--color-muted)]">活动</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.month} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)]">
                <td className="px-4 py-2.5 font-medium">{s.month.slice(5)}月</td>
                <td className="px-4 py-2.5 text-right">{s.totalAvg > 0 ? `¥${fmt(s.totalAvg)}` : '—'}</td>
                <td className="px-4 py-2.5 text-right text-[var(--color-muted)]">{s.totalTarget > 0 ? `¥${fmt(s.totalTarget)}` : '—'}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${s.gap >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {s.totalTarget > 0 ? `${s.gap >= 0 ? '+' : ''}¥${fmt(Math.abs(s.gap))}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {s.activityCount > 0 ? (
                    <span className="text-[10px] bg-[var(--color-accent-light)] text-[var(--color-accent)] px-1.5 py-0.5 rounded-full">{s.activityCount}个</span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[var(--color-muted-light)] text-center">
        数据来源于每月的台账余额和活动配置。空白月份表示暂无数据。
      </p>
    </div>
  );
}
