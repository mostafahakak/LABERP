'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ClinicDetailForm from '@/components/workflow/ClinicDetailForm';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <ClinicDetailForm clinicId={id} />;
}

export default function ClinicDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
    </DashboardLayout>
  );
}
