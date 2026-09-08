export type CourseStatus =
  | "not_planned"
  | "planned"
  | "registered"
  | "in_progress"
  | "complete"
  | "optional"
  | "waived";

export interface TermDefinition {
  id: string;
  name: string;
  startMonth: number;
  endMonth: number;
  durationWeeks: number;
  sortOrder: number;
}

export interface TermSlot {
  id: string;
  year: number;
  termDefinitionId: string;
}

export interface Course {
  id: string;
  number: string;
  name: string;
  credits: number;
  durationTerms: number;
  offeredIn: string[];
  notes: string;
  status: CourseStatus;
}

export interface Placement {
  courseId: string;
  startSlotId: string;
}

export interface PlannerDocument {
  version: 1;
  termDefinitions: TermDefinition[];
  startYear: number;
  startTermDefinitionId: string;
  slots: TermSlot[];
  courses: Course[];
  placements: Placement[];
  maxCoursesPerTerm: number;
}

export const COURSE_STATUSES: CourseStatus[] = [
  "not_planned",
  "planned",
  "registered",
  "in_progress",
  "complete",
  "optional",
  "waived",
];

export const STATUS_LABELS: Record<CourseStatus, string> = {
  not_planned: "Not planned",
  planned: "Planned",
  registered: "Registered",
  in_progress: "In progress",
  complete: "Complete",
  optional: "Optional",
  waived: "Waived",
};

export const MANUAL_STATUSES: CourseStatus[] = [
  "registered",
  "in_progress",
  "complete",
  "optional",
  "waived",
];

/** Already-taken courses keep their placement when catalog availability changes. */
export const KEEP_PLACEMENT_STATUSES: CourseStatus[] = [
  "registered",
  "in_progress",
  "complete",
];

export function applyPlacementStatuses(
  courses: Course[],
  placements: Placement[],
): Course[] {
  const placed = new Set(placements.map((p) => p.courseId));
  return courses.map((course) => {
    if (MANUAL_STATUSES.includes(course.status)) return course;
    const next: CourseStatus = placed.has(course.id) ? "planned" : "not_planned";
    return course.status === next ? course : { ...course, status: next };
  });
}
