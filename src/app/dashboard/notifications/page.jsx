'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import NotificationsPageContent from '@/components/notifications/NotificationsPageContent';

export default function Page() {
  return (
    <DashboardLayout>
      <NotificationsPageContent />
    </DashboardLayout>
  );
}
