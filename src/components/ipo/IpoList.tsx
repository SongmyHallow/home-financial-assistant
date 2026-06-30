'use client';
import { useState, useEffect } from 'react';
import type { IpoListing } from '@/lib/types';
import IpoCard from './IpoCard';

const MARKET_FILTERS = ['全部', '北交所', '港股'] as const;

export default function IpoList() {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [market, setMarket] = useState<string>('全部');
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = market !== '全部' ? `?market=${market}` : '';
        const res = await fetch('/api/ipo' + params, { signal: controller.signal });
        const data = await res.json();
        if (Array.isArray(data)) setIpos(data);
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('IPO fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    fetchWatched();
    return () => controller.abort();
  }, [market]);

  async function fetchWatched() {
    const res = await fetch('/api/ipo/watch');
    const data = await res.json();
    if (Array.isArray(data)) setWatched(data);
  }

  async function toggleWatch(ipoId: string) {
    if (watching.has(ipoId)) return;
    setWatching(prev => new Set(prev).add(ipoId));
    try {
      const method = watched.includes(ipoId) ? 'DELETE' : 'POST';
      await fetch('/api/ipo/watch', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipo_id: ipoId }),
      });
      await fetchWatched();
    } finally {
      setWatching(prev => {
        const next = new Set(prev);
        next.delete(ipoId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] animate-pulse">
            <div className="h-4 w-20 bg-[var(--color-border)] rounded mb-3" />
            <div className="h-5 w-40 bg-[var(--color-border)] rounded mb-2" />
            <div className="h-3 w-24 bg-[var(--color-border-light)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-4 bg-[var(--color-border-light)] rounded-xl p-1 w-fit">
        {MARKET_FILTERS.map(m => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
              market === m
                ? 'bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {ipos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📋</div>
          <p className="text-[var(--color-muted)] text-sm">今日暂无新股申购</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ipos.map(ipo => (
            <IpoCard
              key={ipo.id}
              ipo={ipo}
              watched={watched.includes(ipo.id)}
              onToggleWatch={toggleWatch}
              disabled={watching.has(ipo.id) ? 'opacity-50 pointer-events-none' : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
