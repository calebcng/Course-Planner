import type { Course, Placement, PlannerDocument, TermSlot } from "@/types";
import { canPlaceCourse } from "@/lib/placement";
import { appendNextSlot, slotIndex } from "@/lib/timeline";

const MAX_EXTRA_CYCLES = 8;

export type AutoArrangeOptions = {
  /** First eligible slot. `null` means only terms after the current last slot. */
  fromSlotId?: string | null;
};

function sortRemaining(a: Course, b: Course): number {
  const offered = a.offeredIn.length - b.offeredIn.length;
  if (offered !== 0) return offered;
  const duration = b.durationTerms - a.durationTerms;
  if (duration !== 0) return duration;
  const credits = b.credits - a.credits;
  if (credits !== 0) return credits;
  return a.number.localeCompare(b.number) || a.name.localeCompare(b.name);
}

function resolveFromIndex(slots: TermSlot[], fromSlotId?: string | null): number {
  if (fromSlotId == null) return slots.length;
  const index = slotIndex(slots, fromSlotId);
  return index < 0 ? slots.length : index;
}

function earliestStart(
  course: Course,
  doc: PlannerDocument,
  placements: Placement[],
  slots: TermSlot[],
  fromIndex: number,
): string | undefined {
  for (let i = fromIndex; i < slots.length; i++) {
    const slot = slots[i];
    if (
      canPlaceCourse({
        course,
        startSlotId: slot.id,
        slots,
        placements,
        courses: doc.courses,
        maxCoursesPerTerm: doc.maxCoursesPerTerm,
      })
    ) {
      return slot.id;
    }
  }
  return undefined;
}

export function autoArrange(
  doc: PlannerDocument,
  options: AutoArrangeOptions = {},
): {
  document: PlannerDocument;
  unplaced: Course[];
} {
  const placedIds = new Set(doc.placements.map((p) => p.courseId));
  const remaining = doc.courses
    .filter((c) => c.status === "not_planned" && !c.optional && !placedIds.has(c.id))
    .slice()
    .sort(sortRemaining);

  let slots = [...doc.slots];
  const fromIndex = resolveFromIndex(slots, options.fromSlotId);
  const placements: Placement[] = [...doc.placements];
  const unplaced: Course[] = [];
  const maxExtraSlots = Math.max(doc.termDefinitions.length, 1) * MAX_EXTRA_CYCLES;

  for (const course of remaining) {
    if (course.offeredIn.length === 0) {
      unplaced.push(course);
      continue;
    }

    let start = earliestStart(course, doc, placements, slots, fromIndex);
    let extra = 0;
    while (!start && extra < maxExtraSlots) {
      slots = appendNextSlot(slots, doc.termDefinitions);
      extra += 1;
      start = earliestStart(course, doc, placements, slots, fromIndex);
    }

    if (start) {
      placements.push({ courseId: course.id, startSlotId: start });
    } else {
      unplaced.push(course);
    }
  }

  return {
    document: {
      ...doc,
      slots,
      placements,
    },
    unplaced,
  };
}
