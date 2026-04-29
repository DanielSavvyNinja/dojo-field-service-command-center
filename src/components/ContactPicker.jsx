/**
 * ContactPicker — typeahead picker for selecting a customer (FR-001 #1).
 *
 * Replaces the free-text "Customer Name" input on the New Job modal.
 * Searches the local customers table (which is bidirectionally synced
 * with GHL contacts via the connector). On select, returns the full
 * customer row so the caller can capture customer_id (FK), GHL contact id,
 * plus the address/phone/email for display.
 *
 * Also supports inline "+ Create new customer" when no match is found —
 * inserts a customers row and returns it. The connector pushes new
 * customers to GHL on the next sync cycle.
 *
 * Usage:
 *   <ContactPicker
 *     value={form.customer}
 *     onChange={(customer) => setForm({ ...form, customer, customer_id: customer.id })}
 *   />
 */

import React, { useState } from 'react';
import { Search, Plus, User, Phone, MapPin } from 'lucide-react';
import { useCustomerSearch, createCustomer } from '../lib/dojoData';

export function ContactPicker({ value, onChange, autoFocus = false }) {
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { matches, loading } = useCustomerSearch(open ? query : '');

  const select = (customer) => {
    onChange?.(customer);
    setQuery(customer.name);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!query.trim()) return;
    setCreating(true);
    try {
      const created = await createCustomer({ name: query.trim() });
      select(created);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ContactPicker] failed to create customer', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          autoFocus={autoFocus}
          aria-label="Search for a customer"
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-dojo-500 focus:border-transparent"
          placeholder="Type to search customers..."
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value.name) onChange?.(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>
          )}
          {!loading && matches.length === 0 && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-dojo-600"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={creating || !query.trim()}
            >
              <Plus size={14} />
              {creating ? 'Creating...' : `Create new customer "${query}"`}
            </button>
          )}
          {matches.map(c => (
            <button
              type="button"
              key={c.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(c)}
            >
              <div className="flex items-center gap-2 font-medium">
                <User size={12} className="text-gray-400" />
                {c.name}
              </div>
              <div className="ml-5 text-xs text-gray-500 flex items-center gap-3 flex-wrap mt-0.5">
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={10} />
                    {c.phone}
                  </span>
                )}
                {c.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {c.address}{c.city ? `, ${c.city}` : ''}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {value && (
        <div className="mt-1.5 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
          {value.phone && <span>📞 {value.phone}</span>}
          {value.email && <span>✉ {value.email}</span>}
          {value.address && <span>📍 {value.address}{value.city ? `, ${value.city}` : ''}</span>}
        </div>
      )}
    </div>
  );
}

export default ContactPicker;
