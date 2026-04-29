/**
 * Dojo data layer — Supabase-backed hooks for the dispatch board.
 *
 * Replaces the hardcoded TECHNICIANS array, SERVICE_TYPES map, and demo job
 * generation in App.jsx. Use these hooks to read/write live data instead.
 *
 * Setup:
 *   npm install @supabase/supabase-js
 *
 *   .env.local:
 *     VITE_SUPABASE_URL=https://ybujjznnjfzjbjfegmdj.supabase.co
 *     VITE_SUPABASE_ANON_KEY=<anon key from Supabase project settings>
 *     VITE_GHL_LOCATION_ID=3GI7SZRZHugGLBnDevX2
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─── CLIENT ──────────────────────────────────────────────────────
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn('[dojoData] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — falling back to in-memory demo data');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;

// ─── HOOKS ───────────────────────────────────────────────────────
function useTable(table, { filter, orderBy, deps = [] } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from(table).select('*');
    if (filter) query = filter(query);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
    const { data, error: err } = await query;
    if (err) setError(err);
    else setRows(data || []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}

/** Active technicians for picker dropdowns. Synced from GHL Team API by the connector. */
export function useTechnicians() {
  return useTable('technicians', {
    filter: q => q.eq('is_active', true),
    orderBy: { column: 'name' },
  });
}

/** Active price book items for service-type pickers. Includes tax_rate + is_taxable per FR-001 #5. */
export function usePriceBook() {
  return useTable('price_book', {
    filter: q => q.eq('is_active', true),
    orderBy: { column: 'category' },
  });
}

/** Customer search — typeahead for the contact picker. */
export function useCustomerSearch(query) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase || !query || query.length < 2) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, ghl_contact_id, name, email, phone, address, city, state, zip')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);
      if (!cancelled) {
        setMatches(data || []);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return { matches, loading };
}

/** Jobs for a given date range, with related customer / technician / line items. */
export function useJobs({ from, to }) {
  return useTable('jobs', {
    filter: q => q
      .gte('scheduled_date', from)
      .lte('scheduled_date', to),
    orderBy: { column: 'scheduled_date' },
    deps: [from, to],
  });
}

// ─── MUTATIONS ───────────────────────────────────────────────────
export async function createCustomer(input) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createJob(input) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJob(id, patch) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Create a draft invoice for a job. Pre-fills line items from the job's
 * job_line_items, picking up the price_book_id FK that FR-001 #2 added.
 * Connector pushes to GHL on next sync.
 */
export async function createInvoiceForJob(jobId) {
  if (!supabase) throw new Error('Supabase not configured');

  // Pull job + customer + line items
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, customer_id, total, tax')
    .eq('id', jobId)
    .single();
  if (jobErr) throw jobErr;

  const { data: lineItems, error: liErr } = await supabase
    .from('job_line_items')
    .select('id, price_book_id, qty, price, description')
    .eq('job_id', jobId);
  if (liErr) throw liErr;

  // Insert invoice
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      job_id: job.id,
      customer_id: job.customer_id,
      location_id: LOCATION_ID,
      status: 'draft',
      amount: job.total,
      tax: job.tax || 0,
      total: (job.total || 0) + (job.tax || 0),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (invErr) throw invErr;

  // Insert invoice_line_items
  if (lineItems?.length) {
    const rows = lineItems.map((li, idx) => ({
      invoice_id: invoice.id,
      price_book_item_id: li.price_book_id,
      description: li.description,
      quantity: li.qty,
      unit_price: li.price,
      total: (li.qty || 0) * (li.price || 0),
      sort_order: idx,
    }));
    await supabase.from('invoice_line_items').insert(rows);
  }

  return invoice;
}

/** Record a manual cash/check payment from the dispatch board "Collect Payment" dialog. */
export async function recordManualPayment({ invoiceId, amount, method, notes }) {
  if (!supabase) throw new Error('Supabase not configured');
  if (!['cash', 'check'].includes(method)) {
    throw new Error('Manual payment method must be cash or check');
  }

  const { data: payment, error: pErr } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      location_id: LOCATION_ID,
      amount,
      method,
      status: 'paid',
      processor: null,
      collected_at: new Date().toISOString(),
      notes: notes || null,
    })
    .select()
    .single();
  if (pErr) throw pErr;

  // Mark invoice paid if the sum of paid payments covers the total
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total')
    .eq('id', invoiceId)
    .single();
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('invoice_id', invoiceId);
  const paidSum = (payments || [])
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  if (invoice && paidSum >= Number(invoice.total || 0)) {
    await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
  }

  return payment;
}
