'use client';
import { useState, useEffect } from 'react';
import type { AccountV2 } from '@/lib/types';

const ACCOUNT_TYPES = ['储蓄卡', '券商', '信用卡'] as const;

export default function AccountManager() {
  const [accounts, setAccounts] = useState<AccountV2[]>([]);
  const [editing, setEditing] = useState<Partial<AccountV2> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!editing?.name || !editing?.type) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/accounts' + (method === 'PUT' ? '' : ''), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      setEditing(null);
      fetchAccounts();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此账户？关联的流水记录不会删除。')) return;
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    fetchAccounts();
  }

  if (loading) return <p className="text-[var(--color-muted-light)]">加载中...</p>;

  return (
    <div>
      <h3 className="font-semibold mb-2">账户管理</h3>
      <ul className="space-y-2 mb-4">
        {accounts.map(acc => (
          <li key={acc.id} className="flex items-center justify-between bg-[var(--color-background)] rounded-lg px-3 py-2">
            <div>
              <span className="font-medium">{acc.name}</span>
              <span className="text-xs text-[var(--color-muted)] ml-2">{acc.type}</span>
              {acc.note && <span className="text-xs text-[var(--color-muted-light)] ml-1">· {acc.note}</span>}
              <div className="text-xs text-[var(--color-muted-light)] mt-0.5 flex flex-wrap gap-2">
                {acc.currency && acc.currency !== 'CNY' && <span className="bg-yellow-100 text-yellow-700 px-1 rounded">{acc.currency}</span>}
                {acc.is_brokerage && <span className="bg-blue-100 text-blue-700 px-1 rounded">券商</span>}
                {acc.transfer_method && <span>{acc.transfer_method === 'ukey' ? 'U盾' : acc.transfer_method === 'mobile' ? '手机银行' : '柜台'}</span>}
                {acc.daily_limit != null && <span>日限{acc.daily_limit.toLocaleString()}</span>}
                {acc.transfer_hours && <span>{acc.transfer_hours}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(acc)} className="text-[var(--color-accent)] text-sm">编辑</button>
              <button onClick={() => handleDelete(acc.id)} className="text-[var(--color-danger)] text-sm">删除</button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="border rounded-lg p-4 bg-[var(--color-surface)]">
          <h4 className="font-medium mb-3">{editing.id ? '编辑账户' : '添加账户'}</h4>
          <input
            type="text" placeholder="名称（如 招行 7321）" value={editing.name || ''}
            onChange={e => setEditing({ ...editing, name: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <select
            value={editing.type || ''}
            onChange={e => setEditing({ ...editing, type: e.target.value as AccountV2['type'] })}
            className="w-full border rounded px-3 py-2 mb-2"
          >
            <option value="">选择类型</option>
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text" placeholder="备注（如 工资卡）" value={editing.note || ''}
            onChange={e => setEditing({ ...editing, note: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <select value={editing.currency || 'CNY'} onChange={e => setEditing({ ...editing, currency: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-2">
            <option value="CNY">CNY 人民币</option>
            <option value="HKD">HKD 港币</option>
          </select>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={editing.is_brokerage || false}
              onChange={e => setEditing({ ...editing, is_brokerage: e.target.checked })} />
            <span>券商账户（用于打新申购）</span>
          </label>
          <select value={editing.transfer_method || ''} onChange={e => setEditing({ ...editing, transfer_method: e.target.value || null })}
            className="w-full border rounded px-3 py-2 mb-2">
            <option value="">选择转账方式</option>
            <option value="ukey">U盾+自己操作</option>
            <option value="mobile">手机银行</option>
            <option value="counter">需要去柜台</option>
          </select>
          <div className="flex gap-2 mb-2">
            <input type="number" placeholder="单日限额（元）" value={editing.daily_limit ?? ''}
              onChange={e => setEditing({ ...editing, daily_limit: e.target.value ? Number(e.target.value) : null })}
              className="w-1/2 border rounded px-3 py-2" />
            <input type="number" placeholder="单笔限额（元）" value={editing.per_transfer_limit ?? ''}
              onChange={e => setEditing({ ...editing, per_transfer_limit: e.target.value ? Number(e.target.value) : null })}
              className="w-1/2 border rounded px-3 py-2" />
          </div>
          <input type="text" placeholder="操作时段（如：工作日9:00-17:00）" value={editing.transfer_hours || ''}
            onChange={e => setEditing({ ...editing, transfer_hours: e.target.value || null })}
            className="w-full border rounded px-3 py-2 mb-2" />
          <input type="text" placeholder="转账备注" value={editing.transfer_notes || ''}
            onChange={e => setEditing({ ...editing, transfer_notes: e.target.value || null })}
            className="w-full border rounded px-3 py-2 mb-3" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg">保存</button>
            <button onClick={() => setEditing(null)} className="border px-4 py-2 rounded-lg">取消</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing({ name: '', type: undefined, note: '', currency: 'CNY', is_brokerage: false })}
          className="text-[var(--color-accent)] border border-blue-300 rounded-lg px-4 py-2 text-sm"
        >
          ＋ 添加账户
        </button>
      )}
    </div>
  );
}
