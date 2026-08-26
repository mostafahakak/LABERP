export function getItemSuppliers(item) {
  if (!item) return [];
  const names = [];
  if (Array.isArray(item.suppliers)) {
    for (const supplier of item.suppliers) {
      const name = String(supplier || '').trim();
      if (name) names.push(name);
    }
  }
  const primary = String(item.supplier || '').trim();
  if (primary) names.push(primary);

  const seen = new Set();
  const unique = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

export function itemBelongsToSupplier(item, supplierName) {
  const target = String(supplierName || '').trim().toLowerCase();
  if (!target) return false;
  return getItemSuppliers(item).some((name) => name.toLowerCase() === target);
}

export function formatItemSuppliers(item) {
  const names = getItemSuppliers(item);
  return names.length ? names.join(', ') : 'N/A';
}
