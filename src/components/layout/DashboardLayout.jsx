'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppSidebar from './Sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getHomeHref, isPathAllowedForUser } from '@/lib/menu-config';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (!isPathAllowedForUser(user.type, pathname)) {
      router.replace(getHomeHref(user.type));
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sidebar gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-sidebar-foreground/60">Loading workspace...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="w-full p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
