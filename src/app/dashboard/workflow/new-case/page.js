'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import NewCaseForm from '@/components/workflow/NewCaseForm';

export default function NewCasePage() {
  return (
    <DashboardLayout>
      <NewCaseForm />
    </DashboardLayout>
  );
}
