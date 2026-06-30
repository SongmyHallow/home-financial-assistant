const CHANGELOG = [
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
