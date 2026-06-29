import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  const category = searchParams.get('category');
  const accountId = searchParams.get('account_id');

  const supabase = createServiceClient();
  let query = supabase
    .from('transactions')
    .select('*, from_account:from_account_id(*), to_account:to_account_id(*)')
    .order('date', { ascending: false });

  if (month) {
    // 计算当月开始和下月开始日期
    const [year, mon] = month.split('-').map(Number);
    const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
    const nextYear = mon === 12 ? year + 1 : year;
    const nextMon = mon === 12 ? 1 : mon + 1;
    const endDate = `${nextYear}-${String(nextMon).padStart(2, '0')}-01`;
    query = query.gte('date', startDate).lt('date', endDate);
  }
  if (category) query = query.eq('category', category);
  if (accountId) query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      date: body.date,
      from_account_id: body.from_account_id,
      to_account_id: body.to_account_id || null,
      to_label: body.to_label || null,
      amount: body.amount,
      category: body.category,
      note: body.note || '',
    })
    .select('*, from_account:from_account_id(*), to_account:to_account_id(*)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('transactions')
    .update({
      date: body.date,
      from_account_id: body.from_account_id,
      to_account_id: body.to_account_id || null,
      to_label: body.to_label || null,
      amount: body.amount,
      category: body.category,
      note: body.note || '',
    })
    .eq('id', body.id)
    .select('*, from_account:from_account_id(*), to_account:to_account_id(*)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
