'use server';
import { cookies } from 'next/headers';

const AUTH_COOKIE = 'hfa_auth';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30天

export async function login(code: string): Promise<boolean> {
  const validCode = process.env.ACCESS_CODE;
  if (!validCode) throw new Error('ACCESS_CODE not configured');
  if (code !== validCode) return false;

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(AUTH_COOKIE);
}
