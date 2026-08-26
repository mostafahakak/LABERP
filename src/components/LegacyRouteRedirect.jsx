'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STATIC_SEGMENTS = {
  invoices: new Set(['detail']),
  clients: new Set(['detail']),
  employees: new Set(['detail', 'add', 'list', 'loans', 'salary-history']),
  cases: new Set(['detail', 'edit']),
  clinics: new Set(['detail']),
  items: new Set(['history']),
};

function getLegacyRedirect(pathname, searchParams) {
  const path = pathname.replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'finance' &&
    segments[2] === 'invoices' &&
    segments[3] &&
    !STATIC_SEGMENTS.invoices.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    if (!params.has('type')) params.set('type', 'Income');
    return `/dashboard/finance/invoices/detail?${params.toString()}`;
  }

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'hr' &&
    segments[2] === 'clients' &&
    segments[3] &&
    !STATIC_SEGMENTS.clients.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    return `/dashboard/hr/clients/detail?${params.toString()}`;
  }

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'hr' &&
    segments[2] === 'employees' &&
    segments[3] &&
    !STATIC_SEGMENTS.employees.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    return `/dashboard/hr/employees/detail?${params.toString()}`;
  }

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'workflow' &&
    segments[2] === 'cases' &&
    segments[3] &&
    segments[4] === 'edit' &&
    !STATIC_SEGMENTS.cases.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    return `/dashboard/workflow/cases/edit?${params.toString()}`;
  }

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'workflow' &&
    segments[2] === 'cases' &&
    segments[3] &&
    !STATIC_SEGMENTS.cases.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    return `/dashboard/workflow/cases/detail?${params.toString()}`;
  }

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'workflow' &&
    segments[2] === 'clinics' &&
    segments[3] &&
    !STATIC_SEGMENTS.clinics.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    return `/dashboard/workflow/clinics/detail?${params.toString()}`;
  }

  if (
    segments[0] === 'dashboard' &&
    segments[1] === 'inventory' &&
    segments[2] === 'items' &&
    segments[3] &&
    segments[4] === 'history' &&
    !STATIC_SEGMENTS.items.has(segments[3])
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', segments[3]);
    return `/dashboard/inventory/items/history?${params.toString()}`;
  }

  return null;
}

function LegacyRouteRedirectInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const target = getLegacyRedirect(pathname, searchParams);
    if (target) {
      router.replace(target);
    }
  }, [pathname, searchParams, router]);

  return null;
}

export default function LegacyRouteRedirect() {
  return (
    <Suspense fallback={null}>
      <LegacyRouteRedirectInner />
    </Suspense>
  );
}
