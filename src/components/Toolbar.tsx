import { useRef, useState } from "react";
import { toast } from "sonner";
import { AutoArrangeDialog } from "@/components/AutoArrangeDialog";
import { ClearPlannedDialog } from "@/components/ClearPlannedDialog";
import { Button } from "@/components/ui/button";
import { documentToPrettyJson, parseImportedFile, writeHash } from "@/lib/serialize";
import { usePlannerStore, type AppPage } from "@/store/usePlannerStore";
import { Download, Share2, Upload } from "lucide-react";

const PAGES: { id: AppPage; label: string }[] = [
  { id: "schedule", label: "Schedule" },
  { id: "courses", label: "Courses" },
  { id: "terms", label: "Terms" },
];

export function Toolbar({
  onAutoArrange,
  onClearPlanned,
}: {
  onAutoArrange: (fromSlotId: string | null) => void;
  onClearPlanned: () => void;
}) {
  const page = usePlannerStore((s) => s.page);
  const setPage = usePlannerStore((s) => s.setPage);
  const view = usePlannerStore((s) => s.view);
  const setView = usePlannerStore((s) => s.setView);
  const hydrateFromDocument = usePlannerStore((s) => s.hydrateFromDocument);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
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
      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
        <div>
          <h1 className="font-serif text-xl font-semibold leading-none text-stone-900">
            Course Planner
          </h1>
          <p className="text-[11px] text-stone-500">
            Plan terms, place courses, share a link
          </p>
        </div>
        <nav className="flex rounded-md border border-stone-300 bg-white p-0.5" aria-label="Pages">
          {PAGES.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={page === item.id ? "default" : "ghost"}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
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

      {page === "schedule" && (
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
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => setArrangeOpen(true)}>
              Auto-arrange
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setClearOpen(true)}
            >
              Clear planned
            </Button>
          </div>
        </div>
      )}

      <AutoArrangeDialog
        open={arrangeOpen}
        onOpenChange={setArrangeOpen}
        onConfirm={onAutoArrange}
      />
      <ClearPlannedDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        onConfirm={onClearPlanned}
      />
    </header>
  );
}
