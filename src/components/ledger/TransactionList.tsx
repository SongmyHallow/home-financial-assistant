'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Account, Transaction, TransactionCategory } from '@/lib/types';
import TransactionForm from './TransactionForm';

const CATEGORIES: TransactionCategory[] = ['打新', '转账入金', '新股收益', '消费', '利息/分红', '其他'];

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Partial<Transaction> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [catFilter, setCatFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month: monthFilter });
    if (catFilter) params.set('category', catFilter);
    const res = await fetch('/api/transactions?' + params.toString());
    const data = await res.json();
    if (Array.isArray(data)) setTransactions(data);
    setLoading(false);
  }, [monthFilter, catFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function fetchAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (Array.isArray(data)) setAccounts(data);
  }

  async function handleSave(data: Partial<Transaction>) {
    const method = data.id ? 'PUT' : 'POST';
    await fetch('/api/transactions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditing(null);
    setShowForm(false);
    fetchTransactions();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此条流水？')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    fetchTransactions();
  }

  // 月度汇总：新股收益 + 利息/分红 为流入，其余为流出
  const totalIn = transactions
    .filter((t) => t.category === '新股收益' || t.category === '利息/分红')
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions
    .filter((t) => !['新股收益', '利息/分红'].includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📒 流水台账</h2>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          ✏ 记一笔
        </button>
      </div>

      {/* 新增 / 编辑表单 */}
      {showForm && (
        <div className="mb-4">
          <TransactionForm
            editing={editing}
            accounts={accounts}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {/* 筛选控件 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">全部类别</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 月度汇总 */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-white rounded-lg p-2 border">
          <p className="text-xs text-gray-500">本月流入</p>
          <p className="font-bold text-green-600">¥{totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border">
          <p className="text-xs text-gray-500">本月流出</p>
          <p className="font-bold text-red-600">¥{totalOut.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border">
          <p className="text-xs text-gray-500">净额</p>
          <p className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{net.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 流水列表 */}
      {loading ? (
        <p className="text-gray-400 text-center py-8">加载中...</p>
      ) : transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">暂无流水记录</p>
      ) : (
        <div className="space-y-1">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-lg px-3 py-2 border flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{t.date}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{t.category}</span>
                </div>
                <p className="text-sm truncate">
                  {t.from_account?.name || '?'} → {t.to_account?.name || t.to_label || '?'}
                </p>
                {t.note && <p className="text-xs text-gray-400 truncate">{t.note}</p>}
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span
                  className={`font-medium ${
                    ['新股收益', '利息/分红'].includes(t.category)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  ¥{t.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => {
                    setEditing(t);
                    setShowForm(true);
                  }}
                  className="text-blue-600 text-xs"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-gray-400 text-xs"
                >
                  删
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
