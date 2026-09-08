import { toast, Toaster } from "sonner";
import { CoursesView } from "@/components/CoursesView";
import { ScheduleCanvas } from "@/components/ScheduleCanvas";
import { TermsView } from "@/components/TermsView";
import { Toolbar } from "@/components/Toolbar";
import { usePlannerStore } from "@/store/usePlannerStore";

export default function App() {
  const page = usePlannerStore((s) => s.page);
  const runAutoArrange = usePlannerStore((s) => s.runAutoArrange);
  const clearPlannedCourses = usePlannerStore((s) => s.clearPlannedCourses);

  const onAutoArrange = (fromSlotId: string | null) => {
    const unplaced = runAutoArrange(fromSlotId);
    if (unplaced.length === 0) {
      toast.success("Schedule arranged");
      return;
    }
    const names = unplaced
      .map((c) => c.number || c.name || "Untitled")
      .slice(0, 6)
      .join(", ");
    toast.error(
      `Could not place ${unplaced.length} course${unplaced.length === 1 ? "" : "s"}: ${names}`,
    );
  };

  const onClearPlanned = () => {
    const count = clearPlannedCourses();
    if (count === 0) {
      toast.message("No Planned courses to clear");
      return;
    }
    toast.success(
      `Cleared ${count} Planned course${count === 1 ? "" : "s"}`,
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <Toolbar onAutoArrange={onAutoArrange} onClearPlanned={onClearPlanned} />
      {page === "schedule" && <ScheduleCanvas />}
      {page === "courses" && <CoursesView />}
      {page === "terms" && <TermsView />}
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
