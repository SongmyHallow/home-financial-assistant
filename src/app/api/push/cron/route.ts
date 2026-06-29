import { NextRequest, NextResponse } from 'next/server';
import { getPendingReminders, markPushed, sendPushPlus, handleRecurringReminder } from '@/lib/push';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reminders = await getPendingReminders();
  if (reminders.length === 0) {
    return NextResponse.json({ pushed: 0 });
  }

  const pushed: string[] = [];
  for (const r of reminders) {
    // 发送微信推送
    const sent = await sendPushPlus(
      `⏰ ${r.title}`,
      `<p>${r.description || r.title}</p><p>时间: ${new Date(r.trigger_time).toLocaleString('zh-CN')}</p>`
    );
    if (sent) pushed.push(r.id);
  }

  if (pushed.length > 0) {
    await markPushed(pushed);
  }

  return NextResponse.json({ pushed: pushed.length, ids: pushed });
}
