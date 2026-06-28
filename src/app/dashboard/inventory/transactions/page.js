'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import TransactionsPage from '@/components/inventory/TransactionsPage';

export default function InventoryTransactionsPage() {
  return (
    <DashboardLayout>
      <TransactionsPage />
    </DashboardLayout>
  );
}
