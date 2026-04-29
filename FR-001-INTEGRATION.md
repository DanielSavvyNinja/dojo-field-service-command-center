# FR-001 Integration Guide — Dispatch Board

This branch ships:
- `src/lib/dojoData.js` — Supabase client + React hooks + mutations
- `src/components/ContactPicker.jsx` — typeahead customer picker

This doc tells you exactly what to change in `src/App.jsx` to wire them in.
Estimated time: ~15 min with a dev server running.

## Prerequisites

```bash
# @supabase/supabase-js is already in package.json — just install
npm install
```

`.env.local` (or Vercel env vars):

```
VITE_SUPABASE_URL=https://ybujjznnjfzjbjfegmdj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
VITE_GHL_LOCATION_ID=3GI7SZRZHugGLBnDevX2
```

## Step 1 — Imports

At the top of `src/App.jsx`, after the existing lucide-react import, add:

```jsx
import { useTechnicians, usePriceBook, useJobs, createJob, updateJob } from './lib/dojoData';
import { ContactPicker } from './components/ContactPicker';
```

## Step 2 — Replace hardcoded TECHNICIANS

**Find** the `const TECHNICIANS = [ ... ]` block (around line 19 in current App.jsx).

**Replace** the consumers — leave the fallback array as a demo default, but add a hook in the App component:

```jsx
// Inside export default function App() {
const { rows: techRows } = useTechnicians();
const TECHS = techRows.length ? techRows.map(t => ({
  id: t.id,
  name: t.name,
  color: t.color || '#3b82f6',
  avatar: (t.name || '').split(' ').map(s => s[0]).slice(0,2).join(''),
  phone: t.phone,
  status: t.is_active ? 'active' : 'inactive',
})) : TECHNICIANS;  // fall back to demo data when offline / not configured
```

Then **everywhere App.jsx references `TECHNICIANS`, change it to `TECHS`**. Search-replace `TECHNICIANS` to `TECHS` inside the App component body and modal props (`techs={TECHS}`).

## Step 3 — Replace hardcoded SERVICE_TYPES

**Find** the `const SERVICE_TYPES = { ... }` block (around line 33).

**Add** a hook in the App component:

```jsx
const { rows: priceBookRows } = usePriceBook();
const SERVICES = priceBookRows.length
  ? Object.fromEntries(priceBookRows.map(p => [
      p.service_id,
      {
        label: p.name,
        duration: p.duration_minutes || 60,
        price: p.price,
        icon: p.icon || '🔧',
        is_taxable: p.is_taxable,
        tax_rate: p.tax_rate,
      },
    ]))
  : SERVICE_TYPES;
```

Then **search-replace `SERVICE_TYPES` to `SERVICES`** inside the App component (don't change the constant declaration).

## Step 4 — ContactPicker in NewJobModal

**Find** in NewJobModal (around line 235):

```jsx
<div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
  <input type="text"
    value={form.customerName}
    onChange={e => setForm({...form, customerName: e.target.value})}
  />
</div>
```

**Replace with:**

```jsx
<div className="col-span-2">
  <ContactPicker
    value={form.customer}
    onChange={(c) => setForm({
      ...form,
      customer: c,
      customer_id: c?.id || null,
      customerName: c?.name || '',
      address: c?.address || form.address,
      city: c?.city || form.city,
      phone: c?.phone || form.phone,
    })}
  />
</div>
```

Add `customer: null, customer_id: null` to the initial `useState` form object.

## Step 5 — Persist new jobs to Supabase

**Find** in App component (around line 410):

```jsx
const handleNewJob = (job) => setJobs(prev => [...prev, job]);
```

**Replace with:**

```jsx
const handleNewJob = async (job) => {
  try {
    const saved = await createJob({
      customer_id: job.customer_id,
      technician_id: job.techId || null,
      service_id: job.serviceType,
      stage: job.status,
      scheduled_date: job.date,
      scheduled_time: job.startTime,
      address: job.address,
      city: job.city,
      property_type: job.propertyType,
      notes: job.notes,
    });
    setJobs(prev => [...prev, { ...job, id: saved.id }]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('createJob failed, keeping in-memory only:', err);
    setJobs(prev => [...prev, job]);
  }
};
```

## Step 6 — (optional) Live job list

Replace `useState(generateDemoJobs)` with:

```jsx
const today = format(new Date(), 'yyyy-MM-dd');
const oneWeekOut = format(addDays(new Date(), 7), 'yyyy-MM-dd');
const { rows: liveJobs } = useJobs({ from: today, to: oneWeekOut });
const jobs = liveJobs.length ? liveJobs.map(adaptJobShape) : generateDemoJobs();

function adaptJobShape(j) {
  return {
    id: j.id,
    customerName: j.customer_name,           // legacy denorm read
    address: j.address,
    city: j.city,
    phone: j.phone,
    serviceType: j.service_id,                // matches SERVICES key
    status: j.stage,
    techId: j.technician_id,
    date: j.scheduled_date,
    startTime: j.scheduled_time,
    notes: j.notes,
    propertyType: j.property_type,
  };
}
```

(Keep `generateDemoJobs` as the fallback so the demo still works without Supabase configured.)

## Step 7 — Test

```bash
npm run dev
```

Smoke test:
1. New Job modal — search for a customer in the picker; if no match, "Create new" should add a row to `customers` table.
2. Tech assignment dropdown should show real techs from `technicians` table.
3. Service Type dropdown should show items from `price_book`.
4. Creating a job should persist to the `jobs` table — verify in Supabase Studio.

## What's deliberately NOT here

- **Create Invoice / Collect Payment buttons in JobDetailModal** — connector code is ready (`createInvoiceForJob`, `recordManualPayment` in `dojoData.js`), but wiring the buttons + dialog UI is its own ticket. The mobile app's CollectPaymentDialog can be adapted; copy from `dojo-tech-mobile-app` and reuse here.
- **Drag-drop persistence** — moving a job between time slots updates local state only. Wire to `updateJob({ scheduled_time, technician_id })` to persist.

## Related
- Connector PR: DanielSavvyNinja/dojo-ghl-connector#1 (migration 002 + sync code)
- Sibling UI PRs: dojo-job-management-engine#1, dojo-tech-mobile-app#1, dojo-price-book-engine#1
