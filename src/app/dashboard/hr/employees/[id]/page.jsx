'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeProfile from '@/components/hr/EmployeeProfile';

export default function Page({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <EmployeeProfile userId={id} />
    </DashboardLayout>
  );
}
