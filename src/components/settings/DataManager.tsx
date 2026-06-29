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
        alert('文件格式错误');
      }
    };
    input.click();
  }

  async function handleClear() {
    if (!confirm('⚠️ 此操作将清空所有数据，不可恢复！确定继续？')) return;
    if (!confirm('再次确认：输入 "DELETE" 后点确定')) return;
    const res = await fetch('/api/export?action=clear', { method: 'DELETE' });
    if (res.ok) alert('所有数据已清空');
    else alert('清空失败');
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">数据管理</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleExport('json')} disabled={exporting}
          className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">导出 JSON</button>
        <button onClick={() => handleExport('csv')} disabled={exporting}
          className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">导出 CSV</button>
        <button onClick={handleImport}
          className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">导入数据</button>
      </div>
      <button onClick={handleClear}
        className="mt-3 border border-red-300 text-red-500 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50">
        清空所有数据
      </button>
    </div>
  );
}
