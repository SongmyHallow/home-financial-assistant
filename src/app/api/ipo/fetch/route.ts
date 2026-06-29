import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 防止外部未授权调用
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fetchAllIpos } = await import('@/lib/ipo-fetcher');
  const count = await fetchAllIpos();
  return NextResponse.json({ success: true, count });
}
