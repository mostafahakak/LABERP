'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';

const MenuContext = createContext({ openMenu: () => {} });

export function useMenu() {
  return useContext(MenuContext);
}

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171821]">
        <div className="w-10 h-10 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MenuContext.Provider value={{ openMenu: () => setMobileOpen(true) }}>
      <div className="min-h-screen flex bg-white">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </MenuContext.Provider>
  );
}
