'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import SalaryHistory from '@/components/hr/SalaryHistory';

export default function Page() {
  return (
    <DashboardLayout>
      <SalaryHistory />
    </DashboardLayout>
  );
}
