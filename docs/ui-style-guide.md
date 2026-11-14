# Shared UI style

`DESIGN.md` defines the Navy Enterprise visual system. Runtime colors, fonts and
radii live in `src/app/globals.css`; use the existing components in
`src/components/ui/` to apply them. This guide covers screen UI throughout the app.

## Typography

| Role | Implementation |
| --- | --- |
| Page heading | `PageTitle`, one visible h1 per screen; 24px, semibold |
| Card / dialog heading | `CardTitle` / `DialogTitle`; 18px, semibold |
| Body, descriptions, controls | `text-sm` (14px), comfortable Thai line height |
| Supporting text and table headings | `text-xs` (12px) minimum |
| Stock / metric hero | `text-3xl` (30px), semibold, tabular numerals |
| Real codes / lot / QR strings | `font-mono text-[13px]`; Thai prose uses the sans family |

```tsx
import { PageTitle } from "@/components/ui/page-title";

<div>
  <PageTitle>รับเข้าวัตถุดิบ</PageTitle>
  <p className="mt-1 text-sm text-fg-muted">ตรวจสอบเอกสารรับเข้าและจำนวนคงเหลือ</p>
</div>
```

PageTitle accepts normal heading attributes. Preserve contextual spacing and
code fonts via className; avoid overriding its size, weight or tracking.

## Surfaces and spacing

- Use `Card` for ordinary cards. `cardStyles` gives semantic article/section
  wrappers the identical 8px radius, surface fill and hairline border.
- Dialogs, drawers and the app shell use `rounded-xl` (12px). Controls use
  `rounded-md` (6px); small chips can use `rounded-sm` (4px). Reserve circles
  and pills for avatars, statuses and toggles.
- Shared card headers and bodies use `px-5 py-4`; footers use `px-5 py-3`.
  Use 24px between page sections and 16px within form groups and grids.
  Specialized dense tables may retain tighter cell spacing.
- Use borders and background tints to group content. Shadows belong to
  floating dialogs, menus and chrome; static cards do not lift on hover.
- Internal grids use container queries where available width depends on the
  sidebar. Permit headers and action groups to wrap on narrow screens.
- Keep all material tabs reachable on phones by wrapping them. ChartCard action
  groups must have `min-w-0 max-w-full flex-wrap`; nested actions must not force
  the page wider than its content region.
- Receiving/disbursement cards, rows and tables use neutral surfaces and shared
  status badges, superseding the earlier gradient/colored-side-border styling.

## Forms and actions

- Use `Input`, `Textarea`, `Select`, `Label` and `Button`. Input, Textarea and
  Select share `fieldStyles`; single-line controls share `singleLineFieldStyles`.
- Fields use the same background, border, focus ring, disabled styling and
  `aria-invalid` styling. Error messages still need associated descriptions.
- Desktop fields are 36px tall; coarse pointers get a minimum 44px target.
  Button variants retain compact, regular and large sizes; regular/large touch
  targets are 44px, compact touch targets are 40px.
- Use primary for the main action, secondary for an independent supporting
  action, outline beside a primary, ghost for low-emphasis navigation, and
  danger for destructive actions. Use the component API instead of recreating
  buttons with background and height classes.
- Tables use the shared Table primitives: muted header background, 12px
  semibold labels without uppercase/tracking on Thai, 14px body, token borders.
- Wide tables scroll inside their own wrapper. Set an appropriate minimum width
  on the actual table (master lists 40rem, documents 44rem, operational lists
  48rem, the multi-column traceability report 88rem) instead of squeezing codes
  and names into a few characters. Keep codes on one line where practical.
  The shared wrapper has inline-size containment; the authenticated shell clips
  screen document overflow while main and tables retain their own scrolling.
- View toggles and dialog/drawer close buttons grow to 44px on coarse pointers.
  Dialog headers reserve space for the close button rather than overlapping it.
- Filters, row menus and confirmations follow the existing AGENTS.md patterns.

## Color and scope

Use semantic tokens (`bg-surface`, `text-fg`, `text-fg-muted`, `text-primary`).
On status tints, use the corresponding darker `text-success-fg`,
`text-warning-fg`, `text-danger-fg` or `text-info-fg`; always include a text label.
Navy is reserved for navigation and auth branding; ordinary account content
uses the same light surfaces as other pages. No dark-mode variants.

Print layouts and QR labels retain physical dimensions, monochrome borders and
their own type scale. Global-error remains self-contained if the root layout
fails. Hidden report headings retain their accessible sr-only h1. Branding on
auth pages can retain its composition while using the same tokens/type scale.

## Keeping the system consistent

The `design-system/consistent-styles` ESLint rule rejects screen text below
12px, oversized rounded utilities and raw visible h1 elements outside PageTitle.
It excludes print layouts, the root error fallback and PageTitle's own h1.
The existing lint command runs these checks when explicitly requested.

For a new UI pattern, first reuse the shared primitive; add a shared variant
when at least three surfaces have the same need. Record any justified visual
exception here rather than introducing another local design language.
