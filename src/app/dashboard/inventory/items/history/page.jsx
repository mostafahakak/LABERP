'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ItemHistoryPage from '@/components/inventory/ItemHistoryPage';

function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const name = searchParams.get('name');
  return (
    <>
      <Link href="/dashboard/inventory/items" className="inline-block mb-4 text-sm text-[#c3a28e] hover:underline">
        ← Back to Items
      </Link>
      <ItemHistoryPage itemId={id} itemName={name || ''} />
    </>
  );
}

export default function ItemHistoryRoute() {
  return (
      <Suspense fallback={<p className="text-center py-8">Loading...</p>}>
        <Content />
      </Suspense>
  );
}
