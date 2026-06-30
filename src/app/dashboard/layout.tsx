import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Layout from '@/components/Layout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();
  if (!authed) redirect('/login');
  return <Layout>{children}</Layout>;
}
