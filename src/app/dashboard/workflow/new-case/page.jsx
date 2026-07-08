'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NewCaseForm from '@/components/workflow/NewCaseForm';

function Content() {
  const searchParams = useSearchParams();
  const editCaseId = searchParams.get('id');
  return <NewCaseForm editCaseId={editCaseId} />;
}

export default function NewCasePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
    </DashboardLayout>
  );
}
