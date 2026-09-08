import type { Course, Placement, PlannerDocument, TermSlot } from "@/types";
import { canPlaceCourse } from "@/lib/placement";
import { appendNextSlot } from "@/lib/timeline";

const MAX_EXTRA_CYCLES = 8;

function sortRemaining(a: Course, b: Course): number {
  const offered = a.offeredIn.length - b.offeredIn.length;
  if (offered !== 0) return offered;
  const duration = b.durationTerms - a.durationTerms;
  if (duration !== 0) return duration;
  const credits = b.credits - a.credits;
  if (credits !== 0) return credits;
  return a.number.localeCompare(b.number) || a.name.localeCompare(b.name);
}

function earliestStart(
  course: Course,
  doc: PlannerDocument,
  placements: Placement[],
  slots: TermSlot[],
): string | undefined {
  for (const slot of slots) {
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

export function autoArrange(doc: PlannerDocument): {
  document: PlannerDocument;
  unplaced: Course[];
} {
  const placedIds = new Set(doc.placements.map((p) => p.courseId));
  const remaining = doc.courses
    .filter((c) => c.status === "not_planned" && !placedIds.has(c.id))
    .slice()
    .sort(sortRemaining);

  let slots = [...doc.slots];
  const placements: Placement[] = [...doc.placements];
  const unplaced: Course[] = [];
  const maxExtraSlots = Math.max(doc.termDefinitions.length, 1) * MAX_EXTRA_CYCLES;

  for (const course of remaining) {
    if (course.offeredIn.length === 0) {
      unplaced.push(course);
      continue;
    }

    let start = earliestStart(course, doc, placements, slots);
    let extra = 0;
    while (!start && extra < maxExtraSlots) {
      slots = appendNextSlot(slots, doc.termDefinitions);
      extra += 1;
      start = earliestStart(course, doc, placements, slots);
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
