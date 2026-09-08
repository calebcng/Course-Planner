import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlannerStore } from "@/store/usePlannerStore";

export function ClearPlannedDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const plannedCount = usePlannerStore(
    (s) => s.courses.filter((c) => c.status === "planned").length,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear planned courses?</DialogTitle>
          <DialogDescription>
            This will unschedule {plannedCount} Planned course
            {plannedCount === 1 ? "" : "s"} and set {plannedCount === 1 ? "it" : "them"} back
            to Not planned. Registered, In progress, Complete, and Waived courses stay as
            they are.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={plannedCount === 0}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Clear planned
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
