'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ManageDeliveryForm } from '@/components/workflow/CrudPages';

export default function ManageDeliveryPage() {
  return (
    <DashboardLayout>
      <ManageDeliveryForm />
    </DashboardLayout>
  );
}
