'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CaseInvoice from '@/components/finance/CaseInvoice';

export default function Page() {
  return (
    <DashboardLayout>
      <CaseInvoice />
    </DashboardLayout>
  );
}
