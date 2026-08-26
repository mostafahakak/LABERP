'use client';

import { Suspense } from 'react';
import BankTransactions from '@/components/finance/BankTransactions';

export default function Page() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <BankTransactions />
      </Suspense>
  );
}
