import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { MONTH_OPTIONS } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { TermDefinition } from "@/types";

function SortableTermRow({
  def,
  canRemove,
}: {
  def: TermDefinition;
  canRemove: boolean;
}) {
  const updateTermDefinition = usePlannerStore((s) => s.updateTermDefinition);
  const removeTermDefinition = usePlannerStore((s) => s.removeTermDefinition);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: def.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[auto_minmax(0,1fr)_repeat(3,minmax(5.5rem,7rem))_auto] sm:items-end",
        isDragging && "relative z-10 opacity-80 shadow-md",
      )}
    >
      <button
        type="button"
        className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 active:cursor-grabbing"
        aria-label={`Reorder ${def.name}`}
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="grid gap-1">
        <Label>Name</Label>
        <Input
          value={def.name}
          onChange={(e) => updateTermDefinition(def.id, { name: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label>Start</Label>
        <select
          className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm"
          value={def.startMonth}
          onChange={(e) =>
            updateTermDefinition(def.id, { startMonth: Number(e.target.value) })
          }
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label>End</Label>
        <select
          className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm"
          value={def.endMonth}
          onChange={(e) =>
            updateTermDefinition(def.id, { endMonth: Number(e.target.value) })
          }
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label>Weeks</Label>
        <Input
          type="number"
          min={1}
          value={def.durationWeeks}
          onChange={(e) =>
            updateTermDefinition(def.id, {
              durationWeeks: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={!canRemove}
        aria-label={`Remove ${def.name}`}
        title="Remove"
        onClick={() => removeTermDefinition(def.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TermsView() {
  const termDefinitions = usePlannerStore((s) => s.termDefinitions);
  const startYear = usePlannerStore((s) => s.startYear);
  const startTermDefinitionId = usePlannerStore((s) => s.startTermDefinitionId);
  const addTermDefinition = usePlannerStore((s) => s.addTermDefinition);
  const reorderTermDefinitions = usePlannerStore((s) => s.reorderTermDefinitions);
  const setStart = usePlannerStore((s) => s.setStart);
  const resetTimeline = usePlannerStore((s) => s.resetTimeline);
  const addNextTerm = usePlannerStore((s) => s.addNextTerm);
  const addPrevTerm = usePlannerStore((s) => s.addPrevTerm);
  const addFullCycle = usePlannerStore((s) => s.addFullCycle);
  const removeFirstTerm = usePlannerStore((s) => s.removeFirstTerm);
  const removeLastTerm = usePlannerStore((s) => s.removeLastTerm);
  const slots = usePlannerStore((s) => s.slots);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (overId == null) return;
    reorderTermDefinitions(String(event.active.id), String(overId));
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto px-3 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="grid gap-1">
          <h2 className="font-serif text-2xl font-semibold text-stone-900">Terms & timeline</h2>
          <p className="text-sm text-stone-500">
            Approximate months and week lengths for each repeating term, then extend the
            open-ended schedule.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <section className="grid w-full shrink-0 gap-3 lg:w-80">
            <h3 className="text-sm font-semibold text-stone-800">Timeline</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="start-year">Start year</Label>
                <Input
                  id="start-year"
                  type="number"
                  value={startYear}
                  onChange={(e) => setStart(Number(e.target.value), startTermDefinitionId)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="start-term">Start term</Label>
                <select
                  id="start-term"
                  className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm"
                  value={startTermDefinitionId}
                  onChange={(e) => setStart(startYear, e.target.value)}
                >
                  {termDefinitions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-stone-500">
              {slots.length} term{slots.length === 1 ? "" : "s"} on the canvas.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addPrevTerm}>
                Add previous term
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addNextTerm}>
                Add next term
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addFullCycle}>
                Add full cycle
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={removeFirstTerm}>
                Remove first
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={removeLastTerm}>
                Remove last
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset the timeline to one cycle from the start year/term and clear all placements?",
                    )
                  ) {
                    resetTimeline();
                  }
                }}
              >
                Reset timeline
              </Button>
            </div>
          </section>

          <section className="grid min-w-0 flex-1 gap-3">
            <h3 className="text-sm font-semibold text-stone-800">Term templates</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={termDefinitions.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-3">
                  {termDefinitions.map((def) => (
                    <SortableTermRow
                      key={def.id}
                      def={def}
                      canRemove={termDefinitions.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <Button type="button" variant="secondary" onClick={() => addTermDefinition()}>
              Add term template
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
