import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

const EDGE = 80;

export function useNearEdgeScroll(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  axis: "x" | "y",
  onNearEdge: (edge: "start" | "end") => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onScroll = () => {
      if (axis === "y") {
        if (el.scrollTop <= EDGE) onNearEdge("start");
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - EDGE) {
          onNearEdge("end");
        }
      } else {
        if (el.scrollLeft <= EDGE) onNearEdge("start");
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE) {
          onNearEdge("end");
        }
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [enabled, axis, onNearEdge]);
}

export function usePrependScrollFix(
  ref: RefObject<HTMLElement | null>,
  firstId: string | undefined,
  enabled: boolean,
) {
  const snap = useRef({ firstId: "", height: 0, width: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !firstId) {
      if (!enabled) snap.current = { firstId: "", height: 0, width: 0 };
      return;
    }
    if (snap.current.firstId && snap.current.firstId !== firstId) {
      el.scrollTop += el.scrollHeight - snap.current.height;
      el.scrollLeft += el.scrollWidth - snap.current.width;
    }
    snap.current = {
      firstId,
      height: el.scrollHeight,
      width: el.scrollWidth,
    };
  }, [firstId, enabled]);
}

export function useStableNearEdge(
  onNearEdge?: (edge: "start" | "end") => void,
) {
  const ref = useRef(onNearEdge);
  ref.current = onNearEdge;
  return useCallback((edge: "start" | "end") => {
    ref.current?.(edge);
  }, []);
}
