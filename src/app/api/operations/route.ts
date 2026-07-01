import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const supabase = createServiceClient();
  let query = supabase.from('operations').select('*').order('start_date', { ascending: true });
  if (month) query = query.eq('month', month);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('operations').insert({
    month: body.month,
    start_date: body.start_date,
    end_date: body.end_date,
    source: body.source,
    operation_type: body.operation_type,
    amount: body.amount,
    daily_rate: body.daily_rate || null,
    profit: body.profit || null,
    days: body.days || 1,
    total_profit: body.total_profit || 0,
    note: body.note || '',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('operations').update({
    start_date: body.start_date, end_date: body.end_date,
    source: body.source, operation_type: body.operation_type,
    amount: body.amount, daily_rate: body.daily_rate || null,
    profit: body.profit || null, days: body.days || 1,
    total_profit: body.total_profit || 0, note: body.note || '',
  }).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  await supabase.from('operations').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
