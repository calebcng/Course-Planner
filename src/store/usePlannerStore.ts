import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDefaultDocument } from "@/defaults";
import { autoArrange } from "@/lib/autoArrange";
import { createId } from "@/lib/ids";
import { canPlaceCourse } from "@/lib/placement";
import { hashFromLocation } from "@/lib/serialize";
import {
  appendCycle,
  appendNextSlot,
  ensureSlotsThrough,
  findSlotByRef,
  generateSlots,
  occupiedSlotIds,
  orderedTermDefinitions,
  prependPrevSlot,
  withSequentialSortOrder,
} from "@/lib/timeline";
import type {
  Course,
  CourseStatus,
  Placement,
  PlannerDocument,
  TermDefinition,
} from "@/types";
import { applyPlacementStatuses } from "@/types";

export type AppPage = "schedule" | "courses" | "terms";
export type ScheduleView = "table" | "timeline";

export interface PlannerState extends PlannerDocument {
  page: AppPage;
  view: ScheduleView;
  showWaived: boolean;
  showOptional: boolean;
  sidebarCollapsed: boolean;
  addTermDefinition: (partial?: Partial<TermDefinition>) => void;
  updateTermDefinition: (id: string, patch: Partial<TermDefinition>) => void;
  removeTermDefinition: (id: string) => void;
  reorderTermDefinitions: (activeId: string, overId: string) => void;
  setStart: (year: number, termDefinitionId: string) => void;
  resetTimeline: () => void;
  addNextTerm: () => void;
  addPrevTerm: () => void;
  addFullCycle: () => void;
  removeFirstTerm: () => void;
  removeLastTerm: () => void;
  removeSlot: (slotId: string) => void;
  addCourse: (input: Omit<Course, "id">) => string;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  removeCourse: (id: string) => void;
  setCourseStatus: (id: string, status: CourseStatus) => void;
  placeCourse: (courseId: string, startSlotId: string) => boolean;
  unplaceCourse: (courseId: string) => void;
  setMaxCoursesPerTerm: (n: number) => void;
  setPage: (page: AppPage) => void;
  setView: (view: ScheduleView) => void;
  setShowWaived: (show: boolean) => void;
  setShowOptional: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  importCourses: (courses: Omit<Course, "id">[]) => void;
  placeCourseOnTerm: (courseId: string, target: { year: number; termDefinitionId: string }) => boolean;
  runAutoArrange: (fromSlotId?: string | null) => Course[];
  clearPlannedCourses: () => number;
  hydrateFromDocument: (doc: PlannerDocument) => void;
}

const STORAGE_KEY = "course-planner";

function migrateUiNav(state: { page?: unknown; view?: unknown }): {
  page: AppPage;
  view: ScheduleView;
} {
  if (state.view === "courses") {
    return { page: "courses", view: "table" };
  }
  const page: AppPage =
    state.page === "courses" || state.page === "terms" || state.page === "schedule"
      ? state.page
      : "schedule";
  const view: ScheduleView = state.view === "timeline" ? "timeline" : "table";
  return { page, view };
}

function documentSlice(state: PlannerDocument): PlannerDocument {
  return {
    version: 1,
    termDefinitions: state.termDefinitions,
    startYear: state.startYear,
    startTermDefinitionId: state.startTermDefinitionId,
    slots: state.slots,
    courses: state.courses,
    placements: state.placements,
    maxCoursesPerTerm: state.maxCoursesPerTerm,
  };
}

function dropPlacementsForSlots(
  placements: Placement[],
  courses: Course[],
  slots: PlannerDocument["slots"],
  removedIds: Set<string>,
): Placement[] {
  return placements.filter((p) => {
    const course = courses.find((c) => c.id === p.courseId);
    if (!course) return false;
    const occupied = occupiedSlotIds(p.startSlotId, course.durationTerms, slots);
    if (occupied.length === 0) return false;
    return occupied.every((id) => !removedIds.has(id));
  });
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      ...createDefaultDocument(),
      page: "schedule",
      view: "table",
      showWaived: false,
      showOptional: false,
      sidebarCollapsed: false,

      addTermDefinition: (partial) => {
        const defs = get().termDefinitions;
        const def: TermDefinition = {
          id: createId(),
          name: partial?.name ?? "New term",
          startMonth: partial?.startMonth ?? 1,
          endMonth: partial?.endMonth ?? 3,
          durationWeeks: partial?.durationWeeks ?? 8,
          sortOrder: defs.length + 1,
        };
        set({ termDefinitions: withSequentialSortOrder([...defs, def]) });
      },

      updateTermDefinition: (id, patch) => {
        set({
          termDefinitions: get().termDefinitions.map((d) =>
            d.id === id ? { ...d, ...patch, id: d.id } : d,
          ),
        });
      },

      removeTermDefinition: (id) => {
        const { termDefinitions, slots, courses, placements, startTermDefinitionId } =
          get();
        if (termDefinitions.length <= 1) return;
        const nextDefs = termDefinitions.filter((d) => d.id !== id);
        const removedSlotIds = new Set(
          slots.filter((s) => s.termDefinitionId === id).map((s) => s.id),
        );
        const nextSlots = slots.filter((s) => s.termDefinitionId !== id);
        const nextPlacements = dropPlacementsForSlots(
          placements,
          courses,
          slots,
          removedSlotIds,
        );
        const nextCourses = applyPlacementStatuses(
          courses.map((c) => ({
            ...c,
            offeredIn: c.offeredIn.filter((tid) => tid !== id),
          })),
          nextPlacements,
        );
        set({
          termDefinitions: withSequentialSortOrder(nextDefs),
          slots: nextSlots,
          startTermDefinitionId:
            startTermDefinitionId === id ? nextDefs[0].id : startTermDefinitionId,
          courses: nextCourses,
          placements: nextPlacements,
        });
      },

      reorderTermDefinitions: (activeId, overId) => {
        if (activeId === overId) return;
        const defs = get().termDefinitions;
        const from = defs.findIndex((d) => d.id === activeId);
        const to = defs.findIndex((d) => d.id === overId);
        if (from < 0 || to < 0) return;
        const next = [...defs];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        set({ termDefinitions: withSequentialSortOrder(next) });
      },

      setStart: (year, termDefinitionId) => {
        set({ startYear: year, startTermDefinitionId: termDefinitionId });
      },

      resetTimeline: () => {
        const { termDefinitions, startYear, startTermDefinitionId, courses } = get();
        set({
          slots: generateSlots(
            termDefinitions,
            startYear,
            startTermDefinitionId,
            Math.max(termDefinitions.length, 1),
          ),
          placements: [],
          courses: applyPlacementStatuses(courses, []),
        });
      },

      addNextTerm: () => {
        const { slots, termDefinitions, startYear, startTermDefinitionId } = get();
        if (slots.length === 0) {
          set({
            slots: generateSlots(termDefinitions, startYear, startTermDefinitionId, 1),
          });
          return;
        }
        set({ slots: appendNextSlot(slots, termDefinitions) });
      },

      addPrevTerm: () => {
        const { slots, termDefinitions, startYear, startTermDefinitionId } = get();
        if (slots.length === 0) {
          set({
            slots: generateSlots(termDefinitions, startYear, startTermDefinitionId, 1),
          });
          return;
        }
        set({ slots: prependPrevSlot(slots, termDefinitions) });
      },

      addFullCycle: () => {
        const { slots, termDefinitions, startYear, startTermDefinitionId } = get();
        if (slots.length === 0) {
          set({
            slots: generateSlots(
              termDefinitions,
              startYear,
              startTermDefinitionId,
              Math.max(termDefinitions.length, 1),
            ),
          });
          return;
        }
        set({ slots: appendCycle(slots, termDefinitions) });
      },

      removeFirstTerm: () => {
        const { slots, courses, placements } = get();
        if (slots.length === 0) return;
        const removed = slots[0];
        const nextPlacements = dropPlacementsForSlots(
          placements,
          courses,
          slots,
          new Set([removed.id]),
        );
        set({
          slots: slots.slice(1),
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
      },

      removeLastTerm: () => {
        const { slots, courses, placements } = get();
        if (slots.length === 0) return;
        const removed = slots[slots.length - 1];
        const nextPlacements = dropPlacementsForSlots(
          placements,
          courses,
          slots,
          new Set([removed.id]),
        );
        set({
          slots: slots.slice(0, -1),
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
      },

      removeSlot: (slotId) => {
        const { slots, courses, placements } = get();
        if (!slots.some((s) => s.id === slotId)) return;
        const nextPlacements = dropPlacementsForSlots(
          placements,
          courses,
          slots,
          new Set([slotId]),
        );
        set({
          slots: slots.filter((s) => s.id !== slotId),
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
      },

      addCourse: (input) => {
        const id = createId();
        const course: Course = { ...input, id };
        const { courses, placements } = get();
        set({
          courses: applyPlacementStatuses([...courses, course], placements),
        });
        return id;
      },

      importCourses: (incoming) => {
        if (incoming.length === 0) return;
        const { courses, placements } = get();
        const next = incoming.map((input) => ({ ...input, id: createId() }));
        set({
          courses: applyPlacementStatuses([...courses, ...next], placements),
        });
      },

      updateCourse: (id, patch) => {
        set({
          courses: get().courses.map((c) => (c.id === id ? { ...c, ...patch, id } : c)),
        });
      },

      removeCourse: (id) => {
        set({
          courses: get().courses.filter((c) => c.id !== id),
          placements: get().placements.filter((p) => p.courseId !== id),
        });
      },

      setCourseStatus: (id, status) => {
        set({
          courses: get().courses.map((c) => (c.id === id ? { ...c, status } : c)),
        });
      },

      placeCourse: (courseId, startSlotId) => {
        const { courses, slots, placements } = get();
        const course = courses.find((c) => c.id === courseId);
        if (!course) return false;
        const ok = canPlaceCourse({
          course,
          startSlotId,
          slots,
          placements,
          courses,
          ignoreCourseId: courseId,
        });
        if (!ok) return false;
        const nextPlacements = [
          ...placements.filter((p) => p.courseId !== courseId),
          { courseId, startSlotId },
        ];
        set({
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
        return true;
      },

      placeCourseOnTerm: (courseId, target) => {
        const {
          courses,
          slots,
          placements,
          termDefinitions,
          startYear,
          startTermDefinitionId,
        } = get();
        const course = courses.find((c) => c.id === courseId);
        if (!course) return false;
        const nextSlots = ensureSlotsThrough(
          slots,
          termDefinitions,
          target,
          Math.max(0, course.durationTerms - 1),
          { year: startYear, termDefinitionId: startTermDefinitionId },
        );
        const start = findSlotByRef(nextSlots, target);
        if (!start) return false;
        const ok = canPlaceCourse({
          course,
          startSlotId: start.id,
          slots: nextSlots,
          placements,
          courses,
          ignoreCourseId: courseId,
        });
        if (!ok) return false;
        const nextPlacements = [
          ...placements.filter((p) => p.courseId !== courseId),
          { courseId, startSlotId: start.id },
        ];
        set({
          slots: nextSlots,
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
        return true;
      },

      unplaceCourse: (courseId) => {
        const { courses, placements } = get();
        const nextPlacements = placements.filter((p) => p.courseId !== courseId);
        set({
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
      },

      setMaxCoursesPerTerm: (n) => {
        set({ maxCoursesPerTerm: Math.max(1, Math.min(12, Math.round(n) || 1)) });
      },

      setPage: (page) => set({ page }),
      setView: (view) => set({ view }),
      setShowWaived: (show) => set({ showWaived: show }),
      setShowOptional: (show) => set({ showOptional: show }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      runAutoArrange: (fromSlotId) => {
        const result = autoArrange(documentSlice(get()), { fromSlotId });
        set({
          slots: result.document.slots,
          placements: result.document.placements,
          courses: applyPlacementStatuses(get().courses, result.document.placements),
        });
        return result.unplaced;
      },

      clearPlannedCourses: () => {
        const { courses, placements } = get();
        const plannedIds = new Set(
          courses.filter((c) => c.status === "planned").map((c) => c.id),
        );
        if (plannedIds.size === 0) return 0;
        const nextPlacements = placements.filter((p) => !plannedIds.has(p.courseId));
        set({
          placements: nextPlacements,
          courses: applyPlacementStatuses(courses, nextPlacements),
        });
        return plannedIds.size;
      },

      hydrateFromDocument: (doc) => {
        set({
          version: 1,
          termDefinitions: orderedTermDefinitions(doc.termDefinitions),
          startYear: doc.startYear,
          startTermDefinitionId: doc.startTermDefinitionId,
          slots: doc.slots,
          courses: applyPlacementStatuses(doc.courses, doc.placements),
          placements: doc.placements,
          maxCoursesPerTerm: doc.maxCoursesPerTerm,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        version: state.version,
        termDefinitions: state.termDefinitions,
        startYear: state.startYear,
        startTermDefinitionId: state.startTermDefinitionId,
        slots: state.slots,
        courses: state.courses,
        placements: state.placements,
        maxCoursesPerTerm: state.maxCoursesPerTerm,
        page: state.page,
        view: state.view,
        showWaived: state.showWaived,
        showOptional: state.showOptional,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PlannerState>;
        return {
          ...current,
          ...stored,
          ...migrateUiNav(stored),
        };
      },
      onRehydrateStorage: () => () => {
        const fromHash = hashFromLocation();
        if (fromHash) {
          usePlannerStore.setState({
            ...fromHash,
            version: 1,
            termDefinitions: orderedTermDefinitions(fromHash.termDefinitions),
            courses: applyPlacementStatuses(fromHash.courses, fromHash.placements),
          });
          return;
        }
        const state = usePlannerStore.getState();
        usePlannerStore.setState({
          termDefinitions: orderedTermDefinitions(state.termDefinitions),
          courses: applyPlacementStatuses(state.courses, state.placements),
          ...migrateUiNav(state),
        });
      },
    },
  ),
);
