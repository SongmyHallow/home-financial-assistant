'use client';
import { useSearchParams } from 'next/navigation';
import ReminderList from '@/components/reminders/ReminderList';
import { Suspense } from 'react';

function ReminderContent() {
  const searchParams = useSearchParams();
  const prefill: Record<string, string> = {};
  searchParams.forEach((value, key) => { prefill[key] = value; });
  return <ReminderList prefill={Object.keys(prefill).length > 0 ? prefill : undefined} />;
}

export default function RemindersPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">加载中...</p>}>
      <ReminderContent />
    </Suspense>
  );
}
