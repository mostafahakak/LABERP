'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PaySalaries from '@/components/finance/PaySalaries';

export default function Page() {
  return (
    <DashboardLayout>
      <PaySalaries />
    </DashboardLayout>
  );
}
