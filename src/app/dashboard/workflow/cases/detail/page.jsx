'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CaseDetailForm from '@/components/workflow/CaseDetailForm';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <CaseDetailForm caseId={id} />;
}

export default function CaseDetailPage() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
  );
}
