'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ViewCasesForm from '@/components/workflow/ViewCasesForm';

export default function ViewCasesPage() {
  return (
    <DashboardLayout>
      <ViewCasesForm />
    </DashboardLayout>
  );
}
