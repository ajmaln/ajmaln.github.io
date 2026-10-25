import { initAgent, highlightJson } from "./agent.js";

const root = document.documentElement;
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const isApple = /mac|iphone|ipad|ipod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
const MOD_KEY = isApple ? "⌘K" : "Ctrl K";

const EMAIL = "ajmalnshd@gmail.com";
const CV_URL = "assets/Ajmal_Noushad_CV.pdf";
const CAREER_START = "2018-11";

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  },
};

/* ---------- Dates ---------- */

const today = new Date();
const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const parseYM = (s) => {
  const [y, m] = s.split("-").map(Number);
  return new Date(y, m - 1, 1);
};
const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
const yearsSince = (ym) => Math.floor(monthsBetween(parseYM(ym), thisMonth) / 12);

function formatTenure(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} mo${m > 1 ? "s" : ""}`);
  return parts.join(" ") || "1 mo";
}

const istFormat = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const istHour = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" });
const istTime = () => istFormat.format(new Date());

function initDates() {
  $$("[data-years-since]").forEach((el) => (el.textContent = yearsSince(el.dataset.yearsSince)));
  $$("[data-year]").forEach((el) => (el.textContent = today.getFullYear()));
  $$("[data-tenure]").forEach((el) => {
    const role = el.closest("[data-start]");
    if (!role) return;
    const end = role.dataset.end ? parseYM(role.dataset.end) : thisMonth;
    el.textContent = formatTenure(monthsBetween(parseYM(role.dataset.start), end) + 1);
  });
}

/* ---------- Theme ---------- */

const themeListeners = new Set();
const getTheme = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");

function syncThemeUI() {
  const dark = getTheme() === "dark";
  $$("[data-theme-toggle]").forEach((btn) => btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme"));
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  storage.set("theme", theme);
  syncThemeUI();
  const paper = getComputedStyle(root).getPropertyValue("--paper").trim();
  $$('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", paper));
  themeListeners.forEach((fn) => fn(theme));
}

function setTheme(theme, origin) {
  if (theme === getTheme() && root.dataset.theme) return;
  if (!document.startViewTransition || !motionOK()) {
    applyTheme(theme);
    return;
  }
  const x = origin?.x ?? innerWidth - 48;
  const y = origin?.y ?? 32;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(() => applyTheme(theme));
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 560, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => {});
}

const toggleTheme = (origin) => setTheme(getTheme() === "dark" ? "light" : "dark", origin);

function initTheme() {
  syncThemeUI();
  systemDark.addEventListener("change", () => {
    if (root.dataset.theme) return;
    syncThemeUI();
    themeListeners.forEach((fn) => fn(getTheme()));
  });
  $$("[data-theme-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const r = btn.getBoundingClientRect();
      toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    })
  );
}

/* ---------- Toast + clipboard ---------- */

let toastTimer = 0;
function toast(message) {
  const el = $("[data-toast]");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

async function copyEmail(button) {
  const ok = await copyText(EMAIL);
  toast(ok ? "Email copied to clipboard" : `Couldn't copy. The address is ${EMAIL}`);
  if (ok && button) {
    const label = $("[data-copy-label]", button);
    button.classList.add("is-copied");
    if (label) label.textContent = "Copied";
    setTimeout(() => {
      button.classList.remove("is-copied");
      if (label) label.textContent = "Copy";
    }, 1800);
  }
}

function initCopy() {
  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", () => copyEmail(btn)));
}

/* ---------- Navigation ---------- */

function initNav() {
  const nav = $("[data-nav]");
  const linkBox = $(".nav__links");
  const links = $$("[data-nav-link]");
  const sections = links.map((l) => document.getElementById(l.dataset.navLink)).filter(Boolean);
  const pill = document.createElement("span");
  pill.className = "nav__pill";
  pill.setAttribute("aria-hidden", "true");
  linkBox.prepend(pill);

  let active = null;
  const movePill = () => {
    const link = links.find((l) => l.dataset.navLink === active);
    if (!link || !linkBox.offsetParent) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.opacity = "1";
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = root.scrollHeight - innerHeight;
    nav.style.setProperty("--progress", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : "0");
    nav.classList.toggle("is-scrolled", scrollY > 8);

    let current = null;
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id;
    if (innerHeight + scrollY >= root.scrollHeight - 4) current = sections.at(-1)?.id ?? current;
    if (current !== active) {
      active = current;
      links.forEach((l) => (l.dataset.navLink === active ? l.setAttribute("aria-current", "true") : l.removeAttribute("aria-current")));
      movePill();
    }
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => {
    movePill();
    onScroll();
  });
  document.fonts?.ready.then(movePill);
  update();
}

/* ---------- Reveal on scroll ---------- */

function initReveal() {
  if (!motionOK() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add("is-revealed");
        setTimeout(() => el.classList.remove("reveal-pending", "is-revealed"), 1200);
      }
    },
    { rootMargin: "0px 0px -6% 0px" }
  );
  $$(".bento > .card").forEach((card, i) => card.style.setProperty("--i", String(i % 3)));
  $$("[data-reveal]").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight * 0.92) return;
    el.classList.add("reveal-pending");
    io.observe(el);
  });
}

/* ---------- Hero: rotating roles ---------- */

function initRoles() {
  const el = $("[data-roles]");
  if (!el || !motionOK()) return;
  let roles;
  try { roles = JSON.parse(el.dataset.roles); } catch { return; }
  const glyphs = "abcdefghijklmnopqrstuvwxyz<>/{}[]=+*_#";
  let index = 0;

  const scramble = (to) =>
    new Promise((resolve) => {
      const from = el.textContent;
      const length = Math.max(from.length, to.length);
      const queue = Array.from({ length }, (_, n) => {
        const start = Math.floor(Math.random() * 14);
        return { from: from[n] || "", to: to[n] || "", start, end: start + 8 + Math.floor(Math.random() * 14) };
      });
      let frame = 0;
      const tick = () => {
        let out = "";
        let done = 0;
        for (const c of queue) {
          if (frame >= c.end) {
            done += 1;
            out += c.to;
          } else if (frame >= c.start) {
            out += glyphs[(Math.random() * glyphs.length) | 0];
          } else {
            out += c.from;
          }
        }
        el.textContent = out;
        if (done === queue.length) resolve();
        else {
          frame += 1;
          requestAnimationFrame(tick);
        }
      };
      tick();
    });

  const loop = async () => {
    await new Promise((r) => setTimeout(r, 2800));
    if (!document.hidden) {
      index = (index + 1) % roles.length;
      await scramble(roles[index]);
    }
    loop();
  };
  loop();
}

/* ---------- Hero: interactive dot field ---------- */

function initDots() {
  const canvas = $(".hero__dots");
  const hero = canvas?.closest(".hero");
  if (!canvas || !hero || !canvas.getContext) return { ripple() {} };

  const ctx = canvas.getContext("2d");
  const GAP = 26;
  const RADIUS = 150;
  const DOT = 1.15;
  const RIPPLE_MS = 1700;
  const animated = motionOK();
  const pointer = { x: 0, y: 0, active: false };
  const ripples = [];
  let width = 0;
  let height = 0;
  let dots = [];
  let raf = 0;
  let visible = true;
  let base = "";
  let hot = "";

  const readColors = () => {
    const cs = getComputedStyle(root);
    base = cs.getPropertyValue("--dot").trim();
    hot = cs.getPropertyValue("--dot-hot").trim();
  };

  function layout() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.floor(width / GAP) + 2;
    const rows = Math.floor(height / GAP) + 2;
    const ox = (width - (cols - 1) * GAP) / 2;
    const oy = (height - (rows - 1) * GAP) / 2;
    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) dots.push({ x: ox + c * GAP, y: oy + r * GAP, dx: 0, dy: 0, e: 0 });
    }
    draw(performance.now());
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t0 > RIPPLE_MS) ripples.splice(i, 1);

    let busy = ripples.length > 0;
    const lit = [];
    ctx.fillStyle = base;
    ctx.beginPath();
    for (const d of dots) {
      let tx = 0;
      let ty = 0;
      let te = 0;
      if (pointer.active) {
        const vx = d.x - pointer.x;
        const vy = d.y - pointer.y;
        const dist = Math.hypot(vx, vy);
        if (dist < RADIUS) {
          const f = 1 - dist / RADIUS;
          const push = f * f * 18;
          tx += (vx / (dist || 1)) * push;
          ty += (vy / (dist || 1)) * push;
          te = Math.max(te, f);
        }
      }
      for (const rp of ripples) {
        const age = now - rp.t0;
        const front = age * 0.6;
        const vx = d.x - rp.x;
        const vy = d.y - rp.y;
        const dist = Math.hypot(vx, vy);
        const band = Math.abs(dist - front);
        if (band < 46) {
          const f = (1 - band / 46) * (1 - age / RIPPLE_MS);
          tx += (vx / (dist || 1)) * f * 9;
          ty += (vy / (dist || 1)) * f * 9;
          te = Math.max(te, f * 0.9);
        }
      }
      d.dx += (tx - d.dx) * 0.16;
      d.dy += (ty - d.dy) * 0.16;
      d.e += (te - d.e) * 0.16;
      if (Math.abs(tx - d.dx) > 0.05 || Math.abs(ty - d.dy) > 0.05 || Math.abs(te - d.e) > 0.004) busy = true;
      const x = d.x + d.dx;
      const y = d.y + d.dy;
      if (d.e > 0.03) lit.push(d);
      else {
        ctx.moveTo(x + DOT, y);
        ctx.arc(x, y, DOT, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.fillStyle = hot;
    for (const d of lit) {
      ctx.globalAlpha = Math.min(1, 0.2 + d.e * 0.8);
      ctx.beginPath();
      ctx.arc(d.x + d.dx, d.y + d.dy, DOT + d.e * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return busy;
  }

  const frame = (now) => {
    raf = 0;
    if (draw(now) && visible) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (animated && !raf && visible) raf = requestAnimationFrame(frame);
  };

  function ripple(clientX, clientY) {
    if (!animated) return;
    const rect = canvas.getBoundingClientRect();
    ripples.push({ x: clientX - rect.left, y: clientY - rect.top, t0: performance.now() });
    kick();
  }

  if (animated) {
    hero.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      kick();
    });
    hero.addEventListener("pointerleave", () => {
      pointer.active = false;
      kick();
    });
    hero.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      ripple(e.clientX, e.clientY);
    });
  }

  readColors();
  themeListeners.add(() => {
    readColors();
    draw(performance.now());
  });
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(canvas);
  else addEventListener("resize", layout);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    }).observe(hero);
  }
  layout();
  return { ripple };
}

/* ---------- Hero: portrait ring ---------- */

function initPortrait(dots) {
  const portrait = $(".portrait");
  const ring = $(".portrait__ring");
  if (!portrait || !ring) return;
  if (motionOK() && ring.animate) {
    const spin = ring.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 36000, iterations: Infinity });
    const rate = (r) => (spin.updatePlaybackRate ? spin.updatePlaybackRate(r) : (spin.playbackRate = r));
    portrait.addEventListener("pointerenter", () => rate(5));
    portrait.addEventListener("pointerleave", () => rate(1));
  }
  const pulseFromPortrait = () => {
    const r = portrait.getBoundingClientRect();
    dots.ripple(r.left + r.width / 2, r.top + r.height / 2);
  };
  portrait.addEventListener("click", pulseFromPortrait);
  setTimeout(pulseFromPortrait, 650);
}

/* ---------- Cards ---------- */

function initCards() {
  const cards = $$("[data-card]");
  cards.forEach((card) =>
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    })
  );
  if (!motionOK()) return;

  if (finePointer.matches) {
    cards.forEach((card) => {
      card.addEventListener("pointerenter", () => card.classList.add("is-live"));
      card.addEventListener("pointerleave", () => card.classList.remove("is-live"));
      card.addEventListener("focusin", () => card.classList.add("is-live"));
      card.addEventListener("focusout", () => card.classList.remove("is-live"));
    });
  }

  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const { target: card, isIntersecting } of entries) {
        if (!finePointer.matches) {
          card.classList.toggle("is-live", isIntersecting);
          continue;
        }
        // On desktop, play each illustration once as it scrolls in; hover replays it.
        if (!isIntersecting) continue;
        io.unobserve(card);
        card.classList.add("is-live");
        setTimeout(() => {
          if (!card.matches(":hover, :focus-within")) card.classList.remove("is-live");
        }, 2600);
      }
    },
    { threshold: 0.6 }
  );
  cards.forEach((card) => io.observe(card));
}

function initMagnetic() {
  if (!finePointer.matches || !motionOK()) return;
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

function initCounters() {
  const els = $$("[data-count]");
  if (!els.length || !motionOK() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const el = entry.target;
        const to = Number(el.dataset.count);
        const t0 = performance.now();
        const step = (now) => {
          const p = Math.min(1, (now - t0) / 1300);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 1 }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Experience timeline ---------- */

function initTimeline() {
  const host = $("[data-timeline]");
  const roleEls = $$("[data-roles-list] [data-role]");
  if (!host || !roleEls.length) return;

  const items = roleEls
    .map((el) => ({
      el,
      key: el.dataset.role,
      label: el.dataset.label,
      start: parseYM(el.dataset.start),
      end: el.dataset.end ? parseYM(el.dataset.end) : null,
    }))
    .sort((a, b) => a.start - b.start);

  const min = items[0].start;
  const max = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);
  const total = monthsBetween(min, max);
  const pct = (d) => (monthsBetween(min, d) / total) * 100;

  const track = document.createElement("div");
  track.className = "timeline__track";
  const axis = document.createElement("div");
  axis.className = "timeline__axis";
  axis.setAttribute("aria-hidden", "true");
  const caption = document.createElement("p");
  caption.className = "timeline__caption";
  caption.setAttribute("aria-live", "polite");

  const careerMonths = monthsBetween(parseYM(CAREER_START), thisMonth);
  const defaultCaption = `In industry since Nov 2018 · ${formatTenure(careerMonths)} and counting`;
  caption.textContent = defaultCaption;

  const segments = [];
  for (const it of items) {
    const isEdu = it.key === "edu";
    const end = it.end || max;
    const months = isEdu ? monthsBetween(it.start, it.end) : monthsBetween(it.start, it.end || thisMonth) + 1;
    const range = `${monthLabel(it.start)} – ${it.end ? monthLabel(it.end) : "Present"}`;
    const text = `${it.label} · ${range} · ${isEdu ? "B.Tech, Computer Science" : formatTenure(months)}`;

    const seg = document.createElement("button");
    seg.type = "button";
    seg.className = `timeline__seg timeline__seg--${it.key}`;
    seg.textContent = it.label;
    seg.style.left = `${pct(it.start)}%`;
    seg.style.width = `calc(${pct(end) - pct(it.start)}% - 3px)`;
    seg.setAttribute("aria-label", `${it.label}, ${range}. Show details.`);

    const highlight = (on, fromRole = false) => {
      host.classList.toggle("has-hl", on);
      seg.classList.toggle("is-hl", on);
      if (!fromRole) it.el.classList.toggle("is-hl", on);
      caption.textContent = on ? text : defaultCaption;
    };
    seg.addEventListener("pointerenter", () => highlight(true));
    seg.addEventListener("pointerleave", () => highlight(false));
    seg.addEventListener("focus", () => highlight(true));
    seg.addEventListener("blur", () => highlight(false));
    seg.addEventListener("click", () => {
      if (it.el.tagName === "DETAILS") it.el.open = true;
      it.el.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "center" });
    });
    it.el.addEventListener("pointerenter", () => highlight(true, true));
    it.el.addEventListener("pointerleave", () => highlight(false, true));

    track.append(seg);
    segments.push(seg);
  }

  const now = document.createElement("span");
  now.className = "timeline__now";
  now.title = "Today";
  track.append(now);

  const firstYear = min.getFullYear() + 1;
  const lastYear = max.getFullYear();
  for (let y = firstYear; y <= lastYear; y++) {
    if ((y - firstYear) % 2) continue;
    const at = pct(new Date(y, 0, 1));
    if (at < 2 || at > 98) continue;
    const tick = document.createElement("span");
    tick.className = "timeline__tick";
    tick.style.left = `${at}%`;
    tick.textContent = String(y);
    axis.append(tick);
  }

  host.append(track, axis, caption);

  const fit = () => segments.forEach((s) => s.classList.toggle("is-tight", s.scrollWidth > s.clientWidth + 1 || s.clientWidth < 40));
  fit();
  document.fonts?.ready.then(fit);
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe(track);
}

/* ---------- Toolbox ---------- */

function initToolbox() {
  const toggle = $("[data-toolbox-toggle]");
  const code = $("[data-toolbox-json]");
  if (!toggle || !code) return;

  const deps = {};
  $$(".stack").forEach((stack) => {
    deps[stack.dataset.group] = $$("li", stack).map((li) => li.textContent.trim());
  });
  const pkg = {
    name: "ajmal-noushad",
    description: "Full-stack engineer shipping production LLM features",
    experience: formatTenure(monthsBetween(parseYM(CAREER_START), thisMonth)),
    repository: "github:ajmaln",
    dependencies: deps,
  };
  code.innerHTML = highlightJson(pkg, 64);

  const buttons = $$("[data-view]", toggle);
  const views = $$("[data-toolbox-view]");
  const show = (view) => {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    views.forEach((v) => (v.hidden = v.dataset.toolboxView !== view));
    storage.set("toolbox-view", view);
  };
  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
  toggle.hidden = false;
  const saved = storage.get("toolbox-view");
  if (saved === "json" || saved === "tags") show(saved);
}

/* ---------- Command palette ---------- */

function initPalette(agent) {
  const dialog = $("[data-palette]");
  const input = $("#palette-input");
  const list = $("#palette-list");
  const triggers = $$("[data-palette-open]");
  if (!dialog || typeof dialog.showModal !== "function") {
    triggers.forEach((t) => (t.hidden = true));
    $$("[data-hint]").forEach((h) => (h.hidden = true));
    return;
  }

  const scrollToId = (id) => () => {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto" });
    try { history.replaceState(null, "", id === "top" ? location.pathname : `#${id}`); } catch { /* sandboxed */ }
  };
  const openUrl = (url) => () => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = CV_URL;
    a.download = "Ajmal_Noushad_CV.pdf";
    a.click();
  };

  const commands = [
    { group: "Jump to", label: "Ask my agent", hint: "~/ask", icon: "i-terminal", keys: "chat question ai terminal", run: scrollToId("ask") },
    { group: "Jump to", label: "Selected work", hint: "~/work", icon: "i-hash", keys: "projects akai neeto portfolio", run: scrollToId("work") },
    { group: "Jump to", label: "Experience", hint: "~/experience", icon: "i-hash", keys: "career timeline jobs deel bigbinary tcs education", run: scrollToId("experience") },
    { group: "Jump to", label: "Toolbox", hint: "~/toolbox", icon: "i-hash", keys: "skills stack tech", run: scrollToId("toolbox") },
    { group: "Jump to", label: "Contact", hint: "~/contact", icon: "i-hash", keys: "email hire reach", run: scrollToId("contact") },
    { group: "Actions", label: "Copy email address", hint: EMAIL, icon: "i-copy", keys: "mail contact", run: () => copyEmail() },
    { group: "Actions", label: "Download resume", hint: "PDF", icon: "i-download", keys: "cv pdf", run: download },
    { group: "Actions", label: "Toggle dark mode", hint: "theme", icon: "i-moon", keys: "dark light theme", run: () => toggleTheme() },
    { group: "Links", label: "GitHub", hint: "@ajmaln", icon: "i-github", keys: "code repos", run: openUrl("https://github.com/ajmaln") },
    { group: "Links", label: "LinkedIn", hint: "in/ajmaln", icon: "i-linkedin", keys: "profile", run: openUrl("https://www.linkedin.com/in/ajmaln") },
    { group: "Links", label: "Akai", hint: "akai.run", icon: "i-arrow-up-right", keys: "deel ai agents", run: openUrl("https://akai.run") },
  ];

  let shown = [];
  let selected = 0;

  const svgIcon = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function render() {
    const q = input.value.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    shown = commands.filter((c) => {
      const hay = `${c.label} ${c.hint} ${c.keys} ${c.group}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    if (q) {
      shown.push({
        group: "Ask",
        label: `Ask the agent: “${input.value.trim()}”`,
        hint: "↵",
        icon: "i-terminal",
        run: () => {
          const question = input.value.trim();
          scrollToId("ask")();
          setTimeout(() => agent.ask(question, { focus: true }), motionOK() ? 450 : 0);
        },
      });
    }
    selected = Math.min(selected, Math.max(shown.length - 1, 0));

    let html = "";
    let group = "";
    shown.forEach((c, i) => {
      if (c.group !== group) {
        group = c.group;
        html += `<li class="palette__group" role="presentation">${esc(group)}</li>`;
      }
      html += `<li class="palette__item" role="option" id="cmd-${i}" data-index="${i}" aria-selected="${i === selected}">${svgIcon(c.icon)}<span class="palette__label">${esc(c.label)}</span><span class="palette__hint">${esc(c.hint)}</span></li>`;
    });
    list.innerHTML = html || `<li class="palette__empty" role="presentation">Nothing matches. Try “work” or “email”.</li>`;
    input.setAttribute("aria-activedescendant", shown.length ? `cmd-${selected}` : "");
  }

  function select(i) {
    if (!shown.length) return;
    selected = (i + shown.length) % shown.length;
    $$(".palette__item", list).forEach((item) => item.setAttribute("aria-selected", String(Number(item.dataset.index) === selected)));
    input.setAttribute("aria-activedescendant", `cmd-${selected}`);
    $(`#cmd-${selected}`, list)?.scrollIntoView({ block: "nearest" });
  }

  function runSelected(i = selected) {
    const cmd = shown[i];
    if (!cmd) return;
    dialog.close();
    cmd.run();
  }

  function open() {
    if (dialog.open) return;
    input.value = "";
    selected = 0;
    render();
    dialog.showModal();
    input.focus();
  }

  input.addEventListener("input", () => {
    selected = 0;
    render();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      select(selected + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      select(selected - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runSelected();
    }
  });
  list.addEventListener("pointermove", (e) => {
    const item = e.target.closest(".palette__item");
    if (item && Number(item.dataset.index) !== selected) select(Number(item.dataset.index));
  });
  list.addEventListener("click", (e) => {
    const item = e.target.closest(".palette__item");
    if (item) runSelected(Number(item.dataset.index));
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  triggers.forEach((t) => t.addEventListener("click", open));
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      dialog.open ? dialog.close() : open();
      return;
    }
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if (e.key === "/" && !typing && !dialog.open) {
      e.preventDefault();
      open();
    }
  });
}

/* ---------- Contact clock ---------- */

function initClock() {
  const el = $("[data-clock]");
  if (!el) return;
  const tick = () => {
    const h = Number(istHour.format(new Date())) % 24;
    const mood = h < 7 ? "probably asleep" : h < 10 ? "morning coffee" : h < 19 ? "probably coding" : h < 23 ? "winding down" : "probably asleep";
    el.textContent = `${istTime()} IST, ${mood}`;
  };
  tick();
  setInterval(tick, 30000);
}

/* ---------- Boot ---------- */

function initKeyHints() {
  $$("[data-kbd-mod]").forEach((k) => (k.textContent = MOD_KEY));
  if (!finePointer.matches) $$("[data-hint]").forEach((h) => (h.hidden = true));
}

initDates();
initTheme();
initKeyHints();
initCopy();
initNav();
initReveal();
initRoles();
initPortrait(initDots());
initCards();
initMagnetic();
initCounters();
initTimeline();
initToolbox();
initClock();

const agent = initAgent({
  toast,
  copyText,
  setTheme,
  getTheme,
  istTime,
  cvUrl: CV_URL,
  modKey: MOD_KEY,
  years: () => yearsSince(CAREER_START),
});
initPalette(agent);

console.log(
  "%cHey, curious one 👋%c\nThis site is plain HTML, CSS and vanilla JS. Source: https://github.com/ajmaln/ajmaln.github.io\nSay hi: " + EMAIL,
  "font: 700 15px/1.6 system-ui; color: #2b7444",
  "font: 13px/1.6 ui-monospace, monospace"
);
