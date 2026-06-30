'use client';
import { useState, useEffect } from 'react';
import type { Activity, DailyBalance } from '@/lib/types';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface AccountSummary {
  accountId: string;
  accountName: string;
  isBrokerage: boolean;
  baseAvg: number;
  targetAvg: number | null;
  currentAvg: number;
  gap: number;
  activity?: Activity;
}

export default function DashboardCards() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [summaries, setSummaries] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accRes, actRes, balRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch(`/api/activities?month=${month}`),
          fetch(`/api/balances?month=${month}`),
        ]);
        const accounts = await accRes.json();
        const activities: Activity[] = await actRes.json();
        const balances: DailyBalance[] = await balRes.json();

        if (!Array.isArray(accounts)) return;
        const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
        const today = new Date().toISOString().slice(0, 10);

        const result: AccountSummary[] = accounts.map((acc: any) => {
          const act = Array.isArray(activities) ? activities.find((a: Activity) => a.account_id === acc.id) : null;
          const accBalances = Array.isArray(balances)
            ? balances.filter((b: DailyBalance) => b.account_id === acc.id && b.date <= today)
            : [];
          const sum = accBalances.reduce((s: number, b: DailyBalance) => s + (b.balance || 0), 0);
          const currentAvg = daysInMonth > 0 ? sum / daysInMonth : 0;
          const targetAvg = act?.target_daily_avg ?? null;
          const baseAvg = act?.base_daily_avg || 0;
          const gap = targetAvg ? currentAvg - targetAvg : 0;

          return {
            accountId: acc.id,
            accountName: acc.name,
            isBrokerage: acc.is_brokerage || false,
            baseAvg,
            targetAvg,
            currentAvg,
            gap,
            activity: act || undefined,
          };
        });

        setSummaries(result);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [month]);

  const activeSummaries = summaries.filter((s) => s.activity || s.currentAvg > 0);
  const totalCurrent = activeSummaries.reduce((s, a) => s + a.currentAvg, 0);
  const totalTarget = activeSummaries.reduce((s, a) => s + (a.targetAvg ?? a.baseAvg), 0);
  const totalGap = totalCurrent - totalTarget;

  if (loading) {
    return <div className="text-center py-12 text-[var(--color-muted)]">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 月份选择 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">资产看板</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-sm bg-white"
        />
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">当前总日均</p>
          <p className="text-2xl font-semibold mt-1 text-[var(--color-foreground)]">
            ¥{fmt(totalCurrent)}
          </p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">目标总日均</p>
          <p className="text-2xl font-semibold mt-1 text-[var(--color-foreground)]">
            ¥{fmt(totalTarget)}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${totalGap >= 0 ? 'bg-[var(--color-success-light)] border-[var(--color-success)]/20' : 'bg-[var(--color-danger-light)] border-[var(--color-danger)]/20'}`}>
          <p className="text-[11px] uppercase tracking-wider opacity-70">资金缺口</p>
          <p className={`text-2xl font-semibold mt-1 ${totalGap >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            {totalGap >= 0 ? '+' : ''}¥{fmt(totalGap)}
          </p>
        </div>
      </div>

      {/* 各银行详情 */}
      {activeSummaries.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-muted)]">各银行详情</h3>
          {activeSummaries.map((s) => (
            <div
              key={s.accountId}
              className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${s.isBrokerage ? 'text-blue-600' : 'text-[var(--color-foreground)]'}`}>
                    {s.accountName}
                  </span>
                  {s.isBrokerage && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">券商</span>
                  )}
                  {s.activity && (
                    <span className="text-[10px] bg-[var(--color-accent-light)] text-[var(--color-accent)] px-1.5 py-0.5 rounded-full">已报活动</span>
                  )}
                </div>
                <div className="flex gap-6 mt-2 text-xs text-[var(--color-muted)]">
                  {s.activity && <span>上月日均 ¥{fmt(s.baseAvg)}</span>}
                  {s.targetAvg != null && <span>目标 ¥{fmt(s.targetAvg)}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold text-[var(--color-foreground)]">¥{fmt(s.currentAvg)}</p>
                <p className="text-xs text-[var(--color-muted)]">当前日均</p>
              </div>
              <div className="text-right shrink-0 min-w-[80px]">
                {s.targetAvg != null ? (
                  <>
                    <p className={`text-sm font-semibold ${s.gap >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {s.gap >= 0 ? '+' : ''}¥{fmt(Math.abs(s.gap))}
                    </p>
                    {/* 进度条 */}
                    <div className="w-full bg-[var(--color-border-light)] rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${s.gap >= 0 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`}
                        style={{ width: `${Math.min(Math.max((s.currentAvg / (s.targetAvg || 1)) * 100, 5), 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[var(--color-muted-light)]">无目标</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <p className="text-4xl mb-2 opacity-30">📊</p>
          <p className="text-[var(--color-muted)] text-sm">本月暂无活动数据</p>
          <p className="text-[var(--color-muted-light)] text-xs mt-1">
            先去「设置」→ 添加银行提升活动，或在「台账」录入余额数据
          </p>
        </div>
      )}
    </div>
  );
}
