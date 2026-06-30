'use client';
import { useState, useEffect } from 'react';
import type { Activity, Account } from '@/lib/types';

const PASS_CONDITIONS = ['日均', '时点', '两者'] as const;

// 返回当前月份，格式 YYYY-MM
function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

interface ActivityFormData {
  account_id: string;
  month: string;
  base_daily_avg: number | '';
  target_daily_avg: number | '';
  signup_deadline: string;
  start_date: string;
  end_date: string;
  pass_condition: string;
  reward: number | '';
  note: string;
}

interface Props {
  activity?: Activity;
  onSave: (data: Partial<Activity>) => void;
  onCancel: () => void;
}

export default function ActivityForm({ activity, onSave, onCancel }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<ActivityFormData>({
    account_id: activity?.account_id || '',
    month: activity?.month || getCurrentMonth(),
    base_daily_avg: activity?.base_daily_avg ?? '',
    target_daily_avg: activity?.target_daily_avg ?? '',
    signup_deadline: activity?.signup_deadline || '',
    start_date: activity?.start_date || '',
    end_date: activity?.end_date || '',
    pass_condition: activity?.pass_condition || '日均',
    reward: activity?.reward ?? '',
    note: activity?.note || '',
  });

  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(setAccounts);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.account_id || !form.month || form.base_daily_avg === '' || !form.start_date || !form.end_date || form.reward === '') {
      return;
    }
    onSave({
      ...(activity?.id ? { id: activity.id } : {}),
      account_id: form.account_id,
      month: form.month,
      base_daily_avg: Number(form.base_daily_avg),
      target_daily_avg: form.target_daily_avg !== '' ? Number(form.target_daily_avg) : null,
      signup_deadline: form.signup_deadline || null,
      start_date: form.start_date,
      end_date: form.end_date,
      pass_condition: form.pass_condition,
      reward: Number(form.reward),
      note: form.note,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-[var(--color-surface)]">
      <h4 className="font-medium mb-3">{activity?.id ? '编辑活动' : '添加活动'}</h4>

      {/* 银行账户 */}
      <label className="block text-sm text-[var(--color-muted)] mb-1">银行账户 *</label>
      <select
        value={form.account_id}
        onChange={e => setForm({ ...form, account_id: e.target.value })}
        required
        className="w-full border rounded px-3 py-2 mb-3"
      >
        <option value="">选择账户</option>
        {accounts.map(acc => (
          <option key={acc.id} value={acc.id}>{acc.name}</option>
        ))}
      </select>

      {/* 月份 */}
      <label className="block text-sm text-[var(--color-muted)] mb-1">活动月份 *</label>
      <input
        type="month"
        value={form.month}
        onChange={e => setForm({ ...form, month: e.target.value })}
        required
        className="w-full border rounded px-3 py-2 mb-3"
      />

      {/* 上月日均 / 目标日均 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-sm text-[var(--color-muted)] mb-1">上月日均（元）*</label>
          <input
            type="number"
            placeholder="如 50000"
            value={form.base_daily_avg}
            onChange={e => setForm({ ...form, base_daily_avg: e.target.value === '' ? '' : Number(e.target.value) })}
            required
            min={0}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-[var(--color-muted)] mb-1">目标日均（元）</label>
          <input
            type="number"
            placeholder="可选"
            value={form.target_daily_avg}
            onChange={e => setForm({ ...form, target_daily_avg: e.target.value === '' ? '' : Number(e.target.value) })}
            min={0}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* 报名截止 */}
      <label className="block text-sm text-[var(--color-muted)] mb-1">报名截止</label>
      <input
        type="date"
        value={form.signup_deadline}
        onChange={e => setForm({ ...form, signup_deadline: e.target.value })}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      {/* 活动起止 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-sm text-[var(--color-muted)] mb-1">开始日期 *</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-[var(--color-muted)] mb-1">结束日期 *</label>
          <input
            type="date"
            value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* 达标条件 */}
      <label className="block text-sm text-[var(--color-muted)] mb-1">达标条件 *</label>
      <select
        value={form.pass_condition}
        onChange={e => setForm({ ...form, pass_condition: e.target.value })}
        className="w-full border rounded px-3 py-2 mb-3"
      >
        {PASS_CONDITIONS.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* 奖励金额 */}
      <label className="block text-sm text-[var(--color-muted)] mb-1">奖励金额（元）*</label>
      <input
        type="number"
        placeholder="如 200"
        value={form.reward}
        onChange={e => setForm({ ...form, reward: e.target.value === '' ? '' : Number(e.target.value) })}
        required
        min={0}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      {/* 备注 */}
      <label className="block text-sm text-[var(--color-muted)] mb-1">备注</label>
      <input
        type="text"
        placeholder="可选备注"
        value={form.note}
        onChange={e => setForm({ ...form, note: e.target.value })}
        className="w-full border rounded px-3 py-2 mb-4"
      />

      <div className="flex gap-2">
        <button type="submit" className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg">
          保存
        </button>
        <button type="button" onClick={onCancel} className="border px-4 py-2 rounded-lg">
          取消
        </button>
      </div>
    </form>
  );
}
