'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CaseDetailForm from '@/components/workflow/CaseDetailForm';

export default function CaseDetailPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <CaseDetailForm caseId={id} />
    </DashboardLayout>
  );
}
