'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default function Header({ title }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <SidebarTrigger className="-ml-1" />
      {title && (
        <>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </>
      )}
    </div>
  );
}
