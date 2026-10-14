"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        <Select value={shift} onValueChange={(value) => onShift(value as Shift)}>
          <SelectTrigger id={`${idPrefix}-shift`}><SelectValue placeholder="เลือกกะ" /></SelectTrigger>
          <SelectContent>
            {(Object.keys(SHIFT_LABELS) as Shift[]).map((s) => (
              <SelectItem key={s} value={s}>{SHIFT_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
