import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { PlannerDocument } from "@/types";

const HASH_PREFIX = "v1.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlannerDocument(value: unknown): value is PlannerDocument {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    Array.isArray(value.termDefinitions) &&
    Array.isArray(value.slots) &&
    Array.isArray(value.courses) &&
    Array.isArray(value.placements) &&
    typeof value.startYear === "number" &&
    typeof value.startTermDefinitionId === "string" &&
    typeof value.maxCoursesPerTerm === "number"
  );
}

export function toDocument(state: PlannerDocument): PlannerDocument {
  return {
    version: 1,
    termDefinitions: state.termDefinitions,
    startYear: state.startYear,
    startTermDefinitionId: state.startTermDefinitionId,
    slots: state.slots,
    courses: state.courses,
    placements: state.placements,
    maxCoursesPerTerm: state.maxCoursesPerTerm,
  };
}

export function encodeDocument(doc: PlannerDocument): string {
  return HASH_PREFIX + compressToEncodedURIComponent(JSON.stringify(toDocument(doc)));
}

export function decodeDocument(payload: string): PlannerDocument | null {
  const raw = payload.startsWith("#") ? payload.slice(1) : payload;
  if (!raw) return null;

  try {
    if (raw.startsWith(HASH_PREFIX)) {
      const json = decompressFromEncodedURIComponent(raw.slice(HASH_PREFIX.length));
      if (!json) return null;
      const parsed: unknown = JSON.parse(json);
      return isPlannerDocument(parsed) ? parsed : null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isPlannerDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseImportedFile(text: string): PlannerDocument | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isPlannerDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function documentToPrettyJson(doc: PlannerDocument): string {
  return JSON.stringify(toDocument(doc), null, 2);
}

export function hashFromLocation(): PlannerDocument | null {
  if (typeof window === "undefined") return null;
  return decodeDocument(window.location.hash);
}

export function writeHash(doc: PlannerDocument): string {
  const encoded = encodeDocument(doc);
  const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${encoded}`;
  window.history.replaceState(null, "", `#${encoded}`);
  return url;
}
