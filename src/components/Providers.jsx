'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={0}>
        <AuthProvider>{children}</AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
