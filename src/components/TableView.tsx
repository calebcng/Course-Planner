import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { CourseCard } from "@/components/CourseCard";
import { DraggableCourse } from "@/components/DraggableCourse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { monthRangeLabel } from "@/lib/dates";
import { slotDroppableId } from "@/lib/dnd";
import { assignLanes, creditsForSlot, maxLane, OFFERING_UNSCHEDULE_TOAST } from "@/lib/placement";
import { getTermDef, isVirtualSlotId, slotLabel } from "@/lib/timeline";
import { useNearEdgeScroll, usePrependScrollFix, useStableNearEdge } from "@/lib/useDragScroll";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { TermSlot } from "@/types";
import { CalendarPlus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

function SlotRow({
  slotId,
  valid,
  virtual,
}: {
  slotId: string;
  valid: boolean | null;
  virtual: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotDroppableId(slotId),
    data: { type: "slot", slotId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full min-h-[7.5rem] border-b border-stone-200 bg-white/40",
        virtual && "border-dashed bg-stone-100/50",
        valid === true && "bg-teal-50",
        valid === false && "bg-stone-200/70 opacity-60",
        isOver && valid !== false && "bg-teal-100",
      )}
    />
  );
}

export function TableView({
  displaySlots,
  validSlotIds,
  dragging,
  onNearEdge,
  onPlanTerm,
  onEditCourse,
}: {
  displaySlots: TermSlot[];
  validSlotIds: Set<string> | null;
  dragging: boolean;
  onNearEdge?: (edge: "start" | "end") => void;
  onPlanTerm: (slotId: string) => void;
  onEditCourse: (id: string) => void;
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
  const rowMin = "7.5rem";
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<"start" | "end" | null>(null);
  const stableNearEdge = useStableNearEdge(onNearEdge);

  useNearEdgeScroll(scrollRef, dragging, "y", stableNearEdge);
  usePrependScrollFix(scrollRef, slots[0]?.id, dragging);

  useEffect(() => {
    const dir = pendingScroll.current;
    if (!dir) return;
    pendingScroll.current = null;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: dir === "end" ? el.scrollHeight : 0,
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
    <div ref={scrollRef} className="h-full overflow-auto">
      {!dragging && (
        <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#f7f1e8] px-3 py-2">
          <Button type="button" size="sm" variant="outline" onClick={handleAddPrev}>
            <ChevronUp className="h-3.5 w-3.5" />
            Add previous term
          </Button>
        </div>
      )}

      <div className="min-w-max">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `14rem repeat(${laneCount}, minmax(14rem, 1fr))`,
            gridTemplateRows: `repeat(${slots.length}, minmax(${rowMin}, auto))`,
          }}
        >
          {slots.map((slot, index) => {
            const virtual = isVirtualSlotId(slot.id);
            const def = getTermDef(termDefinitions, slot.termDefinitionId);
            const credits = creditsForSlot(slot.id, placements, courses);
            let valid: boolean | null = null;
            if (dragging && validSlotIds) {
              valid = validSlotIds.has(slot.id);
            }
            return (
              <div key={slot.id} className="contents">
                <div
                  className={cn(
                    "sticky left-0 z-20 border-b border-r border-stone-200 bg-[#f7f1e8] px-3 py-2",
                    virtual && "bg-stone-100/90 text-stone-500",
                  )}
                  style={{ gridColumn: 1, gridRow: index + 1 }}
                >
                  <p className="font-serif text-sm font-semibold text-stone-900">
                    {slotLabel(slot, termDefinitions)}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {def
                      ? `${monthRangeLabel(def.startMonth, def.endMonth)} · ${def.durationWeeks}w`
                      : ""}
                  </p>
                  {!virtual && (
                    <>
                      <p className="mt-1 text-xs font-medium text-stone-700">
                        {credits} credits
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => onPlanTerm(slot.id)}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          Plan
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-red-800 hover:text-red-900"
                          onClick={() => removeSlot(slot.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </>
                  )}
                  {virtual && (
                    <p className="mt-1 text-[11px] italic text-stone-400">Drop to add</p>
                  )}
                </div>
                <div
                  className="h-full min-h-[7.5rem]"
                  style={{
                    gridColumn: `2 / span ${laneCount}`,
                    gridRow: index + 1,
                  }}
                >
                  <SlotRow slotId={slot.id} valid={valid} virtual={virtual} />
                </div>
              </div>
            );
          })}

          {lanes.map((item) => (
            <div
              key={item.course.id}
              className="z-10 min-w-0 p-1"
              style={{
                gridColumn: item.lane + 2,
                gridRow: `${item.startCol + 1} / span ${item.span}`,
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

      {!dragging && (
        <div className="sticky bottom-0 z-30 border-t border-stone-200 bg-[#f7f1e8] px-3 py-2">
          <Button type="button" size="sm" variant="outline" onClick={handleAddNext}>
            <ChevronDown className="h-3.5 w-3.5" />
            Add next term
          </Button>
        </div>
      )}
    </div>
  );
}
