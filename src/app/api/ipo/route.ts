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

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.company_name || !body.subscription_code) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ipo_listings')
    .insert({
      market: body.market || '港股',
      company_name: body.company_name,
      subscription_code: body.subscription_code,
      price_low: body.price_low || null,
      price_high: body.price_high || null,
      lot_size: body.lot_size || 100,
      lot_amount: body.lot_amount || null,
      subscription_deadline: body.subscription_deadline || null,
      expected_listing_date: body.expected_listing_date || null,
      status: body.status || '进行中',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
