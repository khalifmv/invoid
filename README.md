<p align="center">
  <img src="src/assets/invoid.svg" alt="Invoid" height="72" />
</p>

<h1 align="center"></h1>

<p align="center">
  An open-source invoice generator for everyone and small businesses.
  <br />
</p>

---

## Overview

Invoid is a browser-based invoicing tool designed to let you create a professional invoice in seconds. All data is stored locally in your browser using IndexedDB, nothing is sent to a server. The application is built as a single-page application and is designed to eventually be installable as a Progressive Web App (PWA).

The core workflow is straightforward: maintain a catalog of your products and categories, build an invoice by selecting items from that catalog (or entering them manually), apply a discount and tax, then export. Every saved invoice is retained in local history for reference.

---

## Features

- **Invoice builder** — Add line items from your product catalog or enter them manually. Each item has an editable description, quantity, and unit price with a computed line total.
- **Discount and tax** — Apply a pre-tax discount as either a percentage or a fixed amount. Toggle tax on or off with a configurable rate. All totals are computed in real time.
- **Product catalog** — Manage a reusable library of products and categories. Products pre-fill name and price when added to an invoice.
- **Invoice history** — Every exported invoice is persisted to IndexedDB and viewable in a chronological history log.
- **Business settings** — Configure your business name, logo, default currency (USD or IDR), and default tax settings. Settings survive page reloads via `localStorage`.
- **Fully offline** — No network requests at runtime. All persistence is handled by the browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| State management | Zustand 5 |
| Local database | Dexie (IndexedDB) 4 |
| Routing | React Router 7 |
| Icons | Lucide React |

---

## Project Structure

```
src/
  assets/           Static assets (logo SVG)
  components/
    nav/            AppNav — responsive sidebar / bottom bar
    ui/             Primitive UI components (Button, Card, Input, Toggle, etc.)
  layouts/          AppLayout — root shell with nav and header
  lib/              Pure utilities (db, currency formatting, ID generation, invoice math)
  pages/            Route-level page components
  store/            Zustand stores (invoice, catalog, settings)
  types/            Shared TypeScript type definitions
```

### Pages

| Route | Page | Description |
|---|---|---|
| `/` | Invoice | Build and export an invoice |
| `/catalog` | Catalog | Manage products and categories |
| `/history` | History | View previously exported invoices |
| `/settings` | Settings | Configure business name, logo, currency, and tax defaults |

---

## Invoice Calculation

Totals follow this formula:

```
subtotal        = sum of (quantity * unitPrice) for all line items
discountAmount  = subtotal * rate  OR  fixed amount (whichever type is selected)
taxableAmount   = subtotal - discountAmount
taxAmount       = taxableAmount * taxRate  (if tax is enabled, otherwise 0)
total           = taxableAmount + taxAmount
```

All computed values are rounded to two decimal places.

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

```bash
git clone https://github.com/khalifmv/invoid.git
cd invoid
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite development server with hot module replacement. Open `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
```

Compiles TypeScript and bundles the application into `dist/`. The build artifact is a fully static site with no server-side dependencies.

### Preview Production Build

```bash
npm run preview
```

Serves the `dist/` directory locally to verify the production build before deployment.

### Lint

```bash
npm run lint
```

---

## Data Persistence

| Data | Storage | Key |
|---|---|---|
| Products and categories | IndexedDB (`invoid` database) | — |
| Saved invoices | IndexedDB (`invoid` database) | — |
| Business settings | `localStorage` | `invoid-settings` |
| Active invoice state | In-memory (Zustand, not persisted) | — |

The active invoice in progress is intentionally ephemeral — it resets when the page is refreshed or after a successful export. Settings persist across sessions via Zustand's `persist` middleware.

---

## Roadmap

The following features are planned but not yet implemented:

- **PDF export** — Generate a downloadable PDF invoice using `pdf-lib`.
- **PWA / installability** — Add a service worker via `vite-plugin-pwa` (Workbox) to enable offline installation and caching.
- **Invoice notes** — Expose the `notes` field (already typed) in the invoice builder UI.

---

## License

This project does not currently have a license file. All rights reserved unless otherwise stated.
