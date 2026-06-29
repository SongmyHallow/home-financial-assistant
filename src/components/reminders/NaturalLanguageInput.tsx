'use client';
import { useState } from 'react';
import type { ParsedReminder, Reminder } from '@/lib/types';

export default function NaturalLanguageInput({ onCreate }: { onCreate: (data: Partial<Reminder>) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedReminder | null>(null);
  const [error, setError] = useState('');

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reminders/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || '解析失败，请重试');
      } else {
        setResult(data);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!result) return;
    onCreate({
      template_type: result.template_type,
      title: result.title,
      description: result.description,
      trigger_time: result.trigger_time,
      repeat_type: '一次',
    });
    setText('');
    setResult(null);
  }

  return (
    <div className="mb-4">
      {!result ? (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleParse()}
              placeholder="如：明天上午10:00用招行尾号7321给李四转8000"
              className="flex-1 border rounded-lg px-3 py-2"
              autoFocus
            />
            <button onClick={handleParse} disabled={loading || !text.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
              {loading ? '解析中...' : '解析'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      ) : (
        <div className="border rounded-xl p-4 bg-blue-50">
          <p className="text-sm text-blue-700 mb-1">📋 解析结果（{(result.confidence * 100).toFixed(0)}% 置信度）</p>
          <div className="grid grid-cols-2 gap-1 text-sm mb-3">
            <div><span className="text-gray-500">标题:</span> {result.title}</div>
            <div><span className="text-gray-500">类型:</span> {result.template_type}</div>
            <div className="col-span-2"><span className="text-gray-500">时间:</span> {new Date(result.trigger_time).toLocaleString('zh-CN')}</div>
            {result.description !== result.title && (
              <div className="col-span-2"><span className="text-gray-500">描述:</span> {result.description}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleConfirm} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">确认创建</button>
            <button onClick={() => setResult(null)} className="border px-4 py-2 rounded-lg text-sm">修改</button>
          </div>
        </div>
      )}
    </div>
  );
}
