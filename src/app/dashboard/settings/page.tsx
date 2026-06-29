import AccountManager from '@/components/settings/AccountManager';

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">⚙ 设置</h2>
      <section className="mb-6">
        <AccountManager />
      </section>
      {/* 后续 Task 加入推送设置和数据管理 */}
    </div>
  );
}
