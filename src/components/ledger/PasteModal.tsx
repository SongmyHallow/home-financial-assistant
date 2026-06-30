'use client';
import { useState } from 'react';
import type { AccountV2 } from '@/lib/types';

interface Props {
  accounts: AccountV2[];
  month: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function PasteModal({ accounts, month, onComplete, onClose }: Props) {
  const [raw, setRaw] = useState('');
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ date: string; values: Record<string, number> }[] | null>(null);
  const [colMap, setColMap] = useState<(string | undefined)[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleParse() {
    setError('');
    const lines = raw.trim().split('\n').filter((l) => l.trim());
    if (lines.length < 2) { setError('至少需要标题行和一行数据'); return; }

    // 第一行是标题
    const headers = lines[0].split('\t').map((h) => h.trim());
    const mapping: (string | undefined)[] = [];
    const unmatched: string[] = [];

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const match = accounts.find(
        (a) => a.name === h || h.includes(a.name) || a.name.includes(h)
      );
      if (match) mapping[i] = match.id;
      else if (h && h !== '日期' && h !== '星期' && h !== '备注' && h !== '总计' && !h.includes('星期')) {
        unmatched.push(h);
      }
    }

    if (mapping.filter(Boolean).length === 0) {
      setError(`未匹配到任何账户列。标题: ${headers.join(', ')}`);
      return;
    }

    setColMap(mapping);

    // 解析数据行
    const rows: { date: string; values: Record<string, number> }[] = [];
    const monthPrefix = month + '-';

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      // 第一列可能是日期
      let dateStr = cols[0]?.trim();
      if (!dateStr) continue;

      // 尝试解析各种日期格式
      let date = '';
      if (/^\d{1,2}[\/\-\.]\d{1,2}$/.test(dateStr)) {
        // "6/1" 或 "6-1" 格式
        const [m, d] = dateStr.split(/[\/\-\.]/).map(Number);
        date = `${month}-${String(d).padStart(2, '0')}`;
      } else if (/^\d{1,2}$/.test(dateStr)) {
        // 纯数字 "1" 表示当月第1天
        date = `${month}-${dateStr.padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        date = dateStr;
      } else if (dateStr.includes('-')) {
        // 可能已经是完整日期
        const parts = dateStr.split('-');
        if (parts.length === 3) date = dateStr;
        else if (parts.length === 2) date = `${month}-${parts[1].padStart(2, '0')}`;
      }

      if (!date || !date.startsWith(monthPrefix)) continue;

      const values: Record<string, number> = {};
      for (let j = 0; j < cols.length; j++) {
        const accId = mapping[j];
        if (!accId) continue;
        const val = parseFloat(cols[j]?.replace(/[,，¥￥\s]/g, ''));
        if (!isNaN(val)) values[accId] = val;
      }

      if (Object.keys(values).length > 0) {
        rows.push({ date, values });
      }
    }

    if (rows.length === 0) {
      setError('未能解析出任何数据行。请确保复制了包含日期和金额的表格。');
      return;
    }

    setParsing(true);
    setPreview(rows);
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    let count = 0;
    for (const row of preview) {
      for (const [accId, val] of Object.entries(row.values)) {
        try {
          await fetch('/api/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account_id: accId,
              date: row.date,
              balance: val,
              is_manual: true,
            }),
          });
          count++;
        } catch {}
      }
    }
    setSaving(false);
    onComplete();
  }

  function getAccountName(id: string) {
    return accounts.find((a) => a.id === id)?.name || id;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--color-surface)] px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between rounded-t-2xl">
          <h3 className="font-semibold">从 Excel 粘贴数据</h3>
          <button onClick={onClose} className="text-[var(--color-muted-light)] hover:text-[var(--color-foreground)] text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!preview ? (
            <>
              <p className="text-xs text-[var(--color-muted)]">
                在 Excel 中选中要复制的区域（包括标题行），Ctrl+C 复制，然后在此处 Ctrl+V 粘贴
              </p>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="在此粘贴 Excel 数据..."
                className="w-full h-32 border border-[var(--color-border)] rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              {error && (
                <p className="text-xs text-[var(--color-danger)]">{error}</p>
              )}
              <button
                onClick={handleParse}
                disabled={!raw.trim()}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-40 transition-all"
              >
                解析预览
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--color-accent)]">
                已解析 {preview.length} 行数据（{Object.keys(preview[0]?.values || {}).length} 个账户列）
              </p>
              <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg max-h-64">
                <table className="text-xs min-w-full">
                  <thead>
                    <tr className="bg-[var(--color-background)]">
                      <th className="px-3 py-1.5 text-left border-b border-[var(--color-border)]">日期</th>
                      {colMap.filter(Boolean).map((id) => (
                        <th key={id!} className="px-3 py-1.5 text-right border-b border-[var(--color-border)]">
                          {getAccountName(id!)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1 border-b border-[var(--color-border-light)]">{row.date.slice(5)}</td>
                        {colMap.filter(Boolean).map((id) => (
                          <td key={id!} className="px-3 py-1 text-right border-b border-[var(--color-border-light)]">
                            {row.values[id!]?.toLocaleString() || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="text-center text-[var(--color-muted-light)] text-xs py-2">
                    ... 还有 {preview.length - 10} 行
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-40 transition-all"
                >
                  {saving ? '保存中...' : `确认保存 ${preview.length} 行`}
                </button>
                <button
                  onClick={() => { setPreview(null); setParsing(false); }}
                  className="border border-[var(--color-border)] text-sm px-4 py-2 rounded-xl hover:bg-[var(--color-surface-hover)] transition-all"
                >
                  重新粘贴
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
