<p align="center">
  <img src="src/assets/invoid.svg" alt="Invoid" height="72" />
</p>

<p align="center">
  Open-source invoice generator for individuals and small businesses.
</p>

---

## Overview

Invoid is a browser-based invoicing app that runs fully on the client side.
All business data (catalog, customers, invoices) is stored locally in IndexedDB,
and app preferences are stored in localStorage.

It supports invoice creation, customer management, payment tracking, template-based PDF generation,
and installable PWA behavior with offline fallback.

---

## Current Features

- Invoice builder with editable line items (catalog-based and manual)
- Discount and tax controls with real-time total calculation
- Customer management and customer snapshot on saved invoices
- Payment methods: cash, bank transfer, e-wallet, and other
- Invoice history and detail page
- Template-driven PDF export and print (including uploaded business logo)
- Multi-page PDF item table rendering
- Installable PWA with service worker caching and offline navigation fallback
- New-version update prompt when a new service worker is available

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router 7 |
| State Management | Zustand 5 |
| Local Database | Dexie 4 (IndexedDB) |
| PDF Engine | pdf-lib |
| Icons | Lucide React |

---

## Routes

| Route | Page | Description |
|---|---|---|
| / | Invoice | Build invoice and export PDF |
| /catalog | Catalog | Manage categories and products |
| /customers | Customers | Manage customer records |
| /history | History | View saved invoices |
| /history/:invoiceId | Invoice Detail | View invoice detail and print PDF |
| /settings | Settings | Business profile, logo, currency, tax defaults |

---

## PDF Template System

Invoid uses a JSON template + renderer pipeline for invoice PDFs.

- Template blocks: logo, header, customer, payment, table, summary
- Dynamic bindings using placeholders such as {{invoice.id}} and {{business.name}}
- Right/left alignment control per table column
- Automatic table pagination for long invoices
- Download and print workflows using the same PDF render output

Default template location:

- src/lib/pdf/templates/default.json

---

## PWA Support

PWA is implemented manually for Vite 8 compatibility.

- Manifest: public/manifest.webmanifest
- Service worker: public/sw.js
- Offline fallback page: public/offline.html
- Icons: public/pwa-192.png and public/pwa-512.png

Service worker strategy:

- Stale-while-revalidate for static assets (scripts, styles, images, fonts)
- Network-first for page navigation with fallback to cached shell/offline page
- Network-first runtime cache for same-origin GET requests
- Versioned cache cleanup during activation
- Skip waiting + user update prompt flow

---

## Invoice Calculation

```text
subtotal        = sum(quantity * unitPrice)
discountAmount  = percentage or fixed value
taxableAmount   = subtotal - discountAmount
taxAmount       = taxableAmount * taxRate (if tax enabled)
total           = taxableAmount + taxAmount
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/khalifmv/invoid.git
cd invoid
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Data Persistence

| Data | Storage | Key |
|---|---|---|
| Categories | IndexedDB (invoid-db) | categories |
| Products | IndexedDB (invoid-db) | products |
| Customers | IndexedDB (invoid-db) | customers |
| Saved invoices | IndexedDB (invoid-db) | invoices |
| App settings | localStorage | invoid-settings |

---

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
See LICENSE for the full license text.
