'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeProfile from '@/components/hr/EmployeeProfile';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <EmployeeProfile userId={id} />;
}

export default function Page() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
    </DashboardLayout>
  );
}
