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
  const [editAccountName, setEditAccountName] = useState('');
  const [editDateLabel, setEditDateLabel] = useState('');
  const [editHasRecord, setEditHasRecord] = useState(false);
  const [cellError, setCellError] = useState<string | null>(null);
  const [inheriting, setInheriting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextBlurRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 计算上月最后 3 天（跨月沿用需要）
      const [y, m] = month.split('-').map(Number);
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const prevMonth = `${prevY}-${String(prevM).padStart(2, '0')}`;

      const [actRes, balRes, prevBalRes] = await Promise.all([
        fetch(`/api/activities?month=${month}`),
        fetch(`/api/balances?month=${month}`),
        fetch(`/api/balances?month=${prevMonth}`),
      ]);
      const [actData, balData, prevBalData] = await Promise.all([
        actRes.json(), balRes.json(), prevBalRes.json(),
      ]);
      if (Array.isArray(actData)) setActivities(actData);
      // 合并当月和上月余额（上月仅取最后 3 天用于跨月继承）
      const allBals = Array.isArray(balData) ? [...balData] : [];
      if (Array.isArray(prevBalData)) {
        const lastDays = prevBalData
          .filter((b: any) => b.date >= `${prevMonth}-28`)
          .map((b: any) => ({ ...b, date: b.date })); // keep original date
        allBals.push(...lastDays);
      }
      setBalances(allBals);
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

  // 获取某天某账户的余额（仅真实记录，不向前继承显示）
  function getBalance(accountId: string, date: string): DailyBalance | undefined {
    return balanceMap.get(accountId)?.entries.get(date);
  }

  // 计算继承余额（用于"一键沿用"功能，不用于显示）
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

  // 每日总计（仅真实记录）
  const dailyTotals = useMemo(() => {
    return days.map((date) => {
      let total = 0;
      for (const acc of accounts) {
        const b = getBalance(acc.id, date);
        if (b) total += b.balance;
      }
      return total;
    });
  }, [days, accounts, getInheritedBalance]);

  // 汇总数据
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const daysToToday = days.filter((d) => d <= today);
    const monthlyTotal = daysToToday.reduce((s, _, i) => {
      const dayIdx = days.indexOf(daysToToday[i]);
      return s + (dailyTotals[dayIdx] || 0);
    }, 0);
    const monthlyAvg = daysToToday.length > 0
      ? monthlyTotal / daysToToday.length
      : 0;
    return { monthlyTotal, monthlyAvg };
  }, [dailyTotals, days]);

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

  function startEdit(accountId: string, date: string, currentValue: number, accountName: string, hasRecord: boolean) {
    const key = `${accountId}_${date}`;
    setEditingKey(key);
    setEditValue(String(currentValue || ''));
    setEditAccountName(accountName);
    setEditDateLabel(`${date.slice(5)} 周${['日','一','二','三','四','五','六'][new Date(date).getDay()]}`);
    setEditHasRecord(hasRecord);
    // focus after render
    setTimeout(() => inputRef.current?.focus(), 50);
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
            // 计算当前日均：使用真实余额记录
            const today = new Date().toISOString().slice(0, 10);
            const relevantDays = days.filter((d) => d <= today);
            let currentAvg = 0;
            if (relevantDays.length > 0) {
              const realValues = relevantDays
                .map((d) => getBalance(act.account_id, d)?.balance || 0)
                .filter((v) => v > 0);
              currentAvg = realValues.length > 0 ? realValues.reduce((s, v) => s + v, 0) / days.length : 0;
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
                  className={`px-3 py-2 text-right font-medium border-b border-r border-[var(--color-border)] whitespace-nowrap ${
                    acc.is_brokerage ? 'text-blue-600' : 'text-[var(--color-muted)]'
                  }`}
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
                  {/* 粘性日期（含星期） */}
                  <td className="sticky left-0 z-10 bg-[var(--color-surface)] hover:bg-[var(--color-accent-light)] px-3 py-1.5 border-b border-r border-[var(--color-border)] whitespace-nowrap text-xs">
                    <span className="text-[var(--color-foreground)]">{date.slice(5)}</span>
                    <span className="text-[var(--color-muted-light)] ml-1.5 text-[10px]">
                      {['日','一','二','三','四','五','六'][new Date(date).getDay()]}
                    </span>
                  </td>

                  {/* 每个账户的单元格 */}
                  {accounts.map((acc) => {
                    const key = `${acc.id}_${date}`;
                    const isEditing = editingKey === key;
                    const balance = getBalance(acc.id, date);
                    const value = balance ? balance.balance : 0;
                    const hasRecord = !!balance;
                    const activity = activityMap.get(acc.id);
                    const isNearTarget =
                      activity?.target_daily_avg &&
                      value > 0 &&
                      Math.abs(value - activity.target_daily_avg) / activity.target_daily_avg <= 0.1;

                    return (
                      <td
                        key={acc.id}
                        className={`px-2 py-1.5 border-b border-r border-[var(--color-border)] text-right cursor-pointer min-w-[90px] ${
                          isNearTarget ? 'bg-[var(--color-success-light)]' : ''
                        } ${!hasRecord ? 'text-[var(--color-muted-light)]' : ''} ${
                          acc.is_brokerage && hasRecord ? 'text-blue-600 font-medium' : ''
                        }`}
                        onClick={() => startEdit(acc.id, date, value, acc.name, hasRecord)}
                      >
                        <span className={`text-xs ${hasRecord && acc.is_brokerage ? 'text-blue-600 font-medium' : 'text-[var(--color-foreground)]'} ${!hasRecord ? 'text-[var(--color-muted-light)]' : ''}`}>
                          {hasRecord ? fmt(value) : '—'}
                        </span>
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
                const today = new Date().toISOString().slice(0, 10);
                const relevantDays = days.filter((d) => d <= today);
                let sum = 0;
                let count = 0;
                for (const d of relevantDays) {
                  const b = getBalance(acc.id, d);
                  if (b) { sum += b.balance; count++; }
                }
                const avg = count > 0 ? sum / days.length : 0;
                return (
                  <td key={acc.id} className={`px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap ${acc.is_brokerage ? 'text-blue-600 font-medium' : ''}`}>
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
              {accounts.map((acc) => {
                const act = activityMap.get(acc.id);
                const today = new Date().toISOString().slice(0, 10);
                const relevantDays = days.filter((d) => d <= today);
                let sum = 0, count = 0;
                for (const d of relevantDays) {
                  const b = getBalance(acc.id, d);
                  if (b) { sum += b.balance; count++; }
                }
                const avg = count > 0 ? sum / days.length : 0;
                const base = act?.base_daily_avg || 0;
                const improvement = avg - base;
                return (
                  <td key={acc.id} className={`px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap ${acc.is_brokerage ? 'text-blue-600' : ''}`}>
                    {base > 0 ? (
                      <span className={improvement >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                        {improvement >= 0 ? '+' : ''}{fmt(improvement)}
                      </span>
                    ) : '-'}
                  </td>
                );
              })}
              <td className="px-3 py-2 border-t border-r border-[var(--color-border)]" />
              <td className="px-3 py-2 border-t border-[var(--color-border)]" />
            </tr>
            <tr className="bg-[var(--color-background)]">
              <td className="sticky left-0 z-10 bg-[var(--color-background)] px-3 py-2 border-t border-r border-[var(--color-border)] text-xs text-[var(--color-muted)] whitespace-nowrap">
                vs 目标
              </td>
              {accounts.map((acc) => {
                const act = activityMap.get(acc.id);
                const today = new Date().toISOString().slice(0, 10);
                const relevantDays = days.filter((d) => d <= today);
                let sum = 0, count = 0;
                for (const d of relevantDays) {
                  const b = getBalance(acc.id, d);
                  if (b) { sum += b.balance; count++; }
                }
                const avg = count > 0 ? sum / days.length : 0;
                const target = act?.target_daily_avg;
                const gap = target ? avg - target : 0;
                return (
                  <td key={acc.id} className={`px-3 py-2 border-t border-r border-[var(--color-border)] text-right text-xs whitespace-nowrap ${acc.is_brokerage ? 'text-blue-600' : ''}`}>
                    {target ? (
                      <span className={gap >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                        {gap >= 0 ? '+' : ''}{fmt(gap)}
                      </span>
                    ) : '-'}
                  </td>
                );
              })}
              <td className="px-3 py-2 border-t border-r border-[var(--color-border)]" />
              <td className="px-3 py-2 border-t border-[var(--color-border)]" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* 规则说明 */}
      <p className="text-[11px] text-[var(--color-muted-light)]">
        💡 资产总计用于核验总金额是否正确。如果填报正确，本月总金额不应有太大变化（资金仅在不同账户间转移）。
        如有增减，请在备注中注明原因。
      </p>

      {/* 悬浮编辑弹窗 */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setEditingKey(null)}>
          <div
            className="bg-[var(--color-surface)] rounded-2xl shadow-xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-[var(--color-muted)] mb-1">{editAccountName}</p>
            <p className="text-sm font-semibold mb-4">{editDateLabel}</p>

            <div className="mb-4">
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">余额</label>
              <input
                ref={inputRef}
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const [accId, dt] = editingKey.split('_');
                    saveCell(accId, dt, editValue);
                  }
                  if (e.key === 'Escape') setEditingKey(null);
                }}
                className="w-full text-lg font-semibold text-center py-3 border-2 border-[var(--color-accent)] rounded-xl outline-none bg-white"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const [accId, dt] = editingKey.split('_');
                  saveCell(accId, dt, editValue);
                }}
                className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-2.5 rounded-xl text-sm"
              >
                确认保存
              </button>
              <button
                onClick={() => setEditingKey(null)}
                className="flex-1 border border-[var(--color-border)] text-[var(--color-muted)] py-2.5 rounded-xl text-sm hover:bg-[var(--color-surface-hover)]"
              >
                取消
              </button>
            </div>

            {editHasRecord && (
              <button
                onClick={() => {
                  const [accId, dt] = editingKey.split('_');
                  const record = balanceMap.get(accId)?.entries.get(dt);
                  if (record?.id) {
                    deleteCell(record.id);
                    setEditingKey(null);
                  }
                }}
                className="w-full mt-2 text-[var(--color-danger)] text-sm py-2 hover:bg-[var(--color-danger-light)] rounded-lg transition-colors"
              >
                清除此记录
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

