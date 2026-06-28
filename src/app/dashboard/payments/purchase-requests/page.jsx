'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ViewPurchaseRequests from '@/components/finance/ViewPurchaseRequests';

export default function Page() {
  return (
    <DashboardLayout>
      <ViewPurchaseRequests />
    </DashboardLayout>
  );
}
