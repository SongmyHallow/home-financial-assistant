'use client';
import { useState } from 'react';
import type { AccountV2 } from '@/lib/types';

interface Props {
  accounts: AccountV2[];
  month: string;
  onTransferComplete: () => void;
}

export default function TransferBar({ accounts, month, onTransferComplete }: Props) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);

  // 获取账户当天余额（不传则为 0）
  async function fetchCurrentBalance(accountId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    try {
      const res = await fetch(`/api/balances?month=${ym}`);
      const data: { account_id: string; date: string; balance: number }[] = await res.json();
      if (!Array.isArray(data)) return 0;
      // 找该账户 ≤ today 的最新一条
      const rows = data
        .filter((b) => b.account_id === accountId && b.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date));
      return rows.length > 0 ? rows[0].balance : 0;
    } catch {
      return 0;
    }
  }

  async function handleConfirm() {
    if (!fromId || !toId || !amount) {
      setMsg({ type: 'error', text: '请填写完整转账信息' });
      return;
    }
    if (fromId === toId) {
      setMsg({ type: 'error', text: '转出和转入不能是同一账户' });
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setMsg({ type: 'error', text: '请输入有效金额' });
      return;
    }

    setSaving(true);
    setMsg(null);
    const today = new Date().toISOString().slice(0, 10);

    try {
      const [fromBal, toBal] = await Promise.all([
        fetchCurrentBalance(fromId),
        fetchCurrentBalance(toId),
      ]);

      await Promise.all([
        fetch('/api/balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: fromId,
            date: today,
            balance: fromBal - num,
            is_manual: true,
            note: `转出至 ${toAccount?.name ?? toId}`,
          }),
        }),
        fetch('/api/balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: toId,
            date: today,
            balance: toBal + num,
            is_manual: true,
            note: `从 ${fromAccount?.name ?? fromId} 转入`,
          }),
        }),
      ]);

      setMsg({ type: 'success', text: `转账成功：¥${num.toLocaleString()}` });
      setAmount('');
      setFromId('');
      setToId('');
      onTransferComplete();
    } catch {
      setMsg({ type: 'error', text: '转账失败，请重试' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-[var(--color-muted)]">快捷转账</span>

        <select
          value={fromId}
          onChange={(e) => setFromId(e.target.value)}
          className="border border-[var(--color-border)] rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">从: 请选择</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <span className="text-[var(--color-muted)]">→</span>

        <select
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          className="border border-[var(--color-border)] rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">到: 请选择</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="金额"
          className="border border-[var(--color-border)] rounded px-2 py-1 text-sm w-28 bg-white"
        />

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
        >
          {saving ? '处理中...' : '确认转账'}
        </button>
      </div>

      {/* 转账规则提示卡 */}
      {fromAccount && (fromAccount.transfer_method || fromAccount.daily_limit || fromAccount.per_transfer_limit || fromAccount.transfer_hours || fromAccount.transfer_notes) && (
        <div className="bg-[var(--color-accent-light)] rounded px-3 py-2 text-xs space-y-1">
          <div className="font-medium text-[var(--color-accent)]">{fromAccount.name} 转账规则</div>
          {fromAccount.transfer_method && (
            <div className="flex gap-2">
              <span className="text-[var(--color-muted)]">方式</span>
              <span>{fromAccount.transfer_method}</span>
            </div>
          )}
          {fromAccount.daily_limit && (
            <div className="flex gap-2">
              <span className="text-[var(--color-muted)]">日限额</span>
              <span>¥{fromAccount.daily_limit.toLocaleString()}</span>
            </div>
          )}
          {fromAccount.per_transfer_limit && (
            <div className="flex gap-2">
              <span className="text-[var(--color-muted)]">单笔限额</span>
              <span>¥{fromAccount.per_transfer_limit.toLocaleString()}</span>
            </div>
          )}
          {fromAccount.transfer_hours && (
            <div className="flex gap-2">
              <span className="text-[var(--color-muted)]">可转时段</span>
              <span>{fromAccount.transfer_hours}</span>
            </div>
          )}
          {fromAccount.transfer_notes && (
            <div className="flex gap-2">
              <span className="text-[var(--color-muted)]">备注</span>
              <span>{fromAccount.transfer_notes}</span>
            </div>
          )}
        </div>
      )}

      {/* 操作结果提示 */}
      {msg && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            msg.type === 'success'
              ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
              : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
