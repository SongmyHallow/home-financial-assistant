-- 操作收益表
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  daily_rate DECIMAL(6,4),
  profit DECIMAL(10,2),
  days INT NOT NULL DEFAULT 1,
  total_profit DECIMAL(10,2) DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operations_month ON operations (month);
