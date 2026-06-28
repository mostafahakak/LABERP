export function getSuperAdminMenu() {
  return [
    {
      title: 'Dashboard',
      href: '/dashboard',
      children: [
        { title: 'Home', href: '/dashboard' },
        { title: 'Summery', href: '/dashboard/summary' },
        { title: 'Charts', href: '/dashboard/charts' },
      ],
    },
    {
      title: 'HR',
      href: '/dashboard/hr/employees',
      children: [
        { title: 'HR', href: '/dashboard/hr/employees' },
        { title: 'Clients', href: '/dashboard/hr/clients' },
        { title: 'Suppliers', href: '/dashboard/hr/suppliers' },
      ],
    },
    {
      title: 'Workflow',
      href: '/dashboard/workflow/new-case',
      children: [
        { title: 'New cases', href: '/dashboard/workflow/new-case' },
        { title: 'View cases', href: '/dashboard/workflow/view-cases' },
        { title: 'Actions', href: '/dashboard/workflow/actions' },
        { title: 'Manage Types', href: '/dashboard/workflow/types' },
        { title: 'Manage Clinic', href: '/dashboard/workflow/clinics' },
        { title: 'Manage Dr', href: '/dashboard/workflow/doctors' },
      ],
    },
    {
      title: 'Finance',
      href: '/dashboard/finance',
      children: [
        { title: 'Dashboard', href: '/dashboard/finance' },
        { title: 'View Invoices', href: '/dashboard/finance/invoices' },
        { title: 'View Expenses', href: '/dashboard/finance/expenses' },
        { title: 'Banks', href: '/dashboard/finance/banks' },
      ],
    },
    {
      title: 'Payments',
      href: '/dashboard/payments/create-invoice',
      children: [
        { title: 'Create New Invoice', href: '/dashboard/payments/create-invoice' },
        { title: 'Invoice', href: '/dashboard/payments/case-invoice' },
        { title: 'Pay Expense', href: '/dashboard/payments/pay-expense' },
        { title: 'Create Purchase Invoice', href: '/dashboard/payments/purchase-invoice' },
        { title: 'Create Purchase Request', href: '/dashboard/payments/purchase-request' },
        { title: 'View Purchase Requests', href: '/dashboard/payments/purchase-requests' },
      ],
    },
    {
      title: 'Inventory',
      href: '/dashboard/inventory/items',
      children: [
        { title: 'Items', href: '/dashboard/inventory/items' },
        { title: 'Categories', href: '/dashboard/inventory/categories' },
        { title: 'Transactions', href: '/dashboard/inventory/transactions' },
        { title: 'Upload File', href: '/dashboard/inventory/upload' },
        { title: 'Inventory Usage', href: '/dashboard/inventory/usage' },
      ],
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      children: [
        { title: 'Settings', href: '/dashboard/settings' },
        { title: 'Utilities', href: '/dashboard/settings/utilities' },
        { title: 'Invoice items', href: '/dashboard/settings/invoice-items' },
        { title: 'Manage Delivery Company', href: '/dashboard/workflow/delivery' },
      ],
    },
    {
      title: 'Notifications',
      href: '/dashboard/notifications',
    },
  ];
}

export function getHrAdminMenu() {
  return [
    {
      title: 'Dashboard',
      href: '/dashboard',
      children: [
        { title: 'Home', href: '/dashboard' },
        { title: 'Charts', href: '/dashboard/charts' },
      ],
    },
    {
      title: 'HR',
      href: '/dashboard/hr/employees',
      children: [
        { title: 'HR', href: '/dashboard/hr/employees' },
        { title: 'Clients', href: '/dashboard/hr/clients' },
        { title: 'Suppliers', href: '/dashboard/hr/suppliers' },
      ],
    },
    {
      title: 'Workflow',
      href: '/dashboard/workflow/new-case',
      children: [
        { title: 'New cases', href: '/dashboard/workflow/new-case' },
        { title: 'View cases', href: '/dashboard/workflow/view-cases' },
        { title: 'Actions', href: '/dashboard/workflow/actions' },
        { title: 'Manage Types', href: '/dashboard/workflow/types' },
        { title: 'Manage Clinic', href: '/dashboard/workflow/clinics' },
        { title: 'Manage Dr', href: '/dashboard/workflow/doctors' },
        { title: 'Manage Delivery Company', href: '/dashboard/workflow/delivery' },
      ],
    },
    {
      title: 'Finance',
      href: '/dashboard/finance',
      children: [
        { title: 'Dashboard', href: '/dashboard/finance' },
        { title: 'View Invoices', href: '/dashboard/finance/invoices' },
        { title: 'View Expenses', href: '/dashboard/finance/expenses' },
        { title: 'Banks', href: '/dashboard/finance/banks' },
      ],
    },
    {
      title: 'Payments',
      href: '/dashboard/payments/create-invoice',
      children: [
        { title: 'Create New Invoice', href: '/dashboard/payments/create-invoice' },
        { title: 'Pay Expense', href: '/dashboard/payments/pay-expense' },
        { title: 'Create Purchase Invoice', href: '/dashboard/payments/purchase-invoice' },
        { title: 'Create Purchase Request', href: '/dashboard/payments/purchase-request' },
        { title: 'View Purchase Requests', href: '/dashboard/payments/purchase-requests' },
      ],
    },
    {
      title: 'Inventory',
      href: '/dashboard/inventory/items',
      children: [
        { title: 'Items', href: '/dashboard/inventory/items' },
        { title: 'Categories', href: '/dashboard/inventory/categories' },
        { title: 'Transactions', href: '/dashboard/inventory/transactions' },
        { title: 'Upload File', href: '/dashboard/inventory/upload' },
        { title: 'Inventory Usage', href: '/dashboard/inventory/usage' },
      ],
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      children: [
        { title: 'Settings', href: '/dashboard/settings' },
        { title: 'Utilities', href: '/dashboard/settings/utilities' },
      ],
    },
    {
      title: 'Notifications',
      href: '/dashboard/notifications',
    },
  ];
}

export function getMenuForUserType(type) {
  if (type === 'HR' || type === 'Sales') {
    return getHrAdminMenu();
  }
  return getSuperAdminMenu();
}
