# Impeccable Responsive Audit — admin-dashboard

Date: 2026-11-14 · Command: `/impeccable audit` (responsive dimension) · **Report only; no source changed.**

## Evidence and limits

| Evidence | Status |
|---|---|
| Source scan of widths, `min-w`, overflow wrappers, breakpoints, touch-size classes across `src/` | Done (grep-based, sampled by reading ~25 hits) |
| Rendered checks at **375×812** (touch-emulated) and **768×1024** | **Only the public pages** `/login`, `/register`, `/forgot-password`. Measured `scrollWidth` vs `clientWidth` and control sizes via script. |
| Authenticated pages (≈60 routes) at any size | **Not rendered.** The browser pane is not signed in; logging in was out of scope. All claims below about dashboard pages come from source only. |
| Touch gestures, text zoom 200%, landscape tablet, real device | Not tested |
| Earlier evidence | `docs/ui-visual-review.md` (2026-11-03) reports 57 routes captured at 1440×960 and 390×844 and fixes applied. Not re-run here; this audit does not contradict it. |

## Score — Responsive Design: 3/4 (Good; provisional)

Strong systematic design, unverified on rendered authenticated pages, with a few concrete gaps.

## Measured (rendered)

| Page | 375px | Notes |
|---|---|---|
| `/login` | no horizontal overflow (375/375); viewport meta present | "ลืมรหัสผ่าน?" link is 63×16 px; show-password button is 28×28 px |
| `/register` | no overflow (redirects per AGENTS.md; title empty in measure) | — |
| `/forgot-password` | no overflow | two links 327×32 and 327×42 px |
| `/login` at 768 | visually coherent split layout (small screenshot only) | — |

## What works (source evidence)

- Shell: `h-dvh`, gutters `p-2 → sm:p-3 → lg:p-4`, `min-w-0` content column (`layout/dashboard-shell.tsx:28,42`); sidebar is replaced by a Sheet below `lg`; topbar swaps the search field for an icon below `sm` (`layout/topbar.tsx:105-108`).
- Shared `Table` wraps every table in `overflow-auto` with `[contain:inline-size]` (`ui/table.tsx:6`), so wide tables scroll inside their card rather than the page.
- Buttons enlarge on coarse pointers (`pointer-coarse:h-10/h-11`, icon 44px; `ui/button.tsx:17-20`); dialog/sheet close buttons are 44px on coarse (`ui/dialog.tsx:68`, `ui/sheet.tsx:56`).
- Dialogs have `fullScreenOnMobile`; dashboard grids use container queries rather than viewport breakpoints.

## Findings

### P1

None found.

### P2

**R-P2-1 Wide tables have no visible scroll cue (tablet portrait most affected)**
- Files: `components/materials-pc/material-pc-table.tsx:766-767` (`min-w-[1080px]`, scrollbar hidden by `[&>div:last-child]:[scrollbar-width:none]`); `components/material-traceability/material-traceability-table.tsx:59` (`min-w-[88rem]` = 1408px); sales tables `sales-report-view.tsx:218` (920px), `sales-order-client.tsx:173` (880px), `sales-job-order-list.tsx:38` (860px), `sales-job-order-detail.tsx:276`; permissions `department-permission-matrix.tsx:272` (56rem), `user-overrides-panel.tsx:307`.
- Impact: at 768px (content ≈ 700px) these tables are 1.2–2× wider than the screen; with the project-wide hidden scrollbars (46 occurrences of `scrollbar-width:none`) users get no hint that columns continue to the right. Not rendered; inferred from code.
- Doc/code mismatch: AGENTS.md says Materials/Products tables keep visible scrollbars, but `material-pc-table.tsx:767` hides the inner scroller's scrollbar. Reconcile one way or the other.
- Fix: show a thin visible horizontal scrollbar or an edge fade/shadow on wide tables; keep first column sticky (Materials already does).
- Command: `/impeccable adapt`.

**R-P2-2 Navigation drops to a Sheet on tablets below 1024px**
- `layout/sidebar.tsx:151` (`hidden … lg:flex`), `topbar.tsx` hamburger `lg:hidden`. A shop-floor tablet in portrait (768–1023px) loses persistent navigation and the breadcrumb (`topbar.tsx:98` `lg:flex`). Judgment from source; not rendered.
- Fix: consider an icon-rail sidebar from `md`, or confirm with users that portrait tablet navigation via Sheet is acceptable.
- Command: `/impeccable adapt`, `/impeccable shape`.

**R-P2-3 Quick filters hidden by breakpoint (by design) leave only search + drawer on mobile/tablet**
- AGENTS.md describes `hidden md:flex` / `lg:flex` quick dropdowns; everything stays in the Advanced drawer. Acceptable pattern, but each filtered result needs one extra tap on tablets in portrait. Not measured with users.
- Command: `/impeccable adapt` (consider showing one more dropdown at `md` for scan-heavy pages).

### P3

- **R-P3-1** `/login`: "ลืมรหัสผ่าน?" link is 63×16 px (below 24px AA minimum unless the inline/spacing exception applies) — measured at 375px. Show-password button 28×28 passes AA but is under 44px.
- **R-P3-2** `/forgot-password`: link targets 32px tall; under the 44px shop-floor guideline (PRODUCT.md) but pass AA.
- **R-P3-3** `components/dashboard/dashboard-header.tsx:64` fixed `w-[150px]` select; and `topbar.tsx:101` crumb `min-w-[5rem]` — fine at tested sizes, low risk.
- **R-P3-4** Fixed 520/480px decorative blobs on `/login` (`login/page.tsx:114-115`) are absolutely positioned inside an overflow-hidden panel; no overflow was measured.

## Not verifiable here (needs an authenticated pass)

Priority pages to render at 375 / 768 / 1024 / 1440: `/dashboard`, `/materials/catalog`, `/materials/receiving` (create dialog), `/materials/disbursements` (form), `/job-orders/[id]` (pick/scan), `/production/*/orders/[id]` (process board, scan dialogs), `/engineering/setup` (wizard), `/reports/materials`, `/sales/orders`, `/system/permissions`. Check: horizontal page scroll, dialog footers reachable, sticky headers, tap targets ≥44px, long Thai strings wrapping, QR print sheets (`@media print`).

## Quick wins

1. Visible scroll cue (fade or thin scrollbar) on the 9 wide tables above.
2. Enlarge "ลืมรหัสผ่าน?" and show-password hit areas on `/login` (padding only).
3. Correct AGENTS.md vs `material-pc-table.tsx` scrollbar statement.

## Recommended next steps

1. Run an authenticated render sweep (needs a signed-in browser) at the four widths and update this report with measured overflow per route.
2. `/impeccable adapt` for R-P2-1 and R-P2-2 after the sweep confirms them.
3. `/impeccable polish` as the closing step.

## Authenticated render sweep (2026-11-14, after the user signed in)

Method: same-origin hidden iframes at 375 / 768 / 1024 / 1440 px over 20 routes (`/dashboard`, `/materials`, `/materials/{catalog,receiving,disbursements}`, `/job-orders/products`, `/production/products/{plans,orders}`, `/engineering/{products,setup}`, `/reports/{materials,audit-logs,analytics}`, `/sales/orders`, `/system/{users,permissions}`, `/master-data`, `/master-data/units`, `/orders`, `/menu-hub`), measuring `scrollWidth - clientWidth` on `document` and `main`. Not covered: dialogs and wizards opened by clicks, `/[id]` detail routes, tap targets, gestures, print.

Findings (measured):
- **Hidden-label leak widened the document** on `/job-orders/products` (375/768/1024), `/production/products/plans` (375/1024), `/system/users` (375/768/1024): `sr-only` spans inside table cells were positioned against an ancestor outside the scroll wrapper, so `document.scrollWidth` exceeded the viewport (e.g. 965 vs 768). The shell clips it (`overflow: clip`) so users could not scroll, but programmatic scroll moved the whole shell (scrollLeft set to 197). Fixed by `position: relative` in the `scroll-cue-x` utility; re-measured 0 overflow on all six cases.
- **`/reports/materials` at 375:** the "all / receiving / disbursement" tab switch was 358px wide inside a 341px column (`main` +17px). Fixed with `max-w-full flex-wrap` (`material-traceability-view.tsx:111`); re-measured 0.
- All other route/width combinations measured 0 overflow; `scroll-cue-x` is present on wide tables in 11 of the sampled routes at 768px. The edge-shadow itself was not inspected visually on a table (only layout was measured).
- `/orders` at 768: the sample-data banner renders correctly (screenshot).
- Not verified visually: error boundary (no way to trigger a page error safely).

## Touch-target sweep at 375px (2026-11-15, measured)

Method: iframes at 375px in a touch-emulated tab (`pointer: coarse` = true) over 17 routes; counted visible buttons/links/inputs under 24px (WCAG 2.5.8 AA minimum) in height or width. Clean (0 under 24px): `/materials/catalog`, `/materials/receiving`, `/job-orders/products`, `/production/products/orders`, `/engineering/products`, `/engineering/setup`, `/reports/audit-logs`, `/system/users`, `/master-data/units`, `/menu-hub`, `/materials/disbursements` (2 under 44px only).

| Route | Under 24px | Examples |
|---|---|---|
| `/reports/materials` | 100 | lot/QR drill-down buttons 94–166 × 16 px (`material-traceability-table.tsx`) |
| `/system/permissions` | 69 (258 under 44) | matrix checkboxes 16×16 (admin screen, desktop task) |
| `/dashboard` | 20 | "ดูวัสดุ" 34×20, "ดูการรับเข้า" 67×20 links in tables |
| `/materials` | 7 | chart-type toggles 30×22 ("แท่ง + เส้นสะสม", "พื้นที่", "เส้น") |
| `/production/products/plans` | 3 | "จ่ายออกครบแล้ว" 114×22 buttons |
| `/sales/orders` | 1 | job-order link 115×16 |

Impact: the `/reports/materials` drill-down is the main scan/trace path and is 16px tall; on a tablet this is a mis-tap risk and fails AA unless the spacing exception applies (not verified per target). Suggested fix (not applied): `py-2` / min-h-6 on those link-buttons, or a larger row hit area. Command: `/impeccable adapt`.

## Dialog check (one case)

`/materials/receiving` create dialog at 375×812: full-screen (0,0,375×812), no horizontal overflow (dialog or document), footer buttons "ยกเลิก"/"ยืนยันการรับเข้า" are 44px high with bottom at 796 ≤ 812 (reachable). Other dialogs, wizards and `[id]` detail routes were still not opened.

### Fix applied: `/reports/materials` touch targets (2026-11-15)

`material-traceability-table.tsx`: MAIN/SUB QR buttons and the receiving/disbursement link buttons now have `min-h-6` (24px, AA) and `pointer-coarse:min-h-11` (44px on touch). Re-measured at 375px in a touch-emulated tab: 150 table buttons/links, smallest 44px, 0 under 24px, 0 under 44px, no horizontal overflow. On touch screens rows become taller (44px). Not measured: non-touch desktop appearance, other pages in the table above (still open).

### Fix applied: touch targets on `/dashboard`, `/materials`, `/production/products/plans`, `/sales/orders` (2026-11-15)

Added `min-h-6 pointer-coarse:min-h-11` (inline-flex + items-center for links) to: watchlist links (`dashboard/low-stock-watchlist.tsx`), document-number links (`dashboard/recent-documents.tsx`), chart-type/unit toggles and "ทั้งหมด" links (`materials-dashboard/materials-movement-overview.tsx`), "ดูทั้งหมด" link buttons (`materials-dashboard-view.tsx`), job-order status button (`production-plans/production-plan-table.tsx`), job-order link (`sales/sales-order-client.tsx`). Re-measured at 375px touch: 0 targets under 24px on all four routes (the only 1×1 element is the skip link, hidden until focus); no horizontal overflow. `/system/permissions` (16×16 matrix checkboxes) intentionally left: admin desktop screen.

## Detail pages and dialogs at 375px (2026-11-15, measured)

Detail routes (`/job-orders/10`, `/sales/job-orders/1`, `/production/products/orders/11` and `/7`): no horizontal overflow, no error boundary. Small targets found and fixed (`min-h-6 pointer-coarse:min-h-11`): lot-code links and the "สแกน QR / ค้นหา Lot" link in `production-lots/lot-order-board.tsx`, "กลับไปรายการสั่งผลิต" in `production-orders/production-order-page.tsx`, "ใบจัดงานขายทั้งหมด" in `sales/sales-job-order-detail.tsx`. Not changed: the plan-code link inside a sentence on `/job-orders/[id]` (inline text, AA inline exception).

Create dialogs opened by click at 375×812 (disbursement, production plan, add product wizard, add material wizard, add user, add unit): all full-screen, footer buttons reachable (bottom ≤ 796px), no document overflow. One defect found and fixed: in the add-product wizard (and the same pattern in the add-material form) the visually hidden file input kept the base `w-full`, making the dialog body 23px wider than the screen (`dlgOver` 23). Fixed with `w-px!` on `products-form-dialog.tsx:87` and `material-pc-form-dialog.tsx:110`; re-measured 0.

Not covered: the `/engineering/setup` wizard steps beyond step 1 (page loads clean at 375px in the route sweep), dialogs reached only by row actions, and QR/Job-Order print layout (`@media print`) — print preview cannot be driven from this browser tool, so it is unverified.

### Setup wizard check (2026-11-15)

`/engineering/setup` at 375px: no horizontal overflow; the scope tabs (32px) and filter pills (30px) are above the 24px AA minimum but under 44px; create buttons are 44px. Opening "สร้างสินค้า" shows step 1 of 5 clean (0 targets under 24px). "ถัดไป" does not advance with empty required fields (validation), so **steps 2–5 were not measured**; that needs valid test data typed into the form. Row-action dialogs (Radix dropdown → dialog) and print layout also remain unverified.
