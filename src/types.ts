export type CourseStatus =
  | "not_planned"
  | "planned"
  | "registered"
  | "in_progress"
  | "complete"
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
  optional: boolean;
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
  "waived",
];

export const STATUS_LABELS: Record<CourseStatus, string> = {
  not_planned: "Not planned",
  planned: "Planned",
  registered: "Registered",
  in_progress: "In progress",
  complete: "Complete",
  waived: "Waived",
};

export const MANUAL_STATUSES: CourseStatus[] = [
  "registered",
  "in_progress",
  "complete",
  "waived",
];

/** Already-taken courses keep their placement when catalog availability changes. */
export const KEEP_PLACEMENT_STATUSES: CourseStatus[] = [
  "registered",
  "in_progress",
  "complete",
];

export function normalizeCourse(course: Course): Course {
  const legacyOptional = (course.status as string) === "optional";
  const status: CourseStatus = legacyOptional
    ? "not_planned"
    : COURSE_STATUSES.includes(course.status)
      ? course.status
      : "not_planned";
  return {
    ...course,
    status,
    optional: course.optional === true || legacyOptional,
  };
}

export function normalizeCourses(courses: Course[]): Course[] {
  return courses.map(normalizeCourse);
}

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
