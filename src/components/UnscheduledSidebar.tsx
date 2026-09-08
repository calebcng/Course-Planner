import { useDroppable } from "@dnd-kit/core";
import { CourseCard } from "@/components/CourseCard";
import { DraggableCourse } from "@/components/DraggableCourse";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { usePlannerStore } from "@/store/usePlannerStore";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const SIDEBAR_DROPPABLE_ID = "unscheduled-sidebar";

export function UnscheduledSidebar({
  onAddCourse,
  onEditCourse,
}: {
  onAddCourse: () => void;
  onEditCourse: (id: string) => void;
}) {
  const courses = usePlannerStore((s) => s.courses);
  const placements = usePlannerStore((s) => s.placements);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const showWaived = usePlannerStore((s) => s.showWaived);
  const setShowWaived = usePlannerStore((s) => s.setShowWaived);
  const setCourseStatus = usePlannerStore((s) => s.setCourseStatus);
  const sidebarCollapsed = usePlannerStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = usePlannerStore((s) => s.setSidebarCollapsed);

  const { setNodeRef, isOver } = useDroppable({
    id: SIDEBAR_DROPPABLE_ID,
    data: { type: "sidebar" },
  });

  const placed = new Set(placements.map((p) => p.courseId));
  const unscheduled = courses.filter((c) => {
    if (placed.has(c.id)) return false;
    if (c.status === "waived" && !showWaived) return false;
    return true;
  });

  if (sidebarCollapsed) {
    return (
      <aside
        ref={setNodeRef}
        className={cn(
          "flex h-full w-10 shrink-0 flex-col items-center border-l border-stone-200 bg-[#efe8dc] py-2",
          isOver && "ring-2 ring-inset ring-teal-700/40",
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Expand unscheduled sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p
          className="mt-3 text-[11px] font-semibold tracking-wide text-stone-600"
          style={{ writingMode: "vertical-rl" }}
        >
          Unscheduled ({unscheduled.length})
        </p>
      </aside>
    );
  }

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-l border-stone-200 bg-[#efe8dc]",
        isOver && "ring-2 ring-inset ring-teal-700/40",
      )}
    >
      <div className="border-b border-stone-200 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">Unscheduled</h2>
            <p className="text-xs text-stone-500">
              Drag onto a term, or drop a scheduled course here to remove it.
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Collapse unscheduled sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Switch
            id="show-waived"
            checked={showWaived}
            onCheckedChange={setShowWaived}
          />
          <Label htmlFor="show-waived" className="text-xs font-normal">
            Show waived
          </Label>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {unscheduled.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white/50 p-3 text-sm text-stone-500">
            All courses are scheduled
          </p>
        ) : (
          unscheduled.map((course) => (
            <DraggableCourse key={course.id} id={course.id}>
              <CourseCard
                course={course}
                termDefinitions={termDefinitions}
                compact
                onEdit={() => onEditCourse(course.id)}
                onStatusChange={(status) => setCourseStatus(course.id, status)}
              />
            </DraggableCourse>
          ))
        )}
      </div>
      <div className="grid gap-2 border-t border-stone-200 p-3">
        <Button type="button" className="w-full" onClick={onAddCourse}>
          <Plus />
          Add course
        </Button>
      </div>
    </aside>
  );
}
