'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EditCaseForm from '@/components/workflow/EditCaseForm';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <EditCaseForm caseId={id} />;
}

export default function EditCasePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
    </DashboardLayout>
  );
}
