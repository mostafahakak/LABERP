'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ExpensesList from '@/components/finance/ExpensesList';

export default function Page() {
  return (
    <DashboardLayout>
      <ExpensesList />
    </DashboardLayout>
  );
}
