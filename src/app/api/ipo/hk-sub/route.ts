import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/ipo/hk-sub?ipo_id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ipo_id = searchParams.get('ipo_id');

  const supabase = createServiceClient();
  let query = supabase
    .from('hk_subscriptions')
    .select('*');

  if (ipo_id) query = query.eq('ipo_id', ipo_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/ipo/hk-sub — upsert { ipo_id, subscribed }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ipo_id, subscribed } = body;
  if (!ipo_id) {
    return NextResponse.json({ error: '缺少 ipo_id' }, { status: 400 });
  }

  const supabase = createServiceClient();
  // 先查是否已存在
  const { data: existing } = await supabase
    .from('hk_subscriptions')
    .select('id')
    .eq('ipo_id', ipo_id)
    .maybeSingle();

  let result;
  if (existing?.id) {
    const { data, error } = await supabase
      .from('hk_subscriptions')
      .update({ subscribed: !!subscribed })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from('hk_subscriptions')
      .insert({ ipo_id, subscribed: !!subscribed, note: '' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json(result, { status: 201 });
}
