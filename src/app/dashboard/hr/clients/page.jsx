'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ClientsList from '@/components/hr/ClientsList';

export default function Page() {
  return (
    <DashboardLayout>
      <ClientsList />
    </DashboardLayout>
  );
}
