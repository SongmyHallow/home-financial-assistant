const CHANGELOG = [
  {
    version: 'v2.3',
    date: '2026-07-01',
    sections: [
      {
        title: '🚀 驾驶舱（操作收益日志）',
        items: [
          '全新驾驶舱页面：操作流水日志，和 Excel 收益填报格式完全一致',
          '支持手动录入：资金来源、操作类型、金额、日利率、天数、收益、备注',
          '自动预填报：系统根据北交所新股信息，点击即可预填申购操作行',
          '顶部概览：操作笔数、累计金额、总收益、年化收益率',
          '底部合计：合计收益、操作天数、年化收益率',
          '自动计算预估收益：输入金额×日利率×天数即时预览',
        ],
      },
      {
        title: '🔧 体验优化',
        items: [
          '台账跨月沿用：7月1日可继承6月30日余额',
          '券商账户蓝色标识覆盖所有汇总行（日均/资产提升/vs目标）',
          '浏览器通知按钮增加状态反馈（请求中/已拒绝/不支持）',
          '数据导入导出增加格式说明和使用描述',
          '侧边栏「资产看板」更名为「驾驶舱」',
        ],
      },
      {
        title: '🐛 Bug 修复',
        items: [
          'IPO 管理港股/北交所切换后无法返回',
          'Script 标签和 localStorage 导致的 hydration 错误',
          '设置页通知按钮无反馈',
        ],
      },
    ],
  },
  {
    version: 'v2.2',
    date: '2026-06-30',
    sections: [
      {
        title: '🏦 IPO 管理升级',
        items: [
          '北交所新股自动抓取：接入东方财富 API，覆盖申购/发行结果公告/上市三种事件',
          '日历视图：格子里直接显示公司名和事件类型标签（申购=青瓷、公告=琥珀、上市=蓝）',
          '列表视图：按事件类型筛选（全部/申购/发行结果公告/上市），每行显示日期+类型标签',
          '北交所官网链接：每只股票可一键跳转 bse.cn 公司详情页',
          '创建提醒：列表和日历中每行均可快速创建申购提醒',
          '港股 IPO：支持手动添加新股，申购状态切换 ✓已申购 / ○未申购',
        ],
      },
      {
        title: '📊 看板与台账优化',
        items: [
          '看板重构为驾驶舱：总日均/目标/缺口三卡片 + 各银行详情行 + 进度条',
          '台账新增一键沿用昨日余额、保存/取消按钮、日期旁显示星期几',
          '台账支持 Excel 粘贴：智能识别标题列、自动匹配银行账户、批量导入',
          '台账支持选择本月使用哪些账户（勾选下拉，localStorage 记忆）',
          '券商账户资产变动用蓝色标识',
          '台账底部增加资产总计规则说明',
          '快速转账栏替换为可折叠转账规则参考卡片',
        ],
      },
      {
        title: '🔧 账户管理优化',
        items: [
          '每个表单字段增加标签说明（账户名、账户类型、备注等）',
          '账户类型调整为储蓄卡/券商账户两种',
          '转账方式更新：U盾+手机银行 / U盾+网上银行 / 银行柜台临柜',
          '金额输入支持千分位逗号（如 5,000,000）',
          '券商账户勾选增加说明（台账中蓝色标识，备注绑定存管银行）',
        ],
      },
      {
        title: '✨ 新增功能',
        items: [
          '新增年度收益页面：12 个月资产/目标/差额汇总 + 活动月数统计',
          '新增更新日志页签：时间轴展示版本迭代',
          '港股 IPO 手动添加：填写公司名/代码/发行价/截止日即可录入',
        ],
      },
      {
        title: '🎨 界面优化',
        items: [
          'PC 端左侧边栏导航，移动端保持底部 Tab',
          '亮色系 teal 主题（暖白底+青瓷强调色）',
          '年度收益页加载速度优化：36 次 → 2 次 API 请求',
        ],
      },
      {
        title: '🐛 Bug 修复',
        items: [
          '台账：修复输入数字后所有空格自动填充（移除向前继承值显示）',
          '台账：修复日均公式（SUM/当月天数）',
          '台账：修复差额公式（每账户独立计算）',
          '台账：修复数字溢出单元格边框',
          '修复 Script 标签和 localStorage 导致的 hydration 错误',
        ],
      },
    ],
  },
  {
    version: 'v2.1',
    date: '2026-06-30',
    sections: [
      {
        title: '🐛 Bug 修复',
        items: [
          '台账：修复输入一个数字后所有空格自动填充的问题（移除向前传播的继承值显示）',
          '台账：修复日均计算公式错误 — 改为 SUM(每日余额) / 当月天数',
          '台账：修复差额公式错误 — 每个账户独立计算资产提升与目标差距',
          '台账：修复数字过长时溢出单元格边框',
        ],
      },
      {
        title: '✨ 功能优化',
        items: [
          '台账：移除快速转账栏，改为可折叠的转账规则参考卡片',
          '台账：新增「一键沿用昨日余额」功能，每天打开点一下自动填充',
        ],
      },
      {
        title: '🎨 界面优化',
        items: [
          'PC 端采用左侧边栏导航，移动端保持底部 Tab',
          '主内容区拓宽至全宽，数据密集型页面不再拥挤',
          '新增「更新日志」页签',
        ],
      },
    ],
  },
  {
    version: 'v2.0',
    date: '2026-06-30',
    sections: [
      {
        title: '🚀 重大更新',
        items: [
          '全新 V2 架构：基于甲方需求全面重构',
          '新增资产看板：当月各银行活动达标情况一览',
          '新增资产台账：Excel 式日×账户矩阵，支持单元格编辑、自动汇总',
          '新增活动管理：银行资产提升活动 CRUD，目标/基准/起止/达标条件',
          '新增 IPO 管理：北交所多账户配资 + 港股申购状态追踪',
          '新增提醒中心：7 条系统预设规则 + 模板/NL 自定义提醒',
          '扩展账户管理：币种、券商标记、转账方式/限额/时段',
        ],
      },
    ],
  },
  {
    version: 'v1.0',
    date: '2026-06-30',
    sections: [
      {
        title: '🎉 初始版本',
        items: [
          '基础架构：Next.js 16 + Supabase + Vercel',
          '登录认证：访问码保护',
          'IPO 信息面板：北交所 + 港股新股展示',
          '提醒管理：模板创建 + 自然语言解析',
          '流水台账：手动记账 + 图表看板',
          '推送系统：PWA 通知 + PushPlus 微信推送',
          'PWA 支持：可安装到桌面',
          '深蓝色 UI 主题',
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6">📋 更新日志</h2>
      <div className="space-y-8">
        {CHANGELOG.map((entry, i) => (
          <div key={i} className="relative pl-8 border-l-2 border-[var(--color-accent)] pb-2">
            {/* 时间轴圆点 */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-background)]" />
            {/* 版本号 */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-[var(--color-accent)]">{entry.version}</span>
              <span className="text-xs text-[var(--color-muted-light)]">{entry.date}</span>
            </div>
            {/* 内容区 */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 space-y-3">
              {entry.sections.map((section, j) => (
                <div key={j}>
                  <h3 className="text-[13px] font-medium text-[var(--color-foreground)] mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.items.map((item, k) => (
                      <li key={k} className="text-[13px] text-[var(--color-muted)] flex gap-2">
                        <span className="text-[var(--color-border)] mt-0.5 shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-[var(--color-muted-light)] mt-8 pb-4">
        每次更新都会记录在这里
      </p>
    </div>
  );
}
