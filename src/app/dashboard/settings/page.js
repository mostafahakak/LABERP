'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsPageContent from '@/components/settings/SettingsPageContent';

export default function Page() {
  return (
    <DashboardLayout>
      <SettingsPageContent />
    </DashboardLayout>
  );
}
