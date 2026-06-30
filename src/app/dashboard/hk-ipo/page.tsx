'use client';
import { useState, useEffect, useCallback } from 'react';
import type { IpoListing, HkSubscription } from '@/lib/types';

export default function HkIpoPage() {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [lotAmount, setLotAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [listingDate, setListingDate] = useState('');

  const loadIpos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ipo?market=港股&status=all');
      const data = await res.json();
      if (Array.isArray(data)) setIpos(data);
    } finally { setLoading(false); }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/ipo/hk-sub');
      const data: HkSubscription[] = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        data.forEach(s => { map[s.ipo_id] = s.subscribed; });
        setSubscriptions(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadIpos();
    loadSubscriptions();
  }, [loadIpos, loadSubscriptions]);

  async function toggleSubscription(ipoId: string) {
    if (toggling.has(ipoId)) return;
    setToggling(prev => new Set(prev).add(ipoId));
    const current = subscriptions[ipoId] ?? false;
    setSubscriptions(prev => ({ ...prev, [ipoId]: !current }));
    try {
      await fetch('/api/ipo/hk-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipo_id: ipoId, subscribed: !current }),
      });
    } catch {
      setSubscriptions(prev => ({ ...prev, [ipoId]: current }));
    } finally {
      setToggling(prev => { const n = new Set(prev); n.delete(ipoId); return n; });
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !code) return;
    const p = parseFloat(price) || 0;
    const lot = parseFloat(lotAmount) || 0;
    await fetch('/api/ipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        market: '港股', company_name: name, subscription_code: code,
        price_low: p, price_high: p, lot_size: 100, lot_amount: lot || p * 100,
        subscription_deadline: deadline ? `${deadline}T10:00:00.000Z` : null,
        expected_listing_date: listingDate || null,
        status: '进行中',
      }),
    });
    setName(''); setCode(''); setPrice(''); setLotAmount('');
    setDeadline(''); setListingDate(''); setShowForm(false);
    loadIpos();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">港股 IPO</h2>
        <div className="space-y-3">{[1,2,3].map(i => (
          <div key={i} className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] animate-pulse">
            <div className="h-4 w-32 bg-[var(--color-border)] rounded mb-2" />
          </div>
        ))}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">港股 IPO</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="border border-[var(--color-border)] text-[13px] text-[var(--color-muted)] px-3 py-1.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition-all"
        >
          ＋ 添加新股
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
          <h3 className="font-semibold text-sm">手动添加港股新股</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">公司名称 *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如：XX Holdings" className="w-full" required />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">股票代码 *</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="如：01234" className="w-full" required />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">发行价 (HKD)</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">一手金额 (HKD)</label>
              <input type="number" value={lotAmount} onChange={e => setLotAmount(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">申购截止日</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-muted)] mb-1">上市日期</label>
              <input type="date" value={listingDate} onChange={e => setListingDate(e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium px-4 py-2 rounded-xl">添加</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-[var(--color-border)] text-sm px-4 py-2 rounded-xl">取消</button>
          </div>
        </form>
      )}

      {ipos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">🇭🇰</div>
          <p className="text-[var(--color-muted)] text-sm">暂无港股 IPO 数据</p>
          <p className="text-[var(--color-muted-light)] text-xs mt-1">点击「添加新股」手动录入</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ipos.map(ipo => {
            const subscribed = subscriptions[ipo.id] ?? false;
            const deadline = new Date(ipo.subscription_deadline);
            const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

            return (
              <div key={ipo.id} className={`bg-[var(--color-surface)] rounded-2xl p-5 border transition-all ${isUrgent ? 'ring-1 ring-amber-200 border-amber-300' : 'border-[var(--color-border)]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">港股</span>
                      {isUrgent && <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">即将截止</span>}
                    </div>
                    <h3 className="font-semibold text-base">{ipo.company_name}</h3>
                    <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5">{ipo.subscription_code}</p>
                    <div className="mt-2 space-y-0.5 text-xs text-[var(--color-muted)]">
                      <p><span className="text-[var(--color-muted-light)]">截止：</span>{deadline.toLocaleDateString('zh-CN')}</p>
                      {ipo.price_low > 0 && <p><span className="text-[var(--color-muted-light)]">发行价：</span>HK${ipo.price_low}</p>}
                      {ipo.lot_amount > 0 && <p><span className="text-[var(--color-muted-light)]">一手：</span>HK${ipo.lot_amount.toLocaleString()}</p>}
                      {ipo.expected_listing_date && <p><span className="text-[var(--color-muted-light)]">上市：</span>{ipo.expected_listing_date}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSubscription(ipo.id)}
                    disabled={toggling.has(ipo.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
                      subscribed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[var(--color-border-light)] border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    <span>{subscribed ? '✓' : '○'}</span>
                    <span>{subscribed ? '已申购' : '未申购'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
