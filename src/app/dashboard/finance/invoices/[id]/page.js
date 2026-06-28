'use client';

import { Suspense, use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InvoiceDetail from '@/components/finance/InvoiceDetail';

export default function Page({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <InvoiceDetail invoiceId={id} />
      </Suspense>
    </DashboardLayout>
  );
}
