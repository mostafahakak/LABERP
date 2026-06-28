'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import InvoiceItemsPageContent from '@/components/payments/InvoiceItemsPageContent';

export default function Page() {
  return (
    <DashboardLayout>
      <InvoiceItemsPageContent />
    </DashboardLayout>
  );
}
