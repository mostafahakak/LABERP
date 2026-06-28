'use client';

import { Toaster } from 'react-hot-toast';

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: '0.75rem',
          padding: '12px 14px',
          fontSize: '14px',
        },
      }}
    />
  );
}
