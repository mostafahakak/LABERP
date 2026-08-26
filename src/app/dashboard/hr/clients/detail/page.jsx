'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientDetail from '@/components/hr/ClientDetail';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <ClientDetail clientId={id} />;
}

export default function Page() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
  );
}
