'use client';
import type { TemplateType } from '@/lib/types';

const TEMPLATES: { type: TemplateType; icon: string; label: string; desc: string }[] = [
  { type: '申购', icon: '🏦', label: '申购', desc: '新股打新' },
  { type: '卖出', icon: '💰', label: '卖出', desc: '卖新股' },
  { type: '转账', icon: '💳', label: '转账', desc: '账户转账' },
  { type: '积分', icon: '🎁', label: '积分', desc: '积分检查' },
  { type: '检查', icon: '📊', label: '检查', desc: '余额等' },
  { type: '自定义', icon: '📝', label: '自定义', desc: '自由任务' },
];

export default function TemplatePicker({ onSelect }: { onSelect: (type: TemplateType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {TEMPLATES.map(t => (
        <button
          key={t.type}
          onClick={() => onSelect(t.type)}
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl
                     bg-[var(--color-surface)] border border-[var(--color-border)]
                     hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-light)]
                     transition-all duration-150"
        >
          <span className="text-xl">{t.icon}</span>
          <span className="text-[13px] font-medium text-[var(--color-foreground)]">{t.label}</span>
          <span className="text-[11px] text-[var(--color-muted-light)]">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}
