'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ChartsPageContent from '@/components/charts/ChartsPageContent';

export default function Page() {
  return (
    <DashboardLayout>
      <ChartsPageContent />
    </DashboardLayout>
  );
}
