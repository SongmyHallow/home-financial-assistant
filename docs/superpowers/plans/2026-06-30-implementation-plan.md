# 家庭金融助手 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Next.js 14 PWA 全栈应用，实现 IPO 信息面板、操作提醒管理、流水台账、设置四模块，部署至 Vercel + Supabase。

**Architecture:** Next.js 14 App Router 全栈应用，PostgreSQL 数据库（Supabase），Vercel Cron Jobs 定时抓取 IPO 和推送提醒，PWA 支持双端使用。四模块共享统一的 App Shell（底部 Tab 导航），各模块通过 API Route + 自定义 hooks 独立运作。

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL), ECharts, OpenAI API (NL 解析), Vercel Cron, PWA (next-pwa / serwist)

## Global Constraints

- 双端使用：响应式布局 + PWA 通知，不开发原生 App
- 登录方式：访问码（ACCESS_CODE 环境变量），Cookie 持久化
- 部署平台：Vercel 免费层
- 数据库：Supabase PostgreSQL 免费层（500MB）
- 不接入真实银行/券商 API
- 数据可手动录入、编辑、删除
- 推送双通道：浏览器 Notification API + PushPlus 微信推送
- 零费用运维（所有服务使用免费层）

---

### Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/supabase.ts`, `src/lib/types.ts`, `.env.local.example`

**Interfaces:**
- Produces: `src/lib/supabase.ts` exports `supabase` client instance; `src/lib/types.ts` exports all shared TS interfaces

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd E:\songmuyi\Project\home-financial-assistant
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

- [ ] **Step 2: 安装额外依赖**

```bash
npm install @supabase/supabase-js @supabase/ssr echarts echarts-for-react date-fns openai
```

- [ ] **Step 3: 创建 .env.local.example**

```
ACCESS_CODE=your-secret-code
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
PUSHPLUS_TOKEN=xxxxx
OPENAI_API_KEY=sk-xxxxx
CRON_SECRET=your-cron-secret
```

- [ ] **Step 4: 创建类型定义 `src/lib/types.ts`**

```typescript
// ===== 账户 =====
export interface Account {
  id: string;
  name: string;
  type: '储蓄卡' | '券商' | '信用卡';
  note: string;
  created_at: string;
}

// ===== 提醒 =====
export type TemplateType = '申购' | '卖出' | '转账' | '积分' | '检查' | '自定义';
export type RepeatType = '一次' | '每日' | '每周';
export type ReminderStatus = '待执行' | '已完成' | '已过期';

export interface Reminder {
  id: string;
  template_type: TemplateType;
  title: string;
  description: string;
  trigger_time: string;
  repeat_type: RepeatType;
  repeat_day: number | null;
  status: ReminderStatus;
  created_at: string;
}

// ===== 流水 =====
export type TransactionCategory = '打新' | '转账入金' | '新股收益' | '消费' | '利息/分红' | '其他';

export interface Transaction {
  id: string;
  date: string;
  from_account_id: string;
  to_account_id: string | null;
  to_label: string | null;
  amount: number;
  category: TransactionCategory;
  note: string | null;
  created_at: string;
  // JOIN fields
  from_account?: Account;
  to_account?: Account | null;
}

// ===== IPO =====
export type IpoMarket = '北交所' | '港股';
export type IpoStatus = '进行中' | '已截止' | '已上市';

export interface IpoListing {
  id: string;
  market: IpoMarket;
  company_name: string;
  subscription_code: string;
  price_low: number;
  price_high: number;
  lot_size: number;
  lot_amount: number;
  sponsor: string;
  industry: string;
  subscription_deadline: string;
  expected_listing_date: string;
  status: IpoStatus;
  created_at: string;
}

export interface WatchedIpo {
  id: string;
  ipo_id: string;
  created_at: string;
}

// ===== NL 解析 =====
export interface ParsedReminder {
  title: string;
  description: string;
  trigger_time: string;
  template_type: TemplateType;
  confidence: number;
}
```

- [ ] **Step 5: 创建 Supabase 客户端 `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端用 service_role key 的客户端（仅 API Routes 用）
export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};
```

- [ ] **Step 6: 验证项目能跑**

```bash
npm run dev
```

浏览器打开 `http://localhost:3000`，确认 Next.js 欢迎页显示。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase client and types"
```

---

### Task 2: 数据库 Schema 与迁移

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: 五张 PostgreSQL 表 `accounts`, `reminders`, `transactions`, `ipo_listings`, `watched_ipos`

- [ ] **Step 1: 编写迁移 SQL**

```sql
-- 账户表
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('储蓄卡', '券商', '信用卡')),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 提醒表
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN ('申购', '卖出', '转账', '积分', '检查', '自定义')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_time TIMESTAMPTZ NOT NULL,
  repeat_type TEXT NOT NULL DEFAULT '一次' CHECK (repeat_type IN ('一次', '每日', '每周')),
  repeat_day INT,
  status TEXT NOT NULL DEFAULT '待执行' CHECK (status IN ('待执行', '已完成', '已过期')),
  pushed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_trigger ON reminders (trigger_time) WHERE status = '待执行';
CREATE INDEX idx_reminders_status ON reminders (status);

-- 流水表
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_label TEXT,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('打新', '转账入金', '新股收益', '消费', '利息/分红', '其他')),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_to CHECK (to_account_id IS NOT NULL OR to_label IS NOT NULL)
);

CREATE INDEX idx_transactions_date ON transactions (date);
CREATE INDEX idx_transactions_from ON transactions (from_account_id);
CREATE INDEX idx_transactions_category ON transactions (category);

-- IPO 新股表
CREATE TABLE ipo_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL CHECK (market IN ('北交所', '港股')),
  company_name TEXT NOT NULL,
  subscription_code TEXT NOT NULL,
  price_low DECIMAL(10,2),
  price_high DECIMAL(10,2),
  lot_size INT,
  lot_amount DECIMAL(12,2),
  sponsor TEXT,
  industry TEXT,
  subscription_deadline TIMESTAMPTZ,
  expected_listing_date DATE,
  status TEXT NOT NULL DEFAULT '进行中' CHECK (status IN ('进行中', '已截止', '已上市')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ipo_market ON ipo_listings (market);
CREATE INDEX idx_ipo_status ON ipo_listings (status);

-- IPO 关注表
CREATE TABLE watched_ipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipo_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ipo_id)
);
```

- [ ] **Step 2: 在 Supabase SQL Editor 中执行迁移**

去 Supabase Dashboard → SQL Editor → 粘贴执行。

- [ ] **Step 3: 验证**

在 Supabase Table Editor 中确认五张表均已创建，check 约束生效。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add database schema migration"
```

---

### Task 3: 认证系统（访问码登录）

**Files:**
- Create: `src/app/login/page.tsx`, `src/components/LoginForm.tsx`, `src/lib/auth.ts`, `src/middleware.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `supabase` from Task 1
- Produces: `src/lib/auth.ts` exports `isAuthenticated()`, `login()`, `logout()`; `src/middleware.ts` protects routes; `LoginForm` component

- [ ] **Step 1: 创建 auth 工具 `src/lib/auth.ts`**

```typescript
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
```

- [ ] **Step 2: 创建中间件 `src/middleware.ts`**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authed = request.cookies.has('hfa_auth');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (isApiRoute) return NextResponse.next();

  if (!authed && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (authed && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard/ipo', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|manifest.json|sw.js|icons).*)'],
};
```

- [ ] **Step 3: 创建登录表单 `src/components/LoginForm.tsx`**

```typescript
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
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">🏠 家庭金融助手</h1>
      <input
        type="password"
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="请输入访问码"
        className="border rounded-lg px-4 py-2 text-lg w-64 text-center"
        autoFocus
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || !code}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? '验证中...' : '进入'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: 创建登录页 `src/app/login/page.tsx`**

```typescript
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 5: 创建 Auth API `src/app/api/auth/route.ts`**

```typescript
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
```

- [ ] **Step 6: 修改首页重定向 `src/app/page.tsx`**

```typescript
import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default async function Home() {
  const authed = await isAuthenticated();
  redirect(authed ? '/dashboard/ipo' : '/login');
}
```

- [ ] **Step 7: 验证**

```bash
npm run dev
```
访问 `localhost:3000` → 被重定向到 `/login` → 输入正确访问码 → 进入 `/dashboard/ipo`（此时页面还不存在，但路由正常）。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: add access code authentication with middleware"
```

---

### Task 4: App Shell 与导航

**Files:**
- Create: `src/components/Layout.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/ipo/page.tsx`, `src/app/dashboard/reminders/page.tsx`, `src/app/dashboard/ledger/page.tsx`, `src/app/dashboard/settings/page.tsx`, `src/app/layout.tsx` (overwrite)

**Interfaces:**
- Consumes: auth middleware from Task 3
- Produces: Tab navigation shell wrapping all four module pages

- [ ] **Step 1: 创建 App Shell 布局组件 `src/components/Layout.tsx`**

```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { path: '/dashboard/ipo', label: 'IPO', icon: '🏦' },
  { path: '/dashboard/reminders', label: '提醒', icon: '🔔' },
  { path: '/dashboard/ledger', label: '流水', icon: '📒' },
  { path: '/dashboard/settings', label: '设置', icon: '⚙' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">🏠 金融助手</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-lg mx-auto flex justify-around">
          {tabs.map(tab => (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center py-2 px-3 text-xs ${
                pathname.startsWith(tab.path)
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: 创建 Dashboard 路由布局 `src/app/dashboard/layout.tsx`**

```typescript
import Layout from '@/components/Layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}
```

- [ ] **Step 3: 创建四个占位页面**

`src/app/dashboard/ipo/page.tsx`:
```typescript
export default function IpoPage() {
  return <div><h2 className="text-xl font-bold mb-4">🏦 IPO 新股</h2><p className="text-gray-500">加载中...</p></div>;
}
```

`src/app/dashboard/reminders/page.tsx`:
```typescript
export default function RemindersPage() {
  return <div><h2 className="text-xl font-bold mb-4">🔔 提醒管理</h2><p className="text-gray-500">加载中...</p></div>;
}
```

`src/app/dashboard/ledger/page.tsx`:
```typescript
export default function LedgerPage() {
  return <div><h2 className="text-xl font-bold mb-4">📒 流水台账</h2><p className="text-gray-500">加载中...</p></div>;
}
```

`src/app/dashboard/settings/page.tsx`:
```typescript
export default function SettingsPage() {
  return <div><h2 className="text-xl font-bold mb-4">⚙ 设置</h2><p className="text-gray-500">加载中...</p></div>;
}
```

- [ ] **Step 4: 更新根布局 `src/app/layout.tsx`**（覆盖脚手架默认的）

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '家庭金融助手',
  description: '打新 · 提醒 · 记账',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: 验证**

打开 `/dashboard/ipo` → 底部四个 Tab 可点击切换，高亮状态正常。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add app shell with bottom tab navigation"
```

---

### Task 5: 账户管理 CRUD

**Files:**
- Create: `src/app/api/accounts/route.ts`, `src/components/settings/AccountManager.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `supabase` from Task 1, `Account` type from Task 1
- Produces: REST API `GET/POST/PUT/DELETE /api/accounts`, `AccountManager` component

- [ ] **Step 1: 创建 Accounts API `src/app/api/accounts/route.ts`**

```typescript
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
    .insert({ name: body.name, type: body.type, note: body.note || '' })
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
    .update({ name: body.name, type: body.type, note: body.note || '' })
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
```

- [ ] **Step 2: 创建 AccountManager 组件 `src/components/settings/AccountManager.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Account } from '@/lib/types';

const ACCOUNT_TYPES = ['储蓄卡', '券商', '信用卡'] as const;

export default function AccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!editing?.name || !editing?.type) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/accounts' + (method === 'PUT' ? '' : ''), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      setEditing(null);
      fetchAccounts();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此账户？关联的流水记录不会删除。')) return;
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    fetchAccounts();
  }

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <h3 className="font-semibold mb-2">账户管理</h3>
      <ul className="space-y-2 mb-4">
        {accounts.map(acc => (
          <li key={acc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <div>
              <span className="font-medium">{acc.name}</span>
              <span className="text-xs text-gray-500 ml-2">{acc.type}</span>
              {acc.note && <span className="text-xs text-gray-400 ml-1">· {acc.note}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(acc)} className="text-blue-600 text-sm">编辑</button>
              <button onClick={() => handleDelete(acc.id)} className="text-red-500 text-sm">删除</button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="border rounded-lg p-4 bg-white">
          <h4 className="font-medium mb-3">{editing.id ? '编辑账户' : '添加账户'}</h4>
          <input
            type="text" placeholder="名称（如 招行 7321）" value={editing.name || ''}
            onChange={e => setEditing({ ...editing, name: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <select
            value={editing.type || ''}
            onChange={e => setEditing({ ...editing, type: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-2"
          >
            <option value="">选择类型</option>
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text" placeholder="备注（如 工资卡）" value={editing.note || ''}
            onChange={e => setEditing({ ...editing, note: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-3"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg">保存</button>
            <button onClick={() => setEditing(null)} className="border px-4 py-2 rounded-lg">取消</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing({ name: '', type: '', note: '' })}
          className="text-blue-600 border border-blue-300 rounded-lg px-4 py-2 text-sm"
        >
          ＋ 添加账户
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 更新设置页 `src/app/dashboard/settings/page.tsx`**

```typescript
import AccountManager from '@/components/settings/AccountManager';

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">⚙ 设置</h2>
      <section className="mb-6">
        <AccountManager />
      </section>
      {/* 后续 Task 加入推送设置和数据管理 */}
    </div>
  );
}
```

- [ ] **Step 4: 验证**

进入设置页 → 添加"招行 7321"→ 出现在列表中 → 编辑 → 删除 → 确认全流程正常。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add account CRUD with settings page integration"
```

---

### Task 6: IPO 信息面板

**Files:**
- Create: `src/lib/ipo-fetcher.ts`, `src/app/api/ipo/route.ts`, `src/app/api/ipo/fetch/route.ts`, `src/app/api/ipo/watch/route.ts`, `src/components/ipo/IpoCard.tsx`, `src/components/ipo/IpoList.tsx`
- Modify: `src/app/dashboard/ipo/page.tsx`

**Interfaces:**
- Consumes: `supabase` from Task 1, `IpoListing` from Task 1
- Produces: REST API for IPO CRUD and fetch trigger; IpoCard and IpoList components; IPO 面板页

- [ ] **Step 1: 创建 IPO 抓取器 `src/lib/ipo-fetcher.ts`**

```typescript
import { createServiceClient } from './supabase';

// 北交所新股申购公告页（示例 URL，实际以可用数据源为准）
async function fetchBeijingIpos(): Promise<Partial<IpoListing>[]> {
  // 基于公开页面抓取，返回结构统一的数组
  // TODO：连接真实数据源后替换占位实现
  return [];
}

// 港股新股（示例：捷利交易宝公开页面）
async function fetchHKIpos(): Promise<Partial<IpoListing>[]> {
  // TODO：连接真实数据源后替换占位实现
  return [];
}

export async function fetchAllIpos() {
  const supabase = createServiceClient();

  const beijing = await fetchBeijingIpos();
  const hk = await fetchHKIpos();
  const all = [...beijing, ...hk];

  for (const ipo of all) {
    // Upsert by subscription_code to avoid duplicates
    const { error } = await supabase
      .from('ipo_listings')
      .upsert(
        {
          market: ipo.market!,
          company_name: ipo.company_name!,
          subscription_code: ipo.subscription_code!,
          price_low: ipo.price_low,
          price_high: ipo.price_high,
          lot_size: ipo.lot_size,
          lot_amount: ipo.lot_amount,
          sponsor: ipo.sponsor,
          industry: ipo.industry,
          subscription_deadline: ipo.subscription_deadline,
          expected_listing_date: ipo.expected_listing_date,
          status: '进行中',
        },
        { onConflict: 'subscription_code' }
      );
    if (error) console.error('IPO upsert error:', error);
  }

  // 标记已过截止日期的为"已截止"
  await supabase
    .from('ipo_listings')
    .update({ status: '已截止' })
    .eq('status', '进行中')
    .lt('subscription_deadline', new Date().toISOString());

  return all.length;
}
```

- [ ] **Step 2: 创建 IPO API `src/app/api/ipo/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market');
  const status = searchParams.get('status') || '进行中';

  const supabase = createServiceClient();
  let query = supabase.from('ipo_listings').select('*').order('subscription_deadline', { ascending: true });

  if (market) query = query.eq('market', market);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: 创建 IPO 抓取触发 API `src/app/api/ipo/fetch/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 防止外部调用
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fetchAllIpos } = await import('@/lib/ipo-fetcher');
  const count = await fetchAllIpos();
  return NextResponse.json({ success: true, count });
}
```

- [ ] **Step 4: 创建 IPO 关注 API `src/app/api/ipo/watch/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('watched_ipos')
    .select('ipo_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(w => w.ipo_id));
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
  const supabase = createServiceClient();
  const { error } = await supabase.from('watched_ipos').delete().eq('ipo_id', ipo_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: 创建 IpoCard 组件 `src/components/ipo/IpoCard.tsx`**

```typescript
'use client';
import type { IpoListing } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function IpoCard({ ipo, watched, onToggleWatch }: {
  ipo: IpoListing;
  watched: boolean;
  onToggleWatch: (id: string) => void;
}) {
  const router = useRouter();
  const deadline = new Date(ipo.subscription_deadline);
  const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

  function createReminder() {
    const params = new URLSearchParams({
      template: '申购',
      title: `申购${ipo.company_name}`,
      desc: `代码 ${ipo.subscription_code}，一手 ¥${ipo.lot_amount?.toLocaleString()}`,
      deadline: ipo.subscription_deadline,
    });
    router.push(`/dashboard/reminders?${params.toString()}`);
  }

  return (
    <div className={`border rounded-xl p-4 bg-white ${isUrgent ? 'border-orange-300' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{ipo.market}</span>
          <h3 className="font-bold text-lg mt-1">{ipo.company_name}</h3>
          <p className="text-sm text-gray-500">{ipo.subscription_code}</p>
        </div>
        {isUrgent && <span className="text-xs text-orange-500 font-medium">⏰ 即将截止</span>}
      </div>

      <div className="grid grid-cols-2 gap-y-1 text-sm my-3">
        <div><span className="text-gray-500">发行价:</span> ¥{ipo.price_low} - ¥{ipo.price_high}</div>
        <div><span className="text-gray-500">一手:</span> ¥{ipo.lot_amount?.toLocaleString()} ({ipo.lot_size}股)</div>
        <div><span className="text-gray-500">保荐人:</span> {ipo.sponsor || '-'}</div>
        <div><span className="text-gray-500">行业:</span> {ipo.industry || '-'}</div>
        <div className="col-span-2">
          <span className="text-gray-500">申购截止:</span> {deadline.toLocaleString('zh-CN')}
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">预计上市:</span> {ipo.expected_listing_date || '-'}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={createReminder} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
          🏦 创建申购提醒
        </button>
        <button onClick={() => onToggleWatch(ipo.id)} className="px-3 py-2 border rounded-lg text-sm">
          {watched ? '⭐' : '☆'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 创建 IpoList 并更新 IPO 页面**

`src/components/ipo/IpoList.tsx`:
```typescript
'use client';
import { useState, useEffect } from 'react';
import type { IpoListing } from '@/lib/types';
import IpoCard from './IpoCard';

export default function IpoList() {
  const [ipos, setIpos] = useState<IpoListing[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [market, setMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchIpos(); fetchWatched(); }, [market]);

  async function fetchIpos() {
    const params = market !== 'all' ? `?market=${market}` : '';
    const res = await fetch('/api/ipo' + params);
    const data = await res.json();
    if (Array.isArray(data)) setIpos(data);
    setLoading(false);
  }

  async function fetchWatched() {
    const res = await fetch('/api/ipo/watch');
    const data = await res.json();
    if (Array.isArray(data)) setWatched(data);
  }

  async function toggleWatch(ipoId: string) {
    const method = watched.includes(ipoId) ? 'DELETE' : 'POST';
    await fetch('/api/ipo/watch', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipo_id: ipoId }),
    });
    fetchWatched();
  }

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', '北交所', '港股'].map(m => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-3 py-1 rounded-full text-sm ${market === m ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {m === 'all' ? '全部' : m}
          </button>
        ))}
      </div>

      {ipos.length === 0 ? (
        <p className="text-gray-400 text-center py-8">今日暂无新股申购</p>
      ) : (
        <div className="space-y-4">
          {ipos.map(ipo => (
            <IpoCard key={ipo.id} ipo={ipo} watched={watched.includes(ipo.id)} onToggleWatch={toggleWatch} />
          ))}
        </div>
      )}
    </div>
  );
}
```

更新 `src/app/dashboard/ipo/page.tsx`:
```typescript
import IpoList from '@/components/ipo/IpoList';

export default function IpoPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🏦 IPO 新股</h2>
      <IpoList />
    </div>
  );
}
```

- [ ] **Step 7: 验证**

访问 IPO Tab → 看到新股列表（或"暂无"占位）→ 筛选器切换 → 关注星标切换。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: add IPO panel with listing cards and watchlist"
```

---

### Task 7: 提醒管理 — 模板创建

**Files:**
- Create: `src/app/api/reminders/route.ts`, `src/components/reminders/ReminderList.tsx`, `src/components/reminders/TemplatePicker.tsx`, `src/components/reminders/ReminderForm.tsx`
- Modify: `src/app/dashboard/reminders/page.tsx`

**Interfaces:**
- Consumes: `Reminder` type from Task 1, `accounts` data from Task 5 API
- Produces: Reminder CRUD API, TemplatePicker, ReminderForm, ReminderList; 提醒管理页

- [ ] **Step 1: 创建 Reminders API `src/app/api/reminders/route.ts`**

```typescript
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
```

- [ ] **Step 2: 创建 TemplatePicker 组件 `src/components/reminders/TemplatePicker.tsx`**

```typescript
'use client';
import type { TemplateType } from '@/lib/types';

const TEMPLATES: { type: TemplateType; icon: string; label: string }[] = [
  { type: '申购', icon: '🏦', label: '申购' },
  { type: '卖出', icon: '💰', label: '卖出' },
  { type: '转账', icon: '💳', label: '转账' },
  { type: '积分', icon: '🎁', label: '积分' },
  { type: '检查', icon: '📊', label: '检查' },
  { type: '自定义', icon: '📝', label: '自定义' },
];

export default function TemplatePicker({ onSelect }: { onSelect: (type: TemplateType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATES.map(t => (
        <button
          key={t.type}
          onClick={() => onSelect(t.type)}
          className="flex flex-col items-center p-4 border rounded-xl hover:border-blue-400 transition-colors bg-white"
        >
          <span className="text-2xl mb-1">{t.icon}</span>
          <span className="text-sm font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ReminderForm 组件 `src/components/reminders/ReminderForm.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { TemplateType, RepeatType, Reminder } from '@/lib/types';

interface Props {
  editing: Partial<Reminder> | null;
  onSave: (data: Partial<Reminder>) => void;
  onCancel: () => void;
  prefill?: { template?: string; title?: string; desc?: string; deadline?: string };
}

export default function ReminderForm({ editing, onSave, onCancel, prefill }: Props) {
  const [templateType, setTemplateType] = useState<TemplateType>('自定义');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggerDate, setTriggerDate] = useState('');
  const [triggerTime, setTriggerTime] = useState('09:00');
  const [repeatType, setRepeatType] = useState<RepeatType>('一次');
  const [repeatDay, setRepeatDay] = useState(1);

  useEffect(() => {
    if (prefill) {
      if (prefill.template) setTemplateType(prefill.template as TemplateType);
      if (prefill.title) setTitle(prefill.title);
      if (prefill.desc) setDescription(prefill.desc);
      if (prefill.deadline) {
        const d = new Date(prefill.deadline);
        setTriggerDate(d.toISOString().slice(0, 10));
        setTriggerTime(d.toTimeString().slice(0, 5));
      }
    } else if (editing) {
      if (editing.template_type) setTemplateType(editing.template_type);
      if (editing.title) setTitle(editing.title);
      if (editing.description) setDescription(editing.description);
      if (editing.trigger_time) {
        const d = new Date(editing.trigger_time);
        setTriggerDate(d.toISOString().slice(0, 10));
        setTriggerTime(d.toTimeString().slice(0, 5));
      }
      if (editing.repeat_type) setRepeatType(editing.repeat_type);
      if (editing.repeat_day) setRepeatDay(editing.repeat_day);
    }
  }, [editing, prefill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !triggerDate) return;
    onSave({
      id: editing?.id,
      template_type: templateType,
      title,
      description,
      trigger_time: `${triggerDate}T${triggerTime}:00`,
      repeat_type: repeatType,
      repeat_day: repeatType === '每周' ? repeatDay : null,
      status: '待执行',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-4 bg-white space-y-3">
      <h3 className="font-semibold">{editing?.id ? '编辑提醒' : '新建提醒'}</h3>

      <div>
        <label className="text-sm text-gray-500">类型</label>
        <select value={templateType} onChange={e => setTemplateType(e.target.value as TemplateType)}
          className="w-full border rounded px-3 py-2">
          {['申购','卖出','转账','积分','检查','自定义'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-500">标题 *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="如：申购XX科技" className="w-full border rounded px-3 py-2" required />
      </div>

      <div>
        <label className="text-sm text-gray-500">描述</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="补充信息" className="w-full border rounded px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500">日期 *</label>
          <input type="date" value={triggerDate} onChange={e => setTriggerDate(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm text-gray-500">时间</label>
          <input type="time" value={triggerTime} onChange={e => setTriggerTime(e.target.value)}
            className="w-full border rounded px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-500">重复</label>
        <select value={repeatType} onChange={e => setRepeatType(e.target.value as RepeatType)}
          className="w-full border rounded px-3 py-2">
          <option value="一次">仅一次</option>
          <option value="每日">每日重复</option>
          <option value="每周">每周重复</option>
        </select>
      </div>

      {repeatType === '每周' && (
        <div>
          <label className="text-sm text-gray-500">星期几</label>
          <select value={repeatDay} onChange={e => setRepeatDay(Number(e.target.value))}
            className="w-full border rounded px-3 py-2">
            {['日','一','二','三','四','五','六'].map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">保存</button>
        <button type="button" onClick={onCancel} className="border px-4 py-2 rounded-lg">取消</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: 创建 ReminderList 组件 `src/components/reminders/ReminderList.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Reminder } from '@/lib/types';
import ReminderForm from './ReminderForm';
import TemplatePicker from './TemplatePicker';

export default function ReminderList({ prefill }: { prefill?: Record<string, string> }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showTemplate, setShowTemplate] = useState(false);
  const [editing, setEditing] = useState<Partial<Reminder> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReminders(); }, [prefill]);

  async function fetchReminders() {
    const res = await fetch('/api/reminders');
    const data = await res.json();
    if (Array.isArray(data)) setReminders(data);
    setLoading(false);
  }

  async function handleSave(data: Partial<Reminder>) {
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch('/api/reminders', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditing(null);
      setShowTemplate(false);
      fetchReminders();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此提醒？')) return;
    await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
    fetchReminders();
  }

  async function handleComplete(id: string) {
    await fetch('/api/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: '已完成' }),
    });
    fetchReminders();
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayReminders = reminders.filter(r => r.status === '待执行' && r.trigger_time.slice(0, 10) === today);
  const futureReminders = reminders.filter(r => r.status === '待执行' && r.trigger_time.slice(0, 10) > today);
  const doneReminders = reminders.filter(r => r.status !== '待执行');

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔔 提醒管理</h2>
        <button onClick={() => setShowTemplate(!showTemplate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">＋ 新建</button>
      </div>

      {showTemplate && !prefill && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">选择提醒类型：</p>
          <TemplatePicker onSelect={(type) => {
            setEditing({ template_type: type });
            setShowTemplate(false);
          }} />
        </div>
      )}

      {editing && (
        <div className="mb-4">
          <ReminderForm
            editing={editing}
            prefill={prefill}
            onSave={async (data) => { await handleSave(data); }}
            onCancel={() => { setEditing(null); }}
          />
        </div>
      )}

      {!editing && !showTemplate && (
        <>
          <section className="mb-6">
            <h3 className="font-semibold text-red-500 mb-2">🔴 今天待执行 ({todayReminders.length})</h3>
            {todayReminders.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无</p>
            ) : todayReminders.map(r => (
              <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditing} />
            ))}
          </section>

          <section className="mb-6">
            <h3 className="font-semibold text-gray-600 mb-2">⏳ 未来 ({futureReminders.length})</h3>
            {futureReminders.map(r => (
              <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditing} />
            ))}
          </section>

          {doneReminders.length > 0 && (
            <details>
              <summary className="font-semibold text-gray-400 cursor-pointer mb-2">✅ 已完成 ({doneReminders.length})</summary>
              {doneReminders.map(r => (
                <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditing} />
              ))}
            </details>
          )}
        </>
      )}
    </div>
  );
}

function ReminderRow({ reminder, onComplete, onDelete, onEdit }: {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (r: Reminder) => void;
}) {
  const triggerDate = new Date(reminder.trigger_time);
  const icon = { '申购': '🏦', '卖出': '💰', '转账': '💳', '积分': '🎁', '检查': '📊', '自定义': '📝' }[reminder.template_type];

  return (
    <div className={`flex items-center justify-between py-2 px-3 my-1 rounded-lg ${
      reminder.status !== '待执行' ? 'bg-gray-100 opacity-50' : 'bg-white border'
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span>{icon}</span>
        <div className="truncate">
          <p className="font-medium text-sm truncate">{reminder.title}</p>
          <p className="text-xs text-gray-500">
            {triggerDate.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {reminder.repeat_type !== '一次' && ` · ${reminder.repeat_type}`}
          </p>
        </div>
      </div>
      {reminder.status === '待执行' && (
        <div className="flex gap-1 ml-2 shrink-0">
          <button onClick={() => onComplete(reminder.id)} className="text-green-600 text-xs">完成</button>
          <button onClick={() => onEdit(reminder)} className="text-blue-600 text-xs">编辑</button>
          <button onClick={() => onDelete(reminder.id)} className="text-gray-400 text-xs">删</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 更新提醒页面 `src/app/dashboard/reminders/page.tsx`**

```typescript
'use client';
import { useSearchParams } from 'next/navigation';
import ReminderList from '@/components/reminders/ReminderList';
import { Suspense } from 'react';

function ReminderContent() {
  const searchParams = useSearchParams();
  const prefill: Record<string, string> = {};
  searchParams.forEach((value, key) => { prefill[key] = value; });
  return <ReminderList prefill={Object.keys(prefill).length > 0 ? prefill : undefined} />;
}

export default function RemindersPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">加载中...</p>}>
      <ReminderContent />
    </Suspense>
  );
}
```

- [ ] **Step 6: 验证**

提醒页面 → 新建提醒 → 选择模板 → 填写表单 → 保存 → 出现在列表中 → 编辑/删除/标记完成 → 从 IPO 页面"创建申购提醒"跳转过来预填。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: add reminder management with template creation and IPO prefill"
```

---

### Task 8: 提醒管理 — 自然语言解析

**Files:**
- Create: `src/lib/nl-parser.ts`, `src/app/api/reminders/parse/route.ts`, `src/components/reminders/NaturalLanguageInput.tsx`
- Modify: `src/components/reminders/ReminderList.tsx`

**Interfaces:**
- Consumes: OpenAI API, `ParsedReminder` type from Task 1
- Produces: NL parsing endpoint and input component

- [ ] **Step 1: 创建 NL 解析器 `src/lib/nl-parser.ts`**

```typescript
import OpenAI from 'openai';
import type { ParsedReminder, TemplateType } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseNaturalLanguage(text: string): Promise<ParsedReminder> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const prompt = `你是一个金融操作解析器。将用户输入的自然语言提醒解析为结构化数据。

当前时间: ${now.toLocaleString('zh-CN')}
今天日期: ${today}

规则:
- title: 简短的动作描述（≤15字）
- description: 补充说明
- trigger_time: ISO 8601 格式，"明天上午10:00" 应转为具体日期
- template_type: 申购/卖出/转账/积分/检查/自定义
- confidence: 0-1 之间，解析的确定程度

用户输入: "${text}"

返回纯 JSON（不要 markdown 代码块）:
{"title":"...","description":"...","trigger_time":"...","template_type":"...","confidence":0.9}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  const raw = response.choices[0].message.content || '{}';
  try {
    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return {
      title: text.slice(0, 20),
      description: text,
      trigger_time: new Date().toISOString(),
      template_type: '自定义' as TemplateType,
      confidence: 0.3,
    };
  }
}
```

- [ ] **Step 2: 创建解析 API `src/app/api/reminders/parse/route.ts`**

```typescript
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
```

- [ ] **Step 3: 创建 NL 输入组件 `src/components/reminders/NaturalLanguageInput.tsx`**

```typescript
'use client';
import { useState } from 'react';
import type { ParsedReminder, Reminder } from '@/lib/types';

export default function NaturalLanguageInput({ onCreate }: { onCreate: (data: Partial<Reminder>) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedReminder | null>(null);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch('/api/reminders/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    });
    const data = await res.json();
    if (!data.error) setResult(data);
    setLoading(false);
  }

  function handleConfirm() {
    if (!result) return;
    onCreate({
      template_type: result.template_type,
      title: result.title,
      description: result.description,
      trigger_time: result.trigger_time,
      repeat_type: '一次',
    });
    setText('');
    setResult(null);
  }

  return (
    <div className="mb-4">
      {!result ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleParse()}
            placeholder="如：明天上午10:00用招行尾号7321给李四转8000"
            className="flex-1 border rounded-lg px-3 py-2"
            autoFocus
          />
          <button onClick={handleParse} disabled={loading || !text.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
            {loading ? '解析中...' : '解析'}
          </button>
        </div>
      ) : (
        <div className="border rounded-xl p-4 bg-blue-50">
          <p className="text-sm text-blue-700 mb-1">📋 解析结果（{(result.confidence * 100).toFixed(0)}% 置信度）</p>
          <div className="grid grid-cols-2 gap-1 text-sm mb-3">
            <div><span className="text-gray-500">标题:</span> {result.title}</div>
            <div><span className="text-gray-500">类型:</span> {result.template_type}</div>
            <div className="col-span-2"><span className="text-gray-500">时间:</span> {new Date(result.trigger_time).toLocaleString('zh-CN')}</div>
            {result.description !== result.title && (
              <div className="col-span-2"><span className="text-gray-500">描述:</span> {result.description}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleConfirm} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">确认创建</button>
            <button onClick={() => setResult(null)} className="border px-4 py-2 rounded-lg text-sm">修改</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 将 NL 输入集成到 ReminderList `src/components/reminders/ReminderList.tsx`**

在 `return` 中的 `{showTemplate ...}` 之前插入：

```typescript
{!showTemplate && !editing && (
  <NaturalLanguageInput onCreate={async (data) => {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) fetchReminders();
  }} />
)}
```

同时在文件顶部添加 import:
```typescript
import NaturalLanguageInput from './NaturalLanguageInput';
```

- [ ] **Step 5: 验证**

在提醒页输入"明天上午10:00用招行尾号7321给李四转8000" → 点解析 → 核对结构化结果 → 确认创建 → 出现在提醒列表中。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add natural language parsing for reminder creation"
```

---

### Task 9: 推送系统

**Files:**
- Create: `src/lib/push.ts`, `src/app/api/push/route.ts`, `src/app/api/push/cron/route.ts`
- Modify: `src/app/layout.tsx` (add push registration script)

**Interfaces:**
- Consumes: `Reminder` from Task 1, PushPlus Token from env
- Produces: Browser notification registration, PushPlus 推送，Cron 触发端点

- [ ] **Step 1: 创建推送工具 `src/lib/push.ts`**

```typescript
import { createServiceClient } from './supabase';

export async function getPendingReminders() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const oneMinAgo = new Date(Date.now() - 60000).toISOString();
  const oneMinLater = new Date(Date.now() + 60000).toISOString();

  // 查询今天时间 ±1 分钟内的待执行提醒（含每日/每周重复）
  const { data: exactTime, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', '待执行')
    .eq('pushed', false)
    .gte('trigger_time', oneMinAgo)
    .lte('trigger_time', oneMinLater);

  if (error) {
    console.error('Push query error:', error);
    return [];
  }
  return exactTime || [];
}

export async function markPushed(ids: string[]) {
  const supabase = createServiceClient();
  await supabase.from('reminders').update({ pushed: true }).in('id', ids);
}

export async function sendPushPlus(title: string, content: string) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch('http://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title,
        content,
        template: 'html',
      }),
    });
    const data = await res.json();
    return data.code === 200;
  } catch {
    return false;
  }
}

// 处理重复提醒：执行后自动生成下一次
export async function handleRecurringReminder(reminder: { id: string; repeat_type: string; repeat_day: number | null; trigger_time: string }) {
  const supabase = createServiceClient();

  // 先标记当前为已完成
  await supabase.from('reminders').update({ status: '已完成', pushed: true }).eq('id', reminder.id);

  // 如果是重复提醒，创建下一次实例
  if (reminder.repeat_type === '每日') {
    const next = new Date(reminder.trigger_time);
    next.setDate(next.getDate() + 1);
    await supabase.from('reminders').insert({
      template_type: '自定义',
      title: (await supabase.from('reminders').select('title').eq('id', reminder.id).single()).data?.title || '',
      description: '',
      trigger_time: next.toISOString(),
      repeat_type: '每日',
    });
  }
}
```

- [ ] **Step 2: 创建 Cron 端点 `src/app/api/push/cron/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPendingReminders, markPushed, sendPushPlus, handleRecurringReminder } from '@/lib/push';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reminders = await getPendingReminders();
  if (reminders.length === 0) {
    return NextResponse.json({ pushed: 0 });
  }

  const pushed: string[] = [];
  for (const r of reminders) {
    // 发送微信推送
    const sent = await sendPushPlus(
      `⏰ ${r.title}`,
      `<p>${r.description || r.title}</p><p>时间: ${new Date(r.trigger_time).toLocaleString('zh-CN')}</p>`
    );
    if (sent) pushed.push(r.id);
  }

  if (pushed.length > 0) {
    await markPushed(pushed);
  }

  return NextResponse.json({ pushed: pushed.length, ids: pushed });
}
```

- [ ] **Step 3: 在根布局中注册 Service Worker（PWA 通知）**

在 `src/app/layout.tsx` 中添加脚本：

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator && 'Notification' in window) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add push notification system with PushPlus and cron endpoint"
```

---

### Task 10: 流水台账 CRUD

**Files:**
- Create: `src/app/api/transactions/route.ts`, `src/components/ledger/TransactionList.tsx`, `src/components/ledger/TransactionForm.tsx`
- Modify: `src/app/dashboard/ledger/page.tsx`

**Interfaces:**
- Consumes: `Transaction`, `Account` types from Task 1; `accounts` API from Task 5
- Produces: Transactions REST API; TransactionList, TransactionForm; 流水台账页

- [ ] **Step 1: 创建 Transactions API `src/app/api/transactions/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  const category = searchParams.get('category');
  const accountId = searchParams.get('account_id');

  const supabase = createServiceClient();
  let query = supabase
    .from('transactions')
    .select('*, from_account:from_account_id(*), to_account:to_account_id(*)')
    .order('date', { ascending: false });

  if (month) {
    query = query.gte('date', `${month}-01`).lt('date', month === '12' ? '01-01' : `${parseInt(month.split('-')[0]) + 1}-${(parseInt(month.split('-')[1]) + 1).toString().padStart(2, '0')}-01`);
  }
  if (category) query = query.eq('category', category);
  if (accountId) query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('transactions').insert({
    date: body.date,
    from_account_id: body.from_account_id,
    to_account_id: body.to_account_id || null,
    to_label: body.to_label || null,
    amount: body.amount,
    category: body.category,
    note: body.note || '',
  }).select('*, from_account:from_account_id(*), to_account:to_account_id(*)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('transactions').update({
    date: body.date, from_account_id: body.from_account_id,
    to_account_id: body.to_account_id || null, to_label: body.to_label || null,
    amount: body.amount, category: body.category, note: body.note || '',
  }).eq('id', body.id).select('*, from_account:from_account_id(*), to_account:to_account_id(*)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = createServiceClient();
  await supabase.from('transactions').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: 创建 TransactionForm `src/components/ledger/TransactionForm.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Account, Transaction, TransactionCategory } from '@/lib/types';

const CATEGORIES: TransactionCategory[] = ['打新', '转账入金', '新股收益', '消费', '利息/分红', '其他'];

export default function TransactionForm({
  editing, accounts, onSave, onCancel, continueMode,
}: {
  editing: Partial<Transaction> | null;
  accounts: Account[];
  onSave: (data: Partial<Transaction>) => void;
  onCancel: () => void;
  continueMode?: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('打新');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editing) {
      if (editing.date) setDate(editing.date);
      if (editing.from_account_id) setFromId(editing.from_account_id);
      if (editing.to_account_id) setToId(editing.to_account_id);
      if (editing.to_label) setToLabel(editing.to_label);
      if (editing.amount) setAmount(editing.amount.toString());
      if (editing.category) setCategory(editing.category);
      if (editing.note) setNote(editing.note);
    }
  }, [editing]);

  function handleSubmit(e: React.FormEvent, continueAfter: boolean) {
    e.preventDefault();
    if (!fromId || !amount) return;
    onSave({
      id: editing?.id,
      date, from_account_id: fromId,
      to_account_id: toId || null,
      to_label: toLabel || (toId ? null : '外部'),
      amount: parseFloat(amount),
      category, note,
    });
    if (continueAfter) {
      setAmount('');
      setNote('');
    }
  }

  return (
    <form className="border rounded-xl p-4 bg-white space-y-3">
      <h3 className="font-semibold">{editing?.id ? '编辑流水' : '✏ 记一笔'}</h3>

      <div>
        <label className="text-sm text-gray-500">日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full border rounded px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500">从 *</label>
          <select value={fromId} onChange={e => setFromId(e.target.value)}
            className="w-full border rounded px-3 py-2" required>
            <option value="">选择账户</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500">到</label>
          {accounts.some(a => a.id !== fromId) ? (
            <select value={toId} onChange={e => { setToId(e.target.value); if (e.target.value) setToLabel(''); }}
              className="w-full border rounded px-3 py-2">
              <option value="">选择账户</option>
              {accounts.filter(a => a.id !== fromId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <input type="text" value={toLabel} onChange={e => setToLabel(e.target.value)}
              placeholder="自由输入" className="w-full border rounded px-3 py-2" />
          )}
          {!toId && (
            <input type="text" value={toLabel} onChange={e => setToLabel(e.target.value)}
              placeholder="收款方（可空）" className="w-full border rounded px-3 py-2 mt-1 text-sm" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500">金额 *</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="¥" className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm text-gray-500">类别</label>
          <select value={category} onChange={e => setCategory(e.target.value as TransactionCategory)}
            className="w-full border rounded px-3 py-2">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-500">备注</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="可选" className="w-full border rounded px-3 py-2" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={(e) => handleSubmit(e, false)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg">保存</button>
        {!editing?.id && (
          <button onClick={(e) => handleSubmit(e, true)}
            className="border border-blue-300 text-blue-600 px-3 py-2 rounded-lg text-sm">记录并继续</button>
        )}
        <button type="button" onClick={onCancel} className="border px-4 py-2 rounded-lg text-sm">取消</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: 创建 TransactionList `src/components/ledger/TransactionList.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Account, Transaction, TransactionCategory } from '@/lib/types';
import TransactionForm from './TransactionForm';

const CATEGORIES: TransactionCategory[] = ['打新', '转账入金', '新股收益', '消费', '利息/分红', '其他'];

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Partial<Transaction> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [catFilter, setCatFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => { fetchTransactions(); }, [monthFilter, catFilter]);

  async function fetchAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (Array.isArray(data)) setAccounts(data);
  }

  async function fetchTransactions() {
    const params = new URLSearchParams({ month: monthFilter });
    if (catFilter) params.set('category', catFilter);
    const res = await fetch('/api/transactions?' + params.toString());
    const data = await res.json();
    if (Array.isArray(data)) setTransactions(data);
    setLoading(false);
  }

  async function handleSave(data: Partial<Transaction>) {
    const method = data.id ? 'PUT' : 'POST';
    await fetch('/api/transactions', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditing(null);
    setShowForm(false);
    fetchTransactions();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此条流水？')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    fetchTransactions();
  }

  const totalIn = transactions.filter(t => t.category === '新股收益' || t.category === '利息/分红')
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => !['新股收益', '利息/分红'].includes(t.category))
    .reduce((s, t) => s + t.amount, 0);

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📒 流水台账</h2>
        <button onClick={() => { setEditing(null); setShowForm(!showForm); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">✏ 记一笔</button>
      </div>

      {showForm && (
        <div className="mb-4">
          <TransactionForm editing={editing} accounts={accounts} onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }} />
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm">
          <option value="">全部类别</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-white rounded-lg p-2 border">
          <p className="text-xs text-gray-500">本月流入</p>
          <p className="font-bold text-green-600">¥{totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border">
          <p className="text-xs text-gray-500">本月流出</p>
          <p className="font-bold text-red-600">¥{totalOut.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border">
          <p className="text-xs text-gray-500">净额</p>
          <p className={`font-bold ${totalIn - totalOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{(totalIn - totalOut).toLocaleString()}
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">暂无流水记录</p>
      ) : (
        <div className="space-y-1">
          {transactions.map(t => (
            <div key={t.id} className="bg-white rounded-lg px-3 py-2 border flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{t.date}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{t.category}</span>
                </div>
                <p className="text-sm truncate">
                  {t.from_account?.name || '?'} → {t.to_account?.name || t.to_label || '?'}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className={`font-medium ${['新股收益', '利息/分红'].includes(t.category) ? 'text-green-600' : 'text-red-600'}`}>
                  ¥{t.amount.toLocaleString()}
                </span>
                <button onClick={() => { setEditing(t); setShowForm(true); }} className="text-blue-600 text-xs">编辑</button>
                <button onClick={() => handleDelete(t.id)} className="text-gray-400 text-xs">删</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 更新流水页 `src/app/dashboard/ledger/page.tsx`**

```typescript
import TransactionList from '@/components/ledger/TransactionList';

export default function LedgerPage() {
  return <TransactionList />;
}
```

- [ ] **Step 5: 验证**

流水页 → 记一笔 → 填表保存 → 出现在列表中 → 编辑/删除 → 筛选月份和类别 → 月度汇总数字正确。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add transaction ledger with CRUD, filtering and monthly summary"
```

---

### Task 11: 流水图表看板

**Files:**
- Create: `src/components/ledger/Charts.tsx`
- Modify: `src/components/ledger/TransactionList.tsx`

**Interfaces:**
- Consumes: `Transaction` data from Task 10; `echarts-for-react`
- Produces: ECharts 图表组件

- [ ] **Step 1: 创建 Charts 组件 `src/components/ledger/Charts.tsx`**

```typescript
'use client';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { Transaction } from '@/lib/types';

export default function Charts({ transactions }: { transactions: Transaction[] }) {
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const waterFallData = useMemo(() => {
    const monthly = new Map<string, { in: number; out: number }>();
    transactions.forEach(t => {
      const month = t.date.slice(0, 7);
      const entry = monthly.get(month) || { in: 0, out: 0 };
      if (['新股收益', '利息/分红'].includes(t.category)) {
        entry.in += t.amount;
      } else {
        entry.out += t.amount;
      }
      monthly.set(month, entry);
    });
    return Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  const pieOption = {
    title: { text: '类别占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: pieData,
      label: { formatter: '{b}\n¥{c}' },
    }],
  };

  const waterFallOption = {
    title: { text: '月度流水', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: waterFallData.map(d => d[0]) },
    yAxis: { type: 'value' as const },
    series: [
      { name: '流入', type: 'bar', data: waterFallData.map(d => d[1].in), color: '#22c55e' },
      { name: '流出', type: 'bar', data: waterFallData.map(d => d[1].out), color: '#ef4444' },
    ],
  };

  return (
    <div className="space-y-4 mb-4">
      <details open className="bg-white rounded-xl p-4 border">
        <summary className="font-semibold cursor-pointer">📊 图表看板</summary>
        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <ReactECharts option={waterFallOption} style={{ height: 300 }} />
          <ReactECharts option={pieOption} style={{ height: 300 }} />
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: 集成到 TransactionList**

在 `TransactionList.tsx` 中导入 Charts，并在 return 中过滤器和流水列表之间插入：
```typescript
<Charts transactions={transactions} />
```

- [ ] **Step 3: 验证**

流水页 → 图表看板默认展开 → 月度瀑布图和分类饼图显示正确 → 改变筛选条件后图表联动。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add ECharts visualization for transaction ledger"
```

---

### Task 12: 设置页完善 + 数据管理

**Files:**
- Create: `src/components/settings/PushSettings.tsx`, `src/components/settings/DataManager.tsx`, `src/app/api/export/route.ts`
- Modify: `src/app/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: PushPlus Token from env; 所有表数据
- Produces: 推送设置、数据导入导出功能

- [ ] **Step 1: 创建 PushSettings 组件 `src/components/settings/PushSettings.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';

export default function PushSettings() {
  const [hasPushPlus, setHasPushPlus] = useState(false);
  const [notifyGranted, setNotifyGranted] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    setNotifyGranted(Notification.permission === 'granted');
  }, []);

  async function requestNotification() {
    const result = await Notification.requestPermission();
    setNotifyGranted(result === 'granted');
  }

  async function testBrowserNotify() {
    if (!notifyGranted) return;
    new Notification('✅ 测试通知', { body: '浏览器通知已正常推送！' });
  }

  async function testWechatPush() {
    setTestMsg('');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      setTestMsg(data.success ? '✅ 测试成功，请检查微信' : '❌ 推送失败，请检查 Token');
    } catch {
      setTestMsg('❌ 网络错误');
    }
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">推送设置</h3>

      <div className="space-y-3 bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">微信推送</p>
            <p className="text-xs text-gray-500">
              {hasPushPlus ? '已配置 PushPlus Token' : '需在环境变量中配置 PUSHPLUS_TOKEN'}
            </p>
          </div>
          <button onClick={testWechatPush} className="border px-3 py-1 rounded text-sm">测试</button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">浏览器通知</p>
            <p className="text-xs text-gray-500">
              {notifyGranted ? '✅ 已授权' : '⚠ 未授权'}
            </p>
          </div>
          {notifyGranted ? (
            <button onClick={testBrowserNotify} className="border px-3 py-1 rounded text-sm">测试</button>
          ) : (
            <button onClick={requestNotification} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">开启通知</button>
          )}
        </div>

        {testMsg && <p className="text-sm">{testMsg}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 DataManager `src/components/settings/DataManager.tsx`**

```typescript
'use client';
import { useState } from 'react';

export default function DataManager() {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: 'json' | 'csv') {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hfa-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败');
    }
    setExporting(false);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) alert('导入成功');
        else alert('导入失败');
      } catch {
        alert('文件格式错误');
      }
    };
    input.click();
  }

  async function handleClear() {
    if (!confirm('⚠️ 此操作将清空所有数据，不可恢复！确定继续？')) return;
    if (!confirm('再次确认：输入 "DELETE" 后点确定')) return;
    const res = await fetch('/api/export?action=clear', { method: 'DELETE' });
    if (res.ok) alert('所有数据已清空');
    else alert('清空失败');
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">数据管理</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleExport('json')} disabled={exporting}
          className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">导出 JSON</button>
        <button onClick={() => handleExport('csv')} disabled={exporting}
          className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">导出 CSV</button>
        <button onClick={handleImport}
          className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">导入数据</button>
      </div>
      <button onClick={handleClear}
        className="mt-3 border border-red-300 text-red-500 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50">
        清空所有数据
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 创建导出 API `src/app/api/export/route.ts`**

```typescript
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
    // 简化：仅导出流水为 CSV
    const rows = ['日期,从,到,金额,类别,备注'];
    for (const t of (transactions.data || [])) {
      rows.push([t.date, t.from_account_id, t.to_account_id || t.to_label, t.amount, t.category, t.note].join(','));
    }
    return new NextResponse(rows.join('\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment' },
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
```

- [ ] **Step 4: 创建设置页测试推送 API `src/app/api/push/test/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { sendPushPlus } from '@/lib/push';

export async function POST() {
  const success = await sendPushPlus('🧪 测试推送', '<p>家庭金融助手推送测试，如果你收到此消息说明配置成功！</p>');
  return NextResponse.json({ success });
}
```

- [ ] **Step 5: 更新设置页**

将 `src/app/dashboard/settings/page.tsx` 更新为：
```typescript
import AccountManager from '@/components/settings/AccountManager';
import PushSettings from '@/components/settings/PushSettings';
import DataManager from '@/components/settings/DataManager';

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">⚙ 设置</h2>
      <section className="mb-6">
        <AccountManager />
      </section>
      <section className="mb-6">
        <PushSettings />
      </section>
      <section className="mb-6">
        <DataManager />
      </section>
    </div>
  );
}
```

- [ ] **Step 6: 验证**

设置页 → 三个区块齐全 → 推送测试 → 数据导出下载 → 数据导入 → 清空功能正常。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: add push settings, data export/import, and clear functionality"
```

---

### Task 13: PWA 配置与最终 polish

**Files:**
- Create: `public/manifest.json`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: PWA manifest, Service Worker, 可安装到桌面，支持离线缓存

- [ ] **Step 1: 创建 `public/manifest.json`**

```json
{
  "name": "家庭金融助手",
  "short_name": "金融助手",
  "description": "打新 · 提醒 · 记账",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: 创建 `public/sw.js`**

```javascript
const CACHE_NAME = 'hfa-v1';
const urlsToCache = ['/', '/dashboard/ipo', '/dashboard/reminders', '/dashboard/ledger', '/dashboard/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: '提醒', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/dashboard/reminders'));
});
```

- [ ] **Step 3: 生成 PWA 图标**

```bash
# 使用 Node.js 生成简单的 SVG → PNG 转换（或直接用 Canvas）
# 创建快捷占位图标，用户可后续替换
```

简化的方法：在 `public/icons/` 下放两个纯色方块 PNG 即可先跑通。

- [ ] **Step 4: 更新根布局引用 manifest**

确认 `src/app/layout.tsx` 中已有：
```typescript
export const metadata: Metadata = {
  title: '家庭金融助手',
  description: '打新 · 提醒 · 记账',
  manifest: '/manifest.json',
};
```

- [ ] **Step 5: 添加响应式全局 CSS polish**

在 `src/app/globals.css` 末尾补充：
```css
/* 移动端适配 */
@media (max-width: 640px) {
  .hide-on-mobile { display: none !important; }
}

/* PWA standalone 模式顶部安全区 */
@media (display-mode: standalone) {
  body { padding-top: env(safe-area-inset-top); }
}
```

- [ ] **Step 6: 验证**

Chrome DevTools → Application → Manifest 检查 → Service Worker 注册成功 → Lighthouse PWA 检查通过 → 手机 Chrome 打开 → "添加到主屏幕" → 从桌面打开 → 独立窗口显示。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: add PWA manifest, service worker, and mobile polish"
```

---

### Task 14: Vercel 部署配置

**Files:**
- Create: `vercel.json`, `.env.local.example` (已是 Task 1)

**Interfaces:**
- Produces: Vercel 部署配置，Cron Jobs 定义

- [ ] **Step 1: 创建 `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/ipo/fetch",
      "schedule": "0 1 * * 1-5"
    },
    {
      "path": "/api/push/cron",
      "schedule": "* * * * *"
    }
  ]
}
```

> **注意**：Vercel 免费层 Cron 限制为最多 2 个 job，免费层 cron 实际最小间隔约 1 天。推送轮询改用外部触发（如 UptimeRobot 免费监控 pinging `/api/push/cron` 每分钟一次），或降级为页面加载时自动检查待推送提醒。

- [ ] **Step 2: 设置 Vercel 环境变量**

在 `.env.local.example` 中列出的六个变量全部填入 Vercel Dashboard → Settings → Environment Variables。

- [ ] **Step 3: 部署到 Vercel**

```bash
# 连接 GitHub 仓库后自动部署，或手动：
npx vercel --prod
```

- [ ] **Step 4: 验证生产环境**

通过 Vercel 分配的域名访问 → 登录 → 四模块可用 → IPO Cron 手动触发 → 推送 Cron 验证。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add Vercel deployment config with cron jobs"
```

---

## 附录：文件结构总览

```
home-financial-assistant/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── vercel.json
├── .env.local.example
├── .gitignore
├── README.md
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/
│   └── specs/
│       └── 2026-06-30-product-design.md
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── login/
    │   │   └── page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx
    │   │   ├── ipo/
    │   │   │   └── page.tsx
    │   │   ├── reminders/
    │   │   │   └── page.tsx
    │   │   ├── ledger/
    │   │   │   └── page.tsx
    │   │   └── settings/
    │   │       └── page.tsx
    │   └── api/
    │       ├── auth/
    │       │   └── route.ts
    │       ├── accounts/
    │       │   └── route.ts
    │       ├── ipo/
    │       │   ├── route.ts
    │       │   ├── fetch/
    │       │   │   └── route.ts
    │       │   └── watch/
    │       │       └── route.ts
    │       ├── reminders/
    │       │   ├── route.ts
    │       │   └── parse/
    │       │       └── route.ts
    │       ├── transactions/
    │       │   └── route.ts
    │       ├── push/
    │       │   ├── cron/
    │       │   │   └── route.ts
    │       │   └── test/
    │       │       └── route.ts
    │       └── export/
    │           └── route.ts
    ├── components/
    │   ├── Layout.tsx
    │   ├── LoginForm.tsx
    │   ├── ipo/
    │   │   ├── IpoCard.tsx
    │   │   └── IpoList.tsx
    │   ├── reminders/
    │   │   ├── ReminderList.tsx
    │   │   ├── ReminderForm.tsx
    │   │   ├── TemplatePicker.tsx
    │   │   └── NaturalLanguageInput.tsx
    │   ├── ledger/
    │   │   ├── TransactionList.tsx
    │   │   ├── TransactionForm.tsx
    │   │   └── Charts.tsx
    │   └── settings/
    │       ├── AccountManager.tsx
    │       ├── PushSettings.tsx
    │       └── DataManager.tsx
    └── lib/
        ├── supabase.ts
        ├── auth.ts
        ├── push.ts
        ├── ipo-fetcher.ts
        ├── nl-parser.ts
        └── types.ts
```
