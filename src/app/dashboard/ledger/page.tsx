'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AccountV2 } from '@/lib/types';
import LedgerGrid from '@/components/ledger/LedgerGrid';
import TransferRulesCard from '@/components/ledger/TransferRulesCard';
import PasteModal from '@/components/ledger/PasteModal';

function loadSelection(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('ledger_selected_accounts') || '[]'); } catch { return []; }
}

function saveSelection(ids: string[]) {
  try { localStorage.setItem('ledger_selected_accounts', JSON.stringify(ids)); } catch {}
}

export default function LedgerPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [allAccounts, setAllAccounts] = useState<AccountV2[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [showPaste, setShowPaste] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (Array.isArray(data)) setAllAccounts(data);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // 从 localStorage 加载选中的账户
  useEffect(() => {
    setSelectedIds(loadSelection());
  }, []);

  // 关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAccountPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 默认全选
  useEffect(() => {
    if (allAccounts.length > 0 && selectedIds.length === 0) {
      setSelectedIds(allAccounts.map((a) => a.id));
    }
  }, [allAccounts]);

  function toggleAccount(id: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveSelection(next);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const all = selectedIds.length === allAccounts.length ? [] : allAccounts.map((a) => a.id);
      saveSelection(all);
      return all;
    });
  }

  const activeAccounts = allAccounts.filter((a) => selectedIds.includes(a.id));

  function handleRefresh() {
    setGridKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      {/* 标题 + 操作按钮 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">资产台账</h2>
        <div className="flex items-center gap-2">
          {/* 账户选择器 */}
          <div ref={pickerRef} className="relative">
            <button
              onClick={() => setShowAccountPicker(!showAccountPicker)}
              className="border border-[var(--color-border)] text-[13px] text-[var(--color-muted)] px-3 py-1.5 rounded-xl hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] transition-all"
            >
              📂 {selectedIds.length}/{allAccounts.length} 个账户
            </button>
            {showAccountPicker && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 min-w-[180px] max-h-60 overflow-y-auto">
                <label className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-hover)] rounded-lg">
                  <input type="checkbox" checked={selectedIds.length === allAccounts.length} onChange={toggleAll} />
                  全选 / 全不选
                </label>
                <hr className="my-1 border-[var(--color-border-light)]" />
                {allAccounts.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-[13px] cursor-pointer hover:bg-[var(--color-surface-hover)] rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleAccount(a.id)}
                    />
                    <span className={a.is_brokerage ? 'text-blue-600' : 'text-[var(--color-foreground)]'}>
                      {a.name}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted-light)] ml-auto">{a.currency}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPaste(true)}
            className="border border-[var(--color-border)] text-[13px] text-[var(--color-muted)] px-3 py-1.5 rounded-xl hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] transition-all"
          >
            📋 从 Excel 粘贴
          </button>
          <span className="hidden md:inline text-[11px] text-[var(--color-muted-light)]">
            Excel 中 Ctrl+C 选中区域，在此粘贴
          </span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-sm bg-white"
          />
        </div>
      </div>

      <TransferRulesCard accounts={activeAccounts} />

      <LedgerGrid key={`${month}-${gridKey}`} month={month} accounts={activeAccounts} />

      {showPaste && (
        <PasteModal
          accounts={activeAccounts}
          month={month}
          onComplete={() => {
            setShowPaste(false);
            handleRefresh();
          }}
          onClose={() => setShowPaste(false)}
        />
      )}
    </div>
  );
}
