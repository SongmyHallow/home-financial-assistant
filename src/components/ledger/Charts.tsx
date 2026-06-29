'use client';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { Transaction } from '@/lib/types';

export default function Charts({ transactions }: { transactions: Transaction[] }) {
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const waterFallData = useMemo(() => {
    const monthly = new Map<string, { in: number; out: number }>();
    transactions.forEach(t => {
      const month = t.date.slice(0, 7);
      const entry = monthly.get(month) || { in: 0, out: 0 };
      if (['新股收益', '利息/分红'].includes(t.category)) {
        entry.in += t.amount;
      } else {
        entry.out += t.amount;
      }
      monthly.set(month, entry);
    });
    return Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  const pieOption = {
    title: { text: '类别占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: pieData,
      label: { formatter: '{b}\n¥{c}' },
    }],
  };

  const waterFallOption = {
    title: { text: '月度流水', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: waterFallData.map(d => d[0]) },
    yAxis: { type: 'value' as const },
    series: [
      { name: '流入', type: 'bar', data: waterFallData.map(d => d[1].in), color: '#22c55e' },
      { name: '流出', type: 'bar', data: waterFallData.map(d => d[1].out), color: '#ef4444' },
    ],
  };

  return (
    <div className="space-y-4 mb-4">
      <details open className="bg-white rounded-xl p-4 border">
        <summary className="font-semibold cursor-pointer">📊 图表看板</summary>
        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <ReactECharts option={waterFallOption} style={{ height: 300 }} />
          <ReactECharts option={pieOption} style={{ height: 300 }} />
        </div>
      </details>
    </div>
  );
}
