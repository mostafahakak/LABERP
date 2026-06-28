'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function PageCard({ title, icon, children, action, className }) {
  return (
    <Card className={cn('shadow-sm border-border/60 mb-5', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </CardTitle>
          {action}
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function TextField({ label, value, onChange, type = 'text', readOnly = false, required = true, maxLines = 1, className = '' }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-muted-foreground">{label}</Label>
      {maxLines > 1 ? (
        <textarea
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          required={required}
          rows={maxLines}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 read-only:bg-muted read-only:cursor-default transition-colors"
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          required={required}
        />
      )}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, className = '', placeholder = 'Select...' }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label className="text-muted-foreground">{label}</Label>}
      <Select value={value || ''} onValueChange={(val) => onChange(val || null)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ResponsiveRow({ children, width }) {
  const fieldsPerRow = width > 1200 ? 3 : width > 800 ? 2 : 1;
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${fieldsPerRow}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

export function Snackbar({ message, isError, onClose }) {
  const lastShownMessageRef = useRef('');

  useEffect(() => {
    if (!message || lastShownMessageRef.current === message) return;

    lastShownMessageRef.current = message;
    if (isError) {
      toast.error(message);
    } else {
      toast.success(message);
    }

    if (onClose) onClose();
  }, [isError, message, onClose]);

  useEffect(() => {
    if (!message) {
      lastShownMessageRef.current = '';
    }
  }, [message]);

  return null;
}

export function LoadingOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground font-medium">Loading...</span>
      </div>
    </div>
  );
}

export function PlaceholderPage({ title, description }) {
  return (
    <PageCard title={title}>
      <p className="text-muted-foreground">{description || 'This page mirrors the Flutter ERP module. Full port in progress.'}</p>
    </PageCard>
  );
}
