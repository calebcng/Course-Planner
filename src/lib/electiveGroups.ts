import type { Course, ElectiveGroup } from "@/types";

/** Planned, registered, in progress, complete, or waived counts as selected/taken. */
export function courseCountsTowardElectiveProgress(course: Course): boolean {
  return course.status !== "not_planned";
}

export function clampRequiredCount(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(99, n);
}

export function normalizeElectiveGroups(value: unknown): ElectiveGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: ElectiveGroup[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof rec.name === "string" ? rec.name : "";
    const courseIds = Array.isArray(rec.courseIds)
      ? [
          ...new Set(
            rec.courseIds.filter((cid): cid is string => typeof cid === "string" && cid.length > 0),
          ),
        ]
      : [];
    groups.push({
      id,
      name,
      requiredCount: clampRequiredCount(rec.requiredCount),
      courseIds,
    });
  }
  return groups;
}

export function electiveGroupProgress(
  group: ElectiveGroup,
  courses: Course[],
): { counted: number; required: number; satisfied: boolean } {
  const byId = new Map(courses.map((course) => [course.id, course]));
  let counted = 0;
  for (const id of group.courseIds) {
    const course = byId.get(id);
    if (course && courseCountsTowardElectiveProgress(course)) counted += 1;
  }
  const required = clampRequiredCount(group.requiredCount);
  return { counted, required, satisfied: counted >= required };
}

export function dropCourseFromGroups(
  groups: ElectiveGroup[],
  courseId: string,
): ElectiveGroup[] {
  let changed = false;
  const next = groups.map((group) => {
    if (!group.courseIds.includes(courseId)) return group;
    changed = true;
    return { ...group, courseIds: group.courseIds.filter((id) => id !== courseId) };
  });
  return changed ? next : groups;
}

export function groupsForCourse(
  groups: ElectiveGroup[],
  courseId: string,
): ElectiveGroup[] {
  return groups.filter((group) => group.courseIds.includes(courseId));
}
