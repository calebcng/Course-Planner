import type { ReactNode } from "react";
import { offeredTermLabels } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { scheduledOfferingsForSlot, suggestionsForSlot } from "@/lib/placement";
import { slotLabel } from "@/lib/timeline";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { Course, TermDefinition } from "@/types";

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
  const unscheduled = slot
    ? suggestionsForSlot({
        slotId: slot.id,
        courses,
        placements,
        slots,
      })
    : [];
  const scheduled = slot
    ? scheduledOfferingsForSlot({
        slotId: slot.id,
        courses,
        placements,
        slots,
      })
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Plan {slot ? slotLabel(slot, termDefinitions) : "term"}
          </DialogTitle>
          <DialogDescription>
            Add unscheduled courses offered in this term, or transfer ones already
            scheduled elsewhere. You can add more than Max / term.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-stone-800">
            Unscheduled courses offered in this term
          </h3>
          {unscheduled.length === 0 ? (
            <p className="text-sm text-stone-500">No unscheduled courses for this slot.</p>
          ) : (
            <ul className="grid gap-2">
              {unscheduled.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  termDefinitions={termDefinitions}
                >
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (slot) placeCourse(course.id, slot.id);
                    }}
                  >
                    Add
                  </Button>
                </CourseRow>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-stone-800">
            Scheduled courses offered in this term
          </h3>
          {scheduled.length === 0 ? (
            <p className="text-sm text-stone-500">
              No scheduled courses are offered in this term.
            </p>
          ) : (
            <ul className="grid gap-2">
              {scheduled.map((row) => {
                const current = slots.find((s) => s.id === row.placement.startSlotId);
                return (
                  <CourseRow
                    key={row.course.id}
                    course={row.course}
                    termDefinitions={termDefinitions}
                    currentLabel={
                      current ? slotLabel(current, termDefinitions) : "Unknown term"
                    }
                  >
                    {row.occupiesSlot ? (
                      <span className="shrink-0 text-xs font-medium text-stone-500">
                        On this term
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={!row.canTransfer}
                        onClick={() => {
                          if (slot) placeCourse(row.course.id, slot.id);
                        }}
                      >
                        Transfer
                      </Button>
                    )}
                  </CourseRow>
                );
              })}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function CourseRow({
  course,
  termDefinitions,
  currentLabel,
  children,
}: {
  course: Course;
  termDefinitions: TermDefinition[];
  currentLabel?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 p-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-500">{course.number}</p>
        <p className="font-serif text-sm font-semibold">{course.name}</p>
        <p className="text-[11px] text-stone-500">
          {course.credits} cr
          {course.durationTerms > 1 ? ` · ${course.durationTerms} terms` : ""}
          {currentLabel
            ? ` · Currently: ${currentLabel}`
            : ` · Other terms: ${offeredTermLabels(course, termDefinitions)}`}
        </p>
      </div>
      {children}
    </li>
  );
}
