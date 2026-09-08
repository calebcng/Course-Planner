import type { ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";

export function DraggableCourse({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course:${id}`,
    data: { type: "course", courseId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("cursor-grab touch-none", isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
