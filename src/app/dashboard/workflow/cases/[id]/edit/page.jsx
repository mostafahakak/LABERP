'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EditCaseForm from '@/components/workflow/EditCaseForm';

export default function EditCasePage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <EditCaseForm caseId={id} />
    </DashboardLayout>
  );
}
