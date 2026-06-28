'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from 'lucide-react';

export default function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={className}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
