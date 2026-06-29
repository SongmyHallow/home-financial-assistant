import { createServiceClient } from './supabase';

export async function getPendingReminders() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const oneMinAgo = new Date(Date.now() - 60000).toISOString();
  const oneMinLater = new Date(Date.now() + 60000).toISOString();

  // 查询今天时间 ±1 分钟内的待执行提醒（含每日/每周重复）
  const { data: exactTime, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', '待执行')
    .eq('pushed', false)
    .gte('trigger_time', oneMinAgo)
    .lte('trigger_time', oneMinLater);

  if (error) {
    console.error('Push query error:', error);
    return [];
  }
  return exactTime || [];
}

export async function markPushed(ids: string[]) {
  const supabase = createServiceClient();
  await supabase.from('reminders').update({ pushed: true }).in('id', ids);
}

export async function sendPushPlus(title: string, content: string) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch('http://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title,
        content,
        template: 'html',
      }),
    });
    const data = await res.json();
    return data.code === 200;
  } catch {
    return false;
  }
}

// 处理重复提醒：执行后自动生成下一次
export async function handleRecurringReminder(reminder: { id: string; repeat_type: string; repeat_day: number | null; trigger_time: string }) {
  const supabase = createServiceClient();

  // 先标记当前为已完成
  await supabase.from('reminders').update({ status: '已完成', pushed: true }).eq('id', reminder.id);

  // 如果是重复提醒，创建下一次实例
  if (reminder.repeat_type === '每日') {
    const next = new Date(reminder.trigger_time);
    next.setDate(next.getDate() + 1);
    await supabase.from('reminders').insert({
      template_type: '自定义',
      title: (await supabase.from('reminders').select('title').eq('id', reminder.id).single()).data?.title || '',
      description: '',
      trigger_time: next.toISOString(),
      repeat_type: '每日',
    });
  }
}
