import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CourseFormDialog } from "@/components/CourseFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { electiveGroupProgress } from "@/lib/electiveGroups";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { Course, CourseStatus, ElectiveGroup } from "@/types";
import { COURSE_STATUSES, STATUS_LABELS } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";

function courseLabel(course: Course): string {
  const number = course.number.trim();
  const name = course.name.trim();
  if (number && name) return `${number} · ${name}`;
  return number || name || "Untitled course";
}

export function ElectivesView() {
  const courses = usePlannerStore((s) => s.courses);
  const groups = usePlannerStore((s) => s.electiveGroups);
  const addElectiveGroup = usePlannerStore((s) => s.addElectiveGroup);
  const satisfiedCount = groups.filter((group) => electiveGroupProgress(group, courses).satisfied)
    .length;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              Elective collections
            </h2>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              Group optional courses. A collection is satisfied when at least its required
              number of courses are planned, registered, in progress, complete, or waived.
              Required courses stay independent.
            </p>
            {groups.length > 0 && (
              <p className="mt-2 text-sm font-medium text-stone-800">
                {satisfiedCount} of {groups.length} collection
                {groups.length === 1 ? "" : "s"} satisfied
              </p>
            )}
          </div>
          <Button type="button" onClick={() => addElectiveGroup()}>
            <Plus />
            Add collection
          </Button>
        </header>

        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            No elective collections yet. Add one, then pick how many of its courses must be
            taken.
          </p>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <ElectiveGroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ElectiveGroupCard({ group }: { group: ElectiveGroup }) {
  const courses = usePlannerStore((s) => s.courses);
  const updateElectiveGroup = usePlannerStore((s) => s.updateElectiveGroup);
  const removeElectiveGroup = usePlannerStore((s) => s.removeElectiveGroup);
  const addCourseToElectiveGroup = usePlannerStore((s) => s.addCourseToElectiveGroup);
  const removeCourseFromElectiveGroup = usePlannerStore((s) => s.removeCourseFromElectiveGroup);
  const setCourseStatus = usePlannerStore((s) => s.setCourseStatus);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const progress = electiveGroupProgress(group, courses);
  const members = useMemo(() => {
    const byId = new Map(courses.map((course) => [course.id, course]));
    return group.courseIds
      .map((id) => byId.get(id))
      .filter((course): course is Course => Boolean(course));
  }, [courses, group.courseIds]);
  const available = courses.filter((course) => !group.courseIds.includes(course.id));

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-[12rem] flex-1 gap-1">
          <Label htmlFor={`group-name-${group.id}`}>Collection name</Label>
          <Input
            id={`group-name-${group.id}`}
            value={group.name}
            onChange={(e) => updateElectiveGroup(group.id, { name: e.target.value })}
          />
        </div>
        <div className="grid w-32 gap-1">
          <Label htmlFor={`group-required-${group.id}`}>Required count</Label>
          <Input
            id={`group-required-${group.id}`}
            type="number"
            min={1}
            max={99}
            value={group.requiredCount}
            onChange={(e) =>
              updateElectiveGroup(group.id, { requiredCount: Number(e.target.value) })
            }
          />
        </div>
        <Badge
          className={
            progress.satisfied
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900"
          }
        >
          {progress.satisfied ? "Satisfied" : "Not satisfied"} · {progress.counted}/
          {progress.required}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="ml-auto"
          onClick={() => {
            removeElectiveGroup(group.id);
            toast.success("Collection removed");
          }}
        >
          <Trash2 />
          Remove
        </Button>
      </div>

      <ul className="mt-4 grid gap-2">
        {members.length === 0 ? (
          <li className="text-sm text-stone-500">No courses in this collection yet.</li>
        ) : (
          members.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">
                  {courseLabel(course)}
                </p>
              </div>
              <select
                className="h-8 rounded-md border border-stone-300 bg-white px-2 text-xs"
                value={course.status}
                aria-label={`Status for ${courseLabel(course)}`}
                onChange={(e) => setCourseStatus(course.id, e.target.value as CourseStatus)}
              >
                {COURSE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Edit ${courseLabel(course)}`}
                onClick={() => {
                  setEditId(course.id);
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => removeCourseFromElectiveGroup(group.id, course.id)}
              >
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>

      <div className="mt-3">
        {available.length === 0 ? (
          <p className="text-xs text-stone-500">
            {courses.length === 0
              ? "Add courses on the Courses page, then attach them here."
              : "Every course is already in this collection."}
          </p>
        ) : (
          <select
            className="h-9 w-full max-w-md rounded-md border border-stone-300 bg-white px-2 text-sm"
            defaultValue=""
            aria-label={`Add course to ${group.name || "collection"}`}
            onChange={(e) => {
              const courseId = e.target.value;
              if (!courseId) return;
              addCourseToElectiveGroup(group.id, courseId);
              e.target.value = "";
            }}
          >
            <option value="">Add a course…</option>
            {available.map((course) => (
              <option key={course.id} value={course.id}>
                {courseLabel(course)}
                {course.optional ? "" : " (required)"}
              </option>
            ))}
          </select>
        )}
      </div>

      <CourseFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditId(null);
        }}
        courseId={editId}
      />
    </section>
  );
}
