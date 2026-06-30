'use client';
import { useState, useEffect } from 'react';
import type { Activity } from '@/lib/types';
import ActivityForm from './ActivityForm';

// 返回当前月份，格式 YYYY-MM
function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    fetchActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function fetchActivities() {
    setLoading(true);
    const res = await fetch(`/api/activities?month=${month}`);
    const data = await res.json();
    setActivities(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleSave(formData: Partial<Activity>) {
    const isEdit = !!formData.id;
    const res = await fetch('/api/activities', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingActivity(null);
      fetchActivities();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此活动？')) return;
    await fetch(`/api/activities?id=${id}`, { method: 'DELETE' });
    fetchActivities();
  }

  function handleEdit(activity: Activity) {
    setEditingActivity(activity);
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingActivity(null);
  }

  function handleAddNew() {
    setEditingActivity(null);
    setShowForm(true);
  }

  return (
    <div>
      <h3 className="font-semibold mb-3">活动管理</h3>

      {/* 月份选择器 */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-[var(--color-muted)]">月份：</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        />
      </div>

      {/* 活动列表 */}
      {loading ? (
        <p className="text-[var(--color-muted-light)]">加载中...</p>
      ) : activities.length === 0 ? (
        <p className="text-[var(--color-muted-light)] text-sm mb-4">暂无活动记录</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {activities.map(act => (
            <li key={act.id} className="flex items-start justify-between bg-[var(--color-background)] rounded-lg px-3 py-2">
              <div>
                <span className="font-medium">{act.account?.name || '未知账户'}</span>
                <span className="text-xs text-[var(--color-muted)] ml-2">{act.pass_condition}</span>
                <div className="text-xs text-[var(--color-muted-light)] mt-0.5 flex flex-wrap gap-2">
                  {act.target_daily_avg != null && (
                    <span>目标日均：{act.target_daily_avg.toLocaleString()}元</span>
                  )}
                  <span>基准日均：{act.base_daily_avg.toLocaleString()}元</span>
                  <span className="text-green-600 font-medium">奖励：{act.reward.toLocaleString()}元</span>
                  <span>{act.start_date} ~ {act.end_date}</span>
                  {act.note && <span className="text-[var(--color-muted-light)]">· {act.note}</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <button
                  onClick={() => handleEdit(act)}
                  className="text-[var(--color-accent)] text-sm"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(act.id)}
                  className="text-[var(--color-danger)] text-sm"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 表单 / 添加按钮 */}
      {showForm ? (
        <ActivityForm
          activity={editingActivity ?? undefined}
          onSave={handleSave}
          onCancel={handleCancelForm}
        />
      ) : (
        <button
          onClick={handleAddNew}
          className="text-[var(--color-accent)] border border-blue-300 rounded-lg px-4 py-2 text-sm"
        >
          ＋ 添加活动
        </button>
      )}
    </div>
  );
}
