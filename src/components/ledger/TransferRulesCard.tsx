'use client';
import type { AccountV2 } from '@/lib/types';

export default function TransferRulesCard({ accounts }: { accounts: AccountV2[] }) {
  const rulesAccounts = accounts.filter(
    (a) => a.transfer_method || a.daily_limit || a.per_transfer_limit || a.transfer_hours || a.transfer_notes
  );

  if (rulesAccounts.length === 0) return null;

  return (
    <details className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
      <summary className="px-4 py-3 text-[13px] font-medium text-[var(--color-muted)] cursor-pointer hover:text-[var(--color-foreground)] transition-colors select-none">
        📋 转账限制规则参考
      </summary>
      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {rulesAccounts.map((acc) => (
          <div
            key={acc.id}
            className="border border-[var(--color-border-light)] rounded-xl p-3 bg-[var(--color-background)]"
          >
            <div className="font-medium text-[13px] text-[var(--color-foreground)] mb-2">
              {acc.name}
              {acc.currency === 'HKD' && (
                <span className="ml-1 text-[11px] text-[var(--color-accent)]">HKD</span>
              )}
            </div>
            <div className="text-xs text-[var(--color-muted)] space-y-1">
              {acc.transfer_method && (
                <div className="flex gap-2">
                  <span className="shrink-0 w-14 text-[var(--color-muted-light)]">转账方式</span>
                  <span>{acc.transfer_method === 'ukey' ? 'U盾+手机银行' : acc.transfer_method === 'mobile' ? 'U盾+网上银行' : acc.transfer_method === 'counter' ? '银行柜台临柜' : acc.transfer_method}</span>
                </div>
              )}
              {acc.daily_limit != null && acc.daily_limit > 0 && (
                <div className="flex gap-2">
                  <span className="shrink-0 w-14 text-[var(--color-muted-light)]">单日限额</span>
                  <span>¥{acc.daily_limit.toLocaleString('zh-CN')}</span>
                </div>
              )}
              {acc.per_transfer_limit != null && acc.per_transfer_limit > 0 && (
                <div className="flex gap-2">
                  <span className="shrink-0 w-14 text-[var(--color-muted-light)]">单笔限额</span>
                  <span>¥{acc.per_transfer_limit.toLocaleString('zh-CN')}</span>
                </div>
              )}
              {acc.transfer_hours && (
                <div className="flex gap-2">
                  <span className="shrink-0 w-14 text-[var(--color-muted-light)]">操作时段</span>
                  <span>{acc.transfer_hours}</span>
                </div>
              )}
              {acc.transfer_notes && (
                <div className="flex gap-2">
                  <span className="shrink-0 w-14 text-[var(--color-muted-light)]">备注</span>
                  <span>{acc.transfer_notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
