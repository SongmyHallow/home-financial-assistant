import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const supabase = createServiceClient();
  let query = supabase.from('reminders').select('*').order('trigger_time', { ascending: true });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('reminders').insert({
    template_type: body.template_type,
    title: body.title,
    description: body.description || '',
    trigger_time: body.trigger_time,
    repeat_type: body.repeat_type || '一次',
    repeat_day: body.repeat_day || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('reminders').update({
    title: body.title,
    description: body.description,
    trigger_time: body.trigger_time,
    repeat_type: body.repeat_type,
    repeat_day: body.repeat_day,
    status: body.status,
  }).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  await supabase.from('reminders').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
