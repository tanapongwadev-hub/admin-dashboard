"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays, currentProductionDay, MAX_BACKDATE_DAYS, SHIFT_LABELS, type Shift } from "@/lib/production-day";

/** Production day + shift, defaulting to the current shift; back-date ≤ 2 days. */
export function DayShiftFields({
  idPrefix,
  date,
  shift,
  onDate,
  onShift,
}: {
  idPrefix: string;
  date: string;
  shift: Shift;
  onDate: (value: string) => void;
  onShift: (value: Shift) => void;
}) {
  const today = currentProductionDay().productionDate;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-date`}>วันผลิต</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          min={addDays(today, -MAX_BACKDATE_DAYS)}
          max={today}
          onChange={(e) => onDate(e.target.value || today)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-shift`}>กะ</Label>
        <select
          id={`${idPrefix}-shift`}
          value={shift}
          onChange={(e) => onShift(e.target.value as Shift)}
          className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
        >
          {(Object.keys(SHIFT_LABELS) as Shift[]).map((s) => (
            <option key={s} value={s}>
              {SHIFT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
