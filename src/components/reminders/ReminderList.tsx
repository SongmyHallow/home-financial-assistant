'use client';
import { useState, useEffect } from 'react';
import type { Reminder } from '@/lib/types';
import ReminderForm from './ReminderForm';
import TemplatePicker from './TemplatePicker';

export default function ReminderList({ prefill }: { prefill?: Record<string, string> }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showTemplate, setShowTemplate] = useState(false);
  const [editing, setEditing] = useState<Partial<Reminder> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReminders(); }, [prefill]);

  async function fetchReminders() {
    const res = await fetch('/api/reminders');
    const data = await res.json();
    if (Array.isArray(data)) setReminders(data);
    setLoading(false);
  }

  async function handleSave(data: Partial<Reminder>) {
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch('/api/reminders', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditing(null);
      setShowTemplate(false);
      fetchReminders();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此提醒？')) return;
    await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
    fetchReminders();
  }

  async function handleComplete(id: string) {
    await fetch('/api/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: '已完成' }),
    });
    fetchReminders();
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayReminders = reminders.filter(r => r.status === '待执行' && r.trigger_time.slice(0, 10) === today);
  const futureReminders = reminders.filter(r => r.status === '待执行' && r.trigger_time.slice(0, 10) > today);
  const doneReminders = reminders.filter(r => r.status !== '待执行');

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔔 提醒管理</h2>
        <button onClick={() => setShowTemplate(!showTemplate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">＋ 新建</button>
      </div>

      {showTemplate && !prefill && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">选择提醒类型：</p>
          <TemplatePicker onSelect={(type) => {
            setEditing({ template_type: type });
            setShowTemplate(false);
          }} />
        </div>
      )}

      {editing && (
        <div className="mb-4">
          <ReminderForm
            editing={editing}
            prefill={prefill}
            onSave={async (data) => { await handleSave(data); }}
            onCancel={() => { setEditing(null); }}
          />
        </div>
      )}

      {!editing && !showTemplate && (
        <>
          <section className="mb-6">
            <h3 className="font-semibold text-red-500 mb-2">🔴 今天待执行 ({todayReminders.length})</h3>
            {todayReminders.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无</p>
            ) : todayReminders.map(r => (
              <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditing} />
            ))}
          </section>

          <section className="mb-6">
            <h3 className="font-semibold text-gray-600 mb-2">⏳ 未来 ({futureReminders.length})</h3>
            {futureReminders.map(r => (
              <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditing} />
            ))}
          </section>

          {doneReminders.length > 0 && (
            <details>
              <summary className="font-semibold text-gray-400 cursor-pointer mb-2">✅ 已完成 ({doneReminders.length})</summary>
              {doneReminders.map(r => (
                <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditing} />
              ))}
            </details>
          )}
        </>
      )}
    </div>
  );
}

function ReminderRow({ reminder, onComplete, onDelete, onEdit }: {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (r: Reminder) => void;
}) {
  const triggerDate = new Date(reminder.trigger_time);
  const icon = { '申购': '🏦', '卖出': '💰', '转账': '💳', '积分': '🎁', '检查': '📊', '自定义': '📝' }[reminder.template_type];

  return (
    <div className={`flex items-center justify-between py-2 px-3 my-1 rounded-lg ${
      reminder.status !== '待执行' ? 'bg-gray-100 opacity-50' : 'bg-white border'
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span>{icon}</span>
        <div className="truncate">
          <p className="font-medium text-sm truncate">{reminder.title}</p>
          <p className="text-xs text-gray-500">
            {triggerDate.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {reminder.repeat_type !== '一次' && ` · ${reminder.repeat_type}`}
          </p>
        </div>
      </div>
      {reminder.status === '待执行' && (
        <div className="flex gap-1 ml-2 shrink-0">
          <button onClick={() => onComplete(reminder.id)} className="text-green-600 text-xs">完成</button>
          <button onClick={() => onEdit(reminder)} className="text-blue-600 text-xs">编辑</button>
          <button onClick={() => onDelete(reminder.id)} className="text-gray-400 text-xs">删</button>
        </div>
      )}
    </div>
  );
}
