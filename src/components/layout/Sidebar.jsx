'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { getMenuForUserType } from '@/lib/menu-config';
import { ACCENT_COLOR } from '@/lib/utils';

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const menu = getMenuForUserType(user?.type);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (index) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isActive = (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const content = (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="pt-6 pb-4 flex flex-col items-center">
        <Image src="/logo.png" alt="360 Lab ERP" width={120} height={120} className="object-contain" />
        <p className="mt-3 text-base font-semibold text-black">{user?.name}</p>
      </div>
      <nav className="flex-1 space-y-1">
        {menu.map((item, index) => (
          <div key={item.title}>
            {item.children ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-black hover:bg-gray-50"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-gray-500">{expanded[index] ? '▲' : '▼'}</span>
                </button>
                {expanded[index] && (
                  <div className="ml-6 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-md text-sm ${
                          isActive(child.href)
                            ? 'font-bold'
                            : 'text-black hover:bg-gray-50'
                        }`}
                        style={isActive(child.href) ? { color: ACCENT_COLOR } : undefined}
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
                className={`block px-3 py-2 rounded-md font-medium ${
                  isActive(item.href) ? 'text-black' : 'text-black hover:bg-gray-50'
                }`}
                style={isActive(item.href) ? { backgroundColor: ACCENT_COLOR } : undefined}
              >
                {item.title}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
