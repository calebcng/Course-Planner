import type { PlannerDocument, TermDefinition } from "@/types";
import { generateSlots } from "@/lib/timeline";

export const DEFAULT_TERM_DEFS: TermDefinition[] = [
  {
    id: "fall-a",
    name: "Fall A",
    startMonth: 8,
    endMonth: 10,
    durationWeeks: 8,
    sortOrder: 1,
  },
  {
    id: "fall-b",
    name: "Fall B",
    startMonth: 10,
    endMonth: 12,
    durationWeeks: 8,
    sortOrder: 2,
  },
  {
    id: "spring-a",
    name: "Spring A",
    startMonth: 1,
    endMonth: 3,
    durationWeeks: 8,
    sortOrder: 3,
  },
  {
    id: "spring-b",
    name: "Spring B",
    startMonth: 3,
    endMonth: 5,
    durationWeeks: 8,
    sortOrder: 4,
  },
  {
    id: "summer",
    name: "Summer",
    startMonth: 5,
    endMonth: 7,
    durationWeeks: 8,
    sortOrder: 5,
  },
];

export const DEFAULT_START_TERM_ID = "fall-a";
export const DEFAULT_MAX_COURSES_PER_TERM = 2;

export function defaultStartYear(): number {
  return new Date().getFullYear();
}

export function createDefaultDocument(
  startYear = defaultStartYear(),
): PlannerDocument {
  return {
    version: 1,
    termDefinitions: DEFAULT_TERM_DEFS.map((d) => ({ ...d })),
    startYear,
    startTermDefinitionId: DEFAULT_START_TERM_ID,
    slots: generateSlots(DEFAULT_TERM_DEFS, startYear, DEFAULT_START_TERM_ID, 5),
    courses: [],
    placements: [],
    maxCoursesPerTerm: DEFAULT_MAX_COURSES_PER_TERM,
  };
}
