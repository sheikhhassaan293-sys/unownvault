/**
 * Animated page backgrounds — one scene per theme, drawn on a single shared <canvas>.
 * Canvas 2D (GPU-composited) keeps this light: no textures, no video, no images.
 * Each scene is created for the current viewport size and redrawn every frame.
 */
import type { ThemeKey } from "@/lib/themes";

export type Env = {
  x: CanvasRenderingContext2D;
  W: number;
  H: number;
  reduce: boolean;
  /** monotonically increasing seconds */
  t: () => number;
  setFlash: (v: number) => void;
};

export type Scene = { draw: (dt: number) => void };

const R = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

function vignette(e: Env, a: number) {
  const { x, W, H } = e;
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
}

function offscreen(W: number, H: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, W);
  c.height = Math.max(1, H);
  return c;
}

/* ───────────────────────────── ABYSS ───────────────────────────── */
function abyss(e: Env): Scene {
  const { x, W, H } = e;
  const rays = Array.from({ length: 6 }, () => ({ x: R(0, W), w: R(60, 170), p: R(0, TAU), s: R(0.15, 0.4) }));
  const bub = Array.from({ length: Math.round((W * H) / 22000) + 20 }, () => ({
    x: R(0, W), y: R(0, H), r: R(1, 4), v: R(0.3, 1.1), w: R(0.5, 1.5), p: R(0, TAU),
  }));
  // the vast shape: glides across every ~10–15s
  const sh = { start: e.t() + 3, dur: 10, y: H * R(0.55, 0.75), s: R(0.9, 1.25) };

  return {
    draw(dt) {
      const t = e.t();
      const f = dt * 60;
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#08202a");
      g.addColorStop(0.7, "#03080C");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);

      x.globalCompositeOperation = "lighter";
      const lg = x.createLinearGradient(0, 0, 0, H * 0.9);
      lg.addColorStop(0, "rgba(60,242,196,.075)");
      lg.addColorStop(1, "rgba(60,242,196,0)");
      x.fillStyle = lg;
      for (const r of rays) {
        const sw = Math.sin(t * r.s + r.p) * 70;
        x.beginPath();
        x.moveTo(r.x + sw - r.w / 2, -10);
        x.lineTo(r.x + sw + r.w / 2, -10);
        x.lineTo(r.x + sw * 2 + r.w * 1.5, H * 0.9);
        x.lineTo(r.x + sw * 2 - r.w * 0.3, H * 0.9);
        x.closePath();
        x.fill();
      }
      // caustics near the surface
      x.lineWidth = 1.6;
      for (let i = 0; i < 8; i++) {
        x.strokeStyle = `rgba(130,255,225,${0.06 - i * 0.006})`;
        x.beginPath();
        const y0 = 18 + i * 20;
        for (let xx = -20; xx <= W + 20; xx += 22) {
          const y = y0 + Math.sin(xx * 0.011 + t * (0.55 + i * 0.07) + i) * 9 + Math.sin(xx * 0.029 - t * 0.9 + i * 2) * 4;
          if (xx < 0) x.moveTo(xx, y);
          else x.lineTo(xx, y);
        }
        x.stroke();
      }
      x.globalCompositeOperation = "source-over";

      const p = (t - sh.start) / sh.dur;
      if (p > 0 && p < 1) {
        const L = Math.max(W, H) * 0.55 * sh.s;
        x.save();
        x.translate(-L + p * (W + 2 * L), sh.y + Math.sin(p * 7) * 14);
        x.rotate(Math.sin(p * 5) * 0.04);
        x.scale(1, 0.26);
        for (const [ox, rr, a] of [[0, 0.5, 0.62], [-0.62, 0.3, 0.5], [-0.95, 0.16, 0.4], [0.18, 0.22, 0.3]] as const) {
          const rg = x.createRadialGradient(ox * L, 0, 0, ox * L, 0, rr * L);
          rg.addColorStop(0, `rgba(0,5,8,${a})`);
          rg.addColorStop(0.55, `rgba(0,5,8,${a * 0.6})`);
          rg.addColorStop(1, "rgba(0,5,8,0)");
          x.fillStyle = rg;
          x.beginPath();
          x.arc(ox * L, 0, rr * L, 0, TAU);
          x.fill();
        }
        x.restore();
      } else if (p >= 1) {
        sh.start = t + R(1, 5);
        sh.y = H * R(0.5, 0.8);
        sh.s = R(0.9, 1.3);
      }

      x.strokeStyle = "rgba(170,255,230,.3)";
      x.lineWidth = 1;
      x.beginPath();
      for (const b of bub) {
        b.y -= b.v * f;
        b.x += Math.sin(t * b.w + b.p) * 0.35 * f;
        if (b.y < -10) {
          b.y = H + 10;
          b.x = R(0, W);
        }
        x.moveTo(b.x + b.r, b.y);
        x.arc(b.x, b.y, b.r, 0, TAU);
      }
      x.stroke();
      vignette(e, 0.6);
    },
  };
}

/* ───────────────────────────── THUNDERSTORM ───────────────────────────── */
function storm(e: Env): Scene {
  const { x, W, H } = e;
  const clouds = Array.from({ length: 22 }, () => ({
    x: R(-300, W + 300), y: R(-80, H * 0.55), r: R(170, 400), v: R(0.12, 0.45), a: R(0.07, 0.16), k: R(0.8, 1.4),
  }));
  const rain = Array.from({ length: Math.round((W * H) / 4200) }, () => ({ x: R(0, W + 300), y: R(0, H), l: R(14, 32), v: R(13, 20) }));
  const S = { flash: 0, next: e.t() + R(1.2, 2.5), re: 0, bolt: null as number[][][] | null, sheet: e.t() + R(1, 2), sf: 0 };

  function bolt() {
    let px = R(W * 0.15, W * 0.85);
    let py = -10;
    const main: number[][] = [[px, py]];
    const end = H * R(0.65, 0.95);
    const br: number[][][] = [];
    while (py < end) {
      px += R(-28, 28);
      py += R(14, 34);
      main.push([px, py]);
      if (Math.random() < 0.28) {
        const b: number[][] = [[px, py]];
        let bx = px, by = py;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const n = R(3, 7);
        for (let i = 0; i < n; i++) {
          bx += dir * R(6, 26);
          by += R(10, 24);
          b.push([bx, by]);
        }
        br.push(b);
      }
    }
    return [main, ...br];
  }

  return {
    draw(dt) {
      const t = e.t();
      const f = dt * 60;
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#110f1d");
      g.addColorStop(1, "#08070F");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      // distant sheet lightning between strikes
      if (!e.reduce && t > S.sheet) {
        S.sf = R(0.25, 0.5);
        S.sheet = t + R(0.8, 2.4);
      }
      S.sf *= Math.pow(0.9, f);
      const fl = Math.max(S.flash, S.sf * 0.5);
      for (const k of clouds) {
        k.x += k.v * f;
        if (k.x - k.r * 2 > W) k.x = -k.r * 2;
        x.save();
        x.translate(k.x, k.y);
        x.scale(1.8 * k.k, 0.62);
        const rg = x.createRadialGradient(0, 0, 0, 0, 0, k.r);
        const a = k.a * (1 + fl * 3.5);
        rg.addColorStop(0, `rgba(${(118 + fl * 120) | 0},${(112 + fl * 125) | 0},${(160 + fl * 95) | 0},${a})`);
        rg.addColorStop(1, "rgba(21,19,31,0)");
        x.fillStyle = rg;
        x.beginPath();
        x.arc(0, 0, k.r, 0, TAU);
        x.fill();
        x.restore();
      }
      x.strokeStyle = `rgba(205,198,255,${0.17 + S.flash * 0.25})`;
      x.lineWidth = 1;
      x.beginPath();
      for (const d of rain) {
        d.y += d.v * f;
        d.x -= d.v * 0.32 * f;
        if (d.y > H + 30) {
          d.y = R(-40, -10);
          d.x = R(0, W + 300);
        }
        x.moveTo(d.x, d.y);
        x.lineTo(d.x + d.l * 0.32, d.y - d.l);
      }
      x.stroke();
      if (!e.reduce && t > S.next) {
        S.flash = 1;
        S.bolt = bolt();
        S.next = t + R(3, 6.5);
        S.re = t + R(0.09, 0.16);
      }
      if (S.re && t > S.re) {
        S.flash = Math.max(S.flash, 0.85); // the re-strike flicker
        S.re = 0;
      }
      if (S.flash > 0.02) {
        x.fillStyle = `rgba(196,181,255,${S.flash * 0.13})`;
        x.fillRect(0, 0, W, H);
        if (S.flash > 0.3 && S.bolt) {
          x.save();
          x.shadowColor = "#C4B5FF";
          x.shadowBlur = 28;
          x.strokeStyle = `rgba(245,240,255,${S.flash})`;
          x.lineJoin = "round";
          S.bolt.forEach((b, i) => {
            x.lineWidth = i ? 1.2 : 3;
            x.beginPath();
            b.forEach((q, j) => (j ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])));
            x.stroke();
          });
          x.restore();
        }
        S.flash *= Math.pow(0.88, f);
        e.setFlash(S.flash);
      } else if (S.flash) {
        S.flash = 0;
        e.setFlash(0);
      }
      vignette(e, 0.55);
    },
  };
}

/* ───────────────────────────── MAGMA ───────────────────────────── */
function magma(e: Env): Scene {
  const { x, W, H } = e;
  const oc = offscreen(W, H);
  const o = oc.getContext("2d")!;
  const paths: { pts: number[][]; w: number }[] = [];
  const n = Math.round((W * H) / 40000) + 10;
  function walk(px: number, py: number, ang: number, len: number, w: number) {
    const pts = [[px, py]];
    for (let i = 0; i < len; i++) {
      ang += R(-0.55, 0.55);
      const s = R(14, 30);
      px += Math.cos(ang) * s;
      py += Math.sin(ang) * s;
      pts.push([px, py]);
      if (Math.random() < 0.14 && w > 0.9 && paths.length < 220) walk(px, py, ang + R(-1.3, 1.3), (len * 0.5) | 0, w * 0.6);
    }
    paths.push({ pts, w });
  }
  for (let i = 0; i < n; i++) walk(R(-40, W + 40), R(H * 0.3, H * 1.05), R(0, TAU), R(8, 18) | 0, R(1.2, 2.6));
  o.lineCap = "round";
  o.lineJoin = "round";
  o.shadowColor = "rgba(255,80,10,1)";
  o.shadowBlur = 16;
  o.strokeStyle = "rgba(255,110,30,.85)";
  const stroke = (k: number) =>
    paths.forEach((p) => {
      o.beginPath();
      p.pts.forEach((q, i) => (i ? o.lineTo(q[0], q[1]) : o.moveTo(q[0], q[1])));
      o.lineWidth = p.w * k;
      o.stroke();
    });
  stroke(1.6);
  o.shadowBlur = 0;
  o.strokeStyle = "rgba(255,215,160,.9)";
  stroke(0.45);

  const mk = () => ({ x: R(0, W), y: R(H * 0.55, H + 20), vx: R(-0.3, 0.3), vy: R(-1.7, -0.5), s: R(0.8, 2.4), life: 0, max: R(2.5, 6), f: R(0, TAU) });
  const emb = Array.from({ length: Math.round((W * H) / 16000) + 30 }, () => {
    const m = mk();
    m.life = R(0, m.max);
    m.y = R(0, H);
    return m;
  });

  return {
    draw(dt) {
      const t = e.t();
      const f = dt * 60;
      x.fillStyle = "#0B0807";
      x.fillRect(0, 0, W, H);
      const g = x.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0, "rgba(255,70,15,0)");
      g.addColorStop(1, "rgba(255,70,15,.17)");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      // veins pulse brighter / dimmer
      x.globalAlpha = 0.42 + 0.22 * Math.sin(t * 0.9);
      x.drawImage(oc, 0, 0, W, H);
      x.globalCompositeOperation = "lighter";
      x.globalAlpha = 0.12 + 0.14 * Math.sin(t * 1.6 + 1.3);
      x.drawImage(oc, 0, 0, W, H);
      x.globalAlpha = 1;
      // heat haze near the bottom
      x.lineWidth = 10;
      for (let i = 0; i < 5; i++) {
        x.strokeStyle = "rgba(255,110,40,.022)";
        x.beginPath();
        const y0 = H * 0.78 + i * H * 0.045;
        for (let xx = -20; xx <= W + 20; xx += 30) {
          const y = y0 + Math.sin(xx * 0.008 + t * 1.4 + i) * 6;
          if (xx < 0) x.moveTo(xx, y);
          else x.lineTo(xx, y);
        }
        x.stroke();
      }
      for (const m of emb) {
        m.life += dt;
        m.x += (m.vx + Math.sin(t * 2 + m.f) * 0.35) * f;
        m.y += m.vy * f;
        if (m.life > m.max || m.y < -10) Object.assign(m, mk());
        const a = Math.max(0, 1 - m.life / m.max) * (0.55 + 0.45 * Math.sin(t * 11 + m.f * 3));
        x.fillStyle = `rgba(255,${150 + ((m.f * 15) | 0)},60,${a})`;
        x.beginPath();
        x.arc(m.x, m.y, m.s, 0, TAU);
        x.fill();
      }
      x.globalCompositeOperation = "source-over";
      vignette(e, 0.6);
    },
  };
}

/* ───────────────────────────── DARK FOREST ───────────────────────────── */
function forest(e: Env): Scene {
  const { x, W, H } = e;
  const pine = (g: CanvasRenderingContext2D, px: number, b: number, h: number, w: number) => {
    g.fillRect(px - w * 0.04, b - h * 0.16, w * 0.08, h * 0.2);
    for (let i = 0; i < 4; i++) {
      const y0 = b - h * 0.12 - i * h * 0.19, tw = w * (1 - i * 0.2), th = h * 0.42;
      g.beginPath();
      g.moveTo(px - tw / 2, y0);
      g.lineTo(px, y0 - th);
      g.lineTo(px + tw / 2, y0);
      g.closePath();
      g.fill();
    }
  };
  const layer = (color: string, base: number, hmin: number, hmax: number, gap: number) => {
    const o = offscreen(W, H);
    const g = o.getContext("2d")!;
    g.fillStyle = color;
    let px = R(-60, 0);
    while (px < W + 80) {
      const h = R(hmin, hmax);
      pine(g, px, base + R(-16, 16), h, h * R(0.3, 0.42));
      px += R(gap * 0.45, gap * 1.3);
    }
    g.fillRect(0, base + 4, W, H);
    return o;
  };
  const layers = [
    layer("#12271b", H * 0.62, H * 0.16, H * 0.3, 60),
    layer("#0b1a11", H * 0.77, H * 0.24, H * 0.44, 100),
    layer("#030705", H * 0.97, H * 0.45, H * 0.85, 200),
  ];
  const fogs = Array.from({ length: 10 }, (_, i) => ({
    x: R(-200, W + 200), yy: [0.55, 0.72, 0.92][i % 3], r: R(150, 330), v: R(0.08, 0.3) * (Math.random() < 0.5 ? -1 : 1), a: R(0.05, 0.1), l: i % 3,
  }));
  const ff = Array.from({ length: Math.round((W * H) / 24000) + 18 }, () => ({ x: R(0, W), y: R(H * 0.2, H), vx: 0, vy: 0, p: R(0, TAU), b: R(0.6, 1.8), s: R(0.8, 1.8) }));

  return {
    draw(dt) {
      const t = e.t();
      const f = dt * 60;
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0d1f17");
      g.addColorStop(0.6, "#07110b");
      g.addColorStop(1, "#040805");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      // moonlight from above
      const mg = x.createRadialGradient(W * 0.78, H * 0.06, 0, W * 0.78, H * 0.06, Math.max(W, H) * 0.55);
      mg.addColorStop(0, "rgba(215,240,225,.12)");
      mg.addColorStop(1, "rgba(215,240,225,0)");
      x.fillStyle = mg;
      x.fillRect(0, 0, W, H);
      const fog = (l: number) => {
        for (const k of fogs) {
          if (k.l !== l) continue;
          k.x += k.v * f;
          const span = k.r * 2.6;
          if (k.x > W + span) k.x = -span;
          if (k.x < -span) k.x = W + span;
          x.save();
          x.translate(k.x, H * k.yy);
          x.scale(2.6, 0.42);
          const rg = x.createRadialGradient(0, 0, 0, 0, 0, k.r);
          rg.addColorStop(0, `rgba(185,215,200,${k.a})`);
          rg.addColorStop(1, "rgba(185,215,200,0)");
          x.fillStyle = rg;
          x.beginPath();
          x.arc(0, 0, k.r, 0, TAU);
          x.fill();
          x.restore();
        }
      };
      x.drawImage(layers[0], 0, 0, W, H);
      fog(0);
      x.drawImage(layers[1], 0, 0, W, H);
      fog(1);
      x.drawImage(layers[2], 0, 0, W, H);
      fog(2);
      x.globalCompositeOperation = "lighter";
      for (const c of ff) {
        c.vx = (c.vx + R(-0.04, 0.04)) * 0.97;
        c.vy = (c.vy + R(-0.04, 0.04)) * 0.97;
        c.x += (c.vx + Math.sin(t * 0.7 + c.p) * 0.15) * f;
        c.y += (c.vy + Math.cos(t * 0.6 + c.p) * 0.1) * f;
        if (c.x < -10) c.x = W + 10;
        if (c.x > W + 10) c.x = -10;
        if (c.y < H * 0.15) c.vy += 0.02;
        if (c.y > H + 10) c.y = H * 0.3;
        const a = Math.pow(Math.max(0, Math.sin(t * c.b + c.p)), 3);
        if (a < 0.02) continue;
        const r = 11 * c.s;
        const rg = x.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
        rg.addColorStop(0, `rgba(200,245,106,${0.55 * a})`);
        rg.addColorStop(1, "rgba(200,245,106,0)");
        x.fillStyle = rg;
        x.beginPath();
        x.arc(c.x, c.y, r, 0, TAU);
        x.fill();
        x.fillStyle = `rgba(240,255,200,${a})`;
        x.beginPath();
        x.arc(c.x, c.y, c.s * 0.9, 0, TAU);
        x.fill();
      }
      x.globalCompositeOperation = "source-over";
      vignette(e, 0.65);
    },
  };
}

/* ───────────────────────────── TEMPLE ───────────────────────────── */
function temple(e: Env): Scene {
  const { x, W, H } = e;
  const pc = offscreen(W, H);
  const p = pc.getContext("2d")!;
  const cx = W * 0.76, cy = H * 0.4, M = Math.hypot(W, H);
  p.strokeStyle = "rgba(227,179,65,1)";
  p.lineWidth = 1;
  for (let r = 56; r < M; r += 44) {
    p.beginPath();
    p.arc(cx, cy, r, 0, TAU);
    p.stroke();
  }
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    p.beginPath();
    p.moveTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56);
    p.lineTo(cx + Math.cos(a) * M, cy + Math.sin(a) * M);
    p.stroke();
  }
  for (let gx = 20; gx < W * 0.42; gx += 40)
    for (let gy = H * 0.55; gy < H; gy += 40) {
      p.beginPath();
      p.moveTo(gx, gy - 12);
      p.lineTo(gx + 12, gy);
      p.lineTo(gx, gy + 12);
      p.lineTo(gx - 12, gy);
      p.closePath();
      p.stroke();
    }
  const lc = offscreen(W, H);
  const l = lc.getContext("2d")!;
  const motes = Array.from({ length: Math.round((W * H) / 12000) + 40 }, () => ({ x: R(0, W), y: R(0, H), vx: R(-0.15, 0.15), vy: R(-0.12, 0.08), s: R(0.6, 2), p: R(0, TAU) }));

  return {
    draw(dt) {
      const t = e.t();
      const f = dt * 60;
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#17130C");
      g.addColorStop(1, "#0A0906");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 0.045;
      x.drawImage(pc, 0, 0, W, H);
      x.globalAlpha = 1;
      // engravings light up where the scroll position "points"
      const docH = Math.max(1, document.documentElement.scrollHeight - H);
      const sp = Math.min(1, window.scrollY / docH);
      const lx = W * 0.62 + Math.sin(t * 0.25) * W * 0.14, ly = H * (0.18 + 0.64 * sp), lr = Math.min(W, H) * 0.5;
      l.globalCompositeOperation = "source-over";
      l.clearRect(0, 0, W, H);
      l.drawImage(pc, 0, 0);
      l.globalCompositeOperation = "destination-in";
      const rg = l.createRadialGradient(lx, ly, 0, lx, ly, lr);
      rg.addColorStop(0, "rgba(0,0,0,1)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      l.fillStyle = rg;
      l.fillRect(0, 0, W, H);
      x.globalCompositeOperation = "lighter";
      x.globalAlpha = 0.3;
      x.drawImage(lc, 0, 0, W, H);
      x.globalAlpha = 1;
      // the light beam
      const sw = Math.sin(t * 0.3) * W * 0.03;
      const bg2 = x.createLinearGradient(W * 0.2, 0, W * 0.55, H);
      bg2.addColorStop(0, "rgba(227,179,65,.13)");
      bg2.addColorStop(1, "rgba(227,179,65,0)");
      x.fillStyle = bg2;
      x.beginPath();
      x.moveTo(W * 0.14 + sw, -10);
      x.lineTo(W * 0.36 + sw, -10);
      x.lineTo(W * 0.74 + sw * 2, H);
      x.lineTo(W * 0.36 + sw * 2, H);
      x.closePath();
      x.fill();
      for (const m of motes) {
        m.x += (m.vx + Math.sin(t * 0.5 + m.p) * 0.08) * f;
        m.y += (m.vy + Math.cos(t * 0.4 + m.p) * 0.05) * f;
        if (m.x < -5) m.x = W + 5;
        if (m.x > W + 5) m.x = -5;
        if (m.y < -5) m.y = H + 5;
        if (m.y > H + 5) m.y = -5;
        const bx = W * 0.25 + sw + (W * 0.3 + sw) * (m.y / H);
        let a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.2 + m.p));
        if (Math.abs(m.x - bx) < W * 0.15) a *= 2.4;
        x.fillStyle = `rgba(245,205,125,${Math.min(a, 0.9)})`;
        x.beginPath();
        x.arc(m.x, m.y, m.s, 0, TAU);
        x.fill();
      }
      x.globalCompositeOperation = "source-over";
      vignette(e, 0.65);
    },
  };
}

/* ───────────────────────────── NEUTRAL (auth / account / admin) ───────────────────────────── */
function neutral(e: Env): Scene {
  const { x, W, H } = e;
  return {
    draw() {
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#12161b");
      g.addColorStop(1, "#0A0C0F");
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      vignette(e, 0.5);
    },
  };
}

export const SCENES: Record<ThemeKey, (e: Env) => Scene> = { abyss, storm, magma, forest, temple, neutral };
/** Scenes that never animate. */
export const STATIC_SCENES: ThemeKey[] = ["neutral"];
