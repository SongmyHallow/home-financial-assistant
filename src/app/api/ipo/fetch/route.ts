import { NextRequest, NextResponse } from 'next/server';

function checkAuth(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

async function doFetch() {
  try {
    const { fetchAllIpos } = await import('@/lib/ipo-fetcher');
    const count = await fetchAllIpos();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('IPO fetch failed:', error);
    return NextResponse.json({ error: 'Fetch failed', detail: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Vercel Cron 用 GET
  const authErr = checkAuth(request);
  if (authErr) return authErr;
  return doFetch();
}

export async function POST(request: NextRequest) {
  // 手动触发用 POST
  const authErr = checkAuth(request);
  if (authErr) return authErr;
  return doFetch();
}
