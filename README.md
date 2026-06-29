# 家庭金融助手 (Home Financial Assistant)

个人金融操作中枢：打新信息收集 + 操作提醒 + 流水记账，一站管理。

## 技术栈

- Next.js 14 (App Router) + TypeScript
- Supabase PostgreSQL
- Vercel 部署
- PWA 支持双端使用

## 本地开发

```bash
npm install
npm run dev
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `ACCESS_CODE` | 登录访问码 |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_KEY` | Supabase 匿名密钥 |
| `PUSHPLUS_TOKEN` | PushPlus Token（微信推送） |
| `OPENAI_API_KEY` | LLM API Key（自然语言解析） |
| `CRON_SECRET` | Cron Job 鉴权密钥 |

## 设计文档

见 `docs/specs/2026-06-30-product-design.md`
