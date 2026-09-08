import type { Course, CourseStatus, TermDefinition } from "@/types";
import { COURSE_STATUSES, STATUS_LABELS } from "@/types";

export const COURSE_CSV_HEADERS = [
  "number",
  "name",
  "credits",
  "durationTerms",
  "offeredIn",
  "notes",
  "status",
] as const;

const STATUS_BY_LABEL = Object.fromEntries(
  COURSE_STATUSES.map((status) => [STATUS_LABELS[status].toLowerCase(), status]),
) as Record<string, CourseStatus>;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function toCsvRow(fields: string[]): string {
  return fields.map(csvEscape).join(",");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }

  if (quoted) {
    throw new Error("Unclosed quote in CSV");
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function courseCsvTemplate(termNames: string[]): string {
  const offered = termNames.slice(0, 2).join("; ") || "Fall A";
  return [
    toCsvRow([...COURSE_CSV_HEADERS]),
    toCsvRow([
      "CS 101",
      "Introduction to Computing",
      "3",
      "1",
      offered,
      "Optional notes",
      "not_planned",
    ]),
  ].join("\n") + "\n";
}

export function parseStatus(raw: string): CourseStatus | null {
  const value = raw.trim();
  if (!value) return "not_planned";
  const lower = value.toLowerCase().replaceAll(" ", "_");
  if (COURSE_STATUSES.includes(lower as CourseStatus)) {
    return lower as CourseStatus;
  }
  return STATUS_BY_LABEL[value.toLowerCase()] ?? null;
}

function matchOfferedTerms(
  raw: string,
  defs: TermDefinition[],
): { ids: string[]; unknown: string[] } {
  if (!raw.trim()) return { ids: [], unknown: [] };
  const parts = raw.split(";").map((p) => p.trim()).filter(Boolean);
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const part of parts) {
    const def = defs.find((d) => d.name.toLowerCase() === part.toLowerCase());
    if (def) ids.push(def.id);
    else unknown.push(part);
  }
  return { ids, unknown };
}

export function parseCourseCsv(
  text: string,
  termDefinitions: TermDefinition[],
): { courses: Omit<Course, "id">[]; skipped: string[] } {
  const rows = parseCsv(text);
  const skipped: string[] = [];
  if (rows.length === 0) {
    return { courses: [], skipped: ["File is empty"] };
  }

  const header = rows[0].map((h) => h.trim());
  const index = (name: string) =>
    header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const col = {
    number: index("number"),
    name: index("name"),
    credits: index("credits"),
    durationTerms: index("durationTerms"),
    offeredIn: index("offeredIn"),
    notes: index("notes"),
    status: index("status"),
  };
  if (col.number < 0 || col.name < 0) {
    return {
      courses: [],
      skipped: ["Missing required columns: number and name"],
    };
  }

  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
  const courses: Omit<Course, "id">[] = [];

  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const number = cell(row, col.number);
    const name = cell(row, col.name);
    if (!number && !name) return;

    const creditsRaw = cell(row, col.credits);
    const durationRaw = cell(row, col.durationTerms);
    const credits = creditsRaw === "" ? 0 : Number(creditsRaw);
    const durationTerms = durationRaw === "" ? 1 : Number(durationRaw);
    if (!Number.isFinite(credits) || credits < 0) {
      skipped.push(`Row ${line}: invalid credits`);
      return;
    }
    if (!Number.isFinite(durationTerms) || durationTerms < 1) {
      skipped.push(`Row ${line}: invalid durationTerms`);
      return;
    }

    const status = parseStatus(cell(row, col.status));
    if (!status) {
      skipped.push(`Row ${line}: unknown status`);
      return;
    }

    const offered = matchOfferedTerms(cell(row, col.offeredIn), termDefinitions);
    if (offered.unknown.length > 0) {
      skipped.push(
        `Row ${line}: unknown term(s) ${offered.unknown.join(", ")}`,
      );
      return;
    }

    courses.push({
      number,
      name,
      credits,
      durationTerms: Math.round(durationTerms),
      offeredIn: offered.ids,
      notes: cell(row, col.notes),
      status,
    });
  });

  return { courses, skipped };
}
