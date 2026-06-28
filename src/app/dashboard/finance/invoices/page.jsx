'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import InvoiceList from '@/components/finance/InvoiceList';

export default function Page() {
  return (
    <DashboardLayout>
      <InvoiceList />
    </DashboardLayout>
  );
}
