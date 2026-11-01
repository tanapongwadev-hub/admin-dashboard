---
name: CPS Admin Dashboard
description: Navy Enterprise admin console for factory materials, production and sales, built for desktop and shop-floor tablets.
colors:
  primary: "#1769D1"
  primary-hover: "#135DAE"
  primary-soft: "#E7F1FC"
  navy: "#0F2747"
  navy-dark: "#091C33"
  page-bg: "#F5F7FA"
  surface: "#FFFFFF"
  surface-2: "#EDF1F6"
  border: "#E2E8F0"
  border-strong: "#CBD5E1"
  text: "#172033"
  text-secondary: "#475569"
  text-muted: "#64748B"
  success: "#16A34A"
  success-soft: "#E7F6EC"
  success-text: "#166534"
  warning: "#F59E0B"
  warning-soft: "#FEF3E0"
  warning-text: "#92400E"
  danger: "#DC2626"
  danger-soft: "#FDEAEA"
  danger-text: "#B91C1C"
  info: "#0EA5E9"
  info-soft: "#E3F4FC"
  info-text: "#0369A1"
  on-navy-primary: "#4C9AEF"
typography:
  body:
    fontFamily: "IBM Plex Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "IBM Plex Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "IBM Plex Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  sidebar:
    backgroundColor: "{colors.navy}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
---

# Design System: CPS Admin Dashboard

## Overview

**Creative North Star: "The Control Room"**

A calm, light working surface with one dark navy spine. The page is pale gray and the content sits on white cards; the sidebar and login panel carry the dark navy as a fixed frame, never as a mode. Everything is tuned for accuracy at the point of work: dense tables, labelled values, clear status, large enough targets for a tablet on the shop floor.

Density is moderate. Information is grouped into bordered cells and data sheets rather than loose text, and the most important number on a record (stock, quantity) is the largest thing on it. Decoration is absent; color carries meaning (status, lot identity) and is always paired with text.

**Key Characteristics:**
- Single fixed theme, no dark mode; the sidebar is dark by scoping, not by toggle.
- Accent blue for interaction, navy only for chrome.
- Thai-first typography; one family for Thai and Latin.
- Status is never color-only: badge text, icon or label always accompanies the tone.

## Colors

Restrained and corporate: a saturated blue accent on cool neutrals, with semantic green/amber/red/sky for status.

### Primary
- **Accent Blue** (#1769D1): buttons, links, focus ring, active states, selected rows. Hover is **Deep Accent** (#135DAE). **Soft Accent** (#E7F1FC) is the tinted fill for active nav rows, stock hero panels and selected chips. Inside the navy sidebar the accent is lifted to **Sidebar Sky** (#4C9AEF) so it stays legible.

### Secondary
- **Primary Navy** (#0F2747) and **Navy Deep** (#091C33): the sidebar, login/auth brand panel and mobile nav only. Never used for page content or buttons.

### Neutral
- **Page Mist** (#F5F7FA): page background.
- **Card White** (#FFFFFF): cards, dialogs, inputs, header.
- **Pale Slate** (#EDF1F6): hover, table header, secondary fills.
- **Hairline** (#E2E8F0) and **Strong Hairline** (#CBD5E1): dividers and input borders.
- **Ink** (#172033), **Slate Text** (#475569), **Quiet Slate** (#64748B): primary, secondary and muted text.

### Semantic
- **Success** (#16A34A, text #166534), **Warning** (#F59E0B, text #92400E), **Danger** (#DC2626, text #B91C1C), **Info** (#0EA5E9, text #0369A1), each with a soft tint fill for badges. Use the darker `-text` value for text on a tint.

### Named Rules
**The Two Navies Rule.** Accent Blue is interactive; Primary Navy is chrome. Never make a button or link navy.

**The Token Rule.** Reference tokens (`bg-primary`, `text-fg-muted`), never raw hex.

**The Lot Color Rule.** Eight lot colors (`--lot-1..8`, chosen by the lot's trailing sequence number) identify individual material lots in traceability views. They identify, they do not signal status.

## Typography

**Display/Body Font:** IBM Plex Sans Thai (fallback ui-sans-serif, system-ui). Chosen because it covers Thai and Latin in one family.
**Mono Font:** Geist Mono, for lot codes, QR codes and the keyboard hint only.

**Character:** Slightly technical and even, readable at small sizes in Thai; numbers use tabular figures where they align in columns.

### Hierarchy
- **Page title** (600, ~1.5rem): one per page.
- **Title** (600, 1.125rem, 1.35): card and dialog headings.
- **Body** (400, 0.875rem, 1.5): default.
- **Label** (500, 0.75rem): field labels, table headers, eyebrows (small uppercase eyebrows only for Latin codes).
- **Data hero** (600, 1.75-2rem, tabular): the key quantity on a card, such as remaining stock.
- **Code** (Geist Mono 500, 0.8125rem): lot numbers and QR strings.

### Named Rules
**The Thai Glyph Rule.** Any new font must cover Thai, otherwise Thai text falls back to a mismatched system font.

## Layout

A floating-box shell fills the full viewport height: a rounded bordered sidebar, a rounded topbar and a separately scrolling content surface, with a small outer gap. The document itself never scrolls. Below `lg` the sidebar becomes a floating sheet. Content grids use container queries (not viewport breakpoints), because the sidebar eats variable width; card grids run 1, 2 or 4 columns by container width.

Wide data tables keep a visible horizontal scrollbar and a sticky header inside a bounded container; ordinary vertical scrollers hide their scrollbar. Lists use a quick filter bar, removable filter chips and a right-side staged drawer for advanced filters. Forms use a two-column dialog on desktop and full screen on mobile. Touch targets grow to 40-44px on coarse pointers.

## Elevation & Depth

Mostly flat and bordered. Depth comes from white-on-mist layering plus 1px hairline borders; soft shadows are limited to floating chrome (shell surfaces, dialogs, menus). State changes use tint (soft accent) rather than lift. Print views switch to monochrome with cut borders.

### Named Rules
**The Border First Rule.** Separate regions with hairline borders or `divide-y`, not shadows.

## Shapes

Tight, practical corners: base radius 8px (cards, inputs `rounded-md` 6px), 12px for the floating shell and large containers, 4px for small chips. Cells inside data sheets are square-cornered inside a rounded, bordered frame. Avoid pill shapes except for status badges and the view toggle.

## Components

### Buttons
- **Shape:** rounded-md (6px), height 36px (40-44px on touch).
- **Primary:** Accent Blue fill, white text; hover Deep Accent.
- **Secondary / Outline / Ghost / Danger / Link:** a filled secondary for a lone action on a card; outline only when paired with a primary.
- **Focus:** 2px accent ring.

### Cards / Containers
- **Corner Style:** 8px. **Background:** Card White on Page Mist. **Border:** hairline. **Structure:** image or identity header, key figure, bordered Data Sheet table, action row, divided by `divide-y`.

### Inputs / Fields
- **Style:** white fill, Strong Hairline border, 6px radius; labelled, with error text linked by `aria-describedby`. Selects are searchable by default.

### Badges and Status
- Soft tinted fill, tone text colour, always a text label; status pairs with a dot or icon.

### Navigation
- **Sidebar:** Primary Navy surface; rows are borderless, the active row has Soft Accent fill, accent text, semibold weight and a 3px left bar; open parents use Navy Deep. Collapsed mode is icon-only with accessible names.

### Data Sheet
- Signature component: a bordered key/value table inside a card with muted labels and ink values, reused by cards and detail dialogs so a value reads the same everywhere.

## Do's and Don'ts

### Do:
- **Do** use the existing `components/ui/*` primitives and token classes.
- **Do** keep the key quantity the biggest element on a record.
- **Do** pair every status colour with a text label.
- **Do** write all user-facing copy in Thai.
- **Do** target WCAG 2.1 AA contrast; use `-text` shades on tinted backgrounds.

### Don't:
- **Don't** add a dark mode or `dark:` variants; the only dark surface is the navy chrome.
- **Don't** use raw hex or navy for buttons and links.
- **Don't** use `variant="outline"` for a lone button on a card; use secondary or stronger.
- **Don't** hand-roll a new filter bar, row-action menu or confirm dialog.
- **Don't** introduce a font without Thai glyph coverage.
