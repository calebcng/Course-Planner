import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { CourseCard } from "@/components/CourseCard";
import { DraggableCourse } from "@/components/DraggableCourse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { monthRangeLabel } from "@/lib/dates";
import { slotDroppableId } from "@/lib/dnd";
import { assignLanes, maxLane, OFFERING_UNSCHEDULE_TOAST } from "@/lib/placement";
import { getTermDef, isVirtualSlotId, slotLabel } from "@/lib/timeline";
import { useNearEdgeScroll, usePrependScrollFix, useStableNearEdge } from "@/lib/useDragScroll";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { TermSlot } from "@/types";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export function TimelineView({
  displaySlots,
  validSlotIds,
  dragging,
  onNearEdge,
  onEditCourse,
  onPlanTerm,
}: {
  displaySlots: TermSlot[];
  validSlotIds: Set<string> | null;
  dragging: boolean;
  onNearEdge?: (edge: "start" | "end") => void;
  onEditCourse: (id: string) => void;
  onPlanTerm: (slotId: string) => void;
}) {
  const storeSlots = usePlannerStore((s) => s.slots);
  const courses = usePlannerStore((s) => s.courses);
  const placements = usePlannerStore((s) => s.placements);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const setCourseStatus = usePlannerStore((s) => s.setCourseStatus);
  const addNextTerm = usePlannerStore((s) => s.addNextTerm);
  const addPrevTerm = usePlannerStore((s) => s.addPrevTerm);
  const removeSlot = usePlannerStore((s) => s.removeSlot);

  const slots = displaySlots;
  const lanes = assignLanes(placements, courses, slots);
  const laneCount = Math.max(maxLane(lanes) + 1, 1);
  const weeks = slots.map((slot) => {
    const def = getTermDef(termDefinitions, slot.termDefinitionId);
    return Math.max(def?.durationWeeks ?? 8, 4);
  });
  const columns = weeks
    .map((w) => `minmax(14rem, ${Math.max(w * 1.6, 14)}rem)`)
    .join(" ");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<"start" | "end" | null>(null);
  const stableNearEdge = useStableNearEdge(onNearEdge);

  useNearEdgeScroll(scrollRef, dragging, "x", stableNearEdge);
  usePrependScrollFix(scrollRef, slots[0]?.id, dragging);

  useEffect(() => {
    const dir = pendingScroll.current;
    if (!dir) return;
    pendingScroll.current = null;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: dir === "end" ? el.scrollWidth : 0,
      behavior: "smooth",
    });
  }, [storeSlots.length]);

  const handleAddNext = () => {
    const before = storeSlots.length;
    pendingScroll.current = "end";
    addNextTerm();
    const nextSlots = usePlannerStore.getState().slots;
    const added = nextSlots[nextSlots.length - 1];
    if (nextSlots.length > before && added) {
      toast.success(`Added ${slotLabel(added, termDefinitions)}`);
    }
  };

  const handleAddPrev = () => {
    const before = storeSlots.length;
    pendingScroll.current = "start";
    addPrevTerm();
    const nextSlots = usePlannerStore.getState().slots;
    const added = nextSlots[0];
    if (nextSlots.length > before && added) {
      toast.success(`Added ${slotLabel(added, termDefinitions)}`);
    }
  };

  if (slots.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-stone-500">
        No terms on the timeline yet.
        <Button type="button" onClick={handleAddNext}>
          Add a term
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {!dragging && (
        <div className="flex items-center gap-2 border-b border-stone-200 bg-[#f7f1e8] px-3 py-2">
          <Button type="button" size="sm" variant="outline" onClick={handleAddPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous term
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleAddNext}>
            Next term
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-max pb-4">
          <div
            className="sticky top-0 z-20 grid border-b border-stone-200 bg-[#f7f1e8]"
            style={{ gridTemplateColumns: columns }}
          >
            {slots.map((slot, index) => {
              const virtual = isVirtualSlotId(slot.id);
              const def = getTermDef(termDefinitions, slot.termDefinitionId);
              return (
                <div
                  key={slot.id}
                  className={cn(
                    "border-r border-stone-200 px-2 py-2 last:border-r-0",
                    virtual && "bg-stone-100/80 text-stone-500",
                  )}
                >
                  <p className="font-serif text-sm font-semibold">
                    {slotLabel(slot, termDefinitions)}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {def
                      ? `${monthRangeLabel(def.startMonth, def.endMonth)} · ${weeks[index]}w`
                      : ""}
                  </p>
                  {virtual ? (
                    <p className="text-[11px] italic text-stone-400">Drop to add</p>
                  ) : (
                    <>
                      <div className="mt-1 flex flex-wrap gap-x-2">
                        <button
                          type="button"
                          className="text-[11px] font-medium text-teal-800 hover:underline"
                          onClick={() => onPlanTerm(slot.id)}
                        >
                          Plan
                        </button>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-red-800 hover:underline"
                          onClick={() => removeSlot(slot.id)}
                        >
                          <Trash2 className="mr-0.5 inline h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: columns,
              gridTemplateRows: `repeat(${laneCount}, minmax(6rem, auto))`,
            }}
          >
            {slots.map((slot, index) => (
              <TimelineSlot
                key={slot.id}
                slotId={slot.id}
                virtual={isVirtualSlotId(slot.id)}
                laneCount={laneCount}
                column={index + 1}
                valid={
                  dragging && validSlotIds ? validSlotIds.has(slot.id) : null
                }
              />
            ))}
            {lanes.map((item) => (
              <div
                key={item.course.id}
                className="z-10 min-w-0 p-1"
                style={{
                  gridColumn: `${item.startCol + 1} / span ${item.span}`,
                  gridRow: item.lane + 1,
                }}
              >
                <DraggableCourse id={item.course.id}>
                  <CourseCard
                    course={item.course}
                    termDefinitions={termDefinitions}
                    onEdit={() => onEditCourse(item.course.id)}
                    onStatusChange={(status) => {
                      if (setCourseStatus(item.course.id, status)) {
                        toast.message(OFFERING_UNSCHEDULE_TOAST);
                      }
                    }}
                  />
                </DraggableCourse>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineSlot({
  slotId,
  valid,
  virtual,
  laneCount,
  column,
}: {
  slotId: string;
  valid: boolean | null;
  virtual: boolean;
  laneCount: number;
  column: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotDroppableId(slotId),
    data: { type: "slot", slotId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: column,
        gridRow: `1 / span ${laneCount}`,
      }}
      className={cn(
        "min-h-24 border-r border-stone-200 bg-white/40 last:border-r-0",
        virtual && "border-dashed bg-stone-100/40",
        valid === true && "bg-teal-50",
        valid === false && "bg-stone-200/70 opacity-60",
        isOver && valid !== false && "bg-teal-100",
      )}
    />
  );
}
