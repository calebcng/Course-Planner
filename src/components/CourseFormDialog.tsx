import { useEffect, useMemo, useState } from "react";
import type { Course, CourseStatus } from "@/types";
import { COURSE_STATUSES, STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlannerStore } from "@/store/usePlannerStore";
import { monthRangeLabel } from "@/lib/dates";

type Draft = Omit<Course, "id">;

function emptyDraft(offeredIn: string[]): Draft {
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

export function CourseFormDialog({
  open,
  onOpenChange,
  courseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string | null;
}) {
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const courses = usePlannerStore((s) => s.courses);
  const addCourse = usePlannerStore((s) => s.addCourse);
  const updateCourse = usePlannerStore((s) => s.updateCourse);
  const removeCourse = usePlannerStore((s) => s.removeCourse);

  const existing = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  );

  const [draft, setDraft] = useState<Draft>(emptyDraft(termDefinitions.map((d) => d.id)));

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft({
        number: existing.number,
        name: existing.name,
        credits: existing.credits,
        durationTerms: existing.durationTerms,
        offeredIn: existing.offeredIn,
        notes: existing.notes,
        status: existing.status,
      });
    } else {
      setDraft(emptyDraft(termDefinitions.map((d) => d.id)));
    }
  }, [open, existing, termDefinitions]);

  const toggleOffered = (id: string) => {
    setDraft((d) => ({
      ...d,
      offeredIn: d.offeredIn.includes(id)
        ? d.offeredIn.filter((x) => x !== id)
        : [...d.offeredIn, id],
    }));
  };

  const save = () => {
    const payload: Draft = {
      ...draft,
      number: draft.number.trim(),
      name: draft.name.trim(),
      credits: Number.isFinite(draft.credits) ? draft.credits : 0,
      durationTerms: Math.max(1, Math.round(draft.durationTerms) || 1),
    };
    if (existing) {
      updateCourse(existing.id, payload);
    } else {
      addCourse(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit course" : "Add course"}</DialogTitle>
          <DialogDescription>
            Catalog details, when the course is offered, and how many terms it occupies.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="course-number">Course number</Label>
              <Input
                id="course-number"
                value={draft.number}
                onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))}
                placeholder="CS 101"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-credits">Credits</Label>
              <Input
                id="course-credits"
                type="number"
                min={0}
                step={0.5}
                value={draft.credits}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, credits: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="course-name">Course name</Label>
            <Input
              id="course-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Introduction to Computing"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="course-duration">Duration (terms)</Label>
              <Input
                id="course-duration"
                type="number"
                min={1}
                value={draft.durationTerms}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, durationTerms: Number(e.target.value) }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-status">Status</Label>
              <select
                id="course-status"
                className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm"
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, status: e.target.value as CourseStatus }))
                }
              >
                {COURSE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-stone-700">Offered in</legend>
            <div className="grid gap-1.5">
              {termDefinitions.map((def) => (
                <label key={def.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.offeredIn.includes(def.id)}
                    onChange={() => toggleOffered(def.id)}
                  />
                  <span>
                    {def.name}{" "}
                    <span className="text-stone-500">
                      ({monthRangeLabel(def.startMonth, def.endMonth)})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="course-notes">Notes</Label>
            <Textarea
              id="course-notes"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Prereqs, instructor, campus…"
            />
          </div>
        </div>

        <DialogFooter>
          {existing && (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => {
                removeCourse(existing.id);
                onOpenChange(false);
              }}
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
