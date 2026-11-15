/* Prompt Dash: a tiny 3D lane runner drawn on a 2D canvas.
   Everything is projected by hand (see `project`), so there are no libraries. */

const LANE = 2.4;
const SPAWN_Z = 110;
const BEST_KEY = "dash-best";
const TAU = Math.PI * 2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pick = (list) => list[(Math.random() * list.length) | 0];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [134, 209, 159] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (rgb, a = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
// k > 1 lightens towards white, k < 1 darkens towards black.
const shade = (rgb, k) => rgb.map((c) => Math.round(k > 1 ? c + (255 - c) * (k - 1) : c * k));

export function initGame({ onRecord } = {}) {
  const host = document.querySelector("[data-game]");
  const canvas = host?.querySelector("canvas");
  if (!host || !canvas?.getContext) return { start() {} };

  const ctx = canvas.getContext("2d");
  const $ = (sel) => host.querySelector(sel);
  const ui = {
    overlay: $("[data-game-overlay]"),
    title: $("[data-game-title]"),
    msg: $("[data-game-msg]"),
    button: $("[data-game-start]"),
    score: $("[data-game-score]"),
    best: $("[data-game-best]"),
    mult: $("[data-game-mult]"),
    lives: $("[data-game-lives]"),
  };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  let width = 0;
  let height = 0;
  let focal = 1;
  let horizon = 0;
  let colors = {};
  let mode = "idle"; // idle | playing | paused | over
  let inView = false;
  let raf = 0;
  let last = 0;
  let time = 0;

  let best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { best = 0; }

  const cam = { x: 0, y: 3, z: -7.5 };
  const player = { lane: 0, x: 0, y: 0, vy: 0, roll: 0, invuln: 0 };
  const game = { dist: 0, nextSpawn: 30, speed: 10, score: 0, lives: 3, streak: 0, mult: 1, shake: 0 };
  let objects = [];
  let particles = [];
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.1, p: Math.random() * TAU }));

  function readColors() {
    const cs = getComputedStyle(host);
    const get = (name, fallback) => hexToRgb(cs.getPropertyValue(name).trim() || fallback);
    colors = {
      bg: get("--term-bg", "#161715"),
      ink: get("--term-ink", "#e8e9e3"),
      dim: get("--term-dim", "#92968e"),
      accent: get("--term-accent", "#86d19f"),
      warm: get("--term-warm", "#e2b878"),
      bug: [240, 96, 84],
    };
  }

  /* ---------- Projection ---------- */

  function project(x, y, z) {
    const dz = z - cam.z;
    if (dz < 0.35) return null;
    const s = focal / dz;
    return [width / 2 + (x - cam.x) * s, horizon + (cam.y - y) * s, s];
  }

  function poly(points, fill) {
    if (points.some((p) => !p)) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function box(x, y0, y1, z, hw, hd, rgb) {
    const zn = z - hd;
    const zf = z + hd;
    const a = project(x - hw, y0, zn);
    const b = project(x + hw, y0, zn);
    const c = project(x + hw, y1, zn);
    const d = project(x - hw, y1, zn);
    if (!a) return null;
    const e = project(x - hw, y0, zf);
    const f = project(x + hw, y0, zf);
    const g = project(x + hw, y1, zf);
    const h = project(x - hw, y1, zf);
    if (cam.y > y1) poly([d, c, g, h], rgba(shade(rgb, 1.35)));
    if (cam.x < x - hw) poly([a, d, h, e], rgba(shade(rgb, 0.6)));
    if (cam.x > x + hw) poly([b, c, g, f], rgba(shade(rgb, 0.6)));
    poly([a, b, c, d], rgba(rgb));
    return { a, b, c, d };
  }

  function shadow(x, z, radius, alpha) {
    const p = project(x, 0, z);
    if (!p) return;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], radius * p[2], radius * p[2] * 0.28, 0, 0, TAU);
    ctx.fill();
  }

  /* ---------- World ---------- */

  function spawnRow() {
    const z = SPAWN_Z;
    if (mode !== "playing") {
      // Attract mode: keep the centre lane clear so nothing passes through the player.
      const lane = pick([-1, 1]);
      objects.push({ type: Math.random() < 0.6 ? "token" : "bug", lane, z, spin: Math.random() * TAU });
      return;
    }
    const roll = Math.random();
    const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
    if (roll < 0.16 && game.dist > 250) {
      objects.push({ type: "wall", lane: 0, z });
      objects.push({ type: "token", lane: lanes[0], z, high: true, spin: 0 });
    } else if (roll < 0.42) {
      objects.push({ type: "bug", lane: lanes[0], z });
      objects.push({ type: "bug", lane: lanes[1], z });
      objects.push({ type: "token", lane: lanes[2], z, spin: 0 });
    } else if (roll < 0.72) {
      objects.push({ type: "bug", lane: lanes[0], z });
      objects.push({ type: "token", lane: lanes[1], z, spin: 0 });
    } else {
      for (let i = 0; i < 4; i++) objects.push({ type: "token", lane: lanes[0], z: z + i * 5, spin: i });
      if (Math.random() < 0.5) objects.push({ type: "bug", lane: lanes[1], z: z + 8 });
    }
  }

  function burst(x, y, z, rgb, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const v = 2 + Math.random() * 6;
      particles.push({ x, y, z, vx: Math.cos(a) * v, vy: 2 + Math.random() * 7, vz: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, rgb });
    }
  }

  function reset() {
    objects = [];
    particles = [];
    Object.assign(player, { lane: 0, x: 0, y: 0, vy: 0, roll: 0, invuln: 0 });
    Object.assign(game, { dist: 0, nextSpawn: 40, speed: 22, score: 0, lives: 3, streak: 0, mult: 1, shake: 0 });
  }

  function update(dt) {
    time += dt;
    const playing = mode === "playing";
    game.speed = playing ? Math.min(50, 22 + game.dist * 0.011) : 11;
    const step = game.speed * dt;
    game.dist += step;

    if (game.dist >= game.nextSpawn) {
      spawnRow();
      const reaction = playing ? Math.max(0.5, 0.8 - game.dist * 0.00012) : 1.4;
      game.nextSpawn = game.dist + game.speed * reaction;
    }

    const targetX = player.lane * LANE;
    player.x += (targetX - player.x) * Math.min(1, dt * 14);
    player.roll = (targetX - player.x) * -0.32;
    if (player.y > 0 || player.vy > 0) {
      player.vy -= 30 * dt;
      player.y = Math.max(0, player.y + player.vy * dt);
      if (player.y === 0) player.vy = 0;
    }
    player.invuln = Math.max(0, player.invuln - dt);
    game.shake = Math.max(0, game.shake - dt);

    for (const o of objects) {
      o.z -= step;
      if (o.spin !== undefined) o.spin += dt * 3;
      if (!playing || o.done || o.z > 0.9 || o.z < -0.9) continue;
      const ox = o.lane * LANE;
      if (o.type === "token") {
        const reach = o.high ? player.y > 0.5 : player.y < 1.5;
        if (Math.abs(ox - player.x) < 1.1 && reach) {
          o.done = true;
          game.streak += 1;
          game.mult = Math.min(5, 1 + Math.floor(game.streak / 5));
          game.score += 10 * game.mult;
          burst(ox, o.high ? 2 : 0.9, 0, colors.accent, 10);
        }
      } else if (player.invuln === 0) {
        const hit = o.type === "wall" ? player.y < 0.6 : Math.abs(ox - player.x) < 1.25 && player.y < 1.15;
        if (hit) {
          o.done = true;
          game.lives -= 1;
          game.streak = 0;
          game.mult = 1;
          game.shake = 0.35;
          player.invuln = 1.3;
          burst(player.x, 0.7, 0, colors.bug, 22);
          if (game.lives <= 0) return gameOver();
        }
      }
    }
    objects = objects.filter((o) => o.z > -4 && !(o.done && o.type !== "wall"));

    for (const p of particles) {
      p.vy -= 22 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      p.z += (p.vz - game.speed * 0.5) * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);

    if (playing) game.score += step * 0.35;
  }

  /* ---------- Drawing ---------- */

  function drawBackdrop() {
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgba(shade(colors.bg, 0.7)));
    sky.addColorStop(1, rgba(shade(colors.bg, 1.05)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizon + 1);

    for (const s of stars) {
      ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.3 + s.p));
      ctx.fillStyle = rgba(colors.ink);
      ctx.fillRect(((s.x * width - cam.x * 6) % width + width) % width, s.y * horizon * 0.92, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // Striped sun sitting on the horizon.
    const r = Math.min(width * 0.2, horizon * 0.72);
    const cx = width / 2 - cam.x * 9;
    const sun = ctx.createLinearGradient(0, horizon - r, 0, horizon);
    sun.addColorStop(0, rgba(colors.warm, 0.95));
    sun.addColorStop(1, rgba(colors.accent, 0.85));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, horizon);
    ctx.clip();
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, horizon, r, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, horizon, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = rgba(shade(colors.bg, 1.05));
    for (let i = 0; i < 6; i++) {
      const y = horizon - r * (0.08 + i * 0.13) + ((time * 4) % (r * 0.13));
      ctx.fillRect(cx - r, y, r * 2, 1.5 + i * 0.9);
    }
    ctx.restore();
    const glow = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, r * 2.6);
    glow.addColorStop(0, rgba(colors.accent, 0.22));
    glow.addColorStop(1, rgba(colors.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, rgba(shade(colors.bg, 1.09)));
    floor.addColorStop(1, rgba(shade(colors.bg, 0.8)));
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, width, height - horizon);
  }

  function drawFloor() {
    const near = cam.z + 0.6;
    const half = LANE * 1.5;
    // The road itself, slightly lighter than the ground around it.
    poly([project(-half, 0, near), project(half, 0, near), project(half, 0, SPAWN_Z), project(-half, 0, SPAWN_Z)], rgba(colors.accent, 0.05));

    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const x = -half + i * LANE;
      const a = project(x, 0, near);
      const b = project(x, 0, SPAWN_Z);
      const edge = i === 0 || i === 3;
      const grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
      grad.addColorStop(0, rgba(colors.accent, edge ? 0.9 : 0.3));
      grad.addColorStop(1, rgba(colors.accent, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = edge ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    const gap = 4;
    for (let z = -(game.dist % gap) + Math.ceil(near / gap) * gap; z < SPAWN_Z; z += gap) {
      const a = project(-half, 0, z);
      const b = project(half, 0, z);
      if (!a) continue;
      ctx.strokeStyle = rgba(colors.accent, 0.3 * Math.pow(1 - z / SPAWN_Z, 2));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }

  function drawToken(o) {
    const x = o.lane * LANE;
    const y = (o.high ? 2.05 : 0.95) + Math.sin(time * 4 + o.z * 0.2) * 0.1;
    shadow(x, o.z, 0.42, 0.25);
    const r = 0.5;
    const eq = [0, 1, 2, 3].map((i) => {
      const a = o.spin + (i * Math.PI) / 2;
      return { p: project(x + Math.cos(a) * r, y, o.z + Math.sin(a) * r), depth: Math.sin(a), a };
    });
    const top = project(x, y + 0.68, o.z);
    const bottom = project(x, y - 0.68, o.z);
    const faces = [0, 1, 2, 3]
      .map((i) => ({ a: eq[i], b: eq[(i + 1) % 4], depth: eq[i].depth + eq[(i + 1) % 4].depth }))
      .sort((m, n) => n.depth - m.depth);
    for (const f of faces) {
      const light = 0.5 + 0.5 * Math.cos(f.a.a + Math.PI / 4 + 0.6);
      poly([bottom, f.a.p, f.b.p], rgba(shade(colors.accent, 0.5 + light * 0.45)));
      poly([top, f.a.p, f.b.p], rgba(shade(colors.accent, 0.85 + light * 0.55)));
    }
  }

  function drawBug(o) {
    const x = o.lane * LANE;
    shadow(x, o.z, 0.9, 0.3);
    const bob = Math.abs(Math.sin(time * 6 + o.lane)) * 0.12;
    const face = box(x, 0.12 + bob, 1.42 + bob, o.z, 0.68, 0.6, colors.bug);
    if (!face) return;
    const { a, b, d } = face;
    const w = b[0] - a[0];
    const h = a[1] - d[1];
    // Eyes and antennae, drawn flat on the front face.
    for (const side of [0.3, 0.7]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(a[0] + w * side, d[1] + h * 0.42, w * 0.11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#1a1210";
      ctx.beginPath();
      ctx.arc(a[0] + w * side + clamp((cam.x - x) * w * 0.02, -w * 0.04, w * 0.04), d[1] + h * 0.46, w * 0.055, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(shade(colors.bug, 0.6));
      ctx.lineWidth = Math.max(1, w * 0.04);
      ctx.beginPath();
      ctx.moveTo(a[0] + w * side, d[1]);
      ctx.lineTo(a[0] + w * (side < 0.5 ? side - 0.16 : side + 0.16), d[1] - h * 0.3);
      ctx.stroke();
    }
  }

  function drawWall(o) {
    const face = box(0, 0, 0.62, o.z, LANE * 1.5, 0.3, shade(colors.warm, o.done ? 0.5 : 0.92));
    if (!face) return;
    const { a, b, d } = face;
    const h = a[1] - d[1];
    if (h < 7) return;
    ctx.fillStyle = rgba(shade(colors.bg, 0.8));
    ctx.font = `700 ${h * 0.56}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("<<<<<<< merge conflict · jump!", (a[0] + b[0]) / 2, d[1] + h / 2, (b[0] - a[0]) * 0.9);
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(time * 14) % 2) return;
    shadow(player.x, 0, 0.75 - Math.min(0.35, player.y * 0.15), 0.35);
    const y0 = player.y + 0.32 + Math.sin(time * 5) * 0.05;
    const cos = Math.cos(player.roll);
    const sin = Math.sin(player.roll);
    const v = (x, y, z) => project(player.x + x * cos - y * sin, y0 + x * sin + y * cos, z);
    const nose = v(0, 0.08, 1.15);
    const left = v(-0.78, 0, -0.75);
    const right = v(0.78, 0, -0.75);
    const notch = v(0, 0.05, -0.25);
    const top = v(0, 0.56, -0.4);

    // Exhaust trails behind each wing tip.
    const len = 1.2 + game.speed / 14;
    for (const tip of [-0.78, 0.78]) {
      const a = v(tip, 0, -0.75);
      const b = v(tip * 0.45, 0, -0.75);
      const end = v(tip * 0.6, 0, -0.75 - len);
      if (!a || !b || !end) continue;
      const grad = ctx.createLinearGradient(a[0], a[1], end[0], end[1]);
      grad.addColorStop(0, rgba(colors.accent, 0.75));
      grad.addColorStop(1, rgba(colors.accent, 0));
      poly([a, b, end], grad);
    }
    poly([nose, left, top], rgba(shade(colors.ink, 0.86)));
    poly([nose, top, right], rgba(colors.ink));
    poly([left, notch, top], rgba(shade(colors.accent, 0.75)));
    poly([notch, right, top], rgba(shade(colors.accent, 1.05)));
  }

  function draw() {
    const jitter = game.shake > 0 ? game.shake * 0.9 : 0;
    cam.x = player.x * 0.55 + (Math.random() - 0.5) * jitter;
    cam.y = 3 + player.y * 0.25 + (Math.random() - 0.5) * jitter;

    ctx.clearRect(0, 0, width, height);
    drawBackdrop();
    drawFloor();

    const queue = [...objects].sort((a, b) => b.z - a.z);
    let playerDrawn = false;
    for (const o of queue) {
      if (!playerDrawn && o.z < 0) {
        drawPlayer();
        playerDrawn = true;
      }
      if (o.z < -3.4) continue;
      // Fade in from the horizon, and out again once something has passed the player.
      ctx.globalAlpha = Math.min(clamp((SPAWN_Z - o.z) / 18, 0, 1), clamp((o.z + 3.4) / 2.4, 0, 1));
      if (o.type === "token") drawToken(o);
      else if (o.type === "bug") drawBug(o);
      else drawWall(o);
    }
    ctx.globalAlpha = 1;
    if (!playerDrawn) drawPlayer();

    for (const p of particles) {
      const q = project(p.x, p.y, p.z);
      if (!q) continue;
      const size = Math.max(1.5, q[2] * 0.11);
      ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
      ctx.fillStyle = rgba(p.rgb);
      ctx.fillRect(q[0] - size / 2, q[1] - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD + state ---------- */

  const shown = {};
  function syncHud() {
    const score = Math.floor(game.score);
    if (shown.score !== score) ui.score.textContent = shown.score = score;
    if (shown.best !== best) ui.best.textContent = shown.best = best;
    if (shown.mult !== game.mult) {
      ui.mult.textContent = `×${(shown.mult = game.mult)}`;
      ui.mult.classList.toggle("is-hot", game.mult > 1);
    }
    if (shown.lives !== game.lives) {
      shown.lives = game.lives;
      ui.lives.innerHTML = [0, 1, 2].map((i) => `<i${i < game.lives ? "" : ' class="is-lost"'}>❯</i>`).join("");
    }
  }

  function showOverlay(title, message, action) {
    ui.title.textContent = title;
    ui.msg.textContent = message;
    ui.button.textContent = action;
    ui.overlay.hidden = false;
  }

  function setMode(next) {
    mode = next;
    host.dataset.state = next;
    host.classList.toggle("is-playing", next === "playing");
    schedule();
  }

  function start() {
    if (mode === "playing") return;
    if (mode !== "paused") reset();
    readColors();
    ui.overlay.hidden = true;
    last = 0;
    setMode("playing");
    syncHud();
    canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (mode !== "playing") return;
    setMode("paused");
    showOverlay("Paused", "Take a breath. Your run is waiting.", "Resume");
    draw();
  }

  function gameOver() {
    const score = Math.floor(game.score);
    const record = score > best;
    if (record) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* storage unavailable */ }
    }
    setMode("over");
    syncHud();
    showOverlay(record ? "New best!" : "Shipped with bugs", `You scored ${score}.${record ? "" : ` Best is ${best}.`}`, "Play again");
    // Hold the button briefly so a jump pressed at the moment of impact doesn't restart the run.
    ui.button.disabled = true;
    setTimeout(() => {
      ui.button.disabled = false;
      if (mode === "over") ui.button.focus({ preventScroll: true });
    }, 700);
    if (record && score > 0) onRecord?.(score);
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    update(dt);
    draw();
    if (mode === "playing") syncHud();
    schedule();
  }

  function schedule() {
    if (raf) return;
    const animate = mode === "playing" || ((mode === "idle" || mode === "over") && inView && !document.hidden && !reducedMotion.matches);
    if (animate) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function layout() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    focal = Math.min(width * 0.85, height * 1.1);
    horizon = height * 0.36;
    draw();
  }

  /* ---------- Input ---------- */

  const steer = (dir) => (player.lane = clamp(player.lane + dir, -1, 1));
  const jump = () => {
    if (player.y === 0) player.vy = 10.5;
  };

  addEventListener("keydown", (e) => {
    if (mode !== "playing" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, dialog, [contenteditable]")) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === "ArrowLeft" || key === "a") steer(-1);
    else if (key === "ArrowRight" || key === "d") steer(1);
    else if (key === "ArrowUp" || key === "w" || key === " ") jump();
    else if (key === "Escape" || key === "p") pause();
    else return;
    e.preventDefault();
  });

  let touch = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "playing") return;
    touch = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (mode !== "playing" || !touch) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    touch = null;
    if (dy < -28 && Math.abs(dy) > Math.abs(dx)) jump();
    else if (Math.abs(dx) > 28) steer(Math.sign(dx));
    else {
      const rect = canvas.getBoundingClientRect();
      const at = (e.clientX - rect.left) / rect.width;
      if (at < 0.36) steer(-1);
      else if (at > 0.64) steer(1);
      else jump();
    }
  });

  ui.button.addEventListener("click", start);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : schedule()));
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (!inView) pause();
        schedule();
      },
      { threshold: 0.15 }
    ).observe(host);
  } else inView = true;
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(canvas);
  else addEventListener("resize", layout);

  readColors();
  // Seed the attract mode so the first frame already has things on the road.
  for (let z = 30; z < SPAWN_Z; z += 16) {
    objects.push({ type: Math.random() < 0.6 ? "token" : "bug", lane: pick([-1, 1]), z, spin: z });
  }
  layout();
  syncHud();
  setMode("idle");

  return {
    start,
    refreshColors() {
      readColors();
      draw();
    },
  };
}
