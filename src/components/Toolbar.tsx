import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AutoArrangeDialog } from "@/components/AutoArrangeDialog";
import { ClearPlannedDialog } from "@/components/ClearPlannedDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { documentToPrettyJson, parseImportedFile, writeHash } from "@/lib/serialize";
import { usePlannerStore, type AppPage } from "@/store/usePlannerStore";
import { Download, MoreHorizontal, Share2, Upload } from "lucide-react";

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
  const [compactActions, setCompactActions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const sync = () => {
      const title = titleRef.current;
      const nav = navRef.current;
      const measure = measureRef.current;
      if (!title || !nav || !measure) return;
      const gap = Number.parseFloat(getComputedStyle(row).columnGap || "12") || 12;
      const needed = title.offsetWidth + nav.offsetWidth + measure.offsetWidth + gap * 2;
      setCompactActions(needed > row.clientWidth);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(row);
    if (titleRef.current) observer.observe(titleRef.current);
    if (navRef.current) observer.observe(navRef.current);
    return () => observer.disconnect();
  }, []);

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

  const fileInput = (
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
  );

  return (
    <header className="border-b border-stone-200 bg-[#f7f1e8]">
      <div ref={rowRef} className="relative flex flex-nowrap items-center gap-3 overflow-hidden px-3 py-2">
        <div ref={titleRef} className="shrink-0">
          <h1 className="font-serif text-xl font-semibold leading-none text-stone-900">
            Course Planner
          </h1>
          <p className="text-[11px] text-stone-500">
            Plan terms, place courses, share a link
          </p>
        </div>
        <nav
          ref={navRef}
          className="flex shrink-0 rounded-md border border-stone-300 bg-white p-0.5"
          aria-label="Pages"
        >
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
        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
          {compactActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  aria-label="Share, export, and import"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void copyShareLink()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy share link
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportFile}>
                  <Upload className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                  <Download className="mr-2 h-4 w-4" />
                  Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyShareLink()}>
                <Share2 />
                Copy share link
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportFile}>
                <Upload />
                Export
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Download />
                Import
              </Button>
            </>
          )}
          {fileInput}
        </div>
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 flex flex-nowrap gap-1.5"
        >
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            <Share2 />
            Copy share link
          </Button>
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            <Upload />
            Export
          </Button>
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            <Download />
            Import
          </Button>
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
