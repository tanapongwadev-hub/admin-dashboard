---
target: /dashboard
total_score: 15
max_score: 36
na_heuristics: 8
p0_count: 0
p1_count: 3
target_identity: "file:D:\\project-cps\\New\\admin-dashboard\\src\\components\\dashboard\\dashboard-view.tsx"
target_fingerprint: "sha256:e6607b22b0ae236ca308284e10ca9439cd3647d2ef4a15cc1611708bc07d957e"
target_path: "D:\\project-cps\\New\\admin-dashboard\\src\\components\\dashboard\\dashboard-view.tsx"
timestamp: 2026-11-03T06-44-36Z
slug: src-components-dashboard-dashboard-view-tsx
---
# Dashboard critique
Independent design and detector assessments. Source-based; browser redirected to login. No authenticated visual validation.

Design specificity: domain-aware Thai factory dashboard, but conventional KPI/chart composition prioritizes reporting over resolving stock exceptions.

Heuristics (0–4): status 1; real-world match 2; user control 2; consistency 3; error prevention 1; recognition 2; efficiency 2; aesthetic/minimalist n/a (authenticated view unavailable); recovery 1; help 1. Total 15/36, provisional.

Strengths: explicit confirmed-document KPI scope; text labels accompany status colors; container-aware layout and Thai-compatible CSV BOM.

Priority issues:
1. P1 Failed fetches become zeros and healthy status. dashboard-loader.ts:36,117; dashboard-view.tsx:22; dashboard-header.tsx:65. Preserve per-source errors, unavailable states, retry and accurate material-health wording. Command: harden.
2. P1 Exception/document rows lack drill-down; material codes truncated. low-stock-watchlist.tsx:25; recent-documents.tsx:63,96. Show full identity and permission-aware links. Command: layout.
3. P1 Disbursement sums mix physical units. dashboard-loader.ts:58; recent-documents.tsx:83. Group quantities by unit or show item count. Command: clarify.
4. P2 Export silently limited to eight recent documents; selected range only controls chart. dashboard-view.tsx:40; dashboard-loader.ts:109. Label scope and relocate export or provide full export. Command: clarify.
5. P2 Empty-state advice mentions absent search/filter controls. low-stock-watchlist.tsx:14; recent-documents.tsx:37; category-breakdown-chart.tsx. Separate empty, denied and failed states. Command: clarify.

Detector: 10 advisory font-size findings. Nine 10/11px discrepancies; 30px KPI is consistent with DESIGN.md hero range and is a false positive. Locations: category-breakdown-chart.tsx:66; dashboard-filters.tsx:79,98,117,135,153; dashboard-view.tsx:166; kpi-card.tsx:121; low-stock-watchlist.tsx:26; traffic-chart.tsx:41. Directory scan includes potentially unused components.

Cognitive load: three header actions, two range options; no observed choice point above four. Repeated stock status competes with actionable queue. Emotional journey: reassuring start, questionable green status, then urgent rows without direct actions.
Personas: power users must navigate manually; screen-reader users may encounter unnamed mobile export button (dashboard-header.tsx:99); warehouse staff must reconstruct truncated codes. Runtime confirmation pending.
Minor: watchlist limited to six without total context; recent documents omit dates; refresh is manual despite animated live indicator.
Questions: prioritize trustworthy data or action navigation? Scope top three issues or all five?
