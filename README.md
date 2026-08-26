# 360 Lab ERP — Web (Next.js)

Full JavaScript/Next.js port of the Flutter **laberp** app, connected to Firebase **`lab360erp`**.

## Run

```bash
cd laberp-web
npm install
npm run dev
```

Open http://localhost:3000 — login with the same credentials as the Flutter app.

## Modules (Flutter parity)

| Module | Routes | Status |
|--------|--------|--------|
| **Auth** | `/login` | ✅ |
| **Dashboard** | `/dashboard` | ✅ Logs, charts, activity |
| **Summary** | `/dashboard/summary` | ✅ Financial tree |
| **Charts** | `/dashboard/charts` | ✅ |
| **HR Employees** | `/dashboard/hr/employees/*` | ✅ List, add, profile, salary/loan history |
| **HR Clients** | `/dashboard/hr/clients/*` | ✅ List, detail, invoices |
| **HR Suppliers** | `/dashboard/hr/suppliers` | ✅ CRUD + view transactions |
| **Workflow** | `/dashboard/workflow/*` | ✅ Cases, types, clinics, doctors, delivery, actions |
| **Finance** | `/dashboard/finance/*` | ✅ Dashboard, invoices, expenses, banks |
| **Payments** | `/dashboard/payments/*` | ✅ Create invoice, case invoice, purchase, pay expense |
| **Inventory** | `/dashboard/inventory/*` | ✅ Items, categories, transactions, usage, CSV upload |
| **Settings** | `/dashboard/settings` | ✅ Logout, calculate salaries, invoice items, utilities |
| **Notifications** | `/dashboard/notifications` | ✅ |

## Firebase

Same web config as Flutter (`lab360erp`). Session stored in `localStorage` key `UID`.

## Deploy to Firebase Hosting

**Important:** Always deploy from the `laberp-web` folder, not the Flutter project root.

```bash
cd laberp-web
npm run deploy
```

This runs `next build` (static export to `out/`) then `firebase deploy --only hosting`.

The Flutter root `firebase.json` points to `build/web` — that is the old Flutter app, not this Next.js site. This folder has its own `firebase.json` pointing to `out/`.

Live URL: https://lab360erp.web.app
