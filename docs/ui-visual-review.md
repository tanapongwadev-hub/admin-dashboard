# Authenticated UI visual review — 2026-11-03

Reviewed the local app through a real login using the project's documented
guide account. No business records were created, edited, confirmed or deleted.

## Coverage

- Captured all 57 static dashboard routes at 1440×960 desktop and 390×844 mobile
  with touch/coarse-pointer emulation, including aliases and shared master pages.
- Inspected individual screenshots and contact sheets for materials, engineering,
  production, job orders, sales, reports, master data, system and manuals.
- Opened receiving, category and sales-order create dialogs without saving.
- Revisited 14 directly affected routes at both sizes after changes; the browser
  reported no page errors and no document/main horizontal overflow in that pass.
- Dense tables intentionally remain horizontally scrollable inside their frames.

## Changes from visual evidence

| Observed drift | Resolution |
| --- | --- |
| Dashboard document actions widened the mobile content | Wrapping, width-bounded ChartCard actions; one-line document codes in an independently scrolling table |
| Six dashboard KPIs left an uneven 4+2 layout | Three columns when production metrics are present; existing four-column layout for four metrics |
| Material tabs hid the third choice | Wrap the tab bar; retain Radix tab behavior and labels |
| Product summary labels were truncated | Stack icon/value on mobile, wrap supporting labels, reuse border/radius without card shadows |
| Receiving/disbursement cards used gradient washes, 4px side accents and hover lift | Neutral image/data surfaces, 16:9 image area, shared radius/type scale and text status badges in every view |
| Dense table text wrapped into very short fragments | Explicit minimum table widths, adequate department column width and horizontal table scrolling |
| Scrolling tables could widen the mobile layout viewport | Contain table intrinsic sizing and clip authenticated screen-document overflow; preserve main/table scrolling and print styles |
| Report header/tinted text differed from shared defaults | Shared TableHeader background; darker semantic status text; unbroken QR codes |
| Hub pages added extra display labels and hidden category navigation | Remove redundant control-tower eyebrows; wrap menu-hub categories and use standard input/card shapes |
| Small touch controls differed from shared button targets | 44px coarse-pointer view toggles and close buttons, visible toggle focus and reserved dialog-header space |

## Evidence and limits

Screenshots and JSON observations are saved outside the source tree in the Codex
visualizations directory for this chat. `authenticated-ui-review.json` records the
57-route capture; `final-ui-review.json` records the 28 post-change page views.
`contact-{desktop,mobile}-{1..5}.png` contains the overview sheets; `final-*.png`
contains the affected-page and dialog captures.

This is a browser visual pass, not exhaustive testing of every dynamic document,
permission combination, browser engine or transaction state. All captures use
Chromium and the guide account's permissions. Lint, unit tests, build and
typecheck were not rerun in this visual-only request, per AGENTS.md R0.
