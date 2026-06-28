'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ManageTypesForm } from '@/components/workflow/CrudPages';

export default function ManageTypesPage() {
  return (
    <DashboardLayout>
      <ManageTypesForm />
    </DashboardLayout>
  );
}
