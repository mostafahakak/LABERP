'use client';

import { Suspense } from 'react';
import ViewSupplier from '@/components/finance/ViewSupplier';

export default function Page() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <ViewSupplier />
      </Suspense>
  );
}
