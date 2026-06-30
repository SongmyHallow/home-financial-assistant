import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!month && !year) return NextResponse.json({ error: '缺少 month 或 year 参数' }, { status: 400 });

  const supabase = createServiceClient();

  let startDate: string, endDate: string;
  if (year) {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  } else {
    const [y, m] = month!.split('-').map(Number);
    startDate = `${month}-01`;
    endDate = new Date(y, m, 0).toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from('daily_balances')
    .select('*, account:account_id(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { account_id, date, balance } = body;
  if (!account_id || !date || balance === undefined || balance === null) {
    return NextResponse.json({ error: '缺少必填字段: account_id, date, balance' }, { status: 400 });
  }
  if (typeof balance !== 'number' || isNaN(balance)) {
    return NextResponse.json({ error: 'balance 必须为数字' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('daily_balances')
    .upsert(
      {
        account_id,
        date,
        balance,
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

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from('daily_balances').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
