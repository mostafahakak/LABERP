'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import BanksPage from '@/components/finance/BanksPage';

export default function Page() {
  return (
    <DashboardLayout>
      <BanksPage />
    </DashboardLayout>
  );
}
