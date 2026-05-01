# FR-001 Implementation — dojo-field-service-command-center

Status: **Draft PR — do not merge.** Schema changes and connector code already landed (see [dojo-ghl-connector PR #2](https://github.com/DanielSavvyNinja/dojo-ghl-connector/pull/2)).

## What changes in this repo

The dispatch board needs three free-text fields replaced with picker components, and a Create Invoice / Collect Payment button pair on the job detail panel.

### 1. Customer picker (FR-001 #1)
- Replace the customer name text input with a ContactPicker sourced from the customers table.
- On select, write jobs.customer_id (UUID FK to customers.id).
- Display name / phone / address from the linked customers row, not from the legacy denormalized columns on jobs.

### 2. Service picker (FR-001 #2)
- Replace the service-type free-text input with a ServicePicker sourced from price_book where is_active = true.
- On select, write job_line_items.price_book_id (UUID FK to price_book.id).

### 3. Technician picker (FR-001 #3)
- Replace the tech free-text/static-list input with a TechnicianPicker sourced from technicians.
- On select, write jobs.tech_id (existing column, FK to technicians.id).

### 4. Invoice + Payment buttons on job detail (FR-001 #4)
- Add **Create Invoice** button. Calls connector RPC; pre-fills invoice_line_items from any job_line_items.price_book_id rows.
- Add **Collect Payment** button. Opens a modal: GHL hosted link for card / mobile cash logging.

## Schema reality (use these column names)
Per Daniel's chat decision, do NOT add new columns:
- Contact link is jobs.customer_id, not jobs.contact_id.
- Tech link is jobs.tech_id, not jobs.technician_id.
- Line items live in normalized invoice_line_items, not a JSONB blob on invoices.
- payments.paid_at is a generated alias of collected_at when status='paid'.

## Tax (decision #5)
Per-item tax: price_book.tax_rate (with is_taxable toggle), falling back to location_settings.tax_rate. Job-level override at app layer, not schema.

## Open decisions
- GHL native Invoices/Payments vs Stripe direct (currently: native, Stripe deferred)
- Manual cash/check on mobile (currently: yes — method='cash' or 'check', processor='manual')
- Tax handling (currently: per-item w/ location fallback)
