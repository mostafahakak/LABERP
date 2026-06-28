'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ClinicDetailForm from '@/components/workflow/ClinicDetailForm';

export default function ClinicDetailPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <ClinicDetailForm clinicId={id} />
    </DashboardLayout>
  );
}
