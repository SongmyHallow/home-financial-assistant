import { createServiceClient } from './supabase';
import type { IpoListing } from './types';

const EASTMONEY_API = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

async function fetchBeijingIpos(): Promise<Partial<IpoListing>[]> {
  try {
    // 获取所有近期新股，客户端按市场过滤
    const params = new URLSearchParams({
      reportName: 'RPTA_APP_IPOAPPLY',
      columns: 'SECURITY_NAME,APPLY_CODE,ISSUE_PRICE,APPLY_DATE,LISTING_DATE,TRADE_MARKET,INDUSTRY_NAME,ONLINE_ISSUE_NUM,AFTER_ISSUE_PE',
      sortColumns: 'APPLY_DATE',
      sortTypes: '-1',
      pageSize: '20',
      pageNumber: '1',
    });
    const res = await fetch(`${EASTMONEY_API}?${params.toString()}`, {
      headers: { 'Referer': 'https://data.eastmoney.com/' },
    });
    const json = await res.json();
    if (!json.success || !json.result?.data) return [];

    return json.result.data
      .filter((item: any) => {
        // 只取北交所且申购日期在未来的
        if (!item.APPLY_DATE || !item.TRADE_MARKET?.includes('北京')) return false;
        return new Date(item.APPLY_DATE) >= new Date(new Date().toISOString().slice(0, 10));
      })
      .map((item: any) => ({
        market: '北交所' as const,
        company_name: item.SECURITY_NAME,
        subscription_code: item.APPLY_CODE || item.SECURITY_CODE || '',
        price_low: item.ISSUE_PRICE || null,
        price_high: item.ISSUE_PRICE || null,
        lot_size: 100,
        lot_amount: item.ISSUE_PRICE ? Math.round(item.ISSUE_PRICE * 100) : null,
        sponsor: null,
        industry: item.INDUSTRY_NAME || null,
        subscription_deadline: item.APPLY_DATE ? `${item.APPLY_DATE.slice(0, 10)}T15:00:00.000Z` : null,
        expected_listing_date: item.LISTING_DATE?.slice(0, 10) || null,
        status: '进行中' as const,
      }));
  } catch (e) {
    console.error('北交所 IPO fetch failed:', e);
    return [];
  }
}

async function fetchHKIpos(): Promise<Partial<IpoListing>[]> {
  // 港股需要额外的数据源，暂时返回空
  return [];
}

export async function fetchAllIpos() {
  const supabase = createServiceClient();

  const beijing = await fetchBeijingIpos();
  const hk = await fetchHKIpos();
  const all = [...beijing, ...hk];

  let inserted = 0;
  for (const ipo of all) {
    if (!ipo.subscription_code || !ipo.company_name) continue;
    const { error } = await supabase
      .from('ipo_listings')
      .upsert(
        {
          market: ipo.market || '北交所',
          company_name: ipo.company_name,
          subscription_code: ipo.subscription_code,
          price_low: ipo.price_low,
          price_high: ipo.price_high,
          lot_size: ipo.lot_size || 100,
          lot_amount: ipo.lot_amount,
          sponsor: ipo.sponsor,
          industry: ipo.industry,
          subscription_deadline: ipo.subscription_deadline,
          expected_listing_date: ipo.expected_listing_date,
          status: '进行中',
        },
        { onConflict: 'subscription_code' }
      );
    if (!error) inserted++;
    else console.error('IPO upsert error:', error);
  }

  // 标记已过截止日期的为"已截止"
  const { error: expireError } = await supabase
    .from('ipo_listings')
    .update({ status: '已截止' })
    .eq('status', '进行中')
    .lt('subscription_deadline', new Date().toISOString());
  if (expireError) console.error('IPO expiry update failed:', expireError);

  return inserted;
}
