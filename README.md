# 家庭金融助手

个人银行资金管理中枢 — 资产提升活动追踪 + IPO 打新管理 + 定时操作提醒

> 线上：https://joannywang.site | 本地：`npm run dev` → http://localhost:3000

## 功能模块

| 模块 | 状态 | 说明 |
|------|------|------|
| 📊 资产看板 | ✅ | 当月各银行活动达标情况、差额红绿灯、总资产汇总 |
| 📈 资产台账 | ✅ | Excel 式日×账户矩阵，点击编辑余额，转账栏自动更新，月末汇总（累计/日均/资产提升/vs目标） |
| 🎯 活动管理 | ✅ | 银行提升活动 CRUD，目标日均、起止日期、达标条件、奖励 |
| 🏦 IPO 管理 | ✅ | 北交所新股配资（多账户分配）+ 港股申购状态追踪 |
| 🔔 提醒中心 | ✅ | 7 条预设规则（可开关）+ 模板/NL 自然语言创建自定义提醒 |
| ⚙ 账户管理 | ✅ | 币种/券商标记/转账方式（U盾·手机银行·柜台）/限额/时段 |
| 🤖 NL 解析 | ✅ | DeepSeek API 驱动，自然语言创建提醒 |
| 📲 推送 | ✅ | PushPlus 微信推送 + PWA 浏览器通知 |

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase PostgreSQL · Vercel · DeepSeek API · PushPlus

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
```

环境变量（`.env.local`）：

| 变量 | 说明 |
|------|------|
| `ACCESS_CODE` | 登录访问码 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 |
| `PUSHPLUS_TOKEN` | PushPlus Token（微信推送） |
| `OPENAI_API_KEY` | DeepSeek API Key（NL 解析） |
| `CRON_SECRET` | Cron Job 鉴权密钥 |

## 数据库

运行 `supabase/migrations/001_initial_schema.sql`（V1 基础表）和 `supabase/migrations/002_v2_schema.sql`（V2 扩展表）初始化数据库。

## 部署

推送 GitHub → Vercel 自动部署 → 自定义域名 https://joannywang.site
