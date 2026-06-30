import { createServiceClient } from './supabase';
import type { IpoListing } from './types';

const EASTMONEY_API = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

async function fetchBeijingIpos(): Promise<Partial<IpoListing>[]> {
  try {
    // 获取过去14天到未来的新股数据
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const startDate = fourteenDaysAgo.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      reportName: 'RPTA_APP_IPOAPPLY',
      columns: 'SECURITY_NAME,SECURITY_CODE,APPLY_CODE,ISSUE_PRICE,APPLY_DATE,LISTING_DATE,TRADE_MARKET,INDUSTRY_NAME,ONLINE_ISSUE_NUM,BALLOT_NUM_DATE,AFTER_ISSUE_PE',
      sortColumns: 'APPLY_DATE',
      sortTypes: '-1',
      pageSize: '30',
      pageNumber: '1',
    });
    const res = await fetch(`${EASTMONEY_API}?${params.toString()}`, {
      headers: { 'Referer': 'https://data.eastmoney.com/' },
    });
    const json = await res.json();
    if (!json.success || !json.result?.data) return [];

    return json.result.data
      .filter((item: any) => {
        if (!item.APPLY_DATE || !item.TRADE_MARKET?.includes('北京')) return false;
        // 过去14天到今天之后的数据
        return new Date(item.APPLY_DATE) >= fourteenDaysAgo;
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
        // 中签公布日
        bse_url: item.SECURITY_CODE ? `https://www.bse.cn/newshare/company/${item.SECURITY_CODE}.html` : null,
        ballot_date: item.BALLOT_NUM_DATE?.slice(0, 10) || null,
        status: '进行中' as const,
      }));
  } catch (e) {
    console.error('北交所 IPO fetch failed:', e);
    return [];
  }
}

export async function fetchAllIpos() {
  const supabase = createServiceClient();

  const beijing = await fetchBeijingIpos();

  let inserted = 0;
  for (const ipo of beijing) {
    if (!ipo.subscription_code || !ipo.company_name) continue;

    // 先查是否存在
    const { data: existing } = await supabase
      .from('ipo_listings')
      .select('id, expected_listing_date, subscription_deadline')
      .eq('subscription_code', ipo.subscription_code)
      .maybeSingle();

    const data = {
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
      status: new Date(ipo.subscription_deadline || '') > new Date() ? '进行中' : '已截止',
    };

    if (existing) {
      const { error } = await supabase.from('ipo_listings').update(data).eq('id', existing.id);
      if (!error) inserted++;
      else console.error('IPO update error:', error);
    } else {
      const { error } = await supabase.from('ipo_listings').insert(data);
      if (!error) inserted++;
      else console.error('IPO insert error:', error);
    }

    // 更新上市日期（从 listing_date 字段）
    if (ipo.expected_listing_date && (!existing?.expected_listing_date || existing.expected_listing_date !== ipo.expected_listing_date)) {
      await supabase.from('ipo_listings').update({ expected_listing_date: ipo.expected_listing_date }).eq('subscription_code', ipo.subscription_code);
    }
  }

  // 标记过期的
  const { error: expireError } = await supabase
    .from('ipo_listings')
    .update({ status: '已截止' })
    .eq('status', '进行中')
    .lt('subscription_deadline', new Date().toISOString());
  if (expireError) console.error('IPO expiry update failed:', expireError);

  return inserted;
}
