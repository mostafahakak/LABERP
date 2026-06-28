'use client';

import { useMenu } from './DashboardLayout';
import { Button } from '@/components/ui/button';

export default function Header({ title }) {
  const { openMenu } = useMenu();

  return (
    <div className="flex items-center gap-3 mb-5 lg:hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={openMenu}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>
      {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
    </div>
  );
}
