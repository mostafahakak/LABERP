'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreatePurchaseRequest from '@/components/finance/CreatePurchaseRequest';

export default function Page() {
  return (
    <DashboardLayout>
      <CreatePurchaseRequest />
    </DashboardLayout>
  );
}
