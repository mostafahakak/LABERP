'use client';

import { Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BankTransactions from '@/components/finance/BankTransactions';

export default function Page() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <BankTransactions />
      </Suspense>
    </DashboardLayout>
  );
}
