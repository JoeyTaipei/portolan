"use client";

import { useEffect, useRef, useState } from "react";

/** Width and height of an element, kept current with a ResizeObserver. */
export function useSize<T extends HTMLElement>(min = { w: 280, h: 260 }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 420 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const b = el.getBoundingClientRect();
      setSize({ w: Math.max(min.w, Math.round(b.width)), h: Math.max(min.h, Math.round(b.height)) });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min.w, min.h]);
  return [ref, size] as const;
}
