import { createServiceClient } from './supabase';
import type { IpoListing } from './types';

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
    // 按 subscription_code 做 upsert，避免重复写入
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
