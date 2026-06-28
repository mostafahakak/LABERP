'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PurchaseOrder from '@/components/finance/PurchaseOrder';

export default function Page() {
  return (
    <DashboardLayout>
      <PurchaseOrder />
    </DashboardLayout>
  );
}
