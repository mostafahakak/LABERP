'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';


const NAV_ITEMS = [
  {
    href: '/dashboard/hr/employees/list',
    icon: '👥',
    label: '01. Employee Records',
  },
  {
    href: '/dashboard/hr/employees/salary-history',
    icon: '💰',
    label: '02. Salary History',
  },
  {
    href: '/dashboard/hr/employees/loans',
    icon: '💵',
    label: '03. Loans',
  },
];

export default function EmployeesHub() {
  return (
    <>
      <Header />
      <div className="space-y-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 bg-card rounded-2xl shadow-sm border border-border p-5 hover:shadow-lg transition-shadow"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 bg-primary/10"
            >
              {item.icon}
            </div>
            <span className="flex-1 text-lg font-bold text-foreground">{item.label}</span>
            <span className="text-muted-foreground/70 text-xl">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}
