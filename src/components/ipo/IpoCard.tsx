'use client';
import type { IpoListing } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function IpoCard({
  ipo,
  watched,
  onToggleWatch,
}: {
  ipo: IpoListing;
  watched: boolean;
  onToggleWatch: (id: string) => void;
}) {
  const router = useRouter();
  const deadline = new Date(ipo.subscription_deadline);
  const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

  function createReminder() {
    const params = new URLSearchParams({
      template: '申购',
      title: `申购${ipo.company_name}`,
      desc: `代码 ${ipo.subscription_code}，一手 ¥${ipo.lot_amount?.toLocaleString()}`,
      deadline: ipo.subscription_deadline,
    });
    router.push(`/dashboard/reminders?${params.toString()}`);
  }

  return (
    <div
      className={`border rounded-xl p-4 bg-white ${
        isUrgent ? 'border-orange-300' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            {ipo.market}
          </span>
          <h3 className="font-bold text-lg mt-1">{ipo.company_name}</h3>
          <p className="text-sm text-gray-500">{ipo.subscription_code}</p>
        </div>
        {isUrgent && (
          <span className="text-xs text-orange-500 font-medium">⏰ 即将截止</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-y-1 text-sm my-3">
        <div>
          <span className="text-gray-500">发行价:</span> ¥{ipo.price_low} -{' '}
          ¥{ipo.price_high}
        </div>
        <div>
          <span className="text-gray-500">一手:</span> ¥
          {ipo.lot_amount?.toLocaleString()} ({ipo.lot_size}股)
        </div>
        <div>
          <span className="text-gray-500">保荐人:</span> {ipo.sponsor || '-'}
        </div>
        <div>
          <span className="text-gray-500">行业:</span> {ipo.industry || '-'}
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">申购截止:</span>{' '}
          {deadline.toLocaleString('zh-CN')}
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">预计上市:</span>{' '}
          {ipo.expected_listing_date || '-'}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={createReminder}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
        >
          🏦 创建申购提醒
        </button>
        <button
          onClick={() => onToggleWatch(ipo.id)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          {watched ? '⭐' : '☆'}
        </button>
      </div>
    </div>
  );
}
