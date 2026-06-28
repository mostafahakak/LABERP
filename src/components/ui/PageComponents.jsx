'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { ACCENT_COLOR } from '@/lib/utils';

export function PageCard({ title, icon, children, action }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: ACCENT_COLOR }}>{icon}</span>}
          <h2 className="text-lg font-bold text-black">{title}</h2>
        </div>
        {action}
      </div>
      <hr className="mb-4" />
      {children}
    </div>
  );
}

export function TextField({ label, value, onChange, type = 'text', readOnly = false, required = true, maxLines = 1, className = '' }) {
  const Input = maxLines > 1 ? 'textarea' : 'input';
  return (
    <div className={className}>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <Input
        type={maxLines > 1 ? undefined : type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        required={required}
        rows={maxLines > 1 ? maxLines : undefined}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-black focus:outline-none focus:border-[#c3a28e] read-only:bg-gray-50"
      />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, className = '', placeholder = 'Select...' }) {
  return (
    <div className={className}>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-black focus:outline-none focus:border-[#c3a28e] bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export function ResponsiveRow({ children, width }) {
  const fieldsPerRow = width > 1200 ? 3 : width > 800 ? 2 : 1;
  if (fieldsPerRow === 1) {
    return <div className="grid grid-cols-1 gap-4">{children}</div>;
  }
  return (
    <div className={`grid gap-4 grid-cols-${fieldsPerRow}`} style={{ gridTemplateColumns: `repeat(${fieldsPerRow}, minmax(0, 1fr))` }}>
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-10 h-10 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function PlaceholderPage({ title, description }) {
  return (
    <PageCard title={title}>
      <p className="text-gray-600">{description || 'This page mirrors the Flutter ERP module. Full port in progress.'}</p>
    </PageCard>
  );
}
