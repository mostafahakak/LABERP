'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ItemsPage from '@/components/inventory/ItemsPage';

export default function InventoryItemsPage() {
  return (
    <DashboardLayout>
      <ItemsPage />
    </DashboardLayout>
  );
}
