import { NextRequest, NextResponse } from 'next/server';
import { parseNaturalLanguage } from '@/lib/nl-parser';

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: '输入为空' }, { status: 400 });
  }
  try {
    const result = await parseNaturalLanguage(text.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error('NL parse error:', error);
    return NextResponse.json({ error: '解析失败，请重试' }, { status: 500 });
  }
}
