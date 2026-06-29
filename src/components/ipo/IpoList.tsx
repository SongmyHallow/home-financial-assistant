'use client';
import { useState, useEffect } from 'react';
import type { IpoListing } from '@/lib/types';
import IpoCard from './IpoCard';

export default function IpoList() {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [market, setMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIpos();
    fetchWatched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  async function fetchIpos() {
    setLoading(true);
    const params = market !== 'all' ? `?market=${market}` : '';
    const res = await fetch('/api/ipo' + params);
    const data = await res.json();
    if (Array.isArray(data)) setIpos(data);
    setLoading(false);
  }

  async function fetchWatched() {
    const res = await fetch('/api/ipo/watch');
    const data = await res.json();
    if (Array.isArray(data)) setWatched(data);
  }

  async function toggleWatch(ipoId: string) {
    const method = watched.includes(ipoId) ? 'DELETE' : 'POST';
    await fetch('/api/ipo/watch', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId }),
    });
    fetchWatched();
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
