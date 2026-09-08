import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { CourseCard } from "@/components/CourseCard";
import { CourseFormDialog } from "@/components/CourseFormDialog";
import { PlanTermPanel } from "@/components/PlanTermPanel";
import { TableView } from "@/components/TableView";
import { TimelineView } from "@/components/TimelineView";
import { UnscheduledSidebar, SIDEBAR_DROPPABLE_ID } from "@/components/UnscheduledSidebar";
import { CardPointerSensor, parseCourseDragId, parseSlotDroppableId } from "@/lib/dnd";
import { validStartSlotIds } from "@/lib/placement";
import {
  createDragWindow,
  dragWindowPad,
  extendAfter,
  extendBefore,
  termRefFromSlotId,
} from "@/lib/timeline";
import type { TermSlot } from "@/types";
import { usePlannerStore } from "@/store/usePlannerStore";

export function ScheduleCanvas() {
  const view = usePlannerStore((s) => s.view);
  const courses = usePlannerStore((s) => s.courses);
  const slots = usePlannerStore((s) => s.slots);
  const placements = usePlannerStore((s) => s.placements);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const startYear = usePlannerStore((s) => s.startYear);
  const startTermDefinitionId = usePlannerStore((s) => s.startTermDefinitionId);
  const placeCourseOnTerm = usePlannerStore((s) => s.placeCourseOnTerm);
  const unplaceCourse = usePlannerStore((s) => s.unplaceCourse);

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [displaySlots, setDisplaySlots] = useState<TermSlot[] | null>(null);
  const [courseForm, setCourseForm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [planSlotId, setPlanSlotId] = useState<string | null>(null);
  const lastGrow = useRef(0);
  const displaySlotsRef = useRef<TermSlot[] | null>(null);
  displaySlotsRef.current = displaySlots;

  const sensors = useSensors(
    useSensor(CardPointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const shownSlots = displaySlots ?? slots;
  const dragging = activeCourseId != null;
  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? null;
  const validSlotIds = activeCourse
    ? new Set(
        validStartSlotIds({
          course: activeCourse,
          slots: shownSlots,
          placements,
          courses,
          ignoreCourseId: activeCourse.id,
        }),
      )
    : null;

  const onDragStart = (event: DragStartEvent) => {
    const courseId = parseCourseDragId(String(event.active.id));
    setActiveCourseId(courseId);
    const window = createDragWindow(slots, termDefinitions, {
      year: startYear,
      termDefinitionId: startTermDefinitionId,
    });
    displaySlotsRef.current = window;
    setDisplaySlots(window);
  };

  const onNearEdge = useCallback(
    (edge: "start" | "end") => {
      const now = Date.now();
      if (now - lastGrow.current < 160) return;
      lastGrow.current = now;
      const pad = dragWindowPad(termDefinitions);
      setDisplaySlots((prev) => {
        if (!prev) return prev;
        const next =
          edge === "start"
            ? extendBefore(prev, termDefinitions, pad)
            : extendAfter(prev, termDefinitions, pad);
        displaySlotsRef.current = next;
        return next;
      });
    },
    [termDefinitions],
  );

  const clearDrag = () => {
    setActiveCourseId(null);
    displaySlotsRef.current = null;
    setDisplaySlots(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const courseId = parseCourseDragId(String(event.active.id));
    const overId = event.over ? String(event.over.id) : null;
    const windowSlots = displaySlotsRef.current ?? slots;
    clearDrag();
    if (!courseId || !overId) return;

    if (overId === SIDEBAR_DROPPABLE_ID) {
      unplaceCourse(courseId);
      return;
    }

    const slotId = parseSlotDroppableId(overId);
    if (!slotId) return;
    const target = termRefFromSlotId(slotId, windowSlots);
    if (!target) return;
    const ok = placeCourseOnTerm(courseId, target);
    if (!ok) {
      toast.error("That term is not a valid slot for this course");
    }
  };

  const onDragCancel = () => clearDrag();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      autoScroll={{ threshold: { x: 0.18, y: 0.18 } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {view === "table" ? (
            <TableView
              displaySlots={shownSlots}
              validSlotIds={validSlotIds}
              dragging={dragging}
              onNearEdge={onNearEdge}
              onPlanTerm={(id) => setPlanSlotId(id)}
              onEditCourse={(id) => setCourseForm({ open: true, id })}
            />
          ) : (
            <TimelineView
              displaySlots={shownSlots}
              validSlotIds={validSlotIds}
              dragging={dragging}
              onNearEdge={onNearEdge}
              onEditCourse={(id) => setCourseForm({ open: true, id })}
              onPlanTerm={(id) => setPlanSlotId(id)}
            />
          )}
        </div>
        <UnscheduledSidebar
          onAddCourse={() => setCourseForm({ open: true, id: null })}
          onEditCourse={(id) => setCourseForm({ open: true, id })}
        />
      </div>
      <DragOverlay>
        {activeCourse ? (
          <div className="w-64">
            <CourseCard
              course={activeCourse}
              termDefinitions={termDefinitions}
              compact
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
      <CourseFormDialog
        open={courseForm.open}
        onOpenChange={(open) => setCourseForm((s) => ({ ...s, open }))}
        courseId={courseForm.id}
      />
      <PlanTermPanel
        slotId={planSlotId}
        open={planSlotId != null}
        onOpenChange={(open) => {
          if (!open) setPlanSlotId(null);
        }}
      />
    </DndContext>
  );
}
