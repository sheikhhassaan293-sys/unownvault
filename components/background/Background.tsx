"use client";

import { useEffect, useRef, useState } from "react";
import type { ThemeKey } from "@/lib/themes";
import { SCENES, STATIC_SCENES, type Env, type Scene } from "./scenes";

/**
 * One fixed canvas behind every page. Swaps scene when the theme changes.
 * - DPR capped at 1.5
 * - pauses when the tab is hidden
 * - prefers-reduced-motion → a single static frame
 * - no canvas support → CSS gradient fallback (.bg-fallback)
 */
export function Background({ theme }: { theme: ThemeKey }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<{ setTheme: (t: ThemeKey) => void } | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d", { alpha: false });
    if (!c || !ctx) {
      setFallback(true);
      return;
    }
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = mq.matches;
    let current: ThemeKey = theme;
    let scene: Scene | null = null;
    let W = 0, H = 0, t = 0, last = 0, raf = 0, running = false;

    const env = (): Env => ({
      x: ctx, W, H, reduce,
      t: () => t,
      setFlash: (v) => root.style.setProperty("--flash", v.toFixed(3)),
    });

    const isStatic = () => reduce || STATIC_SCENES.includes(current);

    function build() {
      root.style.setProperty("--flash", "0");
      scene = SCENES[current](env());
      if (isStatic()) {
        t = 3;
        scene.draw(0.016);
      }
    }

    function resize(force = false) {
      const nw = window.innerWidth, nh = window.innerHeight;
      // ignore mobile URL-bar height jiggle
      if (!force && nw === W && Math.abs(nh - H) < 120) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = nw;
      H = nh;
      c!.width = (W * dpr) | 0;
      c!.height = (H * dpr) | 0;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      t += dt;
      scene?.draw(dt);
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running || isStatic() || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => resize(), 140);
    };
    const onVis = () => (document.hidden ? stop() : start());
    const onMq = () => {
      reduce = mq.matches;
      stop();
      build();
      start();
    };

    resize(true);
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    mq.addEventListener("change", onMq);

    engine.current = {
      setTheme(next) {
        if (next === current) return;
        current = next;
        stop();
        build();
        start();
      },
    };

    return () => {
      stop();
      clearTimeout(rt);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", onMq);
      engine.current = null;
    };
    // the engine is created once; theme changes go through setTheme below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.setTheme(theme);
  }, [theme]);

  return (
    <>
      <div className="bg-fallback" aria-hidden="true" />
      {!fallback && <canvas ref={ref} className="bg-canvas" aria-hidden="true" />}
    </>
  );
}
