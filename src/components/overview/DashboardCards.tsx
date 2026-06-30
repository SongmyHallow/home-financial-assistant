'use client';
import { useState, useEffect } from 'react';
import type { Activity, DailyBalance } from '@/lib/types';

// 返回当前月份，格式 YYYY-MM
function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// 格式化金额：超过 10000 显示为 "X万"，否则直接显示
function formatAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000) {
    const wan = value / 10000;
    // 保留整数万，如有小数保留一位
    const formatted = Number.isInteger(wan) ? wan.toString() : wan.toFixed(1);
    return `${formatted}万`;
  }
  return value.toLocaleString('zh-CN');
}

interface AccountSummary {
  activityId: string;
  accountName: string;
  target: number;       // target_daily_avg（万元）
  actual: number | null; // 实际日均（计算所得）
  gap: number | null;   // actual - target
}

export default function DashboardCards() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [rows, setRows] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // 1. 获取当月所有活动
      const actRes = await fetch(`/api/activities?month=${month}`);
      if (!actRes.ok) throw new Error('加载活动失败');
      const activities: Activity[] = await actRes.json();

      if (activities.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2. 获取当月所有余额（一次性拉取，减少请求数）
      const balRes = await fetch(`/api/balances?month=${month}`);
      if (!balRes.ok) throw new Error('加载余额失败');
      const allBalances: DailyBalance[] = await balRes.json();

      // 3. 按活动计算日均
      const summaries: AccountSummary[] = activities.map(act => {
        const target = act.target_daily_avg ?? act.base_daily_avg;
        const accountBalances = allBalances.filter(b => b.account_id === act.account_id);

        let actual: number | null = null;
        if (accountBalances.length > 0) {
          const sum = accountBalances.reduce((s, b) => s + b.balance, 0);
          actual = sum / accountBalances.length;
        }

        return {
          activityId: act.id,
          accountName: act.account?.name ?? '未知账户',
          target,
          actual,
          gap: actual !== null ? actual - target : null,
        };
      });

      setRows(summaries);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }

  // 汇总行
  const totalTarget = rows.reduce((s, r) => s + r.target, 0);
  const hasAllActuals = rows.length > 0 && rows.every(r => r.actual !== null);
  const totalActual = hasAllActuals
    ? rows.reduce((s, r) => s + (r.actual ?? 0), 0)
    : null;
  const totalGap = totalActual !== null ? totalActual - totalTarget : null;

  // 月份标题，例如 "7月资产概览"
  const monthLabel = month ? `${parseInt(month.split('-')[1], 10)}月资产概览` : '资产概览';

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      {/* 头部：标题 + 月份切换 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-light)]">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          📊 {monthLabel}
        </h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-1 bg-white text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-3">
        {loading ? (
          <p className="text-sm text-[var(--color-muted-light)] text-center py-4">加载中...</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-danger)] text-center py-4">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-light)] text-center py-6">
            本月暂无活动记录，请在设置中添加活动
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[280px]">
              <thead>
                <tr className="text-xs text-[var(--color-muted)] border-b border-[var(--color-border-light)]">
                  <th className="text-left py-2 pr-3 font-medium">银行</th>
                  <th className="text-right py-2 px-2 font-medium">目标</th>
                  <th className="text-right py-2 px-2 font-medium">当前日均</th>
                  <th className="text-right py-2 pl-2 font-medium">差额</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const isAbove = row.gap !== null && row.gap >= 0;
                  return (
                    <tr
                      key={row.activityId}
                      className="border-b border-[var(--color-border-light)] last:border-0"
                    >
                      {/* 银行名 */}
                      <td className="py-2.5 pr-3 font-medium text-[var(--color-foreground)] whitespace-nowrap">
                        {row.accountName}
                      </td>
                      {/* 目标 */}
                      <td className="py-2.5 px-2 text-right text-[var(--color-muted)] whitespace-nowrap">
                        {formatAmount(row.target)}
                      </td>
                      {/* 当前日均 */}
                      <td className="py-2.5 px-2 text-right text-[var(--color-foreground)] whitespace-nowrap">
                        {row.actual !== null ? formatAmount(row.actual) : '—'}
                      </td>
                      {/* 差额 */}
                      <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                        {row.gap !== null ? (
                          <span
                            className={`font-medium ${
                              isAbove
                                ? 'text-[var(--color-success)]'
                                : 'text-[var(--color-danger)]'
                            }`}
                          >
                            {isAbove ? '+' : ''}{formatAmount(row.gap)}
                            {' '}{isAbove ? '🟢' : '🔴'}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted-light)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* 合计行 */}
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-background)]">
                  <td className="py-2.5 pr-3 font-semibold text-[var(--color-foreground)]">
                    合计
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold text-[var(--color-muted)]">
                    {formatAmount(totalTarget)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold text-[var(--color-foreground)]">
                    {totalActual !== null ? formatAmount(totalActual) : '—'}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-semibold">
                    {totalGap !== null ? (
                      <span
                        className={
                          totalGap >= 0
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-danger)]'
                        }
                      >
                        {totalGap >= 0 ? '+' : ''}{formatAmount(totalGap)}
                      </span>
                    ) : (
                      <span className="text-[var(--color-muted-light)]">—</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 底部：数据说明 */}
      {!loading && !error && rows.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--color-border-light)] bg-[var(--color-background)]">
          <p className="text-xs text-[var(--color-muted-light)]">
            日均 = 当月已有余额记录的天数平均值；差额 = 当前日均 − 活动目标日均
          </p>
        </div>
      )}
    </div>
  );
}
