export const ACCENT_COLOR = '#c3a28e';
export const SHELL_BG = '#171821';
export const PRIMARY_COLOR = '#A9DFD8';

export function formatPrice(price) {
  const num = Number(price) || 0;
  return num % 1 === 0 ? String(Math.trunc(num)) : String(num);
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return dueDay <= today;
}

export function shortId(id) {
  return id ? id.substring(0, 8) : '';
}

export function getFieldsPerRow(width) {
  if (width > 1200) return 3;
  if (width > 800) return 2;
  return 1;
}
