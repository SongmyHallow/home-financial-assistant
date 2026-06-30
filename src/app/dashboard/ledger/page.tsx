'use client';
import { useState, useEffect, useCallback } from 'react';
import type { AccountV2 } from '@/lib/types';
import LedgerGrid from '@/components/ledger/LedgerGrid';
import TransferBar from '@/components/ledger/TransferBar';

export default function LedgerPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [accounts, setAccounts] = useState<AccountV2[]>([]);
  const [gridKey, setGridKey] = useState(0);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (Array.isArray(data)) setAccounts(data);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function handleTransferComplete() {
    // 触发 LedgerGrid 重新加载
    setGridKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      {/* 标题 + 月份选择器 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">资产台账</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-[var(--color-border)] rounded px-2 py-1 text-sm bg-white"
        />
      </div>

      {/* 转账栏 */}
      <TransferBar
        accounts={accounts}
        month={month}
        onTransferComplete={handleTransferComplete}
      />

      {/* 台账主体 */}
      <LedgerGrid key={`${month}-${gridKey}`} month={month} accounts={accounts} />
    </div>
  );
}
