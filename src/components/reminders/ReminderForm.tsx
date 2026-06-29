'use client';
import { useState, useEffect } from 'react';
import type { TemplateType, RepeatType, Reminder } from '@/lib/types';

interface Props {
  editing: Partial<Reminder> | null;
  onSave: (data: Partial<Reminder>) => void;
  onCancel: () => void;
  prefill?: { template?: string; title?: string; desc?: string; deadline?: string };
}

export default function ReminderForm({ editing, onSave, onCancel, prefill }: Props) {
  const [templateType, setTemplateType] = useState<TemplateType>('自定义');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggerDate, setTriggerDate] = useState('');
  const [triggerTime, setTriggerTime] = useState('09:00');
  const [repeatType, setRepeatType] = useState<RepeatType>('一次');
  const [repeatDay, setRepeatDay] = useState(1);

  useEffect(() => {
    if (prefill) {
      if (prefill.template) setTemplateType(prefill.template as TemplateType);
      if (prefill.title) setTitle(prefill.title);
      if (prefill.desc) setDescription(prefill.desc);
      if (prefill.deadline) {
        const d = new Date(prefill.deadline);
        setTriggerDate(d.toISOString().slice(0, 10));
        setTriggerTime(d.toTimeString().slice(0, 5));
      }
    } else if (editing) {
      if (editing.template_type) setTemplateType(editing.template_type);
      if (editing.title) setTitle(editing.title);
      if (editing.description) setDescription(editing.description);
      if (editing.trigger_time) {
        const d = new Date(editing.trigger_time);
        setTriggerDate(d.toISOString().slice(0, 10));
        setTriggerTime(d.toTimeString().slice(0, 5));
      }
      if (editing.repeat_type) setRepeatType(editing.repeat_type);
      if (editing.repeat_day) setRepeatDay(editing.repeat_day);
    }
  }, [editing, prefill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !triggerDate) return;
    onSave({
      id: editing?.id,
      template_type: templateType,
      title,
      description,
      trigger_time: `${triggerDate}T${triggerTime}:00`,
      repeat_type: repeatType,
      repeat_day: repeatType === '每周' ? repeatDay : null,
      status: '待执行',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-4 bg-white space-y-3">
      <h3 className="font-semibold">{editing?.id ? '编辑提醒' : '新建提醒'}</h3>

      <div>
        <label className="text-sm text-gray-500">类型</label>
        <select value={templateType} onChange={e => setTemplateType(e.target.value as TemplateType)}
          className="w-full border rounded px-3 py-2">
          {['申购','卖出','转账','积分','检查','自定义'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-500">标题 *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="如：申购XX科技" className="w-full border rounded px-3 py-2" required />
      </div>

      <div>
        <label className="text-sm text-gray-500">描述</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="补充信息" className="w-full border rounded px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500">日期 *</label>
          <input type="date" value={triggerDate} onChange={e => setTriggerDate(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm text-gray-500">时间</label>
          <input type="time" value={triggerTime} onChange={e => setTriggerTime(e.target.value)}
            className="w-full border rounded px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-500">重复</label>
        <select value={repeatType} onChange={e => setRepeatType(e.target.value as RepeatType)}
          className="w-full border rounded px-3 py-2">
          <option value="一次">仅一次</option>
          <option value="每日">每日重复</option>
          <option value="每周">每周重复</option>
        </select>
      </div>

      {repeatType === '每周' && (
        <div>
          <label className="text-sm text-gray-500">星期几</label>
          <select value={repeatDay} onChange={e => setRepeatDay(Number(e.target.value))}
            className="w-full border rounded px-3 py-2">
            {['日','一','二','三','四','五','六'].map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">保存</button>
        <button type="button" onClick={onCancel} className="border px-4 py-2 rounded-lg">取消</button>
      </div>
    </form>
  );
}
