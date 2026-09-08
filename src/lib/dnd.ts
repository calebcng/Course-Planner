import { PointerSensor } from "@dnd-kit/core";
import type { PointerEvent } from "react";

export function slotDroppableId(slotId: string) {
  return `slot:${slotId}`;
}

export function parseSlotDroppableId(id: string): string | null {
  return id.startsWith("slot:") ? id.slice(5) : null;
}

export function parseCourseDragId(id: string): string | null {
  return id.startsWith("course:") ? id.slice(7) : null;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [role='menuitem'], [data-no-dnd]",
    ),
  );
}

export class CardPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: PointerEvent) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) {
          return false;
        }
        return !isInteractiveTarget(nativeEvent.target);
      },
    },
  ];
}

