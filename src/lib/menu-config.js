import {
  LayoutDashboard,
  Users,
  BriefcaseMedical,
  DollarSign,
  CreditCard,
  Package,
  Settings,
  Bell,
  Home,
  BarChart3,
  UserCheck,
  Building2,
  Truck,
  FilePlus,
  Eye,
  Receipt,
  Banknote,
  ShoppingCart,
  FileText,
  ClipboardList,
  Boxes,
  Tags,
  ArrowLeftRight,
  Upload,
  Activity,
  Wrench,
  ListChecks,
  Stethoscope,
  UserPlus,
  Briefcase,
  Syringe,
  Hospital,
} from 'lucide-react';

export function getSuperAdminMenu() {
  return [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      children: [
        { title: 'Home', href: '/dashboard', icon: Home },
        { title: 'Summery', href: '/dashboard/summary', icon: BarChart3 },
        { title: 'Charts', href: '/dashboard/charts', icon: Activity },
      ],
    },
    {
      title: 'HR',
      icon: Users,
      href: '/dashboard/hr/employees',
      children: [
        { title: 'HR', href: '/dashboard/hr/employees', icon: UserCheck },
        { title: 'Clients', href: '/dashboard/hr/clients', icon: Building2 },
        { title: 'Suppliers', href: '/dashboard/hr/suppliers', icon: Truck },
        { title: 'Utilities', href: '/dashboard/settings/utilities', icon: Wrench },
        { title: 'Manage Delivery Company', href: '/dashboard/workflow/delivery', icon: Truck },
      ],
    },
    {
      title: 'Workflow',
      icon: BriefcaseMedical,
      href: '/dashboard/workflow/new-case',
      children: [
        { title: 'New cases', href: '/dashboard/workflow/new-case', icon: FilePlus },
        { title: 'View cases', href: '/dashboard/workflow/view-cases', icon: Eye },
        { title: 'Actions', href: '/dashboard/workflow/actions', icon: ListChecks },
        { title: 'Manage Types', href: '/dashboard/workflow/types', icon: Tags },
        { title: 'Manage Clinic', href: '/dashboard/workflow/clinics', icon: Hospital },
        { title: 'Manage Dr', href: '/dashboard/workflow/doctors', icon: Stethoscope },
      ],
    },
    {
      title: 'Finance',
      icon: DollarSign,
      href: '/dashboard/finance',
      children: [
        { title: 'Dashboard', href: '/dashboard/finance', icon: BarChart3 },
        { title: 'View Invoices', href: '/dashboard/finance/invoices', icon: FileText },
        { title: 'View Expenses', href: '/dashboard/finance/expenses', icon: Receipt },
        { title: 'Banks', href: '/dashboard/finance/banks', icon: Banknote },
      ],
    },
    {
      title: 'Payments',
      icon: CreditCard,
      href: '/dashboard/payments/create-invoice',
      children: [
        { title: 'Create New Invoice', href: '/dashboard/payments/create-invoice', icon: FilePlus },
        { title: 'Invoice', href: '/dashboard/payments/case-invoice', icon: FileText },
        { title: 'Pay Expense', href: '/dashboard/payments/pay-expense', icon: Banknote },
        { title: 'Create Purchase Invoice', href: '/dashboard/payments/purchase-invoice', icon: ShoppingCart },
        { title: 'Create Purchase Request', href: '/dashboard/payments/purchase-request', icon: ClipboardList },
        { title: 'View Purchase Requests', href: '/dashboard/payments/purchase-requests', icon: Eye },
      ],
    },
    {
      title: 'Inventory',
      icon: Package,
      href: '/dashboard/inventory/items',
      children: [
        { title: 'Items', href: '/dashboard/inventory/items', icon: Boxes },
        { title: 'Categories', href: '/dashboard/inventory/categories', icon: Tags },
        { title: 'Transactions', href: '/dashboard/inventory/transactions', icon: ArrowLeftRight },
        { title: 'Upload File', href: '/dashboard/inventory/upload', icon: Upload },
        { title: 'Inventory Usage', href: '/dashboard/inventory/usage', icon: Activity },
      ],
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
      children: [
        { title: 'Settings', href: '/dashboard/settings', icon: Settings },
        { title: 'Invoice items', href: '/dashboard/settings/invoice-items', icon: ListChecks },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      href: '/dashboard/notifications',
    },
  ];
}

export function getHrAdminMenu() {
  return [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      children: [
        { title: 'Home', href: '/dashboard', icon: Home },
        { title: 'Charts', href: '/dashboard/charts', icon: Activity },
      ],
    },
    {
      title: 'HR',
      icon: Users,
      href: '/dashboard/hr/employees',
      children: [
        { title: 'HR', href: '/dashboard/hr/employees', icon: UserCheck },
        { title: 'Clients', href: '/dashboard/hr/clients', icon: Building2 },
        { title: 'Suppliers', href: '/dashboard/hr/suppliers', icon: Truck },
        { title: 'Utilities', href: '/dashboard/settings/utilities', icon: Wrench },
        { title: 'Manage Delivery Company', href: '/dashboard/workflow/delivery', icon: Truck },
      ],
    },
    {
      title: 'Workflow',
      icon: BriefcaseMedical,
      href: '/dashboard/workflow/new-case',
      children: [
        { title: 'New cases', href: '/dashboard/workflow/new-case', icon: FilePlus },
        { title: 'View cases', href: '/dashboard/workflow/view-cases', icon: Eye },
        { title: 'Actions', href: '/dashboard/workflow/actions', icon: ListChecks },
        { title: 'Manage Types', href: '/dashboard/workflow/types', icon: Tags },
        { title: 'Manage Clinic', href: '/dashboard/workflow/clinics', icon: Hospital },
        { title: 'Manage Dr', href: '/dashboard/workflow/doctors', icon: Stethoscope },
      ],
    },
    {
      title: 'Finance',
      icon: DollarSign,
      href: '/dashboard/finance',
      children: [
        { title: 'Dashboard', href: '/dashboard/finance', icon: BarChart3 },
        { title: 'View Invoices', href: '/dashboard/finance/invoices', icon: FileText },
        { title: 'View Expenses', href: '/dashboard/finance/expenses', icon: Receipt },
        { title: 'Banks', href: '/dashboard/finance/banks', icon: Banknote },
      ],
    },
    {
      title: 'Payments',
      icon: CreditCard,
      href: '/dashboard/payments/create-invoice',
      children: [
        { title: 'Create New Invoice', href: '/dashboard/payments/create-invoice', icon: FilePlus },
        { title: 'Pay Expense', href: '/dashboard/payments/pay-expense', icon: Banknote },
        { title: 'Create Purchase Invoice', href: '/dashboard/payments/purchase-invoice', icon: ShoppingCart },
        { title: 'Create Purchase Request', href: '/dashboard/payments/purchase-request', icon: ClipboardList },
        { title: 'View Purchase Requests', href: '/dashboard/payments/purchase-requests', icon: Eye },
      ],
    },
    {
      title: 'Inventory',
      icon: Package,
      href: '/dashboard/inventory/items',
      children: [
        { title: 'Items', href: '/dashboard/inventory/items', icon: Boxes },
        { title: 'Categories', href: '/dashboard/inventory/categories', icon: Tags },
        { title: 'Transactions', href: '/dashboard/inventory/transactions', icon: ArrowLeftRight },
        { title: 'Upload File', href: '/dashboard/inventory/upload', icon: Upload },
        { title: 'Inventory Usage', href: '/dashboard/inventory/usage', icon: Activity },
      ],
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
      children: [
        { title: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
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
