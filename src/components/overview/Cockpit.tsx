'use client';
import { useState, useEffect, useMemo } from 'react';
import type { Operation, IpoListing } from '@/lib/types';

const OP_TYPES = ['北交所申购', '北交所卖出', '通知存款', '国债逆回购', '理财', '薪金宝', '活钱', '转账', '其他'];
const SOURCES = ['WQ建行', 'WQ中行', 'CML建行', 'SHT建行', '申万', '国信', '辉立', '其他'];

function getMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function Cockpit() {
  const [month, setMonth] = useState(getMonth);
  const [ops, setOps] = useState<Operation[]>([]);
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Operation> | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [opsRes, ipoRes] = await Promise.all([
        fetch(`/api/operations?month=${month}`),
        fetch('/api/ipo?status=all'),
      ]);
      const [opsData, ipoData] = await Promise.all([opsRes.json(), ipoRes.json()]);
      if (Array.isArray(opsData)) setOps(opsData);
      if (Array.isArray(ipoData)) setIpos(ipoData);
      setLoading(false);
    }
    load();
  }, [month]);

  async function handleSave() {
    if (!editing?.source || !editing?.operation_type) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/operations', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editing, month }),
    });
    setEditing(null); setShowForm(false);
    const res = await fetch(`/api/operations?month=${month}`);
    setOps(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除？')) return;
    await fetch(`/api/operations?id=${id}`, { method: 'DELETE' });
    setOps(ops.filter(o => o.id !== id));
  }

  // Auto-fill from IPO: pre-fill a 北交所申购 row
  function autoFillIpo(ipo: IpoListing) {
    const today = new Date().toISOString().slice(0, 10);
    setEditing({
      source: SOURCES[0],
      operation_type: '北交所申购',
      amount: 0,
      start_date: ipo.subscription_deadline?.slice(0, 10) || today,
      end_date: ipo.subscription_deadline?.slice(0, 10) || today,
      days: 2,
      total_profit: 0,
      note: `申购${ipo.company_name}(${ipo.subscription_code})`,
    });
    setShowForm(true);
  }

  const totalProfit = ops.reduce((s, o) => s + (o.total_profit || 0), 0);
  const totalAmount = ops.reduce((s, o) => s + (o.amount || 0), 0);
  const annualRate = totalAmount > 0 ? (totalProfit / totalAmount * 365 / Math.max(1, ops.reduce((s, o) => s + o.days, 0))) : 0;

  // 近期 IPO（可用于预填报）
  const recentIpos = useMemo(() => {
    return ipos.filter(ipo => ipo.market === '北交所' && ipo.status === '进行中').slice(0, 5);
  }, [ipos]);

  if (loading) return <div className="text-center py-12 text-[var(--color-muted)]">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">驾驶舱</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditing({}); setShowForm(true); }}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium px-4 py-2 rounded-xl">
            ＋ 新增操作
          </button>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-sm bg-white" />
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)]">操作笔数</p>
          <p className="text-2xl font-semibold mt-1">{ops.length}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)]">累计金额</p>
          <p className="text-2xl font-semibold mt-1">¥{fmt(totalAmount)}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)]">总收益</p>
          <p className={`text-2xl font-semibold mt-1 ${totalProfit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            ¥{fmt(totalProfit)}
          </p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
          <p className="text-[11px] text-[var(--color-muted)]">年化收益率</p>
          <p className="text-2xl font-semibold mt-1">{ops.length > 0 ? `${(annualRate * 100).toFixed(2)}%` : '—'}</p>
        </div>
      </div>

      {/* 编辑表单 */}
      {showForm && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
          <h3 className="font-semibold text-sm">{editing?.id ? '编辑操作' : '新增操作'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">开始日期</label>
              <input type="date" value={editing?.start_date || ''} onChange={e => setEditing({...editing, start_date: e.target.value})} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">结束日期</label>
              <input type="date" value={editing?.end_date || ''} onChange={e => setEditing({...editing, end_date: e.target.value})} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">资金来源</label>
              <select value={editing?.source || ''} onChange={e => setEditing({...editing, source: e.target.value})} className="w-full">
                <option value="">选择</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">操作类型</label>
              <select value={editing?.operation_type || ''} onChange={e => setEditing({...editing, operation_type: e.target.value})} className="w-full">
                <option value="">选择</option>
                {OP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">金额</label>
              <input type="number" value={editing?.amount || ''} onChange={e => setEditing({...editing, amount: Number(e.target.value)})} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">日利率(%)</label>
              <input type="number" step="0.0001" value={editing?.daily_rate ?? ''}
                onChange={e => setEditing({...editing, daily_rate: e.target.value ? Number(e.target.value) : null})} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">天数</label>
              <input type="number" value={editing?.days || ''} onChange={e => setEditing({...editing, days: Number(e.target.value)})} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">收益</label>
              <input type="number" step="0.01" value={editing?.profit ?? ''}
                onChange={e => setEditing({...editing, profit: e.target.value ? Number(e.target.value) : null})} className="w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">备注</label>
              <input type="text" value={editing?.note || ''} onChange={e => setEditing({...editing, note: e.target.value})} placeholder="如：申购XX科技" className="w-full" />
            </div>
          </div>
          {/* 自动计算总收益 */}
          {editing?.amount && editing?.days && editing?.daily_rate && (
            <p className="text-xs text-[var(--color-accent)]">
              💡 预估总收益：¥{fmt(editing.amount * (editing.daily_rate / 100) * editing.days)}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-[var(--color-accent)] text-white text-sm px-4 py-2 rounded-xl">保存</button>
            <button onClick={() => { setEditing(null); setShowForm(false); }} className="border border-[var(--color-border)] text-sm px-4 py-2 rounded-xl">取消</button>
          </div>
        </div>
      )}

      {/* 预填报区：近期 IPO */}
      {!showForm && recentIpos.length > 0 && (
        <div className="bg-[var(--color-accent-light)] rounded-2xl border border-[var(--color-accent)]/20 p-4">
          <p className="text-xs font-medium text-[var(--color-accent)] mb-2">📋 近期北交所新股（点击可预填报）</p>
          <div className="flex flex-wrap gap-2">
            {recentIpos.map(ipo => (
              <button key={ipo.id} onClick={() => autoFillIpo(ipo)}
                className="text-[11px] bg-white border border-[var(--color-accent)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors text-[var(--color-foreground)]">
                {ipo.company_name} ¥{ipo.price_low}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 操作日志表 */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">开始</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">结束</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">来源</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">操作</th>
              <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">金额</th>
              <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">日利率</th>
              <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">收益</th>
              <th className="px-3 py-2.5 text-center text-xs text-[var(--color-muted)] font-medium">天数</th>
              <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">总收益</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">备注</th>
              <th className="px-3 py-2.5 text-center text-xs text-[var(--color-muted)] font-medium w-12">操作</th>
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-12 text-[var(--color-muted)] text-sm">暂无操作记录，点击「新增操作」开始记录</td></tr>
            ) : ops.map((op, i) => (
              <tr key={op.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)]">
                <td className="px-3 py-2 text-xs text-[var(--color-muted)]">{i + 1}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{op.start_date?.slice(5)}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{op.end_date?.slice(5)}</td>
                <td className="px-3 py-2 text-xs">{op.source}</td>
                <td className="px-3 py-2 text-xs font-medium">{op.operation_type}</td>
                <td className="px-3 py-2 text-right text-xs font-mono">{op.amount > 0 ? fmt(op.amount) : '—'}</td>
                <td className="px-3 py-2 text-right text-xs">{op.daily_rate != null ? `${op.daily_rate}%` : '—'}</td>
                <td className="px-3 py-2 text-right text-xs">{op.profit != null ? fmt(op.profit) : '—'}</td>
                <td className="px-3 py-2 text-center text-xs">{op.days}</td>
                <td className={`px-3 py-2 text-right text-xs font-medium ${(op.total_profit || 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {op.total_profit ? fmt(op.total_profit) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted)] max-w-[120px] truncate">{op.note || '—'}</td>
                <td className="px-2 py-2 text-center">
                  <button onClick={() => { setEditing(op); setShowForm(true); }} className="text-[var(--color-accent)] text-xs mr-1">编辑</button>
                  <button onClick={() => handleDelete(op.id)} className="text-[var(--color-danger)] text-xs">删</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 合计行 */}
      {ops.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex gap-8 text-sm">
          <div><span className="text-[var(--color-muted)]">合计收益：</span><span className="font-semibold text-[var(--color-success)]">¥{fmt(totalProfit)}</span></div>
          <div><span className="text-[var(--color-muted)]">操作天数：</span>{ops.reduce((s, o) => s + o.days, 0)}天</div>
          <div><span className="text-[var(--color-muted)]">年化：</span><span className="font-semibold">{ops.length > 0 ? `${(annualRate * 100).toFixed(2)}%` : '—'}</span></div>
        </div>
      )}
    </div>
  );
}
