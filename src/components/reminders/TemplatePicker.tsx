'use client';
import type { TemplateType } from '@/lib/types';

const TEMPLATES: { type: TemplateType; icon: string; label: string }[] = [
  { type: '申购', icon: '🏦', label: '申购' },
  { type: '卖出', icon: '💰', label: '卖出' },
  { type: '转账', icon: '💳', label: '转账' },
  { type: '积分', icon: '🎁', label: '积分' },
  { type: '检查', icon: '📊', label: '检查' },
  { type: '自定义', icon: '📝', label: '自定义' },
];

export default function TemplatePicker({ onSelect }: { onSelect: (type: TemplateType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATES.map(t => (
        <button
          key={t.type}
          onClick={() => onSelect(t.type)}
          className="flex flex-col items-center p-4 border rounded-xl hover:border-blue-400 transition-colors bg-white"
        >
          <span className="text-2xl mb-1">{t.icon}</span>
          <span className="text-sm font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
