import type { TermDefinition, TermSlot } from "@/types";
import { startOfLocalDay } from "@/lib/dates";
import { createId } from "@/lib/ids";

export function sortedTermDefs(defs: TermDefinition[]): TermDefinition[] {
  return [...defs].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function withSequentialSortOrder(defs: TermDefinition[]): TermDefinition[] {
  return defs.map((d, index) => ({ ...d, sortOrder: index + 1 }));
}

export function orderedTermDefinitions(defs: TermDefinition[]): TermDefinition[] {
  return withSequentialSortOrder(sortedTermDefs(defs));
}

export function getTermDef(
  defs: TermDefinition[],
  id: string,
): TermDefinition | undefined {
  return defs.find((d) => d.id === id);
}

export function nextTerm(
  defs: TermDefinition[],
  current: TermDefinition,
  year: number,
): { def: TermDefinition; year: number } {
  const sorted = sortedTermDefs(defs);
  if (sorted.length === 0) {
    return { def: current, year };
  }
  const idx = sorted.findIndex((d) => d.id === current.id);
  const next = sorted[(idx + 1) % sorted.length] ?? sorted[0];
  const nextYear = next.startMonth < current.startMonth ? year + 1 : year;
  return { def: next, year: nextYear };
}

export function prevTerm(
  defs: TermDefinition[],
  current: TermDefinition,
  year: number,
): { def: TermDefinition; year: number } {
  const sorted = sortedTermDefs(defs);
  if (sorted.length === 0) {
    return { def: current, year };
  }
  const idx = sorted.findIndex((d) => d.id === current.id);
  const prev =
    sorted[(idx - 1 + sorted.length) % sorted.length] ?? sorted[sorted.length - 1];
  const prevYear = prev.startMonth > current.startMonth ? year - 1 : year;
  return { def: prev, year: prevYear };
}

export function makeSlot(
  year: number,
  termDefinitionId: string,
  id = createId(),
): TermSlot {
  return { id, year, termDefinitionId };
}

export function generateSlots(
  defs: TermDefinition[],
  startYear: number,
  startTermDefinitionId: string,
  count: number,
): TermSlot[] {
  if (defs.length === 0 || count <= 0) return [];
  const startDef = getTermDef(defs, startTermDefinitionId) ?? sortedTermDefs(defs)[0];
  const slots: TermSlot[] = [];
  let year = startYear;
  let def = startDef;
  for (let i = 0; i < count; i++) {
    slots.push(makeSlot(year, def.id));
    const n = nextTerm(defs, def, year);
    def = n.def;
    year = n.year;
  }
  return slots;
}

export function appendNextSlot(
  slots: TermSlot[],
  defs: TermDefinition[],
): TermSlot[] {
  if (defs.length === 0) return slots;
  if (slots.length === 0) {
    const first = sortedTermDefs(defs)[0];
    return [makeSlot(new Date().getFullYear(), first.id)];
  }
  let last = slots[slots.length - 1];
  let lastDef = getTermDef(defs, last.termDefinitionId);
  if (!lastDef) {
    for (let i = slots.length - 2; i >= 0; i--) {
      const candidate = getTermDef(defs, slots[i].termDefinitionId);
      if (candidate) {
        last = slots[i];
        lastDef = candidate;
        break;
      }
    }
  }
  if (!lastDef) {
    const first = sortedTermDefs(defs)[0];
    return [...slots, makeSlot(last.year, first.id)];
  }
  const n = nextTerm(defs, lastDef, last.year);
  return [...slots, makeSlot(n.year, n.def.id)];
}

export function prependPrevSlot(
  slots: TermSlot[],
  defs: TermDefinition[],
): TermSlot[] {
  if (defs.length === 0) return slots;
  if (slots.length === 0) {
    const first = sortedTermDefs(defs)[0];
    return [makeSlot(new Date().getFullYear(), first.id)];
  }
  const firstSlot = slots[0];
  const firstDef = getTermDef(defs, firstSlot.termDefinitionId);
  if (!firstDef) return slots;
  const p = prevTerm(defs, firstDef, firstSlot.year);
  return [makeSlot(p.year, p.def.id), ...slots];
}

export function appendCycle(
  slots: TermSlot[],
  defs: TermDefinition[],
): TermSlot[] {
  let next = slots;
  const count = Math.max(defs.length, 1);
  for (let i = 0; i < count; i++) {
    next = appendNextSlot(next, defs);
  }
  return next;
}

export function slotIndex(slots: TermSlot[], slotId: string): number {
  return slots.findIndex((s) => s.id === slotId);
}

export function occupiedSlotIds(
  startSlotId: string,
  durationTerms: number,
  slots: TermSlot[],
): string[] {
  const start = slotIndex(slots, startSlotId);
  if (start < 0) return [];
  return slots.slice(start, start + durationTerms).map((s) => s.id);
}

export function slotLabel(
  slot: TermSlot,
  defs: TermDefinition[],
): string {
  const def = getTermDef(defs, slot.termDefinitionId);
  return def ? `${def.name} ${slot.year}` : `Term ${slot.year}`;
}

export function slotStartDate(
  slot: TermSlot,
  defs: TermDefinition[],
): Date | null {
  const def = getTermDef(defs, slot.termDefinitionId);
  if (!def) return null;
  return new Date(slot.year, def.startMonth - 1, 1);
}

export function isFutureSlot(
  slot: TermSlot,
  defs: TermDefinition[],
  now = new Date(),
): boolean {
  const start = slotStartDate(slot, defs);
  if (!start) return false;
  return start > startOfLocalDay(now);
}

/** First canvas slot that has not started yet, or null to start after the last slot. */
export function defaultArrangeFromSlotId(
  slots: TermSlot[],
  defs: TermDefinition[],
  now = new Date(),
): string | null {
  const future = slots.find((slot) => isFutureSlot(slot, defs, now));
  return future?.id ?? null;
}

export type TermRef = {
  year: number;
  termDefinitionId: string;
};

export const VIRTUAL_PREFIX = "virtual:";

export function virtualSlotId(termDefinitionId: string, year: number): string {
  return `${VIRTUAL_PREFIX}${termDefinitionId}:${year}`;
}

export function isVirtualSlotId(id: string): boolean {
  return id.startsWith(VIRTUAL_PREFIX);
}

export function parseVirtualSlotId(id: string): TermRef | null {
  if (!isVirtualSlotId(id)) return null;
  const rest = id.slice(VIRTUAL_PREFIX.length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const termDefinitionId = rest.slice(0, lastColon);
  const year = Number(rest.slice(lastColon + 1));
  if (!termDefinitionId || !Number.isFinite(year)) return null;
  return { termDefinitionId, year };
}

export function makeVirtualSlot(year: number, termDefinitionId: string): TermSlot {
  return {
    id: virtualSlotId(termDefinitionId, year),
    year,
    termDefinitionId,
  };
}

export function slotKey(slot: TermRef): string {
  return `${slot.termDefinitionId}:${slot.year}`;
}

export function sameTerm(a: TermRef, b: TermRef): boolean {
  return a.year === b.year && a.termDefinitionId === b.termDefinitionId;
}

export function findSlotByRef(slots: TermSlot[], ref: TermRef): TermSlot | undefined {
  return slots.find((s) => sameTerm(s, ref));
}

function lastKnownDef(
  slots: TermSlot[],
  defs: TermDefinition[],
  fromEnd: boolean,
): { slot: TermSlot; def: TermDefinition } | null {
  const order = fromEnd ? [...slots].reverse() : slots;
  for (const slot of order) {
    const def = getTermDef(defs, slot.termDefinitionId);
    if (def) return { slot, def };
  }
  return null;
}

export function extendAfter(
  slots: TermSlot[],
  defs: TermDefinition[],
  count: number,
): TermSlot[] {
  if (defs.length === 0 || count <= 0) return slots;
  const known = lastKnownDef(slots, defs, true);
  if (!known) return slots;
  const keys = new Set(slots.map(slotKey));
  const added: TermSlot[] = [];
  let { def, slot } = known;
  let year = slot.year;
  for (let i = 0; i < count; i++) {
    const n = nextTerm(defs, def, year);
    def = n.def;
    year = n.year;
    const key = slotKey({ year, termDefinitionId: def.id });
    if (keys.has(key)) continue;
    keys.add(key);
    added.push(makeVirtualSlot(year, def.id));
  }
  return [...slots, ...added];
}

export function extendBefore(
  slots: TermSlot[],
  defs: TermDefinition[],
  count: number,
): TermSlot[] {
  if (defs.length === 0 || count <= 0) return slots;
  const known = lastKnownDef(slots, defs, false);
  if (!known) return slots;
  const keys = new Set(slots.map(slotKey));
  const added: TermSlot[] = [];
  let { def, slot } = known;
  let year = slot.year;
  for (let i = 0; i < count; i++) {
    const p = prevTerm(defs, def, year);
    def = p.def;
    year = p.year;
    const key = slotKey({ year, termDefinitionId: def.id });
    if (keys.has(key)) continue;
    keys.add(key);
    added.push(makeVirtualSlot(year, def.id));
  }
  return [...added.reverse(), ...slots];
}

export function dragWindowPad(defs: TermDefinition[]): number {
  return Math.max(defs.length, 4);
}

export function createDragWindow(
  slots: TermSlot[],
  defs: TermDefinition[],
  seed: TermRef,
): TermSlot[] {
  const pad = dragWindowPad(defs);
  if (slots.length === 0) {
    if (defs.length === 0) return [];
    const defId = getTermDef(defs, seed.termDefinitionId)?.id ?? sortedTermDefs(defs)[0].id;
    const base = [makeVirtualSlot(seed.year, defId)];
    return extendBefore(extendAfter(base, defs, pad), defs, pad);
  }
  return extendAfter(slots, defs, pad);
}

const MAX_ENSURE_STEPS = 240;

export function ensureSlotsThrough(
  slots: TermSlot[],
  defs: TermDefinition[],
  target: TermRef,
  extraAfter: number,
  seed: TermRef,
): TermSlot[] {
  let next = slots.filter((s) => !isVirtualSlotId(s.id));
  if (defs.length === 0) return next;

  if (next.length === 0) {
    const defId =
      getTermDef(defs, seed.termDefinitionId)?.id ?? sortedTermDefs(defs)[0].id;
    next = [makeSlot(seed.year, defId)];
  }

  if (!findSlotByRef(next, target)) {
    let probe = next;
    let found = false;
    for (let i = 0; i < MAX_ENSURE_STEPS; i++) {
      probe = appendNextSlot(probe, defs);
      const last = probe[probe.length - 1];
      if (sameTerm(last, target)) {
        next = probe;
        found = true;
        break;
      }
    }
    if (!found) {
      probe = next;
      for (let i = 0; i < MAX_ENSURE_STEPS; i++) {
        probe = prependPrevSlot(probe, defs);
        const first = probe[0];
        if (sameTerm(first, target)) {
          next = probe;
          found = true;
          break;
        }
      }
    }
    if (!found) return next;
  }

  const idx = next.findIndex((s) => sameTerm(s, target));
  if (idx < 0) return next;
  while (next.length - 1 - idx < extraAfter) {
    next = appendNextSlot(next, defs);
  }
  return next;
}

export function termRefFromSlotId(
  slotId: string,
  slots: TermSlot[],
): TermRef | null {
  const virtual = parseVirtualSlotId(slotId);
  if (virtual) return virtual;
  const real = slots.find((s) => s.id === slotId);
  return real ? { year: real.year, termDefinitionId: real.termDefinitionId } : null;
}

