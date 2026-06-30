-- ========================================
-- 家庭金融助手 - 数据库初始化 SQL
-- 在 Supabase SQL Editor 中粘贴并执行
-- ========================================

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
