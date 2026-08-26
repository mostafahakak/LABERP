'use client';

import Header from '@/components/layout/Header';
import { PlaceholderPage } from '@/components/ui/PageComponents';

export default function ModulePage({ title, description }) {
  return (
    <>
      <Header />
      <PlaceholderPage title={title} description={description} />
    </>
  );
}
