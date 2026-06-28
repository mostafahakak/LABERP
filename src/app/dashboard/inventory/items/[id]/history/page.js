'use client';

import { use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ItemHistoryPage from '@/components/inventory/ItemHistoryPage';

export default function ItemHistoryRoute({ params, searchParams }) {
  const { id } = use(params);
  const { name } = use(searchParams);

  return (
    <DashboardLayout>
      <Link
        href="/dashboard/inventory/items"
        className="inline-block mb-4 text-sm text-[#c3a28e] hover:underline"
      >
        ← Back to Items
      </Link>
      <ItemHistoryPage itemId={id} itemName={name || ''} />
    </DashboardLayout>
  );
}
