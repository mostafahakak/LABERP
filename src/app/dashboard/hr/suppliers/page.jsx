'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import SuppliersPage from '@/components/finance/SuppliersPage';

export default function Page() {
  return (
    <DashboardLayout>
      <SuppliersPage />
    </DashboardLayout>
  );
}
