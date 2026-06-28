'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { ManageClinicsForm } from '@/components/workflow/CrudPages';

export default function ManageClinicsPage() {
  return (
    <DashboardLayout>
      <ManageClinicsForm />
    </DashboardLayout>
  );
}
