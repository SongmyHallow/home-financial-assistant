'use client';
import { useState, useEffect, useCallback } from 'react';
import type { AccountV2 } from '@/lib/types';
import LedgerGrid from '@/components/ledger/LedgerGrid';
import TransferRulesCard from '@/components/ledger/TransferRulesCard';
import PasteModal from '@/components/ledger/PasteModal';

export default function LedgerPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [accounts, setAccounts] = useState<AccountV2[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [showPaste, setShowPaste] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (Array.isArray(data)) setAccounts(data);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function handleRefresh() {
    setGridKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      {/* 标题 + 操作按钮 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">资产台账</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaste(true)}
            className="border border-[var(--color-border)] text-[13px] text-[var(--color-muted)] px-3 py-1.5 rounded-xl hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] transition-all"
          >
            📋 从 Excel 粘贴
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-sm bg-white"
          />
        </div>
      </div>

      <TransferRulesCard accounts={accounts} />

      <LedgerGrid key={`${month}-${gridKey}`} month={month} accounts={accounts} />

      {showPaste && (
        <PasteModal
          accounts={accounts}
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
