'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { path: '/dashboard/ipo', label: 'IPO', icon: '🏦' },
  { path: '/dashboard/reminders', label: '提醒', icon: '🔔' },
  { path: '/dashboard/ledger', label: '流水', icon: '📒' },
  { path: '/dashboard/settings', label: '设置', icon: '⚙' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">🏠 金融助手</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-lg mx-auto flex justify-around">
          {tabs.map(tab => (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center py-2 px-3 text-xs ${
                pathname.startsWith(tab.path)
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
