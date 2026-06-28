'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeesHub from '@/components/hr/EmployeesHub';

export default function Page() {
  return (
    <DashboardLayout>
      <EmployeesHub />
    </DashboardLayout>
  );
}
