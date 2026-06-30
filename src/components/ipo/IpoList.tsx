'use client';
import { useState, useEffect } from 'react';
import type { IpoListing } from '@/lib/types';
import { useRouter } from 'next/navigation';

const MARKET_FILTERS = ['全部', '北交所', '港股'] as const;

export default function IpoList() {
  const router = useRouter();
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [market, setMarket] = useState<string>('全部');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = market !== '全部' ? `?market=${market}` : '';
      const res = await fetch('/api/ipo' + params);
      const data = await res.json();
      if (Array.isArray(data)) setIpos(data);
      setLoading(false);
    }
    load();
  }, [market]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-[var(--color-border-light)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 市场筛选 */}
      <div className="flex gap-1.5 mb-4 bg-[var(--color-border-light)] rounded-xl p-1 w-fit">
        {MARKET_FILTERS.map(m => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
              market === m
                ? 'bg-white text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {ipos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-muted)] text-sm">暂无新股数据</p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--color-background)] border-b border-[var(--color-border)]">
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">代码</th>
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">简称</th>
                <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">发行价格</th>
                <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">一手资金</th>
                <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">申购日</th>
                <th className="px-3 py-2.5 text-right text-xs text-[var(--color-muted)] font-medium">上市日</th>
                <th className="px-3 py-2.5 text-left text-xs text-[var(--color-muted)] font-medium">行业</th>
                <th className="px-3 py-2.5 text-center text-xs text-[var(--color-muted)] font-medium">详情</th>
                <th className="px-3 py-2.5 text-center text-xs text-[var(--color-muted)] font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {ipos.map((ipo) => (
                <tr key={ipo.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--color-muted)]">{ipo.subscription_code || '—'}</td>
                  <td className="px-3 py-2.5 font-medium">
                    {ipo.market === '北交所' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-light)] text-[var(--color-accent)] mr-1.5">申购</span>
                    )}
                    {ipo.company_name}
                    {ipo.expected_listing_date && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 ml-1">上市{ipo.expected_listing_date.slice(5)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {ipo.price_low ? <span className="font-mono">¥{ipo.price_low}</span> : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {ipo.lot_amount ? `¥${ipo.lot_amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    {ipo.subscription_deadline?.slice(0, 10) || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    {ipo.expected_listing_date || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--color-muted)]">
                    {ipo.industry || '—'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {ipo.subscription_code ? (
                      <a
                        href={`https://www.bse.cn/newshare/company/${ipo.subscription_code}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[var(--color-accent)] hover:underline whitespace-nowrap"
                      >
                        北交所 ↗
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams({
                          template: '申购',
                          title: `申购${ipo.company_name}`,
                          desc: `代码 ${ipo.subscription_code}，一手 ¥${ipo.lot_amount?.toLocaleString() ?? '-'}`,
                          deadline: ipo.subscription_deadline || '',
                        });
                        router.push(`/dashboard/reminders?${params.toString()}`);
                      }}
                      className="text-[11px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 py-1 rounded-lg whitespace-nowrap transition-colors"
                    >
                      创建提醒
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-muted-light)] mt-2 text-right">
        数据来源：东方财富 datacenter API
      </p>
    </div>
  );
}
