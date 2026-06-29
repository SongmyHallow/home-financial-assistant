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
