'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FinanceScreen from '@/components/finance/FinanceScreen';

export default function Page() {
  return (
    <DashboardLayout>
      <FinanceScreen />
    </DashboardLayout>
  );
}
