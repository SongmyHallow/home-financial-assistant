'use client';
import { useState, useEffect } from 'react';
import type { Account, Transaction, TransactionCategory } from '@/lib/types';

const CATEGORIES: TransactionCategory[] = ['打新', '转账入金', '新股收益', '消费', '利息/分红', '其他'];

export default function TransactionForm({
  editing,
  accounts,
  onSave,
  onCancel,
}: {
  editing: Partial<Transaction> | null;
  accounts: Account[];
  onSave: (data: Partial<Transaction>) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('打新');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editing) {
      if (editing.date) setDate(editing.date);
      if (editing.from_account_id) setFromId(editing.from_account_id);
      if (editing.to_account_id) setToId(editing.to_account_id);
      if (editing.to_label) setToLabel(editing.to_label);
      if (editing.amount) setAmount(editing.amount.toString());
      if (editing.category) setCategory(editing.category);
      if (editing.note) setNote(editing.note);
    }
  }, [editing]);

  function handleSubmit(e: React.FormEvent, continueAfter: boolean) {
    e.preventDefault();
    if (!fromId || !amount) return;
    onSave({
      id: editing?.id,
      date,
      from_account_id: fromId,
      to_account_id: toId || null,
      to_label: toLabel || (toId ? null : '外部'),
      amount: parseFloat(amount),
      category,
      note,
    });
    if (continueAfter) {
      // "记录并继续"：清空金额和备注，保留其他字段
      setAmount('');
      setNote('');
    }
  }

  // 可选的目标账户（排除来源账户）
  const toAccounts = accounts.filter((a) => a.id !== fromId);

  return (
    <form className="border rounded-xl p-4 bg-white space-y-3">
      <h3 className="font-semibold">{editing?.id ? '编辑流水' : '✏ 记一笔'}</h3>

      <div>
        <label className="text-sm text-gray-500">日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500">从 *</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">选择账户</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500">到</label>
          <select
            value={toId}
            onChange={(e) => {
              setToId(e.target.value);
              if (e.target.value) setToLabel('');
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">外部 / 自填</option>
            {toAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {/* 未选账户时显示自由输入框 */}
          {!toId && (
            <input
              type="text"
              value={toLabel}
              onChange={(e) => setToLabel(e.target.value)}
              placeholder="收款方（可空）"
              className="w-full border rounded px-3 py-2 mt-1 text-sm"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500">金额 *</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="¥"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-500">类别</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TransactionCategory)}
            className="w-full border rounded px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-500">备注</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={(e) => handleSubmit(e, false)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
        >
          保存
        </button>
        {!editing?.id && (
          <button
            onClick={(e) => handleSubmit(e, true)}
            className="border border-blue-300 text-blue-600 px-3 py-2 rounded-lg text-sm"
          >
            记录并继续
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="border px-4 py-2 rounded-lg text-sm"
        >
          取消
        </button>
      </div>
    </form>
  );
}
