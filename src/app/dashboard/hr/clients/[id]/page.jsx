'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ClientDetail from '@/components/hr/ClientDetail';

export default function Page({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <ClientDetail clientId={id} />
    </DashboardLayout>
  );
}
