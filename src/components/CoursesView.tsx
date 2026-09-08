import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { courseCsvTemplate, coursesToCsv, parseCourseCsv } from "@/lib/courseCsv";
import { monthRangeLabel } from "@/lib/dates";
import { canPlaceCourse, placementForCourse, validStartSlotIds, OFFERING_UNSCHEDULE_TOAST } from "@/lib/placement";
import { slotLabel } from "@/lib/timeline";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { Course, CourseStatus } from "@/types";
import { COURSE_STATUSES, KEEP_PLACEMENT_STATUSES, STATUS_LABELS } from "@/types";
import { Download, Filter, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react";

const COLS = [
  "number",
  "name",
  "credits",
  "duration",
  "offered",
  "status",
  "notes",
  "scheduled",
] as const;
type Col = (typeof COLS)[number];

const COL_LABELS: Record<Col, string> = {
  number: "Number",
  name: "Name",
  credits: "Credits",
  duration: "Duration",
  offered: "Offered in",
  status: "Status",
  notes: "Notes",
  scheduled: "Scheduled term",
};

const MIN_WIDTH: Record<Col, number> = {
  number: 72,
  name: 80,
  credits: 56,
  duration: 64,
  offered: 88,
  status: 88,
  notes: 80,
  scheduled: 96,
};

const DEFAULT_WIDTH: Record<Col, number> = {
  number: 72,
  name: 220,
  credits: 72,
  duration: 80,
  offered: 200,
  status: 132,
  notes: 180,
  scheduled: 148,
};

const ACTIONS_WIDTH = 40;
const NAME_EXTRA_WEIGHT = 1;
const NOTES_EXTRA_WEIGHT = 2;

let measureCanvas: HTMLCanvasElement | undefined;

function measureTextWidth(text: string, font: string): number {
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function fitNumberWidth(courses: Course[]): number {
  const samples = ["NUMBER", "BI-5500", ...courses.map((c) => (c.number || "").trim())].filter(
    Boolean,
  );
  const bodyFont = '500 14px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  const headerFont = '600 12px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  let widest = 0;
  for (const sample of samples) {
    widest = Math.max(
      widest,
      measureTextWidth(sample, bodyFont),
      measureTextWidth(sample.toUpperCase(), headerFont),
    );
  }
  return Math.ceil(widest + 28);
}

const cellInput =
  "w-full min-w-0 border-0 bg-transparent px-2 text-sm text-stone-900 shadow-none outline-none ring-0 placeholder:text-stone-400 focus-visible:ring-0";
const cellSelect =
  "min-h-8 w-full min-w-0 cursor-pointer border-0 bg-transparent px-2 py-1.5 text-sm text-stone-900 outline-none ring-0";
const cell =
  "border-b border-r border-stone-200 bg-white p-0 align-top focus-within:bg-teal-50/40";

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function emptyCourse(offeredIn: string[]): Omit<Course, "id"> {
  return {
    number: "",
    name: "",
    credits: 3,
    durationTerms: 1,
    offeredIn,
    notes: "",
    status: "not_planned",
  };
}

function CellText({
  id,
  value,
  onChange,
  placeholder,
  className,
  nowrap = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  nowrap?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(32, el.scrollHeight)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={1}
      className={cn(
        cellInput,
        "min-h-8 resize-none overflow-hidden py-1.5 leading-snug",
        nowrap ? "whitespace-nowrap" : "break-words",
        className,
      )}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ResizableHeader({
  col,
  onResize,
}: {
  col: Col;
  onResize: (col: Col, event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <th className="relative border-b border-r border-stone-200 bg-[#efe8dc] px-2 py-2 font-medium">
      <span className="pr-1">{COL_LABELS[col]}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Resize ${COL_LABELS[col]} column`}
        className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize hover:bg-teal-700/50"
        onPointerDown={(event) => onResize(col, event)}
      />
    </th>
  );
}

export function CoursesView() {
  const courses = usePlannerStore((s) => s.courses);
  const placements = usePlannerStore((s) => s.placements);
  const slots = usePlannerStore((s) => s.slots);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const addCourse = usePlannerStore((s) => s.addCourse);
  const updateCourse = usePlannerStore((s) => s.updateCourse);
  const removeCourse = usePlannerStore((s) => s.removeCourse);
  const setCourseStatus = usePlannerStore((s) => s.setCourseStatus);
  const placeCourse = usePlannerStore((s) => s.placeCourse);
  const unplaceCourse = usePlannerStore((s) => s.unplaceCourse);
  const importCourses = usePlannerStore((s) => s.importCourses);

  const [query, setQuery] = useState("");
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<CourseStatus[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const numberResized = useRef(false);
  const [compactActions, setCompactActions] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [widths, setWidths] = useState<Record<Col, number>>({
    ...DEFAULT_WIDTH,
    number: fitNumberWidth(courses),
  });

  const fittedNumber = useMemo(() => fitNumberWidth(courses), [courses]);
  useEffect(() => {
    if (numberResized.current) return;
    setWidths((current) =>
      current.number === fittedNumber ? current : { ...current, number: fittedNumber },
    );
  }, [fittedNumber]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => {
        if (q && !c.number.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) {
          return false;
        }
        if (offeredIds.length && !offeredIds.some((id) => c.offeredIn.includes(id))) {
          return false;
        }
        if (statuses.length && !statuses.includes(c.status)) {
          return false;
        }
        return true;
      })
      .slice()
      .sort(
        (a, b) =>
          a.number.localeCompare(b.number) || a.name.localeCompare(b.name),
      );
  }, [courses, query, offeredIds, statuses]);

  const tableWidth = COLS.reduce((sum, col) => sum + widths[col], ACTIONS_WIDTH);
  const extra = Math.max(0, availableWidth - tableWidth);
  const extraShare = NAME_EXTRA_WEIGHT + NOTES_EXTRA_WEIGHT;
  const displayWidths: Record<Col, number> = {
    ...widths,
    name: widths.name + (extra * NAME_EXTRA_WEIGHT) / extraShare,
    notes: widths.notes + (extra * NOTES_EXTRA_WEIGHT) / extraShare,
  };
  const displayTableWidth = tableWidth + extra;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setAvailableWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const row = toolbarRef.current;
    if (!row) return;
    const sync = () => {
      const filters = filtersRef.current;
      const measure = measureRef.current;
      if (!filters || !measure) return;
      const gap = Number.parseFloat(getComputedStyle(row).columnGap || "8") || 8;
      const slack = 30;
      setCompactActions(filters.scrollWidth + measure.offsetWidth + gap + slack > row.clientWidth);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(row);
    if (filtersRef.current) observer.observe(filtersRef.current);
    return () => observer.disconnect();
  }, []);

  const startResize = (col: Col, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (col === "number") numberResized.current = true;
    const originX = event.clientX;
    const originW = widths[col];
    const onMove = (move: globalThis.PointerEvent) => {
      const min = col === "number" ? fittedNumber : MIN_WIDTH[col];
      const next = Math.max(min, originW + move.clientX - originX);
      setWidths((current) => ({ ...current, [col]: next }));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`course-number-${focusId}`)?.focus();
    setFocusId(null);
  }, [focusId]);

  const handleAdd = () => {
    setQuery("");
    const id = addCourse(emptyCourse(termDefinitions.map((d) => d.id)));
    setFocusId(id);
  };

  const patchAndValidate = (course: Course, patch: Partial<Course>) => {
    updateCourse(course.id, patch);
    const next = { ...course, ...patch };
    const placement = placementForCourse(placements, course.id);
    if (!placement) return;
    const ok = canPlaceCourse({
      course: next,
      startSlotId: placement.startSlotId,
      slots,
      placements,
      courses,
      ignoreCourseId: course.id,
    });
    if (!ok) {
      if (KEEP_PLACEMENT_STATUSES.includes(course.status)) return;
      unplaceCourse(course.id);
      toast.message("Unscheduled: this course no longer fits that term");
    }
  };

  const downloadTemplate = () => {
    const csv = courseCsvTemplate(termDefinitions.map((d) => d.name));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCourses = () => {
    const csv = coursesToCsv(courses, termDefinitions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "courses.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${courses.length} course${courses.length === 1 ? "" : "s"}`,
    );
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        const result = parseCourseCsv(text, termDefinitions);
        if (result.courses.length > 0) {
          importCourses(result.courses);
        }
        if (result.skipped.length > 0) {
          toast.error(
            `Imported ${result.courses.length}. Skipped ${result.skipped.length}: ${result.skipped.slice(0, 4).join("; ")}`,
          );
        } else if (result.courses.length === 0) {
          toast.error("No courses found in that file");
        } else {
          toast.success(
            `Imported ${result.courses.length} course${result.courses.length === 1 ? "" : "s"}`,
          );
        }
      } catch {
        toast.error("Could not parse that CSV file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={toolbarRef}
        className="relative flex flex-nowrap items-center gap-2 overflow-hidden border-b border-stone-200 bg-[#f7f1e8] px-3 py-2"
      >
        <div ref={filtersRef} className="flex min-w-0 items-center gap-2">
          <Filter className="size-4 shrink-0 text-stone-500" aria-hidden />
          <Input
            type="search"
            placeholder="Search number or name"
            className="h-8 max-w-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={offeredIds.length > 0 ? "default" : "outline"}
              >
                Offered in{offeredIds.length > 0 ? ` (${offeredIds.length})` : ""}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {termDefinitions.map((def) => (
                <DropdownMenuCheckboxItem
                  key={def.id}
                  checked={offeredIds.includes(def.id)}
                  title={monthRangeLabel(def.startMonth, def.endMonth)}
                  onCheckedChange={() => setOfferedIds((current) => toggleValue(current, def.id))}
                >
                  {def.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={statuses.length > 0 ? "default" : "outline"}
              >
                Status{statuses.length > 0 ? ` (${statuses.length})` : ""}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {COURSE_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statuses.includes(status)}
                  onCheckedChange={() => setStatuses((current) => toggleValue(current, status))}
                >
                  {STATUS_LABELS[status]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            className={compactActions ? "h-8 w-8 px-0" : undefined}
            onClick={handleAdd}
            aria-label={compactActions ? "Add course" : undefined}
          >
            <Plus />
            {!compactActions && "Add course"}
          </Button>
          {compactActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  aria-label="Course file actions"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download template
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                  <Download className="mr-2 h-4 w-4" />
                  Import courses
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportCourses}>
                  <Upload className="mr-2 h-4 w-4" />
                  Export courses
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
                <Download />
                Download template
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <Download />
                Import courses
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportCourses}>
                <Upload />
                Export courses
              </Button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importCsv(file);
              e.target.value = "";
            }}
          />
        </div>
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 flex flex-nowrap gap-1.5"
        >
          <Button type="button" size="sm" tabIndex={-1}>
            <Plus />
            Add course
          </Button>
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            <Download />
            Download template
          </Button>
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            <Download />
            Import courses
          </Button>
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            <Upload />
            Export courses
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3">
        <div ref={wrapRef} className="w-full">
        {sorted.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone-500">
            {courses.length === 0
              ? "No courses yet. Add one or import a CSV."
              : "No courses match those filters."}
          </p>
        ) : (
          <table
            className="border-collapse border-l border-t border-stone-200 bg-white text-left text-sm"
            style={{ tableLayout: "fixed", width: displayTableWidth }}
          >
            <colgroup>
              {COLS.map((col) => (
                <col key={col} style={{ width: displayWidths[col] }} />
              ))}
              <col style={{ width: ACTIONS_WIDTH }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {COLS.map((col) => (
                  <ResizableHeader key={col} col={col} onResize={startResize} />
                ))}
                <th className="border-b border-stone-200 bg-[#efe8dc] px-2 py-2 font-medium">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  onPatch={(patch) => patchAndValidate(course, patch)}
                  onStatus={(status) => {
                    if (setCourseStatus(course.id, status)) {
                      toast.message(OFFERING_UNSCHEDULE_TOAST);
                    }
                  }}
                  onSchedule={(slotId) => {
                    if (!slotId) {
                      unplaceCourse(course.id);
                      return;
                    }
                    if (!placeCourse(course.id, slotId)) {
                      toast.error("That term is not a valid slot for this course");
                    }
                  }}
                  onRemove={() => removeCourse(course.id)}
                />
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  );
}

function CourseRow({
  course,
  onPatch,
  onStatus,
  onSchedule,
  onRemove,
}: {
  course: Course;
  onPatch: (patch: Partial<Course>) => void;
  onStatus: (status: CourseStatus) => void;
  onSchedule: (slotId: string) => void;
  onRemove: () => void;
}) {
  const slots = usePlannerStore((s) => s.slots);
  const placements = usePlannerStore((s) => s.placements);
  const courses = usePlannerStore((s) => s.courses);
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);

  const placement = placementForCourse(placements, course.id);
  const validIds = new Set(
    validStartSlotIds({
      course,
      slots,
      placements,
      courses,
      ignoreCourseId: course.id,
    }),
  );
  const hasValidSlot = validIds.size > 0;

  const toggleOffered = (id: string) => {
    onPatch({
      offeredIn: course.offeredIn.includes(id)
        ? course.offeredIn.filter((x) => x !== id)
        : [...course.offeredIn, id],
    });
  };

  return (
    <tr className="hover:bg-stone-50/80">
      <td className={cell}>
        <CellText
          id={`course-number-${course.id}`}
          className="font-medium"
          nowrap
          value={course.number}
          onChange={(value) => onPatch({ number: value })}
          placeholder="BI-5500"
        />
      </td>
      <td className={cell}>
        <CellText
          value={course.name}
          onChange={(value) => onPatch({ name: value })}
          placeholder="Course name"
        />
      </td>
      <td className={cell}>
        <input
          className={`${cellInput} h-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          type="number"
          min={0}
          step={0.5}
          value={course.credits}
          onChange={(e) => onPatch({ credits: Number(e.target.value) })}
        />
      </td>
      <td className={cell}>
        <input
          className={`${cellInput} h-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          type="number"
          min={1}
          value={course.durationTerms}
          onChange={(e) =>
            onPatch({
              durationTerms: Math.max(1, Math.round(Number(e.target.value)) || 1),
            })
          }
        />
      </td>
      <td className={cell}>
        <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1">
          {termDefinitions.map((def) => (
            <label
              key={def.id}
              className="flex items-center gap-1 text-xs leading-snug text-stone-700"
              title={monthRangeLabel(def.startMonth, def.endMonth)}
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={course.offeredIn.includes(def.id)}
                onChange={() => toggleOffered(def.id)}
              />
              <span className="break-words">{def.name}</span>
            </label>
          ))}
        </div>
      </td>
      <td className={cell}>
        <select
          className={`${cellSelect} break-words`}
          value={course.status}
          onChange={(e) => onStatus(e.target.value as CourseStatus)}
        >
          {COURSE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </td>
      <td className={cell}>
        <CellText
          value={course.notes}
          onChange={(value) => onPatch({ notes: value })}
          placeholder="Notes"
        />
      </td>
      <td className={cell}>
        <select
          className={`${cellSelect} break-words whitespace-normal`}
          value={placement?.startSlotId ?? ""}
          onChange={(e) => onSchedule(e.target.value)}
          title={
            !hasValidSlot && !placement
              ? "No matching terms on the schedule. Add terms in Table or Timeline."
              : undefined
          }
        >
          <option value="">Unscheduled</option>
          {slots.map((slot) => {
            const current = placement?.startSlotId === slot.id;
            const allowed = current || validIds.has(slot.id);
            return (
              <option key={slot.id} value={slot.id} disabled={!allowed}>
                {slotLabel(slot, termDefinitions)}
              </option>
            );
          })}
        </select>
      </td>
      <td className="border-b border-stone-200 bg-white p-0 text-center align-top">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-stone-400 hover:text-red-800"
          onClick={onRemove}
          aria-label={`Delete ${course.number || course.name || "course"}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
