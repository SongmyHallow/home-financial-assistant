import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name: body.name,
      type: body.type,
      note: body.note || '',
      currency: body.currency || 'CNY',
      transfer_method: body.transfer_method || null,
      daily_limit: body.daily_limit ?? null,
      per_transfer_limit: body.per_transfer_limit ?? null,
      transfer_hours: body.transfer_hours || null,
      transfer_notes: body.transfer_notes || null,
      is_brokerage: body.is_brokerage ?? false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: body.name,
      type: body.type,
      note: body.note || '',
      currency: body.currency || 'CNY',
      transfer_method: body.transfer_method || null,
      daily_limit: body.daily_limit ?? null,
      per_transfer_limit: body.per_transfer_limit ?? null,
      transfer_hours: body.transfer_hours || null,
      transfer_notes: body.transfer_notes || null,
      is_brokerage: body.is_brokerage ?? false,
    })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
