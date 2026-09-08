import { toast, Toaster } from "sonner";
import { CoursesView } from "@/components/CoursesView";
import { ScheduleCanvas } from "@/components/ScheduleCanvas";
import { Toolbar } from "@/components/Toolbar";
import { usePlannerStore } from "@/store/usePlannerStore";

export default function App() {
  const view = usePlannerStore((s) => s.view);
  const runAutoArrange = usePlannerStore((s) => s.runAutoArrange);

  const onAutoArrange = () => {
    const unplaced = runAutoArrange();
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

  return (
    <div className="flex h-screen flex-col">
      <Toolbar onAutoArrange={onAutoArrange} />
      {view === "courses" ? <CoursesView /> : <ScheduleCanvas />}
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
