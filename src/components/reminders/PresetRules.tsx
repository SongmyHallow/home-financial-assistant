'use client';
import { useState, useEffect } from 'react';

interface PresetRule {
  key: string;
  label: string;
  time: string;
  condition: string;
  icon: string;
}

const PRESET_RULES: PresetRule[] = [
  { key: 'bank_transfer', label: '银证转账提醒', time: '8:20', condition: '有申购时', icon: '💳' },
  { key: 'guoxin_ipo', label: '国信证券申购', time: '8:40', condition: '有北交所新股', icon: '🏦' },
  { key: 'shenwan_ipo', label: '申万证券申购', time: '8:50', condition: '有北交所新股', icon: '🏦' },
  { key: 'hk_check', label: '港股申购检查', time: '9:00', condition: '有港股新股', icon: '📋' },
  { key: 'hk_dark_pool', label: '港股暗盘卖出', time: '16:05', condition: '有上市首日股票', icon: '💰' },
  { key: 'month_start', label: '月初资产检查', time: '每月1号 9:00', condition: '始终', icon: '📊' },
  { key: 'month_end', label: '月末活动检查', time: '每月最后一天 15:00', condition: '可开关', icon: '📅' },
];

const STORAGE_KEY = 'preset_rules_enabled';

function loadEnabledState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // 忽略解析错误
  }
  // 默认全部启用
  const defaults: Record<string, boolean> = {};
  PRESET_RULES.forEach(r => { defaults[r.key] = true; });
  return defaults;
}

function saveEnabledState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 忽略存储错误
  }
}

export default function PresetRules() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabled(loadEnabledState());
    setMounted(true);
  }, []);

  function toggle(key: string) {
    const next = { ...enabled, [key]: !enabled[key] };
    setEnabled(next);
    saveEnabledState(next);
  }

  if (!mounted) return null;

  return (
    <section className="mb-6">
      <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
        <span>⚙️</span>
        <span>系统预设规则</span>
        <span className="text-xs text-[var(--color-muted)] font-normal">（开关状态本地保存）</span>
      </h3>
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        {PRESET_RULES.map((rule, idx) => (
          <div
            key={rule.key}
            className={`flex items-center justify-between px-4 py-3 ${
              idx < PRESET_RULES.length - 1 ? 'border-b border-[var(--color-border)]' : ''
            } ${enabled[rule.key] ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-hover)] opacity-60'}`}
          >
            {/* 左侧：图标 + 文字 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-lg shrink-0">{rule.icon}</span>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{rule.label}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  <span className="font-mono">{rule.time}</span>
                  <span className="mx-1">·</span>
                  <span>{rule.condition}</span>
                </p>
              </div>
            </div>

            {/* 右侧：Toggle 开关 */}
            <button
              onClick={() => toggle(rule.key)}
              aria-label={enabled[rule.key] ? `关闭${rule.label}` : `开启${rule.label}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full shrink-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 ${
                enabled[rule.key]
                  ? 'bg-[var(--color-accent)]'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  enabled[rule.key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
