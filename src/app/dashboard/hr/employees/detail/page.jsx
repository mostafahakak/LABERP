'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EmployeeProfile from '@/components/hr/EmployeeProfile';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <EmployeeProfile userId={id} />;
}

export default function Page() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
  );
}
