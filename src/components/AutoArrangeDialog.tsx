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

export function AutoArrangeDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const maxCoursesPerTerm = usePlannerStore((s) => s.maxCoursesPerTerm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-arrange remaining courses</DialogTitle>
          <DialogDescription>
            Places Not planned courses into the earliest valid terms, at most{" "}
            {maxCoursesPerTerm} course{maxCoursesPerTerm === 1 ? "" : "s"} per term.
            Courses already on the board stay where they are. Waived courses are skipped.
            Extra terms are added if the timeline is too short.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Arrange
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
