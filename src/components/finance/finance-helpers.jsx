import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatTime } from '@/lib/utils';

export const EXPENSE_TYPES = [
  'Salary',
  'Loan',
  'Bonus',
  'Utility',
  'Lab',
  'Purchase Invoice',
  'Invoice Payment',
];

export const DEFAULT_EXPENSE_TYPES = EXPENSE_TYPES;

export function calcCardFee(bankName, amount) {
  if (bankName === 'Card') return amount * 0.02;
  return 0;
}

export function calcNetAmountToBank(bankName, amount) {
  return amount - calcCardFee(bankName, amount);
}

export async function fetchBanksAndDRAccounts() {
  const [banksSnap, drSnap] = await Promise.all([
    getDocs(collection(db, 'Banks')),
    getDocs(query(collection(db, 'Users'), where('type', '==', 'Admin'))),
  ]);
  const accounts = [];
  banksSnap.docs.forEach((d) => {
    accounts.push({
      id: d.id,
      name: d.data().name,
      balance: Number(d.data().balance) || 0,
      sourceCollection: 'Banks',
    });
  });
  drSnap.docs.forEach((d) => {
    accounts.push({
      id: d.id,
      name: d.data().name || `DR User ${d.id.substring(0, 4)}`,
      balance: Number(d.data().balance) || 0,
      sourceCollection: 'Users',
    });
  });
  return accounts;
}

export function filterByDateRange(items, startDate, endDate, dateField = 'Date') {
  return items.filter((item) => {
    const docDate = item[dateField];
    if (!docDate) return true;
    const start = startDate || '2000-01-01';
    const end = endDate || '2100-12-31';
    return docDate >= start && docDate <= end;
  });
}

export function filterByBranch(items, branch, field = 'branch') {
  if (!branch || branch === 'All Branches') return items;
  return items.filter((item) => item[field] === branch);
}

export function buildFinancialTree(logsData, notificationsData, assetsData, { selectedBranch, startDate, endDate }) {
  let filteredLogs = filterByBranch(logsData, selectedBranch);
  filteredLogs = filterByDateRange(
    filteredLogs,
    startDate ? formatDate(startDate) : null,
    endDate ? formatDate(endDate) : null
  );

  let filteredNotifications = filterByBranch(notificationsData, selectedBranch);
  filteredNotifications = filterByDateRange(
    filteredNotifications,
    startDate ? formatDate(startDate) : null,
    endDate ? formatDate(endDate) : null,
    'date'
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalCardFees = 0;
  const incomeByName = {};
  const expenseByName = {};
  const incomeCount = {};
  const expenseCount = {};

  filteredLogs.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const type = item.type || '';
    const name = item.name || 'Unknown';
    const bank = item.bank || '';
    if (type === 'Income') {
      totalIncome += amount;
      incomeByName[name] = (incomeByName[name] || 0) + amount;
      incomeCount[name] = (incomeCount[name] || 0) + 1;
      if (bank === 'Card') totalCardFees += amount * 0.02;
    } else if (type === 'Expense') {
      totalExpenses += amount;
      expenseByName[name] = (expenseByName[name] || 0) + amount;
      expenseCount[name] = (expenseCount[name] || 0) + 1;
    }
  });

  let totalRemainingPayments = 0;
  let totalPaymentsDue = 0;
  const remainingPaymentsByName = {};
  const paymentsDueByName = {};
  const remainingPaymentsCount = {};
  const paymentsDueCount = {};

  filteredNotifications.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const type = item.type || '';
    const name = item.name || 'Unknown';
    const status = item.status || '';
    if (type === 'Invoice' && status === 'Remaining') {
      totalRemainingPayments += amount;
      remainingPaymentsByName[name] = (remainingPaymentsByName[name] || 0) + amount;
      remainingPaymentsCount[name] = (remainingPaymentsCount[name] || 0) + 1;
    } else if (type === 'Invoice Payment' || type === 'Salary' || type === 'Purchase') {
      totalPaymentsDue += amount;
      let category;
      if (type === 'Salary') category = `Salary: ${name}`;
      else if (type === 'Purchase') category = `Purchase: ${name}`;
      else category = `Invoice Payment: ${name}`;
      paymentsDueByName[category] = (paymentsDueByName[category] || 0) + amount;
      paymentsDueCount[category] = (paymentsDueCount[category] || 0) + 1;
    }
  });

  const now = new Date();
  let totalAssetsValue = 0;
  const assetsByName = {};
  const assetsCount = {};
  assetsData.forEach((asset) => {
    const price = Number(asset.actualPrice) || 0;
    const quantity = Number(asset.quantity) || 0;
    const usePercent = Number(asset.usePercent) || 0;
    const dateOfPurchaseStr = asset.dateOfPurchase?.toString() || '';
    let totalActualValue = price * quantity;
    if (dateOfPurchaseStr && usePercent > 0) {
      try {
        const purchaseDate = new Date(dateOfPurchaseStr);
        const yearsSincePurchase = (now - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);
        const depreciationPercent = Math.min(100, Math.max(0, yearsSincePurchase * usePercent));
        totalActualValue = price * ((100 - depreciationPercent) / 100) * quantity;
      } catch {
        totalActualValue = price * quantity;
      }
    }
    const name = asset.name || 'Unknown Asset';
    totalAssetsValue += totalActualValue;
    assetsByName[name] = (assetsByName[name] || 0) + totalActualValue;
    assetsCount[name] = (assetsCount[name] || 0) + 1;
  });

  const totalExpensesOnly = totalExpenses + totalCardFees;
  const netProfit = totalIncome - totalExpensesOnly;

  const mkChildren = (map, countMap, prefix, type) =>
    Object.entries(map).map(([key, value]) => ({
      id: `${prefix}_${key}`,
      title: key,
      subtitle: `${countMap[key] || 0} transaction(s)`,
      amount: value,
      type,
      metadata: {
        count: countMap[key] || 0,
        avg: ((value / (countMap[key] || 1)).toFixed(2)),
      },
    }));

  const expenseChildren = mkChildren(expenseByName, expenseCount, 'expense', 'expense');
  if (totalCardFees > 0) {
    expenseChildren.unshift({
      id: 'card_fees',
      title: 'Card Fees (2%)',
      subtitle: 'Payment processing fees',
      amount: totalCardFees,
      type: 'expense',
      metadata: {},
    });
  }

  const rootChildren = [
    {
      id: 'profit',
      title: 'Net Profit',
      subtitle: 'Revenue - Expenses',
      amount: netProfit,
      type: 'balance',
      children: [
        {
          id: 'income',
          title: 'Total Income',
          subtitle: 'All revenue sources',
          amount: totalIncome,
          type: 'income',
          children: mkChildren(incomeByName, incomeCount, 'income', 'income'),
        },
        {
          id: 'expenses',
          title: 'Total Expenses',
          subtitle: 'Operational costs only',
          amount: totalExpensesOnly,
          type: 'expense',
          children: expenseChildren,
        },
      ],
    },
  ];

  if (totalRemainingPayments > 0) {
    rootChildren.push({
      id: 'remaining_payments',
      title: 'Payment in Advance',
      subtitle: 'Outstanding payments from clients (Not in calculation)',
      amount: totalRemainingPayments,
      type: 'balance',
      children: mkChildren(remainingPaymentsByName, remainingPaymentsCount, 'remaining', 'expense'),
    });
  }
  if (totalPaymentsDue > 0) {
    rootChildren.push({
      id: 'payments_due',
      title: 'Liabilities',
      subtitle: 'Invoice payments, salaries & purchases due (Not in calculation)',
      amount: totalPaymentsDue,
      type: 'balance',
      children: mkChildren(paymentsDueByName, paymentsDueCount, 'payment_due', 'expense'),
    });
  }
  if (totalAssetsValue > 0) {
    rootChildren.push({
      id: 'assets',
      title: 'Assets',
      subtitle: 'Total actual value of all assets (Not in calculation)',
      amount: totalAssetsValue,
      type: 'balance',
      children: mkChildren(assetsByName, assetsCount, 'asset', 'balance'),
    });
  }

  let period = 'All Time';
  if (startDate && endDate) period = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  else if (startDate) period = `From ${formatDate(startDate)}`;
  else if (endDate) period = `Until ${formatDate(endDate)}`;

  return {
    root: {
      id: 'root',
      title: selectedBranch === 'All Branches' ? 'Ozel Dental Clinic' : selectedBranch,
      subtitle: `Financial Overview - ${period}`,
      amount: 0,
      type: 'balance',
      children: rootChildren,
    },
    totalIncome,
    totalExpenses: totalExpensesOnly,
    netProfit,
    period,
  };
}

/** Create Purchase Invoice Finance doc (PurchaseOrder / deliver request) */
export async function createPurchaseInvoice({
  user,
  supplierId,
  supplierName,
  supplierBalanceBefore,
  selectedAccount,
  items,
  total,
  paidAmount,
  isFullPayment,
  note,
  date,
  time,
}) {
  const remaining = isFullPayment ? 0 : total - paidAmount;
  const isUserAccount = selectedAccount.sourceCollection === 'Users';
  const bankBalanceBefore = selectedAccount.balance;
  const bankBalanceAfter = isUserAccount
    ? bankBalanceBefore + paidAmount
    : bankBalanceBefore - paidAmount;
  const supplierBalanceAfter = supplierBalanceBefore + total - paidAmount;

  const financeRef = doc(collection(db, 'Finance'));
  await setDoc(financeRef, {
    Date: date,
    Time: time,
    adminID: user.uid,
    userID: supplierId,
    name: supplierName,
    phone: '',
    bank: selectedAccount.name,
    bankId: selectedAccount.id,
    bankBalanceBefore,
    bankBalanceAfter,
    branch: user.branch || 'New cairo',
    branchTo: user.branch || 'New cairo',
    discount: 0,
    drAmount: 0,
    drBalanceAfter: supplierBalanceAfter,
    drBalanceBefore: supplierBalanceBefore,
    drName: supplierName,
    drPaymentType: '',
    drPercent: 0,
    installmentMonths: 0,
    note: note || (isFullPayment ? 'Full payment for purchase' : 'Partial payment for purchase'),
    paidAmount,
    paymentPlan: isFullPayment ? 'Full Payment' : 'Partial Payment',
    remainingAmount: remaining,
    status: remaining <= 0 ? 'Paid' : 'Remaining',
    total,
    type: 'Purchase Invoice',
    documentID: financeRef.id,
  });

  if (!isFullPayment && remaining > 0) {
    await addDoc(collection(db, 'Notifications'), {
      name: supplierName,
      type: 'Purchase',
      amount: remaining,
      quantity: 0,
      docID: financeRef.id,
      collectionName: 'Finance',
      date,
      time,
      status: 'Remaining',
      branch: user.branch || 'New cairo',
    });
  }

  await addDoc(collection(db, 'Finance', financeRef.id, 'Payments'), {
    Date: date,
    Time: time,
    paidAmount,
    bank: selectedAccount.name,
    bankId: selectedAccount.id,
    paymentMethod: 'Cash',
    cardFee: 0,
    netAmountToBank: paidAmount,
    balanceBefore: bankBalanceBefore,
    balanceAfter: bankBalanceAfter,
  });

  const batch = writeBatch(db);
  for (const item of items) {
    const itemId = item.itemId || item.id;
    batch.set(doc(db, 'Finance', financeRef.id, 'Items', itemId), {
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    });
    if (item.docRef) {
      batch.update(item.docRef, { quantity: increment(item.quantity) });
    } else if (itemId) {
      batch.update(doc(db, 'Items', itemId), { quantity: increment(item.quantity) });
    }
    await addDoc(collection(db, 'Inventory'), {
      Time: time,
      Date: date,
      userId: user.uid,
      userName: user.name,
      usageType: 'In',
      itemId,
      itemName: item.name,
      quantityUsed: item.quantity,
      previousStock: item.previousStock ?? 0,
      newStock: (item.previousStock ?? 0) + item.quantity,
      category: supplierName,
      supplier: supplierName,
      amount: item.price * item.quantity,
      docID: financeRef.id,
    });
  }

  if (isUserAccount) {
    batch.update(doc(db, 'Users', selectedAccount.id), { balance: increment(paidAmount) });
  } else {
    batch.update(doc(db, 'Banks', selectedAccount.id), { balance: increment(-paidAmount) });
  }
  batch.update(doc(db, 'Suppliers', supplierId), { balance: supplierBalanceAfter });
  await batch.commit();

  await addDoc(collection(db, 'Logs'), {
    actionID: financeRef.id,
    section: 'Finance',
    adminID: user.uid,
    adminName: user.name,
    branch: user.branch || 'New cairo',
    type: 'Expense',
    bank: selectedAccount.name,
    name: 'Purchase Invoice',
    Time: time,
    Date: date,
    amount: paidAmount,
    cName: supplierName,
  });

  return financeRef.id;
}

export async function loadInvoiceItems(invoiceId) {
  const snap = await getDocs(collection(db, 'Finance', invoiceId, 'Items'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function loadInvoicePayments(invoiceId) {
  const snap = await getDocs(collection(db, 'Finance', invoiceId, 'Payments'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
