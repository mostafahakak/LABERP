'use client';

import { Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ViewSupplier from '@/components/finance/ViewSupplier';

export default function Page() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <ViewSupplier />
      </Suspense>
    </DashboardLayout>
  );
}
