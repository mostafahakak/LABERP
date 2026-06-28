'use client';

import { useMenu } from './DashboardLayout';

export default function Header({ title }) {
  const { openMenu } = useMenu();

  return (
    <div className="flex items-center gap-3 mb-4 lg:hidden">
      <button
        type="button"
        onClick={openMenu}
        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {title && <h1 className="text-lg font-semibold text-black">{title}</h1>}
    </div>
  );
}
