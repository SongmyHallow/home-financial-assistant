'use client';
import { useState, useEffect, useCallback } from 'react';
import type { IpoListing, HkSubscription } from '@/lib/types';

export default function HkIpoPage() {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // 加载港股 IPO 列表
  const loadIpos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ipo?market=港股&status=all');
      const data = await res.json();
      if (Array.isArray(data)) setIpos(data);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载申购状态
  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/ipo/hk-sub');
      const data: HkSubscription[] = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        data.forEach(s => { map[s.ipo_id] = s.subscribed; });
        setSubscriptions(map);
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    loadIpos();
    loadSubscriptions();
  }, [loadIpos, loadSubscriptions]);

  async function toggleSubscription(ipoId: string) {
    if (toggling.has(ipoId)) return;
    setToggling(prev => new Set(prev).add(ipoId));
    const current = subscriptions[ipoId] ?? false;
    // 乐观更新
    setSubscriptions(prev => ({ ...prev, [ipoId]: !current }));
    try {
      await fetch('/api/ipo/hk-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipo_id: ipoId, subscribed: !current }),
      });
    } catch {
      // 回滚
      setSubscriptions(prev => ({ ...prev, [ipoId]: current }));
    } finally {
      setToggling(prev => {
        const next = new Set(prev);
        next.delete(ipoId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)]">港股 IPO</h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] animate-pulse">
              <div className="h-4 w-32 bg-[var(--color-border)] rounded mb-2" />
              <div className="h-3 w-20 bg-[var(--color-border-light)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--color-foreground)]">港股 IPO</h2>

      {ipos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">🇭🇰</div>
          <p className="text-[var(--color-muted)] text-sm">暂无港股 IPO 数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ipos.map(ipo => {
            const subscribed = subscriptions[ipo.id] ?? false;
            const isToggling = toggling.has(ipo.id);
            const deadline = new Date(ipo.subscription_deadline);
            const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={ipo.id}
                className={`bg-[var(--color-surface)] rounded-2xl p-5 border transition-all duration-150 ${
                  isUrgent
                    ? 'ring-1 ring-amber-200 border-amber-300'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* 左侧：公司信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                        港股
                      </span>
                      {isUrgent && (
                        <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                          即将截止
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-[var(--color-foreground)] truncate">
                      {ipo.company_name}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5">{ipo.subscription_code}</p>
                    <div className="mt-2 space-y-0.5 text-xs text-[var(--color-muted)]">
                      <p>
                        <span className="text-[var(--color-muted-light)]">截止：</span>
                        {deadline.toLocaleDateString('zh-CN')}
                      </p>
                      {ipo.lot_amount > 0 && (
                        <p>
                          <span className="text-[var(--color-muted-light)]">一手：</span>
                          HK${ipo.lot_amount?.toLocaleString() ?? '-'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右侧：申购状态切换 */}
                  <button
                    onClick={() => toggleSubscription(ipo.id)}
                    disabled={isToggling}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium
                                transition-all duration-150 disabled:opacity-50 ${
                      subscribed
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-[var(--color-border-light)] border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
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
