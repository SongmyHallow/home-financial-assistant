# 家庭金融助手 V2 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构 V1 为 V2，新增资产台账（Excel 式日×账户矩阵）、活动管理、IPO 配资、系统预设提醒，扩展账户管理。

**Architecture:** 在现有 Next.js 16 App Router 代码库上增量改造。新增 3 张表（activities, daily_balances, ipo_allocations）+ 扩展 accounts 表。新增 4 个页面（看板、台账、活动、港股IPO），重写提醒页。保留现有认证、推送、PWA 基础设施。

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase PostgreSQL, ECharts

## Global Constraints

- 双端使用：响应式布局 + PWA 通知
- 登录方式：访问码 Cookie 持久化
- 部署平台：Vercel 免费层
- 数据库：Supabase PostgreSQL
- 亮色系 teal 配色（已实现）
- 数据可手动录入、编辑、删除
- 推送双通道：浏览器 Notification + PushPlus

---

### Task 1: 数据库 Schema 升级

**Files:**
- Create: `supabase/migrations/002_v2_schema.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: 扩展 accounts 表（6 个新列），新增 activities、daily_balances、ipo_allocations、hk_subscriptions 四张表，更新 TypeScript 类型

**Steps:**

- [ ] **Step 1: 编写迁移 SQL**

创建 `supabase/migrations/002_v2_schema.sql`：

```sql
-- 扩展 accounts 表
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CNY';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS transfer_method TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(12,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS per_transfer_limit DECIMAL(12,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS transfer_hours TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS transfer_notes TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_brokerage BOOLEAN DEFAULT false;

-- 活动表
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_daily_avg DECIMAL(14,2) NOT NULL DEFAULT 0,
  target_daily_avg DECIMAL(14,2),
  signup_deadline DATE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pass_condition TEXT DEFAULT '日均',
  reward DECIMAL(10,2) DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_account ON activities (account_id);
CREATE INDEX idx_activities_month ON activities (month);

-- 每日余额表
CREATE TABLE IF NOT EXISTS daily_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_manual BOOLEAN NOT NULL DEFAULT true,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, date)
);
CREATE INDEX idx_daily_balances_date ON daily_balances (date);
CREATE INDEX idx_daily_balances_account_date ON daily_balances (account_id, date);

-- IPO 申购分配表
CREATE TABLE IF NOT EXISTS ipo_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipo_listings(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ipo_id, account_id)
);

-- 港股申购记录表
CREATE TABLE IF NOT EXISTS hk_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipo_listings(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ipo_id, account_id)
);
```

- [ ] **Step 2: 更新 TypeScript 类型**

在 `src/lib/types.ts` 末尾追加新类型：

```typescript
// ===== V2 新增 =====

export interface Activity {
  id: string;
  account_id: string;
  month: string;
  base_daily_avg: number;
  target_daily_avg: number | null;
  signup_deadline: string | null;
  start_date: string;
  end_date: string;
  pass_condition: string;
  reward: number;
  note: string;
  created_at: string;
  account?: Account;
}

export interface DailyBalance {
  id: string;
  account_id: string;
  date: string;
  balance: number;
  is_manual: boolean;
  note: string;
  created_at: string;
  account?: Account;
}

export interface IpoAllocation {
  id: string;
  ipo_id: string;
  account_id: string;
  amount: number;
  created_at: string;
}

export interface HkSubscription {
  id: string;
  ipo_id: string;
  account_id: string;
  subscribed: boolean;
  note: string;
  created_at: string;
}

// 扩展 Account 类型
export interface AccountV2 extends Account {
  currency: string;
  transfer_method: string | null;
  daily_limit: number | null;
  per_transfer_limit: number | null;
  transfer_hours: string | null;
  transfer_notes: string | null;
  is_brokerage: boolean;
}
```

- [ ] **Step 3: 在 Supabase SQL Editor 执行迁移**，验证 5 张表均已升级/新增

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: V2 database schema (activities, daily_balances, ipo_allocations, hk_subscriptions)"
```

---

### Task 2: 导航重构 + 页面骨架

**Files:**
- Modify: `src/components/Layout.tsx`
- Create: `src/app/dashboard/overview/page.tsx`
- Modify: `src/app/dashboard/ipo/page.tsx`
- Create: `src/app/dashboard/hk-ipo/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: 现有 Layout 组件
- Produces: 新 5-tab 导航（看板、台账、IPO、提醒、设置），6 个页面骨架

**Steps:**

- [ ] **Step 1: 更新 Layout 导航**

修改 `src/components/Layout.tsx`，tabs 数组改为：

```typescript
const tabs = [
  { path: '/dashboard/overview', label: '看板', icon: '📊' },
  { path: '/dashboard/ledger', label: '台账', icon: '📈' },
  { path: '/dashboard/ipo', label: 'IPO', icon: '🏦' },
  { path: '/dashboard/reminders', label: '提醒', icon: '🔔' },
  { path: '/dashboard/settings', label: '设置', icon: '⚙' },
];
```

- [ ] **Step 2: 创建页面骨架**

- `src/app/dashboard/overview/page.tsx` — 资产看板
- `src/app/dashboard/hk-ipo/page.tsx` — 港股 IPO

三个页面均从占位内容开始（`<h2>标题</h2><p className="text-muted">开发中...</p>`）。

- [ ] **Step 3: 更新根重定向** (`src/app/page.tsx`) 默认跳转 `/dashboard/overview`

- [ ] **Step 4: 验证**

```bash
npm run dev
```

访问 localhost:3000 → 跳转看板 → 5 个 Tab 正常切换。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: V2 navigation (5 tabs) and page skeletons"
```

---

### Task 3: 账户管理升级

**Files:**
- Modify: `src/app/api/accounts/route.ts`
- Modify: `src/components/settings/AccountManager.tsx`

**Interfaces:**
- Consumes: accounts 表新字段，AccountV2 类型
- Produces: 支持币种、转账规则、券商标记的账户 CRUD

**Steps:**

- [ ] **Step 1: 更新 AccountManager 表单**

在现有 AccountManager 的编辑表单中增加字段：

```tsx
{/* 币种 */}
<select value={editing.currency || 'CNY'} onChange={...}>
  <option value="CNY">CNY 人民币</option>
  <option value="HKD">HKD 港币</option>
</select>

{/* 券商标记 */}
<label className="flex items-center gap-2">
  <input type="checkbox" checked={editing.is_brokerage || false} />
  券商账户（用于打新申购）
</label>

{/* 转账方式 */}
<select value={editing.transfer_method || ''}>
  <option value="">选择转账方式</option>
  <option value="ukey">U盾+自己操作</option>
  <option value="mobile">手机银行</option>
  <option value="counter">需要去柜台</option>
</select>

{/* 单日/单笔限额 */}
<input type="number" placeholder="单日限额" />
<input type="number" placeholder="单笔限额" />

{/* 操作时段 */}
<input type="text" placeholder="如：工作日9:00-17:00" />
```

- [ ] **Step 2: 更新 API route** `src/app/api/accounts/route.ts` 支持新字段的读写

- [ ] **Step 3: 更新列表展示**

账户列表每行显示：名称 + 币种标签 + 转账方式简称 + 限额信息（可折叠）。

- [ ] **Step 4: 验证** 添加账户 → 填写完整信息 → 保存 → 列表显示正确

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: extend account management with currency, transfer rules, brokerage flag"
```

---

### Task 4: 活动管理 CRUD

**Files:**
- Create: `src/app/api/activities/route.ts`
- Create: `src/components/activities/ActivityList.tsx`
- Create: `src/components/activities/ActivityForm.tsx`
- Modify: `src/app/dashboard/settings/page.tsx` (添加活动管理入口，或新增独立设置子页)

**Interfaces:**
- Consumes: Activity 类型，accounts API
- Produces: 活动 CRUD REST API，ActivityList 组件

**Steps:**

- [ ] **Step 1: 创建 Activities API** `src/app/api/activities/route.ts`

GET/POST/PUT/DELETE，核心查询：

```typescript
// GET: 支持 ?month=2026-07 筛选
const { data, error } = await supabase
  .from('activities')
  .select('*, account:account_id(*)')
  .eq('month', month)
  .order('created_at');
```

- [ ] **Step 2: 创建 ActivityForm 组件**

表单字段：银行账户（下拉）、月份（默认当月）、上月日均、目标日均、报名截止、活动起止、达标条件（日均/时点/两者）、奖励金额、备注。

- [ ] **Step 3: 创建 ActivityList 组件**

按月筛选，列表展示每个活动的：银行名、目标、上月基准、备注。支持编辑/删除。

- [ ] **Step 4: 集成到设置页** 在 AccountManager 下方加入 `<ActivityList />`

- [ ] **Step 5: 验证** 创建活动 → 列表展示 → 编辑/删除

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: activity management CRUD (bank promotion activities)"
```

---

### Task 5: 资产台账（核心模块）

**Files:**
- Create: `src/app/api/balances/route.ts`
- Create: `src/components/ledger/LedgerGrid.tsx`
- Create: `src/components/ledger/TransferBar.tsx`
- Modify: `src/app/dashboard/ledger/page.tsx`

**Interfaces:**
- Consumes: DailyBalance, AccountV2, Activity 类型；accounts API, activities API
- Produces: 日×账户矩阵组件 LedgerGrid，转账快捷栏 TransferBar

**Steps:**

- [ ] **Step 1: 创建 Balances API** `src/app/api/balances/route.ts`

```typescript
// GET: ?month=2026-06&account_id=xxx
// 返回按日期分组的余额数据，JOIN account 信息
const { data } = await supabase
  .from('daily_balances')
  .select('*, account:account_id(*)')
  .gte('date', `${month}-01`)
  .lte('date', lastDay)
  .order('date');

// POST: upsert 单条余额 { account_id, date, balance, is_manual, note }
// PUT: 更新单条
```

- [ ] **Step 2: 创建 LedgerGrid 组件** （核心）

这是 V2 最重要的组件，实现 Excel 式日×账户矩阵。

```typescript
'use client';
// LedgerGrid.tsx
// Props: month (string), accounts (AccountV2[]), activities (Activity[])
//
// 渲染逻辑：
// 1. 顶部 "活动栏" — 显示上月日均 / 目标日均 / 当前日均 / 差额
// 2. 主体：横向滚动表格
//    - 列: 日期 | 账户1 | 账户2 | ... | 总计 | 备注
//    - 行: 每天一行，底部汇总行
//    - 单元格可点击编辑（inline edit）
//    - 继承前一天余额（如果当日无变动）
// 3. 底部：本月累计 / 本月日均 / 资产提升 / vs目标
```

关键实现细节：
- 使用 `useState` 管理当月所有余额的二维数据
- 单元格点击 → 显示 input → 回车保存 → 调用 API
- "继承前一天"逻辑：如果某单元格无值，渲染时显示前一天的值（灰色），点击后确认才写入
- 目标列行带 `*` 标记（浅绿底）

- [ ] **Step 3: 创建 TransferBar 组件**

```typescript
'use client';
// TransferBar.tsx
// 快捷转账栏： [从: ▼] → [到: ▼] [金额] [确认]
// 选择"从"账户后，展示该账户的转账规则卡片（限额、方式、时段）
// 确认后：调用 balances API 更新两列当天的余额
```

- [ ] **Step 4: 月度汇总计算**

在 LedgerGrid 底部渲染汇总行：
- 本月累计 = SUM(每日余额)
- 本月日均 = 累计 / 有数据天数
- 资产提升 = 本月日均 - 活动.base_daily_avg
- vs目标 = 本月日均 / 活动.target_daily_avg → 百分比

- [ ] **Step 5: 更新 ledger 页面**

`src/app/dashboard/ledger/page.tsx` → 加载 accounts + activities + balances → 渲染 TransferBar + LedgerGrid

- [ ] **Step 6: 验证**

`npm run dev` → 台账页面 → 选择月份 → 点击单元格编辑 → 转账操作 → 汇总行正确

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: asset ledger with Excel-style daily grid and transfer bar"
```

---

### Task 6: 资产看板

**Files:**
- Create: `src/components/overview/DashboardCards.tsx`
- Modify: `src/app/dashboard/overview/page.tsx`

**Interfaces:**
- Consumes: Activity, DailyBalance, AccountV2
- Produces: 看板概览组件

**Steps:**

- [ ] **Step 1: 创建 DashboardCards 组件**

```typescript
'use client';
// DashboardCards.tsx
// 加载当月所有活动 + 对应账户的日均余额
// 每张卡片：银行名 | 目标 | 当前日均 | 差额 | 进度条 | 状态标签
// 
// 汇总行：总资产 vs 总目标
//
// 点击卡片 → 跳转到台账对应列
```

- [ ] **Step 2: 计算日均差额**

```typescript
// 对每个活动关联的账户：
// 当月日均 = AVG(daily_balances WHERE account_id = X AND date IN 当月)
// 差额 = 当月日均 - 目标日均
// 状态：>0 → 🟢达标, <0 → 🔴差XX万
```

- [ ] **Step 3: 更新看板页面** 替换占位内容

- [ ] **Step 4: 验证** 看板显示当月所有活动 + 差额

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: asset dashboard with activity overview and progress indicators"
```

---

### Task 7: IPO 管理扩展

**Files:**
- Create: `src/app/api/ipo/allocations/route.ts`
- Modify: `src/components/ipo/IpoCard.tsx` （增加配资表单）
- Modify: `src/app/dashboard/ipo/page.tsx` （北交所）
- Modify: `src/app/dashboard/hk-ipo/page.tsx` （港股）

**Interfaces:**
- Consumes: IpoAllocation, IpoListing 类型
- Produces: 配资 CRUD API，带资金分配框的 IPO 卡片，港股申购追踪

**Steps:**

- [ ] **Step 1: 修改 IpoCard 增加配资表单**

在原卡片下方增加：

```tsx
{ipo.market === '北交所' && (
  <div className="mt-3 pt-3 border-t">
    <p className="text-xs font-medium mb-2">资金分配</p>
    {brokerageAccounts.map(acc => (
      <div key={acc.id} className="flex items-center gap-2 mb-1">
        <span className="text-xs w-16">{acc.name}</span>
        <input type="number" placeholder="金额"
          value={allocations[acc.id] || ''}
          onChange={e => setAllocations({...allocations, [acc.id]: e.target.value})}
          className="flex-1 text-sm" />
      </div>
    ))}
    <button onClick={saveAllocations} className="text-xs bg-accent text-white px-3 py-1 rounded-lg mt-1">
      确认分配
    </button>
  </div>
)}
```

- [ ] **Step 2: 创建分配 API** `src/app/api/ipo/allocations/route.ts`

- [ ] **Step 3: 创建港股 IPO 页面**

```tsx
// hk-ipo/page.tsx
// 仅显示港股 IPO 列表 + 每个 IPO 的券商申购状态
// [✓ 已申购] / [○ 未申购] 切换按钮
// 所有金额以 HKD 显示，不与 CNY 混合统计
```

- [ ] **Step 4: 验证** 北交所配资 → 港股申购状态切换

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: IPO allocation (BJ) and HK subscription tracking"
```

---

### Task 8: 提醒中心重写

**Files:**
- Modify: `src/components/reminders/ReminderList.tsx`
- Create: `src/components/reminders/PresetRules.tsx`
- Modify: `src/app/dashboard/reminders/page.tsx`

**Interfaces:**
- Consumes: 现有 Reminder 类型，Activity 类型，IPO 数据
- Produces: 系统预设规则组件 + 自定义提醒组件

**Steps:**

- [ ] **Step 1: 创建 PresetRules 组件** 列出 7 条系统预设规则，每条带开关：

```tsx
const PRESET_RULES = [
  { key: 'bank_transfer', label: '银证转账提醒', time: '8:20', condition: '有申购时' },
  { key: 'guoxin_ipo', label: '国信证券申购', time: '8:40', condition: '有北交所新股' },
  { key: 'shenwan_ipo', label: '申万证券申购', time: '8:50', condition: '有北交所新股' },
  { key: 'hk_check', label: '港股申购检查', time: '9:00', condition: '有港股新股' },
  { key: 'hk_dark_pool', label: '港股暗盘卖出', time: '16:05', condition: '有上市首日股票' },
  { key: 'month_start', label: '月初资产检查', time: '每月1号 9:00', condition: '始终' },
  { key: 'month_end', label: '月末活动检查', time: '每月最后一天 15:00', condition: '可开关' },
];
```

预设规则状态存储在 `localStorage`（不需要后端表）。

- [ ] **Step 2: 重写 ReminderList** 保留自定义提醒功能（模板 + NL），在顶部加入 PresetRules 区块

- [ ] **Step 3: 更新提醒页面** 整合 PresetRules + ReminderList

- [ ] **Step 4: 验证** 开关预设规则 → 创建自定义提醒 → 列表正确

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: reminder center with system preset rules"
```

---

### Task 9: 整合与 Polish

**Files:**
- Modify: `src/app/dashboard/layout.tsx` (确保 auth 检查正确)
- Modify: `src/components/Layout.tsx` (最终样式调整)

**Steps:**

- [ ] **Step 1: 端到端测试** 看板 → 台账 → IPO → 提醒 → 设置，五个页面完整流程

- [ ] **Step 2: 修复构建错误** `npm run build` 检查

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: V2 integration polish and build verification"
```

---

## 文件结构总览（V2 新增/修改）

```
src/
├── app/
│   ├── dashboard/
│   │   ├── overview/page.tsx          (新增) 看板
│   │   ├── hk-ipo/page.tsx            (新增) 港股IPO
│   │   └── ipo/page.tsx               (修改) 北交所IPO配资
│   │   └── ledger/page.tsx            (修改) 台账
│   │   └── reminders/page.tsx         (修改) 提醒中心
│   │   └── settings/page.tsx          (修改) 设置+活动管理
│   └── api/
│       ├── activities/route.ts        (新增) 活动CRUD
│       ├── balances/route.ts          (新增) 余额CRUD
│       ├── accounts/route.ts          (修改) 扩展字段
│       └── ipo/allocations/route.ts   (新增) IPO配资
├── components/
│   ├── Layout.tsx                     (修改) 5-tab导航
│   ├── overview/
│   │   └── DashboardCards.tsx         (新增)
│   ├── activities/
│   │   ├── ActivityList.tsx           (新增)
│   │   └── ActivityForm.tsx           (新增)
│   ├── ledger/
│   │   ├── LedgerGrid.tsx             (新增) 核心组件
│   │   └── TransferBar.tsx            (新增)
│   ├── ipo/
│   │   └── IpoCard.tsx                (修改) 加配资表单
│   ├── reminders/
│   │   ├── PresetRules.tsx            (新增)
│   │   └── ReminderList.tsx           (修改)
│   └── settings/
│       └── AccountManager.tsx         (修改) 扩展字段
├── lib/
│   └── types.ts                       (修改) 加V2类型
└── supabase/
    └── migrations/
        └── 002_v2_schema.sql          (新增)
```

## 各任务依赖关系

```
Task 1 (Schema) ──→ Task 2 (导航) ──→ Task 3 (账户升级)
                     │                     │
                     │              ┌──────┴──────┐
                     │              ↓              ↓
                     │         Task 4 (活动)   Task 5 (台账)
                     │              │              │
                     │              └──────┬──────┘
                     │                     ↓
                     └─────────────→ Task 6 (看板)
                                          │
                                     Task 7 (IPO扩展)
                                          │
                                     Task 8 (提醒)
                                          │
                                     Task 9 (Polish)
```
