'use client';
import { useState } from 'react';

export default function DataManager() {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: 'json' | 'csv') {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hfa-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('导出失败');
    }
    setExporting(false);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) alert('导入成功');
        else alert('导入失败');
      } catch {
        alert('文件格式错误，仅支持之前导出的 JSON 文件');
      }
    };
    input.click();
  }

  async function handleClear() {
    if (!confirm('⚠️ 此操作将清空所有数据，不可恢复！确定继续？')) return;
    const res = await fetch('/api/export?action=clear', { method: 'DELETE' });
    if (res.ok) alert('所有数据已清空');
    else alert('清空失败');
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">数据管理</h3>

      <div className="space-y-3 text-sm">
        {/* 导出 JSON */}
        <div className="flex items-center justify-between bg-[var(--color-background)] rounded-xl p-3">
          <div>
            <p className="font-medium text-[13px]">导出 JSON</p>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
              导出全部数据（账户 · 活动 · 台账余额 · IPO · 操作记录），JSON 格式，可用于备份或迁移
            </p>
          </div>
          <button onClick={() => handleExport('json')} disabled={exporting}
            className="shrink-0 border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs hover:bg-[var(--color-surface-hover)]">
            {exporting ? '导出中...' : '导出'}
          </button>
        </div>

        {/* 导出 CSV */}
        <div className="flex items-center justify-between bg-[var(--color-background)] rounded-xl p-3">
          <div>
            <p className="font-medium text-[13px]">导出 CSV</p>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
              导出台账余额数据为 CSV 格式，包含日期、账户、金额、备注等字段，可用 Excel 打开
            </p>
          </div>
          <button onClick={() => handleExport('csv')} disabled={exporting}
            className="shrink-0 border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs hover:bg-[var(--color-surface-hover)]">
            {exporting ? '导出中...' : '导出'}
          </button>
        </div>

        {/* 导入 */}
        <div className="flex items-center justify-between bg-[var(--color-background)] rounded-xl p-3">
          <div>
            <p className="font-medium text-[13px]">导入数据</p>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
              导入之前导出的 JSON 备份文件，支持 upsert（已有记录更新，无记录新增）。<br />
              仅接受本系统导出的 JSON 格式文件
            </p>
          </div>
          <button onClick={handleImport}
            className="shrink-0 border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs hover:bg-[var(--color-surface-hover)]">
            选择文件
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-border-light)]">
        <button onClick={handleClear}
          className="border border-red-300 text-[var(--color-danger)] px-3 py-1.5 rounded-lg text-xs hover:bg-red-50">
          清空所有数据
        </button>
        <p className="text-[11px] text-[var(--color-muted-light)] mt-1">
          删除账户、活动、台账余额、IPO、操作记录等全部数据。操作不可恢复。
        </p>
      </div>
    </div>
  );
}
