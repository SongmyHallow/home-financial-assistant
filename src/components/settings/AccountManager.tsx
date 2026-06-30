'use client';
import { useState, useEffect } from 'react';
import type { AccountV2 } from '@/lib/types';

const ACCOUNT_TYPES = ['储蓄卡', '券商账户'] as const;

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
    const res = await fetch('/api/accounts', {
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
    if (!confirm('确定删除此账户？')) return;
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
              <div className="flex items-center gap-2">
                <span className="font-medium text-[13px]">{acc.name}</span>
                <span className="text-[11px] text-[var(--color-muted)]">{acc.type}</span>
                {acc.currency !== 'CNY' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">{acc.currency}</span>}
                {acc.is_brokerage && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">券商</span>}
              </div>
              <div className="text-[11px] text-[var(--color-muted-light)] mt-0.5 flex flex-wrap gap-2">
                {acc.transfer_method && (
                  <span>{
                    acc.transfer_method === 'ukey_mobile' ? 'U盾+手机银行' :
                    acc.transfer_method === 'ukey_online' ? 'U盾+网上银行' :
                    acc.transfer_method === 'counter' ? '银行柜台临柜' : acc.transfer_method
                  }</span>
                )}
                {acc.daily_limit != null && acc.daily_limit > 0 && <span>日限 ¥{acc.daily_limit.toLocaleString()}</span>}
                {acc.transfer_hours && <span>{acc.transfer_hours}</span>}
                {acc.note && <span className="text-[var(--color-muted-light)]">{acc.note}</span>}
              </div>
            </div>
            <div className="flex gap-2 ml-2 shrink-0">
              <button onClick={() => setEditing(acc)} className="text-[var(--color-accent)] text-sm">编辑</button>
              <button onClick={() => handleDelete(acc.id)} className="text-[var(--color-danger)] text-sm">删除</button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="border border-[var(--color-border)] rounded-2xl p-5 bg-[var(--color-surface)] space-y-4">
          <h4 className="font-semibold text-[15px]">{editing.id ? '编辑账户' : '添加账户'}</h4>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">账户名</label>
            <input type="text" placeholder="如：招行 7321" value={editing.name || ''}
              onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">账户类型</label>
            <select value={editing.type || ''} onChange={e => setEditing({ ...editing, type: e.target.value as AccountV2['type'] })} className="w-full">
              <option value="">选择类型</option>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">币种</label>
            <select value={editing.currency || 'CNY'} onChange={e => setEditing({ ...editing, currency: e.target.value })} className="w-full">
              <option value="CNY">CNY 人民币</option>
              <option value="HKD">HKD 港币</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">备注</label>
            <input type="text" placeholder="如：工资卡、打新专用" value={editing.note || ''}
              onChange={e => setEditing({ ...editing, note: e.target.value })} className="w-full" />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editing.is_brokerage || false}
                onChange={e => setEditing({ ...editing, is_brokerage: e.target.checked })} />
              <span className="text-[13px]">券商账户</span>
            </label>
            <p className="text-[11px] text-[var(--color-muted-light)] mt-0.5 ml-6">
              勾选后在台账中用蓝色标识。请在备注中注明绑定的存管银行。
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">转账方式</label>
            <select value={editing.transfer_method || ''} onChange={e => setEditing({ ...editing, transfer_method: e.target.value || null })} className="w-full">
              <option value="">不涉及转账</option>
              <option value="ukey_mobile">U盾+手机银行</option>
              <option value="ukey_online">U盾+网上银行</option>
              <option value="counter">银行柜台临柜</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">单日限额（元）</label>
              <input type="text" inputMode="numeric" placeholder="如：5,000,000"
                value={editing.daily_limit != null ? editing.daily_limit.toLocaleString('zh-CN') : ''}
                onChange={e => {
                  const v = parseFloat(e.target.value.replace(/[,，]/g, ''));
                  setEditing({ ...editing, daily_limit: isNaN(v) ? null : v });
                }} className="w-full" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">单笔限额（元）</label>
              <input type="text" inputMode="numeric" placeholder="如：1,000,000"
                value={editing.per_transfer_limit != null ? editing.per_transfer_limit.toLocaleString('zh-CN') : ''}
                onChange={e => {
                  const v = parseFloat(e.target.value.replace(/[,，]/g, ''));
                  setEditing({ ...editing, per_transfer_limit: isNaN(v) ? null : v });
                }} className="w-full" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">操作时段</label>
            <input type="text" placeholder="如：工作日 9:00-17:00" value={editing.transfer_hours || ''}
              onChange={e => setEditing({ ...editing, transfer_hours: e.target.value || null })} className="w-full" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-2.5 rounded-xl text-sm">保存</button>
            <button onClick={() => setEditing(null)} className="border border-[var(--color-border)] px-4 py-2.5 rounded-xl text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)]">取消</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing({ name: '', type: undefined, note: '', currency: 'CNY', is_brokerage: false })}
          className="text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-accent-light)] transition-colors"
        >
          ＋ 添加账户
        </button>
      )}
    </div>
  );
}
