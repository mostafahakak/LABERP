import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const ACCENT_COLOR = '#c2a18c';
export const SHELL_BG = '#30394d';
export const PRIMARY_COLOR = '#c2a18c';

export function formatPrice(price) {
  const num = Number(price) || 0;
  const [intPart, decPart] = String(num).split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${formatted}.${decPart}` : formatted;
}

export function formatPriceLE(price) {
  return `${formatPrice(price)} LE`;
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseDueDate(raw) {
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function isDelayed(data) {
  const dueRaw = data.dueDate || data.caseRequestDate;
  const due = parseDueDate(dueRaw);
  if (!due) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  // Alert 1 day before the due date
  const alertDay = new Date(dueDay);
  alertDay.setDate(alertDay.getDate() - 1);
  return now >= alertDay;
}

export function isOverdue(data) {
  const dueRaw = data.dueDate || data.caseRequestDate;
  const due = parseDueDate(dueRaw);
  if (!due) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return now > dueDay;
}

export function shortId(id) {
  return id ? id.substring(0, 8) : '';
}

export function getFieldsPerRow(width) {
  if (width > 1200) return 3;
  if (width > 800) return 2;
  return 1;
}
