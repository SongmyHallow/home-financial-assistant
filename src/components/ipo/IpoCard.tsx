'use client';
import { useState, useEffect, useCallback } from 'react';
import type { IpoListing, IpoAllocation, AccountV2 } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function IpoCard({
  ipo,
  watched,
  onToggleWatch,
  disabled = '',
  brokerageAccounts = [],
}: {
  ipo: IpoListing;
  watched: boolean;
  onToggleWatch: (id: string) => void;
  disabled?: string;
  brokerageAccounts?: AccountV2[];
}) {
  const router = useRouter();
  const deadline = new Date(ipo.subscription_deadline);
  const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

  // 配资状态
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // 加载已有配资数据
  const loadAllocations = useCallback(async () => {
    if (ipo.market !== '北交所') return;
    try {
      const res = await fetch(`/api/ipo/allocations?ipo_id=${ipo.id}`);
      const data: IpoAllocation[] = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach(a => { map[a.account_id] = String(a.amount); });
        setAllocations(map);
      }
    } catch {
      // 静默失败
    }
  }, [ipo.id, ipo.market]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  async function saveAllocations() {
    setSaving(true);
    setSaveMsg('');
    try {
      const entries = brokerageAccounts.map(acc => ({
        account_id: acc.id,
        amount: Number(allocations[acc.id] ?? 0),
      }));
      await Promise.all(
        entries.map(e =>
          fetch('/api/ipo/allocations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ipo_id: ipo.id, account_id: e.account_id, amount: e.amount }),
          })
        )
      );
      setSaveMsg('已保存');
    } catch {
      setSaveMsg('保存失败');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }

  function createReminder() {
    const params = new URLSearchParams({
      template: '申购',
      title: `申购${ipo.company_name}`,
      desc: `代码 ${ipo.subscription_code}，一手 ¥${ipo.lot_amount?.toLocaleString() ?? '-'}`,
      deadline: ipo.subscription_deadline,
    });
    router.push(`/dashboard/reminders?${params.toString()}`);
  }

  return (
    <div className={`bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] transition-all duration-150 ${
      isUrgent ? 'ring-1 ring-amber-200 border-amber-300' : 'hover:border-[var(--color-accent)]/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full ${
            ipo.market === '北交所'
              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
              : 'bg-blue-50 text-blue-700'
          }`}>
            {ipo.market}
          </span>
          <h3 className="font-semibold text-base mt-2 text-[var(--color-foreground)]">{ipo.company_name}</h3>
          <p className="text-xs text-[var(--color-muted)] mt-0.5 font-mono">{ipo.subscription_code}</p>
        </div>
        {isUrgent && (
          <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">
            即将截止
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] py-3 border-y border-[var(--color-border-light)]">
        <div>
          <span className="text-[var(--color-muted-light)]">发行价</span>
          <p className="font-medium text-[var(--color-foreground)]">¥{ipo.price_low} - ¥{ipo.price_high}</p>
        </div>
        <div>
          <span className="text-[var(--color-muted-light)]">一手资金</span>
          <p className="font-medium text-[var(--color-foreground)]">¥{ipo.lot_amount?.toLocaleString() ?? '-'}</p>
        </div>
        <div>
          <span className="text-[var(--color-muted-light)]">保荐人</span>
          <p className="font-medium text-[var(--color-foreground)]">{ipo.sponsor || '-'}</p>
        </div>
        <div>
          <span className="text-[var(--color-muted-light)]">行业</span>
          <p className="font-medium text-[var(--color-foreground)]">{ipo.industry || '-'}</p>
        </div>
        <div className="col-span-2">
          <span className="text-[var(--color-muted-light)]">申购截止</span>
          <p className="font-medium text-[var(--color-foreground)]">{deadline.toLocaleString('zh-CN')}</p>
        </div>
        <div className="col-span-2">
          <span className="text-[var(--color-muted-light)]">预计上市</span>
          <p className="font-medium text-[var(--color-foreground)]">{ipo.expected_listing_date || '-'}</p>
        </div>
      </div>

      {/* 北交所配资分配 */}
      {ipo.market === '北交所' && brokerageAccounts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border-light)]">
          <p className="text-xs font-medium mb-2 text-[var(--color-foreground)]">资金分配</p>
          {brokerageAccounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-[var(--color-muted)] w-20 truncate">{acc.name}</span>
              <input
                type="number"
                placeholder="金额"
                value={allocations[acc.id] ?? ''}
                onChange={e => setAllocations({ ...allocations, [acc.id]: e.target.value })}
                className="flex-1 text-sm border border-[var(--color-border)] rounded-lg px-2 py-1
                           bg-[var(--color-surface)] text-[var(--color-foreground)]
                           focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={saveAllocations}
              disabled={saving}
              className="text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
                         text-white px-3 py-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
            >
              {saving ? '保存中...' : '确认分配'}
            </button>
            {saveMsg && (
              <span className="text-xs text-[var(--color-muted)]">{saveMsg}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={createReminder}
          className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
                     text-white text-sm font-medium py-2.5 rounded-xl transition-colors duration-150"
        >
          创建申购提醒
        </button>
        <button
          onClick={() => onToggleWatch(ipo.id)}
          className={`px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm transition-all duration-150
                     hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] ${disabled}`}
        >
          {watched ? '⭐' : '☆'}
        </button>
      </div>
    </div>
  );
}
