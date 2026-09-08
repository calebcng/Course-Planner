import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseCsvTemplate, parseCourseCsv } from "@/lib/courseCsv";
import { monthRangeLabel } from "@/lib/dates";
import { canPlaceCourse, placementForCourse, validStartSlotIds } from "@/lib/placement";
import { slotLabel } from "@/lib/timeline";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { Course, CourseStatus } from "@/types";
import { COURSE_STATUSES, STATUS_LABELS } from "@/types";
import { Download, Plus, Trash2, Upload } from "lucide-react";

const selectClass =
  "h-8 w-full rounded-md border border-stone-300 bg-white px-2 text-xs text-stone-900";

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
  const [focusId, setFocusId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => {
        if (!q) return true;
        return (
          c.number.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        );
      })
      .slice()
      .sort(
        (a, b) =>
          a.number.localeCompare(b.number) || a.name.localeCompare(b.name),
      );
  }, [courses, query]);

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
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-[#f7f1e8] px-3 py-2">
        <Input
          type="search"
          placeholder="Search number or name"
          className="h-8 max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus />
            Add course
          </Button>
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
            <Upload />
            Import courses
          </Button>
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {sorted.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone-500">
            {courses.length === 0
              ? "No courses yet. Add one or import a CSV."
              : "No courses match that search."}
          </p>
        ) : (
          <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#f7f1e8]">
              <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <th className="px-2 py-2 font-medium">Number</th>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Credits</th>
                <th className="px-2 py-2 font-medium">Duration</th>
                <th className="px-2 py-2 font-medium">Offered in</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                <th className="px-2 py-2 font-medium">Scheduled term</th>
                <th className="px-2 py-2 font-medium">
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
                  onStatus={(status) => setCourseStatus(course.id, status)}
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
    <tr className="border-b border-stone-200 align-top hover:bg-white/50">
      <td className="px-2 py-1.5">
        <Input
          id={`course-number-${course.id}`}
          className="h-8 min-w-24"
          value={course.number}
          onChange={(e) => onPatch({ number: e.target.value })}
          placeholder="BI-5500"
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8 min-w-40"
          value={course.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="Course name"
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8 w-16"
          type="number"
          min={0}
          step={0.5}
          value={course.credits}
          onChange={(e) => onPatch({ credits: Number(e.target.value) })}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8 w-16"
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
      <td className="px-2 py-1.5">
        <div className="flex min-w-48 flex-col gap-1">
          {termDefinitions.map((def) => (
            <label key={def.id} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={course.offeredIn.includes(def.id)}
                onChange={() => toggleOffered(def.id)}
              />
              <span>
                {def.name}{" "}
                <span className="text-stone-400">
                  ({monthRangeLabel(def.startMonth, def.endMonth)})
                </span>
              </span>
            </label>
          ))}
        </div>
      </td>
      <td className="px-2 py-1.5">
        <select
          className={selectClass}
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
      <td className="px-2 py-1.5">
        <Input
          className="h-8 min-w-36"
          value={course.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
          placeholder="Notes"
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          className={selectClass}
          value={placement?.startSlotId ?? ""}
          onChange={(e) => onSchedule(e.target.value)}
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
        {!hasValidSlot && !placement && (
          <p className="mt-1 text-[11px] text-stone-500">
            No matching terms on the schedule. Add terms in Table or Timeline.
          </p>
        )}
      </td>
      <td className="px-2 py-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-800 hover:text-red-900"
          onClick={onRemove}
          aria-label={`Delete ${course.number || course.name || "course"}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
