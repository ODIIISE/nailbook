import { useRef, useEffect, useCallback } from "react";

export function useHorizontalDrag<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [ref]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startX.current = e.touches[0].pageX - (ref.current?.offsetLeft || 0);
    scrollLeft.current = ref.current?.scrollLeft || 0;
    touchStartY.current = e.touches[0].pageY;
  }, [ref]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const x = e.touches[0].pageX - (ref.current?.offsetLeft || 0);
    const y = e.touches[0].pageY;
    const deltaX = Math.abs(x - startX.current);
    const deltaY = Math.abs(y - touchStartY.current);
    if (deltaX > deltaY) {
      e.preventDefault();
      const walk = (x - startX.current) * 1.5;
      if (ref.current) {
        ref.current.scrollLeft = scrollLeft.current - walk;
      }
    }
  }, [ref]);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
