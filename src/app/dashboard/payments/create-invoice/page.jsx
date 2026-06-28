'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateInvoice from '@/components/finance/CreateInvoice';

export default function Page() {
  return (
    <DashboardLayout>
      <CreateInvoice />
    </DashboardLayout>
  );
}
