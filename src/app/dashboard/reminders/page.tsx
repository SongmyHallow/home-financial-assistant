'use client';
import { useSearchParams } from 'next/navigation';
import ReminderList from '@/components/reminders/ReminderList';
import PresetRules from '@/components/reminders/PresetRules';
import { Suspense } from 'react';

function ReminderContent() {
  const searchParams = useSearchParams();
  const prefill: Record<string, string> = {};
  searchParams.forEach((value, key) => { prefill[key] = value; });
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔔 提醒中心</h2>
      </div>
      <PresetRules />
      <div className="mt-2">
        <ReminderList prefill={Object.keys(prefill).length > 0 ? prefill : undefined} />
      </div>
    </div>
  );
}

export default function RemindersPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">加载中...</p>}>
      <ReminderContent />
    </Suspense>
  );
}
