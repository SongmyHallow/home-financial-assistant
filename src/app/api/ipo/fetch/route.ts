import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 });
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { fetchAllIpos } = await import('@/lib/ipo-fetcher');
    const count = await fetchAllIpos();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('IPO fetch failed:', error);
    return NextResponse.json({ error: 'Fetch failed', detail: String(error) }, { status: 500 });
  }
}
