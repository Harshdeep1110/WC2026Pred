import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id! } });
  
  if (!user) {
    redirect('/api/auth/signout?callbackUrl=/login');
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
