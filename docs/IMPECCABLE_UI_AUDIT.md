# Impeccable UI/UX Audit — admin-dashboard

Date: 2026-11-14 · Scope: whole project · Mode: Operate (internal admin tool) · **Report only; no source was changed.**

**Method: ⚠️ DEGRADED: single-context.** The critique reference requires two isolated sub-agents (design review vs detector). Sub-agents were not spawned because the request did not ask for them. Assessment A (source review) was written before the detector output was read, but both ran in one context.

## Fix status (updated 2026-11-14)

tsc, lint and tests passed after these changes (447/447). Fixes were **not** checked in a browser and `pnpm build` was not run.

| Item | Status |
|---|---|
| P1-1 mock pages | Mitigated: `SampleDataNotice` banner on `/orders` and `/reports/analytics`; data is still mock |
| P1-2 pagination names | Fixed (`ui/data-table.tsx`) |
| P1-3 error boundary | Fixed (`(dashboard)/error.tsx`) |
| P2-1 side stripes | Fixed except lot-colored views (`material-traceability-*`), kept on purpose |
| P2-2 muted contrast | Fixed: `--fg-muted` `#64748B` → `#5B6B80` (user-approved). The on-navy estimate below was wrong: it is ≈5.1:1 and needed no change |
| P2-3 reduced motion | Fixed (0.12s instead of 0.01ms) |
| P2-5 loading | Fixed (`(dashboard)/loading.tsx` fallback) |
| P2-8 lot colors | Fixed 2026-11-15: lot palette no longer reuses success green, primary blue, amber, red, sky |
| P2-7 hidden scrollbars | Mitigated 2026-11-15: `scroll-cue-y` edge shadows on 29 dialog/drawer bodies; scrollbars stay hidden by project rule |
| P3-1/P3-3 radius, hex | Documented with comments |
| `/system/permissions` 16px checkboxes | Hit area enlarged on touch (`ui/checkbox.tsx`, after pseudo-element) |
| P2-4 monolith files | Partly fixed 2026-11-15: `setup-wizard-client.tsx` 2,045 → 885 lines (split into `bom-work-list.tsx`, `wizard-sections.tsx`, `wizard-ui.tsx`); `material-pc-table.tsx` 1,119 → 797 (`material-pc-parts.tsx`, re-exports kept). Pure move, no behavior change; `products-table.tsx` and the disbursement dialog not split |
| P2-6 dense forms | Open: needs a UX decision (which step users get stuck on); not changed |
| Responsive R-P2-1 | Fixed: `scroll-cue-x` edge shadows (see `IMPECCABLE_RESPONSIVE_AUDIT.md`) |

The findings below are the original text and are not rewritten.

## Evidence base and limits (read first)

| Evidence | Status |
|---|---|
| Static source review (67 `page.tsx`, ~215 components, `globals.css`, `components/ui/*`) | Done, sampled — not every file read |
| `impeccable detect` over `src` | Done: 26 findings (see §5) |
| Rendered UI | **Only `/login` at the dev server (localhost:3000), unauthenticated, one small desktop screenshot.** It renders in Thai with the brand panel and form, no console check. |
| Authenticated pages, Tablet/Mobile renders, keyboard-only walk-through, screen reader, measured contrast, performance | **Not done.** Entering the dev login was out of scope for a report-only pass. Anything below about these is source-derived and labeled so. |
| Prior visual review | `docs/ui-visual-review.md` (2026-11-03) reports 57 routes captured at 1440×960 and 390×844. It was not re-run here. |

## 1. Executive Summary

- The product has a coherent, product-specific system: Navy Enterprise tokens, shared `ui/*` primitives, one filter architecture, one row-action menu, Thai-first copy, scanner-oriented flows. It does not read as a generic template.
- Weakest areas are **consistency drift at the edges** (12 side-stripe accent cards, ad-hoc lot colors), **a few real accessibility gaps** (unnamed pagination buttons, global reduced-motion kill, muted-text contrast on tinted surfaces), **very large single components** (setup wizard 2,045 lines, materials table 1,119) that raise cognitive load and drift risk, and **mock-data pages still reachable** per project docs.
- Issue count: **P0 0 · P1 3 · P2 8 · P3 4**.
- Audit Health Score **15/20 (Good)**; Nielsen heuristics **30/40 (Good)**.

Top issues: (1) mock `/orders` + `/analytics` presented as real; (2) icon-only data-table pagination without names; (3) no segment-level error boundary, so a page error drops the shell; (4) side-stripe accent cards used as the default "emphasis"; (5) muted-text contrast on `surface-2`.

## 2. UI/UX Score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Good base (focus-visible rings, skip link, named row menus, 44px coarse targets); gaps in data-table, motion, muted contrast |
| 2 | Performance | 3 (not measured) | Source only; very large client components are a risk, no measurement |
| 3 | Theming | 3 | Token-driven; 8 raw hex literals (mostly print/export/swatch) |
| 4 | Responsive | 3 | Container-query design; prior doc reports clean 390px; not re-verified |
| 5 | Implementation Integrity | 3 | Coherent system; repeated side-stripe pattern and monolith components |
| **Total** | | **15/20** | **Good — address weak dimensions** |

Nielsen: 1 Status 3 · 2 Real-world match 4 · 3 Control 3 · 4 Consistency 3 · 5 Error prevention 3 · 6 Recognition 3 · 7 Efficiency 3 · 8 Minimalism 2 · 9 Error recovery 3 · 10 Help 3 = **30/40**. Scores are source-based judgments, not user-tested.

**Implementation Integrity verdict: PASS (with drift).** Evidence for: shared `PageTitle`, `cardStyles`, `field-styles.ts`, `RowActionsMenu`, `FilterDropdown/Chip`, custom ESLint rule `design-system/consistent-styles`, Thai-capable font choice. Evidence against: see P2-1, P2-6.

## 3. Problems by Priority

### P1 — High

**P1-1 Mock-data pages reachable as if real**
- Page: `/orders`, `/analytics` (AGENTS.md "Known gap": still render `lib/data.ts` mock content; `/dashboard` was moved to live data on 2026-11-03).
- Impact: users on a stock/traceability system may act on invented numbers. Violates the product principle "do not fabricate metrics".
- Fix: either remove from menus, show an explicit "ข้อมูลตัวอย่าง" banner, or wire to real data. Not verified at runtime in this pass (source/doc evidence only).
- Command: `/impeccable harden` (honest states), or `/impeccable distill` if the pages are dropped.

**P1-2 Icon-only pagination buttons with no accessible name**
- File: `src/components/ui/data-table.tsx:162,166,171,176` (first/prev/next/last, `size="icon"`, no `aria-label`/`sr-only`). Used by `components/orders/order-table.tsx`.
- Impact: screen-reader users hear "button"; WCAG 4.1.2 (A). Note other tables already label theirs ("หน้าก่อนหน้า"), so this is also an inconsistency.
- Fix: add Thai `aria-label`s; ideally reuse the pagination used in `material-pc-table.tsx`.
- Command: `/impeccable audit` then `/impeccable polish`.

**P1-3 Error boundary only at the app root**
- Files: only `src/app/error.tsx` and `global-error.tsx` exist (no segment `error.tsx` under `(dashboard)`).
- Impact: an uncaught render error in one page replaces the whole screen including sidebar/navigation (error.tsx wraps inside the root layout, outside `(dashboard)/layout.tsx`), forcing a full retry. Verified by file listing; behaviour not reproduced.
- Fix: add `(dashboard)/error.tsx` so the shell stays and only the content area shows the retry card.
- Command: `/impeccable harden`.

### P2 — Medium

**P2-1 Side-stripe accent borders as default emphasis (12 detector hits)**
- Files: `components/engineering/engineering-form-dialog.tsx:105`; `material-traceability/material-traceability-details.tsx:560`; `material-traceability-lot-flow.tsx:79,117,139`; `materials-disbursement/materials-disbursement-form-dialog.tsx:426`; `materials-pc/material-pc-delete-dialog.tsx:63`; `products/products-wizard-dialog.tsx:944,1103`; `setup-wizard/setup-wizard-client.tsx:1172,1284`; `audit-logs/audit-logs-view.tsx:82`.
- Also `border-accent-on-rounded` at `material-traceability-details.tsx:255`.
- Impact: the most recognizable "template" tell; AGENTS.md already says the earlier `STATUS_ACCENT` side-border convention was superseded, yet it persists in dialogs. Mixed uses (row identity color vs danger vs primary) dilute meaning.
- Fix: replace by a numbered badge/header band or background tint; keep lot colors only where they identify a lot (and always with the lot text).
- Command: `/impeccable polish`, `/impeccable quieter`.

**P2-2 Muted text on tinted surfaces likely under 4.5:1**
- Token `--fg-muted: #64748B` (`globals.css:17`) on `--surface-2: #EDF1F6`. Estimated from hex ≈ 4.2:1 (calculated, not measured). On white it is ≈ 4.8:1 (passes). On-navy `rgba(255,255,255,0.52)` (`globals.css`) was estimated borderline (~4.4:1); **corrected: calculated ≈5.1:1 on `--navy`, passes.**
- Impact: hints, table meta and sidebar secondary text on `surface-2` rows fail WCAG 1.4.3 for small text.
- Fix: darken `--fg-muted` slightly or use `fg-secondary` for text sitting on `surface-2`; measure with a browser tool first. Needs approval since it touches the token file.
- Command: `/impeccable audit`, `/impeccable colorize` (token adjustment only).

**P2-3 Global reduced-motion kill**
- `src/app/globals.css:285-291` forces `0.01ms` on all animation/transition.
- Impact: removes useful state feedback (dialog open, spinner meaning) for users with the preference; the audit guidance flags this pattern.
- Fix: keep non-essential motion off but preserve state changes (opacity/fade) and spinners' alternative cue.
- Command: `/impeccable animate`.

**P2-4 Monolithic components**
- `setup-wizard-client.tsx` 2,045 lines, `material-pc-table.tsx` 1,119, `products-table.tsx` 647, `materials-disbursement-form-dialog.tsx` 620.
- Impact: UX consistency drifts when steps/cards are re-implemented inline (e.g. P2-1 repeats in the wizard twice); heavy client bundles on the first screens. Performance not measured.
- Command: `/impeccable optimize` (measure), `/impeccable extract` (shared step/card pieces).

**P2-5 Loading coverage is partial**
- 8 `loading.tsx` for 67 routes. Other routes show nothing until the server finishes (slow API → blank content area).
- Command: `/impeccable harden`.

**P2-6 Interaction density in long forms/wizards**
- Setup wizard (5 steps, nested materials/BOM/workflow cards), products wizard, disbursement dialog with per-row selects: cognitive-load checklist fails on "chunking" and "progressive disclosure" in source (many simultaneous fields per step). Judgment from source, not user-tested; the Setup wizard stepper itself was recently shortened per AGENTS.md.
- Command: `/impeccable distill`, `/impeccable shape`.

**P2-7 Hidden scrollbars everywhere**
- Project rule hides vertical scrollbars on all normal scrollers (AGENTS.md "Scrollbar treatment"). Impact: no visual cue that a dialog/page body continues; mitigated by clipped content but not verified at runtime.
- Command: `/impeccable adapt`.

**P2-8 Status color families vs lot colors**
- `lib/lot-colors.ts` assigns 8 lot hues beside success/warning/danger; a lot hue can be mistaken for a status. Text labels exist, so it is not color-only.
- Command: `/impeccable colorize`.

### P3 — Polish

- **P3-1** `border-radius: 999px` outside DESIGN.md scale at `globals.css:279` (scrollbar thumb) — benign, document it.
- **P3-2** 12 literal font sizes off the DESIGN.md ramp, mostly print/export (`job-order-print-sheet.tsx:93`, `material-traceability-exports.tsx:172,196`, `material-bom-usage-dialog.tsx:88`). Print is an allowed exception; only confirm `material-bom-usage-dialog.tsx:88` is on screen.
- **P3-3** 8 raw hex literals (`material-traceability-exports.tsx`, `lib/master-data/resources/category.tsx`): export document colors and a user-chosen swatch regex — acceptable, add comments.
- **P3-4** Stale docs: `PRODUCT.md` says the dashboard home is partly mock while AGENTS.md says it is live; align them.

## 4. Page-by-Page Review (source + doc based)

| Route | Review |
|---|---|
| `/login` | **Rendered.** Split layout with navy brand panel; Thai text renders in the project font; clear single form. Contrast/keyboard not measured. |
| `/dashboard` | Live summary, KPI + chart cards, container queries. Verify empty/failed-source states at runtime (code has `failedSources`). |
| `/materials`, `/materials/catalog`, `receiving`, `disbursements` | Strongest module: canonical filters, chips, 3 views, RowActionsMenu. Disbursement form is dense (P2-6). |
| `/job-orders/*` | Detail page designed for tablet use; print sheet text-only. Good. |
| `/production/*` | Process board timeline, scan dialogs; complex but patterned. Not run. |
| `/engineering/*` | Setup wizard monolith (P2-4/P2-1). Version manager inside dialogs. |
| `/sales/*`, `/reports/*` | Consistent filter bar; report pages heavy but structured. |
| `/orders`, `/analytics` | Mock content (P1-1). |
| `/system/*`, `/master-data/*` | Generic descriptor pages: very consistent (positive). |
| `/manuals/*` | Server-rendered, screenshot callouts: good help (heuristic 10). |
| Auth: `/register`, `/forgot-password` | Not reviewed in render. |

## 5. Design System Findings

- Tokens are the single source (`globals.css`, `@theme inline`); radius/type/shadow rules documented in `DESIGN.md` and `docs/ui-style-guide.md` and enforced by a custom ESLint rule — rare and good.
- Detector summary: 26 findings → `side-tab` 12, `design-system-font-size` 12, `design-system-radius` 1, `border-accent-on-rounded` 1. Most font-size hits are print/export. No gradient-text or similar slop flagged.
- Gradients/blur: 13 uses of `bg-gradient`/`backdrop-blur` (not individually reviewed).
- The single fixed light theme is intentional; no dark-mode work needed.

## 6. Component Consistency

- Consistent: Button/Input/Select (searchable), RowActionsMenu, ConfirmDialog, FilterDropdown/Chip, PageTitle, generic master-data pages.
- Inconsistent: pagination (custom in tables vs `ui/data-table.tsx`, which lacks labels), emphasis style (side stripes vs tint vs badge), per-row accent colors in three different wizards (`BOM_ROW_ACCENTS`, disbursement `accent.strip`, setup wizard).
- `components/ui/data-table.tsx` appears used only by the mock orders table — a candidate to delete or align.

## 7. Accessibility Issues

- P1-2 unnamed pagination buttons. P2-2 contrast estimates. P2-3 reduced-motion kill. P2-7 no scroll cues.
- Positives: `focus-visible` rings on Button/Input/Checkbox/Switch/Dialog close; skip link; 26 labeled row/select-all controls; `aria-label` pattern on icon buttons elsewhere (only the data-table + one scan found lacking; my grep may miss multi-line labels); `role="alert"` through `FieldError`; coarse-pointer sizes (button `pointer-coarse:h-11`).
- Not tested: tab order, focus trap in dialogs/wizards, screen-reader announcements, Thai text at 200% zoom.

## 8. Responsive Issues

- Source shows container-query grids, full-screen dialogs below `sm`, Sheet nav below `lg`. `docs/ui-visual-review.md` records clean 390px and 1440px captures for 57 routes and fixes made on 2026-11-03.
- **Not re-verified here; no Tablet render at all** (the shop-floor device per PRODUCT.md). Recommend a 768–1024px pass on scan-heavy pages: job order detail, process board, disbursement dialog.
- Wide data tables rely on inner horizontal scroll with a hidden/visible mix of scrollbars (P2-7).

## 9. Quick Wins

1. Add `aria-label`s to the four `data-table.tsx` pagination buttons (P1-2).
2. Add `(dashboard)/error.tsx` (P1-3).
3. Banner or hide `/orders` and `/analytics` (P1-1).
4. Use `fg-secondary` instead of `fg-muted` for text on `surface-2`, after measuring (P2-2).
5. Replace the 12 side stripes with one shared "numbered header band" component (P2-1).
6. Sync `PRODUCT.md` with AGENTS.md on the dashboard data status (P3-4).

## 10. Recommended Improvement Roadmap

1. **Now (approval needed):** `/impeccable harden` for P1-1/P1-3/P2-5; `/impeccable audit` re-run authenticated with real renders and measured contrast.
2. **Next:** `/impeccable polish` + `/impeccable quieter` for emphasis consistency (P2-1, P2-8); `/impeccable animate` for reduced-motion (P2-3).
3. **Then:** `/impeccable extract` to split the wizard/table monoliths and share row-accent/step components; `/impeccable optimize` after measuring bundle and interaction cost (P2-4).
4. **Finally:** `/impeccable adapt` tablet pass for scan flows (P2-7, §8), then `/impeccable polish` as the closing step.

Nothing here has been changed; awaiting approval before any redesign or code edit. Re-run `/impeccable audit` after fixes to track the score.
