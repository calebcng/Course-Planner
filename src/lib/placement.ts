import type { Course, Placement, TermSlot } from "@/types";
import { occupiedSlotIds, slotIndex } from "@/lib/timeline";

export function occupancyCounts(
  placements: Placement[],
  courses: Course[],
  slots: TermSlot[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of slots) {
    counts[slot.id] = 0;
  }
  const byId = new Map(courses.map((c) => [c.id, c]));
  for (const placement of placements) {
    const course = byId.get(placement.courseId);
    if (!course) continue;
    for (const id of occupiedSlotIds(
      placement.startSlotId,
      course.durationTerms,
      slots,
    )) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

export function creditsForSlot(
  slotId: string,
  placements: Placement[],
  courses: Course[],
): number {
  const byId = new Map(courses.map((c) => [c.id, c]));
  let total = 0;
  for (const placement of placements) {
    if (placement.startSlotId !== slotId) continue;
    total += byId.get(placement.courseId)?.credits ?? 0;
  }
  return total;
}

export function placementForCourse(
  placements: Placement[],
  courseId: string,
): Placement | undefined {
  return placements.find((p) => p.courseId === courseId);
}

export function canPlaceCourse(options: {
  course: Course;
  startSlotId: string;
  slots: TermSlot[];
  placements: Placement[];
  courses: Course[];
  maxCoursesPerTerm?: number;
  ignoreCourseId?: string;
}): boolean {
  const {
    course,
    startSlotId,
    slots,
    placements,
    courses,
    maxCoursesPerTerm,
    ignoreCourseId,
  } = options;

  if (course.durationTerms < 1) return false;
  const start = slotIndex(slots, startSlotId);
  if (start < 0) return false;
  const startSlot = slots[start];
  if (!course.offeredIn.includes(startSlot.termDefinitionId)) return false;
  if (start + course.durationTerms > slots.length) return false;

  if (maxCoursesPerTerm == null) return true;

  const relevant = placements.filter(
    (p) => p.courseId !== (ignoreCourseId ?? course.id),
  );
  const counts = occupancyCounts(relevant, courses, slots);
  for (let i = 0; i < course.durationTerms; i++) {
    const id = slots[start + i].id;
    if ((counts[id] ?? 0) >= maxCoursesPerTerm) return false;
  }
  return true;
}

export function validStartSlotIds(options: {
  course: Course;
  slots: TermSlot[];
  placements: Placement[];
  courses: Course[];
  maxCoursesPerTerm?: number;
  ignoreCourseId?: string;
}): string[] {
  return options.slots
    .filter((slot) =>
      canPlaceCourse({
        ...options,
        startSlotId: slot.id,
      }),
    )
    .map((slot) => slot.id);
}

export function suggestionsForSlot(options: {
  slotId: string;
  courses: Course[];
  placements: Placement[];
  slots: TermSlot[];
  maxCoursesPerTerm?: number;
}): Course[] {
  const placed = new Set(options.placements.map((p) => p.courseId));
  return options.courses.filter((course) => {
    if (placed.has(course.id)) return false;
    if (course.status === "complete" || course.status === "waived") return false;
    return canPlaceCourse({
      course,
      startSlotId: options.slotId,
      slots: options.slots,
      placements: options.placements,
      courses: options.courses,
      maxCoursesPerTerm: options.maxCoursesPerTerm,
    });
  });
}

export type LaneItem = {
  course: Course;
  placement: Placement;
  startCol: number;
  span: number;
  lane: number;
};

export function assignLanes(
  placements: Placement[],
  courses: Course[],
  slots: TermSlot[],
): LaneItem[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const items: Omit<LaneItem, "lane">[] = [];

  for (const placement of placements) {
    const course = byId.get(placement.courseId);
    const startCol = slotIndex(slots, placement.startSlotId);
    if (!course || startCol < 0) continue;
    const span = Math.min(course.durationTerms, slots.length - startCol);
    if (span < 1) continue;
    items.push({ course, placement, startCol, span });
  }

  items.sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const laneEnds: number[] = [];
  const result: LaneItem[] = [];

  for (const item of items) {
    const end = item.startCol + item.span;
    let lane = laneEnds.findIndex((occupiedUntil) => occupiedUntil <= item.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    result.push({ ...item, lane });
  }

  return result;
}

export function maxLane(items: LaneItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.lane), -1);
}
