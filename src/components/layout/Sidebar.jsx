'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { getMenuForUserType } from '@/lib/menu-config';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const menu = getMenuForUserType(user?.type);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (index) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isActive = (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const content = (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo & User */}
      <div className="pt-6 pb-2 px-4 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-white/10 p-2 flex items-center justify-center">
          <Image src="/logo.png" alt="360 Lab" width={64} height={64} className="object-contain" />
        </div>
        <p className="mt-3 text-sm font-semibold text-sidebar-foreground">{user?.name}</p>
        <span className="text-xs text-sidebar-foreground/50 capitalize">{user?.type || 'Staff'}</span>
      </div>

      <Separator className="mx-4 my-3 bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {menu.map((item, index) => (
          <div key={item.title}>
            {item.children ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <span className="font-medium">{item.title}</span>
                  <svg
                    className={cn('w-4 h-4 transition-transform', expanded[index] && 'rotate-180')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expanded[index] && (
                  <div className="ml-3 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                          isActive(child.href)
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                {item.title}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <Separator className="mx-4 my-2 bg-sidebar-border" />

      {/* Logout */}
      <div className="p-3">
        <Button
          variant="ghost"
          onClick={() => { logout(); router.push('/login'); }}
          className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-destructive/100/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
          </svg>
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">{content}</aside>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}
