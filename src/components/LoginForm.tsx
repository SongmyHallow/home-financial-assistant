'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard/ipo');
      } else {
        setError('访问码错误');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-1">
          <span className="text-2xl">🏠</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
          家庭金融助手
        </h1>
        <p className="text-sm text-[var(--color-muted)]">打新 · 提醒 · 记账</p>
      </div>

      <div className="w-72 flex flex-col gap-3">
        <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
          访问码
        </label>
        <input
          type="password"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="输入访问码以进入"
          className="w-full text-center text-lg tracking-[0.3em]"
          autoFocus
        />
        {error && (
          <p className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-light)] px-3 py-2 rounded-lg text-center">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !code}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
                     text-white font-medium py-2.5 rounded-xl
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
        >
          {loading ? '验证中…' : '进入'}
        </button>
      </div>
    </form>
  );
}
