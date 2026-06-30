import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/ipo/allocations?ipo_id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ipo_id = searchParams.get('ipo_id');
  if (!ipo_id) {
    return NextResponse.json({ error: '缺少 ipo_id' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ipo_allocations')
    .select('*, account:accounts(id,name,type)')
    .eq('ipo_id', ipo_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/ipo/allocations — upsert { ipo_id, account_id, amount }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ipo_id, account_id, amount } = body;
  if (!ipo_id || !account_id) {
    return NextResponse.json({ error: '缺少 ipo_id 或 account_id' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ipo_allocations')
    .upsert(
      { ipo_id, account_id, amount: Number(amount) ?? 0 },
      { onConflict: 'ipo_id,account_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/ipo/allocations?id=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from('ipo_allocations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
