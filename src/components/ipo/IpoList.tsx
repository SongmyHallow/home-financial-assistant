'use client';
import { useState, useEffect } from 'react';
import type { IpoListing } from '@/lib/types';
import IpoCard from './IpoCard';

export default function IpoList() {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [market, setMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = market !== 'all' ? `?market=${market}` : '';
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
    if (watching.has(ipoId)) return; // 防止重复点击
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

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', '北交所', '港股'].map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-3 py-1 rounded-full text-sm ${
              market === m ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {m === 'all' ? '全部' : m}
          </button>
        ))}
      </div>

      {ipos.length === 0 ? (
        <p className="text-gray-400 text-center py-8">今日暂无新股申购</p>
      ) : (
        <div className="space-y-4">
          {ipos.map((ipo) => (
            <IpoCard
              key={ipo.id}
              ipo={ipo}
              watched={watched.includes(ipo.id)}
              onToggleWatch={toggleWatch}
              disabled={watching.has(ipo.id) ? 'opacity-50 cursor-wait' : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
