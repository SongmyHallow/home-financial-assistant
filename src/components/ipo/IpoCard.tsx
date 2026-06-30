'use client';
import type { IpoListing } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function IpoCard({
  ipo,
  watched,
  onToggleWatch,
  disabled = '',
}: {
  ipo: IpoListing;
  watched: boolean;
  onToggleWatch: (id: string) => void;
  disabled?: string;
}) {
  const router = useRouter();
  const deadline = new Date(ipo.subscription_deadline);
  const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

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
