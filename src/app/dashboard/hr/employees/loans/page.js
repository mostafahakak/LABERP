'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LoanHistory from '@/components/hr/LoanHistory';

export default function Page() {
  return (
    <DashboardLayout>
      <LoanHistory />
    </DashboardLayout>
  );
}
