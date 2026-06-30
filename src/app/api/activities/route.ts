import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const supabase = createServiceClient();

  let query = supabase
    .from('activities')
    .select('*, account:account_id(*)')
    .order('created_at', { ascending: true });

  if (month) {
    query = query.eq('month', month);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('activities')
    .insert({
      account_id: body.account_id,
      month: body.month,
      base_daily_avg: body.base_daily_avg,
      target_daily_avg: body.target_daily_avg ?? null,
      signup_deadline: body.signup_deadline || null,
      start_date: body.start_date,
      end_date: body.end_date,
      pass_condition: body.pass_condition || '日均',
      reward: body.reward,
      note: body.note || '',
    })
    .select('*, account:account_id(*)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('activities')
    .update({
      account_id: body.account_id,
      month: body.month,
      base_daily_avg: body.base_daily_avg,
      target_daily_avg: body.target_daily_avg ?? null,
      signup_deadline: body.signup_deadline || null,
      start_date: body.start_date,
      end_date: body.end_date,
      pass_condition: body.pass_condition || '日均',
      reward: body.reward,
      note: body.note || '',
    })
    .eq('id', body.id)
    .select('*, account:account_id(*)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
