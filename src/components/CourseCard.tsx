import type { PointerEvent } from "react";
import type { Course, CourseStatus, TermDefinition } from "@/types";
import { COURSE_STATUSES, STATUS_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { monthRangeLabel } from "@/lib/dates";
import { Pencil } from "lucide-react";

export const STATUS_CARD: Record<CourseStatus, string> = {
  not_planned: "border-l-stone-400 bg-white",
  planned: "border-l-teal-700 bg-teal-50",
  registered: "border-l-sky-600 bg-sky-50",
  in_progress: "border-l-amber-500 bg-amber-50",
  complete: "border-l-emerald-800 bg-emerald-100",
  optional: "border-l-violet-500 bg-violet-50",
  waived: "border-l-stone-300 bg-stone-100 text-stone-500",
};

function stopDrag(event: PointerEvent) {
  event.stopPropagation();
}

export function offeredTermLabels(
  course: Course,
  defs: TermDefinition[],
): string {
  const names = course.offeredIn
    .map((id) => defs.find((d) => d.id === id)?.name)
    .filter(Boolean);
  return names.join(", ") || "No offered terms";
}

export function CourseCard({
  course,
  termDefinitions,
  compact = false,
  isDragging = false,
  onEdit,
  onStatusChange,
  onUnschedule,
}: {
  course: Course;
  termDefinitions: TermDefinition[];
  compact?: boolean;
  isDragging?: boolean;
  onEdit?: () => void;
  onStatusChange?: (status: CourseStatus) => void;
  onUnschedule?: () => void;
}) {
  const offered = offeredTermLabels(course, termDefinitions);

  return (
    <article
      className={cn(
        "flex min-w-0 w-full gap-2 rounded-md border border-stone-200 border-l-4 p-2 shadow-sm",
        STATUS_CARD[course.status],
        isDragging && "opacity-60 ring-2 ring-teal-700/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-wide text-stone-500">
              {course.number || "No number"}
            </p>
            <h3 className="truncate font-serif text-sm font-semibold leading-tight text-stone-900">
              {course.name || "Untitled course"}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {onEdit && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEdit}
                onPointerDown={stopDrag}
                aria-label="Edit course"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Badge>
            {course.credits} cr
            {course.durationTerms > 1 ? ` · ${course.durationTerms} terms` : ""}
          </Badge>
          {onStatusChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-white"
                  onPointerDown={stopDrag}
                >
                  {STATUS_LABELS[course.status]}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {COURSE_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onSelect={() => onStatusChange(status)}
                  >
                    {STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {!compact && (
          <p className="mt-1 truncate text-[11px] text-stone-500">
            Offered: {offered}
          </p>
        )}
        {compact && (
          <p className="mt-1 truncate text-[11px] text-stone-500">{offered}</p>
        )}
        {course.notes && !compact && (
          <p className="mt-1 line-clamp-2 text-[11px] text-stone-500">{course.notes}</p>
        )}
        {onUnschedule && (
          <button
            type="button"
            className="mt-1 text-[11px] font-medium text-teal-800 hover:underline"
            onClick={onUnschedule}
            onPointerDown={stopDrag}
          >
            Unschedule
          </button>
        )}
      </div>
    </article>
  );
}

export function termDefHint(def: TermDefinition): string {
  return `${monthRangeLabel(def.startMonth, def.endMonth)} · ${def.durationWeeks}w`;
}
