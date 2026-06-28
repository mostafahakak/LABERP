'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import UsagePage from '@/components/inventory/UsagePage';

export default function InventoryUsagePage() {
  return (
    <DashboardLayout>
      <UsagePage />
    </DashboardLayout>
  );
}
