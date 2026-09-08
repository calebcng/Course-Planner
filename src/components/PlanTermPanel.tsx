import { offeredTermLabels } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { suggestionsForSlot } from "@/lib/placement";
import { slotLabel } from "@/lib/timeline";
import { usePlannerStore } from "@/store/usePlannerStore";

export function PlanTermPanel({
  slotId,
  open,
  onOpenChange,
}: {
  slotId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const slots = usePlannerStore((s) => s.slots);
  const courses = usePlannerStore((s) => s.courses);
  const placements = usePlannerStore((s) => s.placements);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const placeCourse = usePlannerStore((s) => s.placeCourse);

  const slot = slots.find((s) => s.id === slotId) ?? null;
  const suggestions = slot
    ? suggestionsForSlot({
        slotId: slot.id,
        courses,
        placements,
        slots,
      })
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Plan {slot ? slotLabel(slot, termDefinitions) : "term"}
          </DialogTitle>
          <DialogDescription>
            Unscheduled courses offered in this term. You can add more than Max / term.
          </DialogDescription>
        </DialogHeader>
        {suggestions.length === 0 ? (
          <p className="text-sm text-stone-500">No eligible courses for this slot.</p>
        ) : (
          <ul className="grid max-h-80 gap-2 overflow-y-auto">
            {suggestions.map((course) => (
              <li
                key={course.id}
                className="flex items-start justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 p-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-500">{course.number}</p>
                  <p className="font-serif text-sm font-semibold">{course.name}</p>
                  <p className="text-[11px] text-stone-500">
                    {course.credits} cr
                    {course.durationTerms > 1 ? ` · ${course.durationTerms} terms` : ""}{" "}
                    · Other terms: {offeredTermLabels(course, termDefinitions)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (slot) placeCourse(course.id, slot.id);
                  }}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
