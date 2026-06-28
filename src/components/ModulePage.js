'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { PlaceholderPage } from '@/components/ui/PageComponents';

export default function ModulePage({ title, description }) {
  return (
    <DashboardLayout>
      <Header />
      <PlaceholderPage title={title} description={description} />
    </DashboardLayout>
  );
}
