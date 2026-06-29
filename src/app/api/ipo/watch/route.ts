import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('watched_ipos')
    .select('ipo_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map((w: { ipo_id: string }) => w.ipo_id));
}

export async function POST(request: NextRequest) {
  const { ipo_id } = await request.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from('watched_ipos').insert({ ipo_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { ipo_id } = await request.json();
  if (!ipo_id || typeof ipo_id !== 'string') {
    return NextResponse.json({ error: '缺少有效的 ipo_id' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { error } = await supabase.from('watched_ipos').delete().eq('ipo_id', ipo_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
