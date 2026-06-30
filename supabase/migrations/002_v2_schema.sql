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
