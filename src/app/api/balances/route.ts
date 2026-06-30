import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  if (!month) return NextResponse.json({ error: '缺少 month 参数' }, { status: 400 });

  const supabase = createServiceClient();
  // 计算月末最后一天
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_balances')
    .select('*, account:account_id(*)')
    .gte('date', `${month}-01`)
    .lte('date', lastDay)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('daily_balances')
    .upsert(
      {
        account_id: body.account_id,
        date: body.date,
        balance: body.balance,
        is_manual: body.is_manual ?? true,
        note: body.note ?? '',
      },
      { onConflict: 'account_id,date' }
    )
    .select('*, account:account_id(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('daily_balances')
    .update({ note: body.note ?? '' })
    .eq('id', body.id)
    .select('*, account:account_id(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
