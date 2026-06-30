'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { AccountV2, Activity, DailyBalance } from '@/lib/types';

interface Props {
  month: string; // "2026-07"
  accounts: AccountV2[];
}

// 枚举月份中所有日期 YYYY-MM-DD
function getDaysInMonth(month: string): string[] {
  const [year, mon] = month.split('-').map(Number);
  const days: string[] = [];
  const total = new Date(year, mon, 0).getDate();
  for (let d = 1; d <= total; d++) {
    days.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function LedgerGrid({ month, accounts }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [balances, setBalances] = useState<DailyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  // 编辑状态: key = `${accountId}_${date}`
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [cellError, setCellError] = useState<string | null>(null);
  const [inheriting, setInheriting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextBlurRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, balRes] = await Promise.all([
        fetch(`/api/activities?month=${month}`),
        fetch(`/api/balances?month=${month}`),
      ]);
      const [actData, balData] = await Promise.all([
        actRes.json(),
        balRes.json(),
      ]);
      if (Array.isArray(actData)) setActivities(actData);
      if (Array.isArray(balData)) setBalances(balData);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 聚焦 input
  useEffect(() => {
    if (editingKey && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingKey]);

  // 二维 Map: accountId → { entries: Map<date, DailyBalance>, sortedDates: string[] }
  const balanceMap = useMemo(() => {
    const map = new Map<string, { entries: Map<string, DailyBalance>; sortedDates: string[] }>();
    for (const b of balances) {
      if (!map.has(b.account_id)) {
        map.set(b.account_id, { entries: new Map(), sortedDates: [] });
      }
      map.get(b.account_id)!.entries.set(b.date, b);
    }
    // 一次性排序，避免在 getInheritedBalance 中重复排序
    for (const accData of map.values()) {
      accData.sortedDates = Array.from(accData.entries.keys()).sort();
    }
    return map;
  }, [balances]);

  // activity Map: accountId → Activity
  const activityMap = useMemo(() => {
    const map = new Map<string, Activity>();
    for (const a of activities) {
      map.set(a.account_id, a);
    }
    return map;
  }, [activities]);

  const days = useMemo(() => getDaysInMonth(month), [month]);

  // 计算继承余额：对于每个 accountId + date，返回该日期当天或最近之前的余额值
  const getInheritedBalance = useCallback(
    (accountId: string, date: string): { value: number; inherited: boolean } => {
      const accData = balanceMap.get(accountId);
      if (!accData) return { value: 0, inherited: true };
      // 精确匹配
      if (accData.entries.has(date)) return { value: accData.entries.get(date)!.balance, inherited: false };
      // 往前找最近一天（使用预排序的 sortedDates）
      let last: number | null = null;
      for (const d of accData.sortedDates) {
        if (d < date) last = accData.entries.get(d)!.balance;
        else break;
      }
      if (last !== null) return { value: last, inherited: true };
      return { value: 0, inherited: true };
    },
    [balanceMap]
  );

  // 每日总计（含继承）
  const dailyTotals = useMemo(() => {
    return days.map((date) => {
      let total = 0;
      for (const acc of accounts) {
        total += getInheritedBalance(acc.id, date).value;
      }
      return total;
    });
  }, [days, accounts, getInheritedBalance]);

  // 汇总数据
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const nonZeroDays = dailyTotals.filter((_, i) => dailyTotals[i] > 0 && days[i] <= today);
    const monthlyTotal = nonZeroDays.reduce((s, v) => s + v, 0);
    const monthlyAvg = nonZeroDays.length > 0
      ? monthlyTotal / nonZeroDays.length
      : 0;

    // 找最低基准日均
    const baseAvgs = activities.map((a) => a.base_daily_avg).filter((v) => v > 0);
    const lowestBase = baseAvgs.length > 0 ? Math.min(...baseAvgs) : 0;
    const assetImprovement = monthlyAvg - lowestBase;

    // 最高目标日均
    const targetAvgs = activities.map((a) => a.target_daily_avg ?? 0).filter((v) => v > 0);
    const highestTarget = targetAvgs.length > 0 ? Math.max(...targetAvgs) : 0;
    const vsTarget = highestTarget > 0 ? (monthlyAvg / highestTarget) * 100 : null;

    return { monthlyTotal, monthlyAvg, assetImprovement, vsTarget };
  }, [dailyTotals, days, activities]);

  // 保存单元格
  async function saveCell(accountId: string, date: string, value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      setEditingKey(null);
      return;
    }

    // Fix 2: 若单元格是继承值（无真实记录），且用户未修改，则不 PIN 保存
    const realRecord = balanceMap.get(accountId)?.entries.get(date);
    if (!realRecord) {
      const { value: inheritedVal } = getInheritedBalance(accountId, date);
      if (inheritedVal === num) {
        setEditingKey(null);
        return;
      }
    }

    // 乐观更新（Fix 1: 使用函数式更新，不捕获闭包快照）
    const newBalance: DailyBalance = {
      id: `temp_${accountId}_${date}`,
      account_id: accountId,
      date,
      balance: num,
      is_manual: true,
      note: '',
      created_at: new Date().toISOString(),
    };
    setBalances((prev) => {
      const existing = prev.findIndex((b) => b.account_id === accountId && b.date === date);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], balance: num };
        return next;
      }
      return [...prev, newBalance];
    });
    setEditingKey(null);

    // 调用 API
    try {
      const res = await fetch('/api/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, date, balance: num, is_manual: true }),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchAll(); // Fix 1: 从服务器刷新获取真实状态
    } catch {
      // Fix 1: 出错时也从服务器重新加载，不回滚到可能已过期的快照
      await fetchAll();
      setCellError('保存失败，请重试');
      setTimeout(() => setCellError(null), 3000);
    }
  }

  // 删除单元格真实记录（Fix 3）
  async function deleteCell(id: string) {
    setEditingKey(null);
    try {
      const res = await fetch(`/api/balances?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchAll();
    } catch {
      setCellError('删除失败，请重试');
      setTimeout(() => setCellError(null), 3000);
    }
  }

  // 一键沿用昨日：把今天所有账户填上继承值
  const today = new Date().toISOString().slice(0, 10);
  async function inheritToday() {
    if (inheriting) return;
    setInheriting(true);
    try {
      for (const acc of accounts) {
        const { value } = getInheritedBalance(acc.id, today);
        if (value > 0) {
          await fetch('/api/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: acc.id, date: today, balance: value, is_manual: false }),
          });
        }
      }
      await fetchAll();
    } catch {
      setCellError('沿用失败，请重试');
      setTimeout(() => setCellError(null), 3000);
    } finally {
      setInheriting(false);
    }
  }

  // 检查今天是否已有手动录入的数据
  const todayManualFilled = useMemo(() => {
    for (const acc of accounts) {
      const b = balanceMap.get(acc.id)?.entries.get(today);
      if (b) return true; // 至少有一个账户今天有记录
    }
    return false;
  }, [accounts, balanceMap, today]);

  // 昨天有数据吗（用于判断是否显示沿用按钮）
  const yesterdayData = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yest = d.toISOString().slice(0, 10);
    for (const acc of accounts) {
      const val = getInheritedBalance(acc.id, yest).value;
      if (val > 0) return true;
    }
    return false;
  }, [accounts, getInheritedBalance]);

  function startEdit(accountId: string, date: string, currentValue: number) {
    const key = `${accountId}_${date}`;
    setEditingKey(key);
    setEditValue(String(currentValue || ''));
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-[var(--color-muted)]">加载中...</div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-muted)]">暂无账户，请先在设置页添加账户</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 保存错误提示 */}
      {cellError && (
        <div className="text-[var(--color-danger)] text-xs mb-2">{cellError}</div>
      )}

      {/* 一键沿用昨日 */}
      {!todayManualFilled && yesterdayData && (
        <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-[var(--color-accent)] font-medium">
            <span>📋</span>
            <span>
              今日（{new Date(today).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}）尚无数据
            </span>
          </div>
          <button
            onClick={inheritToday}
            disabled={inheriting}
            className="shrink-0 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-medium px-4 py-2 rounded-xl transition-all duration-150 disabled:opacity-50"
          >
            {inheriting ? '处理中...' : '一键沿用昨日余额'}
          </button>
        </div>
      )}

      {/* 活动栏 */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.map((act) => {
            const acc = accounts.find((a) => a.id === act.account_id);
            if (!acc) return null;
            // 计算当前日均：使用继承余额，截止今天
            const today = new Date().toISOString().slice(0, 10);
            const relevantDays = days.filter((d) => d <= today);
            let currentAvg = 0;
            if (relevantDays.length > 0) {
              const inherited = relevantDays.map((d) => getInheritedBalance(act.account_id, d).value);
              const nonZero = inherited.filter((v) => v > 0);
              currentAvg = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;
            }
            const diff = act.target_daily_avg ? currentAvg - act.target_daily_avg : 0;
            return (
              <div
                key={act.id}
                className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="font-medium text-sm mb-2">{acc.name}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-[var(--color-muted)]">上月日均</span>
                  <span>¥{fmt(act.base_daily_avg)}</span>
                  {act.target_daily_avg && (
                    <>
                      <span className="text-[var(--color-muted)]">目标日均</span>
                      <span>¥{fmt(act.target_daily_avg)}</span>
                    </>
                  )}
                  <span className="text-[var(--color-muted)]">当前日均</span>
                  <span>¥{fmt(currentAvg)}</span>
                  {act.target_daily_avg && (
                    <>
                      <span className="text-[var(--color-muted)]">差额</span>
                      <span
                        className={diff >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}
                      >
                        {diff >= 0 ? '+' : ''}¥{fmt(diff)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 主体表格 */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="border-collapse text-sm min-w-full">
          <thead>
            <tr className="bg-[var(--color-background)]">
              {/* 粘性日期列 */}
              <th className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-2 text-left font-medium text-[var(--color-muted)] border-b border-r border-[var(--color-border)] whitespace-nowrap">
                日期
              </th>
              {accounts.map((acc) => (
                <th
                  key={acc.id}
                  className="px-3 py-2 text-right font-medium text-[var(--color-muted)] border-b border-r border-[var(--color-border)] whitespace-nowrap"
                >
                  {acc.name}
                  {activityMap.has(acc.id) && (
                    <span className="ml-1 text-[var(--color-accent)] text-xs">*</span>
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium border-b border-r border-[var(--color-border)] whitespace-nowrap">
                总计
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--color-muted)] border-b border-[var(--color-border)] whitespace-nowrap">
                备注
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((date, dayIdx) => {
              const total = dailyTotals[dayIdx];
              // 收集备注
              const notes: string[] = [];
              for (const acc of accounts) {
                const b = balanceMap.get(acc.id)?.entries.get(date);
                if (b?.note) notes.push(b.note);
              }

              return (
                <tr
                  key={date}
                  className="hover:bg-[var(--color-accent-light)] transition-colors"
                >
                  {/* 粘性日期 */}
                  <td className="sticky left-0 z-10 bg-[var(--color-surface)] hover:bg-[var(--color-accent-light)] px-3 py-1.5 border-b border-r border-[var(--color-border)] whitespace-nowrap text-[var(--color-muted)] text-xs">
                    {date.slice(5)}
                  </td>

                  {/* 每个账户的单元格 */}
                  {accounts.map((acc) => {
                    const key = `${acc.id}_${date}`;
                    const isEditing = editingKey === key;
                    const { value, inherited } = getInheritedBalance(acc.id, date);
                    const activity = activityMap.get(acc.id);
                    const isNearTarget =
                      activity?.target_daily_avg &&
                      value > 0 &&
                      Math.abs(value - activity.target_daily_avg) / activity.target_daily_avg <= 0.1;

                    return (
                      <td
                        key={acc.id}
                        className={`px-2 py-1.5 border-b border-r border-[var(--color-border)] text-right cursor-pointer whitespace-nowrap ${
                          isNearTarget ? 'bg-[var(--color-success-light)]' : ''
                        }`}
                        onClick={() => !isEditing && startEdit(acc.id, date, value)}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              ref={inputRef}
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCell(acc.id, date, editValue);
                                if (e.key === 'Escape') {
                                  skipNextBlurRef.current = true;
                                  setEditingKey(null);
                                }
                              }}
                              onBlur={() => {
                                if (skipNextBlurRef.current) { skipNextBlurRef.current = false; return; }
                                saveCell(acc.id, date, editValue);
                              }}
                              className="w-24 text-right border border-[var(--color-accent)] rounded px-1 py-0.5 text-xs outline-none bg-white"
                            />
                            {/* Fix 3: 删除按钮，仅当单元格有真实记录时显示 */}
                            {balanceMap.get(acc.id)?.entries.get(date)?.id && (
                              <button
                                type="button"
                                title="清空此记录"
                                onMouseDown={(e) => {
                                  // 阻止 blur 触发 saveCell
                                  e.preventDefault();
                                  skipNextBlurRef.current = true;
                                  deleteCell(balanceMap.get(acc.id)!.entries.get(date)!.id);
                                }}
                                className="text-[var(--color-danger)] text-xs px-1 py-0.5 rounded hover:bg-[var(--color-danger-light)] leading-none"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-xs ${
                              inherited ? 'text-[var(--color-muted)]' : 'text-[var(--color-foreground)]'
                            }`}
                          >
                            {value > 0 ? fmt(value) : ''}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* 总计 */}
                  <td className="px-3 py-1.5 border-b border-r border-[var(--color-border)] text-right font-medium text-xs whitespace-nowrap">
                    {total > 0 ? fmt(total) : ''}
                  </td>

                  {/* 备注 */}
                  <td className="px-3 py-1.5 border-b border-[var(--color-border)] text-xs text-[var(--color-muted)] max-w-xs truncate">
                    {notes.join(' / ')}
                  </td>
                </tr>
              );
            })}

            {/* 汇总行 */}
            <tr className="bg-[var(--color-accent-subtle)] font-medium">
              <td className="sticky left-0 z-10 bg-[var(--color-accent-subtle)] px-3 py-2 border-t border-r border-[var(--color-border)] text-xs whitespace-nowrap">
                本月累计
              </td>
              <td
                colSpan={accounts.length}
                className="px-3 py-2 border-t border-r border-[var(--color-border)]"
              />
              <td className="px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap">
                {summary.monthlyTotal > 0 ? fmt(summary.monthlyTotal) : '-'}
              </td>
              <td className="px-3 py-2 border-t border-[var(--color-border)]" />
            </tr>
            <tr className="bg-[var(--color-accent-subtle)] font-medium">
              <td className="sticky left-0 z-10 bg-[var(--color-accent-subtle)] px-3 py-2 border-t border-r border-[var(--color-border)] text-xs whitespace-nowrap">
                本月日均
              </td>
              {accounts.map((acc) => {
                // 各账户日均：使用继承余额，与网格显示保持一致
                const today = new Date().toISOString().slice(0, 10);
                const relevantDays = days.filter((d) => d <= today);
                let avg = 0;
                if (relevantDays.length > 0) {
                  const inherited = relevantDays.map((d) => getInheritedBalance(acc.id, d).value);
                  const nonZero = inherited.filter((v) => v > 0);
                  avg = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;
                }
                return (
                  <td key={acc.id} className="px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap">
                    {avg > 0 ? fmt(avg) : '-'}
                  </td>
                );
              })}
              <td className="px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap">
                {summary.monthlyAvg > 0 ? fmt(summary.monthlyAvg) : '-'}
              </td>
              <td className="px-3 py-2 border-t border-[var(--color-border)]" />
            </tr>
            <tr className="bg-[var(--color-background)]">
              <td className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-2 border-t border-r border-[var(--color-border)] text-xs text-[var(--color-muted)] whitespace-nowrap">
                资产提升
              </td>
              <td
                colSpan={accounts.length}
                className="px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs"
              />
              <td className="px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap">
                <span
                  className={
                    summary.assetImprovement >= 0
                      ? 'text-[var(--color-success)]'
                      : 'text-[var(--color-danger)]'
                  }
                >
                  {summary.assetImprovement >= 0 ? '+' : ''}
                  {fmt(summary.assetImprovement)}
                </span>
              </td>
              <td className="px-3 py-2 border-t border-[var(--color-border)]" />
            </tr>
            <tr className="bg-[var(--color-background)]">
              <td className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-2 border-t border-r border-[var(--color-border)] text-xs text-[var(--color-muted)] whitespace-nowrap">
                vs 目标
              </td>
              <td
                colSpan={accounts.length}
                className="px-3 py-2 border-t border-r border-[var(--color-border)]"
              />
              <td className="px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap">
                {summary.vsTarget !== null ? (
                  <span
                    className={
                      summary.vsTarget >= 100
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-danger)]'
                    }
                  >
                    {summary.vsTarget.toFixed(1)}%
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-3 py-2 border-t border-[var(--color-border)]" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

