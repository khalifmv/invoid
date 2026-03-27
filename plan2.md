Let me explore the current codebase thoroughly before designing the plan. 

Explore INVOID codebase structure

Read [](file:///Users/khalifmv/development/invoid/src/App.tsx)

Read [](file:///Users/khalifmv/development/invoid/src/App.css#1-1), lines 1 to 500

Read [](file:///Users/khalifmv/development/invoid/src/index.css)

Read [](file:///Users/khalifmv/development/invoid/src)

Read [](file:///Users/khalifmv/development/invoid/package.json)

Read [](file:///Users/khalifmv/development/invoid/src/store/catalogStore.ts)

Read [](file:///Users/khalifmv/development/invoid/src/store/invoiceStore.ts)

Read [](file:///Users/khalifmv/development/invoid/src/types/index.ts)

Read [](file:///Users/khalifmv/development/invoid/src/types/invoice.ts)

Read [](file:///Users/khalifmv/development/invoid/src/types/category.ts)

Read [](file:///Users/khalifmv/development/invoid/src/types/product.ts)

Read [](file:///Users/khalifmv/development/invoid/src/types/common.ts)

Read [](file:///Users/khalifmv/development/invoid/src/types/settings.ts)

Read [](file:///Users/khalifmv/development/invoid/src/lib/db.ts)

Read [](file:///Users/khalifmv/development/invoid/src/lib/date.ts)

Read [](file:///Users/khalifmv/development/invoid/src/lib/ids.ts)

Read [](file:///Users/khalifmv/development/invoid/src/lib/invoice-calculations.ts)

Read [](file:///Users/khalifmv/development/invoid/src/lib)

Read [](file:///Users/khalifmv/development/invoid/src/store)

Read [](file:///Users/khalifmv/development/invoid/src/types)

Read [](file:///Users/khalifmv/development/invoid/src/assets)

Read [](file:///Users/khalifmv/development/invoid)

Read [](file:///Users/khalifmv/development/invoid/src/main.tsx)

Good. No router installed yet. I have a full picture. Let me design the plan. 

Analyzing your answers...

Now I have everything to design a complete plan. 

Created memory file [](file:///Users/khalifmv/Library/Application%20Support/Code/User/workspaceStorage/d9c24366cd43af900e0a03bb30fb4b1a/GitHub.copilot-chat/memory-tool/memories/YzRlNTViODItYmY5Ny00NTJiLWFjNWMtMGY0M2JmYWJiMjJk/plan.md)

Here's the full plan:

---

## Plan: Multi-page layout with sidebar → bottom nav

**What:** Refactor the monolithic App.tsx into 4 dedicated pages behind a shared shell layout. Navigation lives in a left sidebar on desktop (≥960px) and automatically collapses into a compact bottom bar on mobile via CSS only — no JS toggle needed.

---

### Pages & nav items

| Icon | Label | Route | Content |
|---|---|---|---|
| `FileText` | Invoice | `/` | Invoice builder + live summary panel (current main view) |
| `Package` | Catalog | `/catalog` | Tabbed: Products tab + Categories tab |
| `Clock` | History | `/history` | Saved invoices list from IndexedDB |
| `Settings` | Settings | `/settings` | Business name, logo upload, default tax rate |

---

### Steps

**Phase 1 — Dependencies + Router (blocks all below)**
1. `npm install react-router lucide-react`
2. Rewrite App.tsx as the router tree: `<BrowserRouter>` → `<Routes>` wrapping `AppLayout`
3. Create `src/layouts/AppLayout.tsx` — full-height flex shell: `<AppNav />` on the left + `<Outlet />` as main content

**Phase 2 — Navigation** *(depends on 3)*
4. Create `src/components/nav/AppNav.tsx` — `<NavLink>` items each with a Lucide icon above a short label. Pure CSS handles the dual role: `200px` vertical sidebar on desktop, `60px` fixed bottom bar on mobile via `@media (max-width: 960px)`

**Phase 3 — Pages** *(can run in parallel after Phase 2)*
5. `src/pages/InvoicePage.tsx` — lift invoice builder + summary panel out of App.tsx; wire the Export PDF button to call a new `saveInvoice()` action then navigate to `/history`
6. `src/pages/CatalogPage.tsx` — lift catalog forms + product list; add two tabs ("Products" / "Categories") using local `useState` tab switch
7. `src/pages/HistoryPage.tsx` — read all saved invoices from Dexie; show list with date + total; empty state encourages building first invoice
8. `src/pages/SettingsPage.tsx` — form for business name, logo (base64 via `FileReader`), default tax rate; persisted to `localStorage`

**Phase 4 — Store additions** *(parallel with Phase 3)*
9. New `src/store/settingsStore.ts` — Zustand with `persist` middleware → `localStorage` key `invoid-settings`; extends existing `AppSettings` type with `logoDataUrl`
10. `invoiceStore.ts` additions — `saveInvoice()` snapshots current state into `db.invoices.add(...)`, `clearInvoice()` resets items/discount/tax
11. `catalogStore.ts` addition — `loadInvoices()` reads `db.invoices.toArray()` for the History page

**Phase 5 — Styles** *(parallel with Phases 3–4)*
12. Add layout shell CSS to App.css: `.app-root`, `.sidebar`, `.bottom-nav`, `.page-content`; keep all existing card/form/totals styles intact, just adjust the outer container

---

### Relevant files
- App.tsx — becomes router tree only (~20 lines)
- `src/layouts/AppLayout.tsx` — new shell
- `src/components/nav/AppNav.tsx` — new nav
- `src/pages/*.tsx` — 4 new page files
- `src/store/settingsStore.ts` — new store
- invoiceStore.ts — add `saveInvoice`, `clearInvoice`
- catalogStore.ts — add `loadInvoices`
- settings.ts — extend with `logoDataUrl`
- App.css — add layout shell, nav styles

### Verification
1. `npm run build` — zero TS errors
2. All 4 routes render without blank screens
3. At ≤960px: sidebar hidden, bottom bar shows; at >960px: sidebar shows, bottom bar hidden
4. Product added in Catalog → available in Invoice dropdown
5. "Export PDF" saves → entry visible in History
6. Settings values survive a browser reload

---

**Decisions:**
- Single `AppNav` component — CSS-only responsive flip (no JS state), maximally simple
- Catalog page uses local tab state, no router nesting needed
- History is read-only for now; full invoice detail view is out of scope
- `lucide-react` for icons (lightweight, tree-shakeable, matches monochrome design)

Approve this plan and I'll start implementing immediately.