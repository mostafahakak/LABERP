'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClinicDetailForm from '@/components/workflow/ClinicDetailForm';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <ClinicDetailForm clinicId={id} />;
}

export default function ClinicDetailPage() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
  );
}
