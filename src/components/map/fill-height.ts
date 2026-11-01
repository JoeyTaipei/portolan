"use client";

import { useEffect, useRef } from "react";

/**
 * Three-column pages (≥1024px): the page itself doesn't scroll, each column does. Sizes the
 * element from its top edge to the bottom of the window, minus the chart frame's 7px border.
 */
export function useFillHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const set = () => {
      if (!mq.matches) {
        el.style.height = "";
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(460, Math.floor(window.innerHeight - top - 7))}px`;
    };
    set();
    window.addEventListener("resize", set);
    mq.addEventListener("change", set);
    return () => {
      window.removeEventListener("resize", set);
      mq.removeEventListener("change", set);
    };
  }, []);
  return ref;
}
