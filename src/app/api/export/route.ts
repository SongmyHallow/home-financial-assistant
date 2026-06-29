import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const supabase = createServiceClient();

  const [accounts, reminders, transactions, ipos] = await Promise.all([
    supabase.from('accounts').select('*'),
    supabase.from('reminders').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('ipo_listings').select('*'),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    accounts: accounts.data || [],
    reminders: reminders.data || [],
    transactions: transactions.data || [],
    ipo_listings: ipos.data || [],
  };

  if (format === 'csv') {
    // 仅导出流水为 CSV
    const rows = ['日期,从,到,金额,类别,备注'];
    for (const t of (transactions.data || [])) {
      rows.push([t.date, t.from_account_id, t.to_account_id || t.to_label, t.amount, t.category, t.note].join(','));
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="hfa-transactions.csv"',
      },
    });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();

  if (body.accounts) await supabase.from('accounts').upsert(body.accounts);
  if (body.reminders) await supabase.from('reminders').upsert(body.reminders);
  if (body.transactions) await supabase.from('transactions').upsert(body.transactions);
  if (body.ipo_listings) await supabase.from('ipo_listings').upsert(body.ipo_listings);

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = createServiceClient();
  await Promise.all([
    supabase.from('watched_ipos').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('ipo_listings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('reminders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ]);
  return NextResponse.json({ success: true });
}
