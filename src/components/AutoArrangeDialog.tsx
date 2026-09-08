import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultArrangeFromSlotId, slotLabel } from "@/lib/timeline";
import { usePlannerStore } from "@/store/usePlannerStore";

const AFTER_LAST = "";

export function AutoArrangeDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fromSlotId: string | null) => void;
}) {
  const maxCoursesPerTerm = usePlannerStore((s) => s.maxCoursesPerTerm);
  const setMaxCoursesPerTerm = usePlannerStore((s) => s.setMaxCoursesPerTerm);
  const slots = usePlannerStore((s) => s.slots);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const [fromValue, setFromValue] = useState(AFTER_LAST);

  useEffect(() => {
    if (!open) return;
    setFromValue(defaultArrangeFromSlotId(slots, termDefinitions) ?? AFTER_LAST);
  }, [open, slots, termDefinitions]);

  const lastLabel =
    slots.length > 0
      ? slotLabel(slots[slots.length - 1], termDefinitions)
      : "the last term";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-arrange remaining courses</DialogTitle>
          <DialogDescription>
            Places Not planned courses in the chosen term and later, at most{" "}
            {maxCoursesPerTerm} course{maxCoursesPerTerm === 1 ? "" : "s"} per term.
            Already scheduled courses stay where they are. Extra terms are added if
            the timeline is too short.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="arrange-from">Start from</Label>
            <select
              id="arrange-from"
              className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
            >
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slotLabel(slot, termDefinitions)}
                </option>
              ))}
              <option value={AFTER_LAST}>After {lastLabel} (add if needed)</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="max-courses">Max / term</Label>
            <Input
              id="max-courses"
              type="number"
              min={1}
              max={12}
              className="h-9 w-24"
              value={maxCoursesPerTerm}
              onChange={(e) => setMaxCoursesPerTerm(Number(e.target.value))}
            />
            <p className="text-[11px] text-stone-500">
              Only used by auto-arrange. You can still drag extra courses onto a term.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(fromValue === AFTER_LAST ? null : fromValue);
              onOpenChange(false);
            }}
          >
            Arrange
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
