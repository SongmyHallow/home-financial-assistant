import { NextResponse } from 'next/server';
import { sendPushPlus } from '@/lib/push';

export async function GET() {
  // 检查 PushPlus Token 是否已配置
  const configured = !!process.env.PUSHPLUS_TOKEN;
  return NextResponse.json({ configured });
}

export async function POST() {
  const success = await sendPushPlus(
    '🧪 测试推送',
    '<p>家庭金融助手推送测试，如果你收到此消息说明配置成功！</p>'
  );
  return NextResponse.json({ success });
}
