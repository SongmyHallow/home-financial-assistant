import AccountManager from '@/components/settings/AccountManager';
import PushSettings from '@/components/settings/PushSettings';
import DataManager from '@/components/settings/DataManager';

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">⚙ 设置</h2>
      <section className="mb-6">
        <AccountManager />
      </section>
      <section className="mb-6">
        <PushSettings />
      </section>
      <section className="mb-6">
        <DataManager />
      </section>
    </div>
  );
}
