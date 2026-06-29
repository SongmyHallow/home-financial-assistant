import { NextRequest, NextResponse } from 'next/server';
import { login, logout } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const success = await login(code);
  if (!success) {
    return NextResponse.json({ success: false, error: '无效访问码' }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await logout();
  return NextResponse.json({ success: true });
}
