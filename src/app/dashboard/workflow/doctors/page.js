'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ManageDrsForm } from '@/components/workflow/CrudPages';

export default function ManageDrsPage() {
  return (
    <DashboardLayout>
      <ManageDrsForm />
    </DashboardLayout>
  );
}
