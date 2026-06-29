import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market');
  const status = searchParams.get('status') || '进行中';

  const supabase = createServiceClient();
  let query = supabase
    .from('ipo_listings')
    .select('*')
    .order('subscription_deadline', { ascending: true });

  if (market) query = query.eq('market', market);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
