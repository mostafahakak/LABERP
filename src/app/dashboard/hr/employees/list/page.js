'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeList from '@/components/hr/EmployeeList';

export default function Page() {
  return (
    <DashboardLayout>
      <EmployeeList />
    </DashboardLayout>
  );
}
