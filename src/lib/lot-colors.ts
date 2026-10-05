// Per-lot color coding for the traceability report: every lot number gets its
// own color (e.g. CCI-26J26-003 green, CCI-26J26-001 purple) and keeps it in
// every view — lot groups, disbursement dialog, movement table — so a lot can
// be followed by color alone. Colors come from the --lot-N tokens in
// globals.css; class strings are written out in full so Tailwind can see them.

export interface LotColor {
  /** Solid fill (dots, bars). */
  bar: string;
  /** Soft tinted background. */
  soft: string;
  /** Text color. */
  text: string;
  /** Left accent border. */
  border: string;
}

const LOT_COLORS: LotColor[] = [
  { bar: "bg-lot-1", soft: "bg-lot-1-soft", text: "text-lot-1", border: "border-l-lot-1" },
  { bar: "bg-lot-2", soft: "bg-lot-2-soft", text: "text-lot-2", border: "border-l-lot-2" },
  { bar: "bg-lot-3", soft: "bg-lot-3-soft", text: "text-lot-3", border: "border-l-lot-3" },
  { bar: "bg-lot-4", soft: "bg-lot-4-soft", text: "text-lot-4", border: "border-l-lot-4" },
  { bar: "bg-lot-5", soft: "bg-lot-5-soft", text: "text-lot-5", border: "border-l-lot-5" },
  { bar: "bg-lot-6", soft: "bg-lot-6-soft", text: "text-lot-6", border: "border-l-lot-6" },
  { bar: "bg-lot-7", soft: "bg-lot-7-soft", text: "text-lot-7", border: "border-l-lot-7" },
  { bar: "bg-lot-8", soft: "bg-lot-8-soft", text: "text-lot-8", border: "border-l-lot-8" },
];

/** Color by position — for views listing a known set of lots (e.g. the
 * origin lots of one trace), where sequence-based colors could collide
 * (WE-691004-001 and WE-691005-001 share a sequence). */
export function lotColorAt(index: number): LotColor {
  return LOT_COLORS[((index % LOT_COLORS.length) + LOT_COLORS.length) % LOT_COLORS.length];
}

// Colors are keyed off the lot's running sequence (the trailing -NNN of
// "CCI-26J26-003") so consecutive lots of the same day always differ; lot
// numbers without that suffix fall back to a string hash.
export function lotColor(lotNo: string | null | undefined): LotColor {
  const key = lotNo ?? "";
  const seq = /-(\d+)$/.exec(key);
  if (seq) return LOT_COLORS[Number(seq[1]) % LOT_COLORS.length];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return LOT_COLORS[hash % LOT_COLORS.length];
}
