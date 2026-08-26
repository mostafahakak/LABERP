'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceDetail from '@/components/finance/InvoiceDetail';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const type = searchParams.get('type') || 'Income';
  return <InvoiceDetail invoiceId={id} type={type} />;
}

export default function Page() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
  );
}
