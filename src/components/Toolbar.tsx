import { useRef, useState } from "react";
import { toast } from "sonner";
import { AutoArrangeDialog } from "@/components/AutoArrangeDialog";
import { TermSettingsDialog } from "@/components/TermSettingsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { documentToPrettyJson, parseImportedFile, writeHash } from "@/lib/serialize";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CalendarRange, Download, Share2, Upload } from "lucide-react";

export function Toolbar({ onAutoArrange }: { onAutoArrange: () => void }) {
  const view = usePlannerStore((s) => s.view);
  const setView = usePlannerStore((s) => s.setView);
  const maxCoursesPerTerm = usePlannerStore((s) => s.maxCoursesPerTerm);
  const setMaxCoursesPerTerm = usePlannerStore((s) => s.setMaxCoursesPerTerm);
  const hydrateFromDocument = usePlannerStore((s) => s.hydrateFromDocument);
  const [termsOpen, setTermsOpen] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const copyShareLink = async () => {
    const state = usePlannerStore.getState();
    const url = writeHash(state);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.message("Share URL updated in the address bar");
    }
  };

  const exportFile = () => {
    const json = documentToPrettyJson(usePlannerStore.getState());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course-planner.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported planner JSON");
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const doc = parseImportedFile(text);
      if (!doc) {
        toast.error("Could not read that planner file");
        return;
      }
      hydrateFromDocument(doc);
      toast.success("Imported planner settings");
    };
    reader.readAsText(file);
  };

  return (
    <header className="border-b border-stone-200 bg-[#f7f1e8]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <div>
          <h1 className="font-serif text-xl font-semibold leading-none text-stone-900">
            Course Planner
          </h1>
          <p className="text-[11px] text-stone-500">
            Plan terms, place courses, share a link
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => setTermsOpen(true)}>
            <CalendarRange />
            Terms
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={copyShareLink}>
            <Share2 />
            Copy share link
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportFile}>
            <Download />
            Export
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-3 py-2">
        <div className="flex rounded-md border border-stone-300 bg-white p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === "table" ? "default" : "ghost"}
            onClick={() => setView("table")}
          >
            Table
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "timeline" ? "default" : "ghost"}
            onClick={() => setView("timeline")}
          >
            Timeline
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "courses" ? "default" : "ghost"}
            onClick={() => setView("courses")}
          >
            Courses
          </Button>
        </div>
        {view !== "courses" && (
          <>
            <div
              className="flex items-center gap-1.5"
              title="Used by Auto-arrange. You can drag extra courses onto a term by hand."
            >
              <Label htmlFor="max-courses" className="text-xs">
                Max / term
              </Label>
              <Input
                id="max-courses"
                type="number"
                min={1}
                max={12}
                className="h-8 w-14"
                value={maxCoursesPerTerm}
                onChange={(e) => setMaxCoursesPerTerm(Number(e.target.value))}
              />
            </div>
            <Button type="button" size="sm" onClick={() => setArrangeOpen(true)}>
              Auto-arrange
            </Button>
          </>
        )}
      </div>

      <TermSettingsDialog open={termsOpen} onOpenChange={setTermsOpen} />
      <AutoArrangeDialog
        open={arrangeOpen}
        onOpenChange={setArrangeOpen}
        onConfirm={onAutoArrange}
      />
    </header>
  );
}
