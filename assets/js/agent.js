// A tiny scripted "agent" that answers questions from the CV.
// No network calls: intents are matched by keyword, then the UI plays out a
// tool call, a structured result and a streamed answer, the same shape as a
// real LLM agent UI.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const EMAIL = "ajmalnshd@gmail.com";
const STORE_URL = "https://chromewebstore.google.com/detail/neetorecord-screen-webcam/ljmncfcjgfjogaelciimcgnogdbpbkoh";

const DEFAULT_CHIPS = [
  "What are you working on now?",
  "Tell me about NeetoForm",
  "What's your AI experience?",
  "What's your stack?",
  "How do I contact you?",
];

const SKILLS = {
  ai: ["Vercel AI SDK", "Anthropic SDK", "Tool calling & agents", "Structured outputs", "Prompt chaining", "Streaming UX"],
  languages: ["TypeScript", "JavaScript (ES6)", "Ruby", "HTML", "CSS"],
  frameworks: ["React", "Next.js", "Ruby on Rails", "Node.js", "Express", "PostgreSQL", "Redis", "AWS Lambda"],
  tooling: ["React Query", "Redux", "Zustand", "Tailwind CSS", "Webpack", "Rollup", "Jest", "React Testing Library", "Storybook", "GitHub Actions", "CircleCI"],
};

const SECTIONS = { about: "top", home: "top", top: "top", ask: "ask", work: "work", projects: "work", experience: "experience", career: "experience", toolbox: "toolbox", skills: "toolbox", contact: "contact" };

const INTENTS = [
  {
    id: "neetoform",
    weight: 2,
    keys: ["neetoform", "form builder", "forms", "bundle", "tree shaking", "ssr", "performance"],
    tool: ["get_project", { name: "NeetoForm" }],
    result: {
      name: "NeetoForm",
      company: "BigBinary",
      scope: "UI revamp + form builder architecture",
      team_managed: 2,
      impact: { end_user_bundle: "-80%", client_api_calls_on_load: 0 },
      techniques: ["tree shaking", "server-side rendering"],
    },
    answer:
      "I owned the **NeetoForm** UI revamp at BigBinary. I architected the form builder and managed a team of 2.\n\n" +
      "The biggest win was performance: tree shaking and server-side rendering cut the end-user bundle by **80%** and removed every client API call on load.",
    chips: ["What about NeetoRecord?", "Did you lead a team?", "What's your stack?"],
  },
  {
    id: "neetorecord",
    weight: 2,
    keys: ["neetorecord", "chrome", "extension", "recorder", "recording", "video", "trimming", "zoom"],
    tool: ["get_project", { name: "NeetoRecord Chrome Extension" }],
    result: {
      name: "NeetoRecord Chrome Extension",
      company: "BigBinary",
      recognition: "Featured on the Chrome Web Store",
      built: ["extension", "zoom-in animations", "video trimming"],
    },
    answer:
      "I created the **NeetoRecord Chrome extension**, a screen and webcam recorder that was featured on the Chrome Web Store. " +
      `I also built its zoom-in animations and video trimming. You can [find it on the Chrome Web Store](${STORE_URL}).`,
    chips: ["Tell me about NeetoWireframe", "Tell me about NeetoUI", "How do I contact you?"],
  },
  {
    id: "wireframe",
    weight: 2,
    keys: ["neetowireframe", "wireframe", "wireframing", "prd", "prds", "react query"],
    tool: ["get_project", { name: "NeetoWireframe" }],
    result: {
      name: "NeetoWireframe",
      company: "BigBinary",
      built_from: "scratch",
      outcome: "Better PRD quality across Neeto",
      related: "Migrated multiple products to React Query",
    },
    answer:
      "**NeetoWireframe** is a wireframing tool I built from scratch. It improved the quality of PRDs across Neeto.\n\n" +
      "Around the same time I migrated several Neeto products to **React Query**.",
    chips: ["Tell me about NeetoUI", "Tell me about NeetoForm", "What are you working on now?"],
  },
  {
    id: "neetoui",
    weight: 2,
    keys: ["neetoui", "neetocist", "neeto-cist", "component library", "components", "design system", "storybook", "open source", "opensource", "oss", "unit tests", "testing", "tests", "library"],
    tool: ["get_project", { name: ["NeetoUI", "NeetoCist"] }],
    result: [
      { name: "NeetoUI", type: "React component library", docs: "Storybook", impact: { stability: "+70% from unit tests" } },
      { name: "NeetoCist", type: "Open-source utility library", impact: { loc_removed_per_repo: 300 } },
    ],
    answer:
      "I developed and maintained **NeetoUI**, the shared component library behind the Neeto products, with Storybook docs. Adding unit tests improved its stability by **70%**.\n\n" +
      "I also maintained **NeetoCist**, an open-source utility library that removed about **300 lines** of code from each product repo.",
    chips: ["Tell me about NeetoForm", "Any security experience?", "What's your stack?"],
  },
  {
    id: "ai",
    weight: 1.5,
    keys: ["ai experience", "ai", "llm", "llms", "agent", "agents", "structured output", "structured", "tool calling", "tools", "prompt", "prompts", "chaining", "streaming", "vercel", "anthropic", "sdk", "model", "models", "genai", "gpt", "claude", "openai", "migration"],
    tool: ["search_cv", { query: "llm" }],
    result: {
      role: "Software Engineer, Deel AI",
      product: "Akai",
      work: ["structured output pipelines", "Anthropic SDK -> Vercel AI SDK migration", "streaming response UI", "prompt-chaining workflow UI", "CLI tools for tool calling"],
      skills: SKILLS.ai,
    },
    answer:
      "Most of my recent work is applied LLM engineering at Deel:\n" +
      "- **Structured outputs**: pipelines that turn LLM responses into schema-validated data downstream features can rely on.\n" +
      "- **Provider-agnostic models**: I led the migration from the Anthropic SDK to the Vercel AI SDK, so swapping and testing models is simple.\n" +
      "- **Streaming UX**: streaming response UI, plus a visual prompt-chaining builder that non-technical teams use to compose multi-step pipelines.\n" +
      "- **Agent tooling**: CLI tools that LLMs call through tool calling to work with internal systems.",
    chips: ["What is Akai?", "Tell me about NeetoForm", "How do I contact you?"],
  },
  {
    id: "now",
    weight: 1.5,
    keys: ["deel", "akai", "working on", "right now", "currently", "current", "now", "today", "present", "these days"],
    tool: ["get_experience", { company: "Deel" }],
    result: {
      company: "Deel",
      role: "Software Engineer",
      team: "Deel AI",
      product: "Akai",
      since: "2025-07",
      remote: true,
      used_by: ["client onboarding", "legal", "HR"],
    },
    answer:
      "I'm a software engineer on the Deel AI team at **Deel**, and a core engineer on **Akai** ([akai.run](https://akai.run)), a platform for building and deploying AI agents at scale. Teams across Deel use it, including client onboarding, legal and HR.\n\n" +
      "Day to day that means structured output pipelines, streaming and prompt-chaining interfaces, and CLI tools that agents call to reach internal systems.",
    chips: ["What's your AI experience?", "What did you do before Deel?", "What's your stack?"],
  },
  {
    id: "bigbinary",
    weight: 1.5,
    keys: ["bigbinary", "big binary", "neeto", "before deel", "previous job", "last job"],
    tool: ["get_experience", { company: "BigBinary" }],
    result: {
      company: "BigBinary",
      role: "Software Engineer",
      period: "2021-08 / 2025-07",
      remote: true,
      stack: ["React", "Ruby on Rails"],
      products: ["NeetoRecord", "NeetoForm", "NeetoWireframe", "NeetoUI", "NeetoCist"],
    },
    answer:
      "From Aug 2021 to Jul 2025 I worked full-stack at **BigBinary** on the **Neeto** suite: React frontends on Ruby on Rails APIs, including endpoints, models and migrations.\n\n" +
      "Highlights:\n" +
      "- The NeetoRecord Chrome extension, featured on the Chrome Web Store\n" +
      "- The NeetoForm UI revamp, with an 80% smaller bundle\n" +
      "- NeetoWireframe, built from scratch\n" +
      "- NeetoUI and NeetoCist, the shared component and utility libraries",
    chips: ["Tell me about NeetoForm", "What about NeetoRecord?", "And before BigBinary?"],
  },
  {
    id: "tcs",
    weight: 1.5,
    keys: ["tcs", "tata", "security", "cyber", "qradar", "siem", "crowdstrike", "malware", "soc", "recharts", "chennai", "analyst", "first job", "before bigbinary"],
    tool: ["get_experience", { company: "TCS" }],
    result: {
      company: "TCS",
      role: "Cyber Security Analyst / Software Engineer",
      period: "2018-11 / 2021-08",
      location: "Chennai, India",
      impact: {
        non_reporting_devices: { before: "20%", after: "5%" },
        malware_response_time: { before: "5 min", after: "< 30 s" },
      },
    },
    answer:
      "I started at **TCS** in Chennai, from Nov 2018 to Aug 2021, as a cyber security analyst and software engineer.\n" +
      "- Built a React and Recharts dashboard on IBM QRadar SIEM that brought non-reporting devices down from **20% to 5%**.\n" +
      "- Automated malware-alert response with CrowdStrike network isolation, cutting first response from **5 minutes to under 30 seconds**.",
    chips: ["What did you do at BigBinary?", "What are you working on now?", "Where did you study?"],
  },
  {
    id: "rails",
    weight: 1.5,
    keys: ["rails", "ruby", "backend", "back-end", "api", "apis"],
    tool: ["search_cv", { query: "rails" }],
    result: { skill: "Ruby on Rails", where: "BigBinary (2021-2025)", work: ["API endpoints", "models", "migrations"] },
    answer:
      "Yes. Rails was half of my stack at BigBinary: I worked across the Neeto suite with React frontends on **Ruby on Rails** APIs, writing endpoints, models and migrations alongside the frontend.",
    chips: ["What's your stack?", "Tell me about NeetoForm", "How do I contact you?"],
  },
  {
    id: "react",
    weight: 1.5,
    keys: ["react", "frontend", "front-end", "next", "nextjs", "javascript", "typescript", "ui"],
    tool: ["search_cv", { query: "react" }],
    result: { skill: "React", where: ["TCS: QRadar dashboard", "BigBinary: Neeto frontends, NeetoUI"], related: ["Next.js", "React Query", "Redux", "Zustand", "Storybook"] },
    answer:
      "React has been part of every role. At TCS I built a React and Recharts dashboard on IBM QRadar, and at BigBinary I owned Neeto frontends and maintained **NeetoUI**, the shared component library.\n\n" +
      "Around it I use TypeScript, Next.js, React Query, Redux, Zustand and Storybook.",
    chips: ["Tell me about NeetoUI", "What's your stack?", "How do I contact you?"],
  },
  {
    id: "skills",
    weight: 1,
    keys: ["skill", "skills", "stack", "tech", "technologies", "technology", "languages", "frameworks", "tooling", "toolbox", "know"],
    tool: ["get_skills", { group: "all" }],
    result: SKILLS,
    answer:
      "Here's my toolbox:\n" +
      "- **AI/LLM**: Vercel AI SDK, Anthropic SDK, tool calling and agents, structured outputs, prompt chaining, streaming UX\n" +
      "- **Languages**: TypeScript, JavaScript, Ruby, HTML, CSS\n" +
      "- **Frameworks**: React, Next.js, Ruby on Rails, Node.js, Express, PostgreSQL, Redis, AWS Lambda\n" +
      "- **Tooling**: React Query, Redux, Zustand, Tailwind CSS, Webpack, Rollup, Jest, React Testing Library, Storybook, GitHub Actions, CircleCI",
    chips: ["Do you know Rails?", "What's your AI experience?", "How do I contact you?"],
  },
  {
    id: "leadership",
    weight: 1.5,
    keys: ["lead", "leader", "leadership", "led", "team", "manage", "managed", "management", "mentor"],
    tool: ["search_cv", { query: "lead" }],
    result: [
      { company: "BigBinary", project: "NeetoForm UI revamp", role: "Owner", team_managed: 2 },
      { company: "Deel", project: "Anthropic SDK -> Vercel AI SDK", role: "Led migration" },
    ],
    answer:
      "Yes. At BigBinary I owned the **NeetoForm** UI revamp, architected the form builder and managed a team of 2. At Deel I led the migration from the Anthropic SDK to the Vercel AI SDK.",
    chips: ["Tell me about NeetoForm", "What's your AI experience?", "How do I contact you?"],
  },
  {
    id: "education",
    weight: 1.5,
    keys: ["education", "college", "university", "degree", "btech", "b.tech", "study", "studied", "graduate", "graduated", "school"],
    tool: ["get_education", {}],
    result: { degree: "B.Tech, Computer Science and Engineering", institution: "University College of Engineering, Thiruvananthapuram", period: "2014-06 / 2018-06" },
    answer: "I have a **B.Tech in Computer Science and Engineering** from University College of Engineering, Thiruvananthapuram (2014 to 2018).",
    chips: ["What was your first job?", "What's your stack?", "How do I contact you?"],
  },
  {
    id: "contact",
    weight: 1.5,
    keys: ["contact", "email", "mail", "hire", "hiring", "reach", "available", "availability", "linkedin", "github", "talk", "connect", "opportunity", "open to work", "resume", "cv", "interview"],
    tool: ["get_contact", {}],
    result: { email: EMAIL, github: "github.com/ajmaln", linkedin: "linkedin.com/in/ajmaln", resume: "assets/Ajmal_Noushad_CV.pdf" },
    answer:
      `Email is best: **${EMAIL}**. You can also find me on [GitHub](https://github.com/ajmaln) and [LinkedIn](https://www.linkedin.com/in/ajmaln), or grab my [resume](assets/Ajmal_Noushad_CV.pdf).`,
    chips: [{ label: "Copy email", action: "copy" }, "Where are you based?", "What are you working on now?"],
  },
  {
    id: "location",
    weight: 1.5,
    keys: ["where", "location", "based", "remote", "india", "timezone", "time zone", "live", "relocate"],
    tool: ["get_contact", { field: "location" }],
    result: () => ({ work_mode: "Remote", country: "India", timezone: "IST (UTC+05:30)" }),
    answer: (ctx) => `I work remotely from India, on IST (UTC+5:30). It's **${ctx.istTime()}** for me right now.`,
    chips: ["How do I contact you?", "What are you working on now?", "What's your stack?"],
  },
  {
    id: "experience",
    weight: 1,
    keys: ["experience", "years", "career", "background", "about", "yourself", "summary", "who are you", "introduce"],
    tool: ["get_summary", {}],
    result: (ctx) => ({
      name: "Ajmal Noushad",
      title: "Full-stack engineer",
      years_experience: `${ctx.years()}+`,
      companies: ["TCS", "BigBinary", "Deel"],
      focus: ["React", "Node", "Rails", "LLM features"],
    }),
    answer: (ctx) =>
      `I'm a full-stack engineer with **${ctx.years()}+ years** of experience across React, Node and Rails. ` +
      "I started in security engineering at TCS, spent four years building the Neeto suite at BigBinary, and now ship production LLM features at Deel: agent tooling, structured outputs and streaming AI UX.",
    chips: ["What are you working on now?", "What's your stack?", "How do I contact you?"],
  },
  {
    id: "greeting",
    weight: 1,
    keys: ["hi", "hello", "hey", "yo", "hola", "namaste", "sup"],
    tool: null,
    answer: "Hi! Ask me about my work at Deel, the Neeto products I built, my stack, or how to reach me. Type `help` to see commands.",
    chips: DEFAULT_CHIPS,
  },
  {
    id: "thanks",
    weight: 1,
    keys: ["thanks", "thank", "thx", "cool", "nice", "great", "awesome"],
    tool: null,
    answer: `Glad it helped! If you'd like to keep talking, I'm at **${EMAIL}**.`,
    chips: [{ label: "Copy email", action: "copy" }, "What's your stack?"],
  },
];

const FALLBACK = {
  id: "fallback",
  tool: ["search_cv", null],
  miss: true,
  answer:
    "That isn't in my CV, so I'd rather not guess. Try asking about my work at Deel, NeetoForm, my stack, or how to reach me. " +
    `You can also email me at **${EMAIL}**.`,
  chips: DEFAULT_CHIPS,
};

/* ---------- Helpers ---------- */

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// JSON.stringify with two-space indents, except that arrays of plain values
// are packed onto as few lines as fit within `wrap` characters.
function formatJson(value, wrap, indent = "") {
  const isPlain = (v) => v === null || typeof v !== "object";
  if (Array.isArray(value) && value.every(isPlain)) {
    const lines = [];
    let line = "";
    for (const item of value.map((v) => JSON.stringify(v))) {
      const next = line ? `${line}, ${item}` : item;
      if (line && next.length > wrap) {
        lines.push(`${line},`);
        line = item;
      } else {
        line = next;
      }
    }
    lines.push(line);
    return `[${lines.join(`\n${indent} `)}]`;
  }
  if (value && typeof value === "object") {
    const isArray = Array.isArray(value);
    const entries = isArray ? value.map((v) => [null, v]) : Object.entries(value);
    if (!entries.length) return isArray ? "[]" : "{}";
    const inner = `${indent}  `;
    const body = entries.map(([key, v]) => {
      const prefix = key === null ? "" : `${JSON.stringify(key)}: `;
      const childIndent = Array.isArray(v) && v.every(isPlain) ? inner + " ".repeat(prefix.length) : inner;
      return inner + prefix + formatJson(v, wrap, childIndent);
    });
    return `${isArray ? "[" : "{"}\n${body.join(",\n")}\n${indent}${isArray ? "]" : "}"}`;
  }
  return JSON.stringify(value);
}

export function highlightJson(value, wrap = 56) {
  const json = formatJson(value, wrap);
  return json.replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?\b|[<>&]/g, (m, str, colon, kw) => {
    if (str) return `<span class="${colon ? "j-k" : "j-s"}">${escapeHtml(str)}</span>${colon || ""}`;
    if (kw) return `<span class="j-b">${m}</span>`;
    if (m === "<" || m === ">" || m === "&") return escapeHtml(m);
    return `<span class="j-n">${m}</span>`;
  });
}

function formatArgs(args) {
  if (!args || !Object.keys(args).length) return "()";
  const body = Object.entries(args).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
  return `({ ${body} })`;
}

function parseInline(text) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: "text", text: text.slice(last, m.index) });
    if (m[1]) out.push({ t: "b", text: m[1] });
    else if (m[2]) out.push({ t: "code", text: m[2] });
    else out.push({ t: "a", text: m[3], href: m[4] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: "text", text: text.slice(last) });
  return out;
}

function parseBlocks(md) {
  const blocks = [];
  for (const chunk of md.trim().split(/\n{2,}/)) {
    const lines = chunk.split("\n");
    const para = lines.filter((l) => !l.startsWith("- "));
    const items = lines.filter((l) => l.startsWith("- "));
    if (para.length) blocks.push({ type: "p", inline: parseInline(para.join(" ")) });
    if (items.length) blocks.push({ type: "ul", items: items.map((l) => parseInline(l.slice(2))) });
  }
  return blocks;
}

function normalise(q) {
  return q.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+#.\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function matchIntent(q) {
  const text = ` ${normalise(q)} `;
  const words = text.trim().split(" ");
  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const key of intent.keys) {
      if (key.includes(" ")) {
        if (text.includes(` ${key} `) || text.includes(` ${key}`)) score += 3;
      } else if (words.some((w) => w === key || (key.length >= 4 && w.startsWith(key)))) {
        score += key.length >= 4 ? 2 : 1;
      }
    }
    score *= intent.weight || 1;
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best || FALLBACK;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function icon(id, className = "icon") {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);
  return svg;
}

/* ---------- Agent UI ---------- */

export function initAgent(ctx) {
  const root = document.querySelector("[data-agent]");
  if (!root) return { ask() {} };

  const log = root.querySelector("[data-agent-log]");
  const form = root.querySelector("[data-agent-form]");
  const input = form.querySelector("input");
  const send = form.querySelector("button");
  const chipsBox = root.querySelector("[data-agent-chips]");
  const clearBtn = root.querySelector("[data-agent-clear]");

  input.disabled = false;
  send.disabled = false;

  const history = [];
  let historyIndex = -1;
  let current = null;
  let stick = true;

  log.addEventListener("scroll", () => {
    stick = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  });
  const scrollDown = () => {
    if (stick) log.scrollTop = log.scrollHeight;
  };
  const pause = (run, ms) => (run.fast ? Promise.resolve() : sleep(ms));

  log.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tool-toggle]");
    if (!btn || btn.disabled) return;
    const out = btn.nextElementSibling;
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    out.hidden = open;
  });

  chipsBox.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip-btn");
    if (!chip) return;
    if (chip.dataset.action === "copy") {
      copyEmail();
      return;
    }
    ask(chip.dataset.q || chip.textContent.trim());
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      input.value = history[historyIndex];
    } else if (e.key === "ArrowDown" && historyIndex >= 0) {
      e.preventDefault();
      historyIndex -= 1;
      input.value = historyIndex >= 0 ? history[historyIndex] : "";
    } else if (e.key === "Escape" && current) {
      current.fast = true;
    }
  });

  clearBtn.addEventListener("click", () => {
    if (current) current.fast = true;
    clear();
    input.focus();
  });

  async function copyEmail() {
    const ok = await ctx.copyText(EMAIL);
    ctx.toast(ok ? "Email copied to clipboard" : `Couldn't copy. The address is ${EMAIL}`);
  }

  function setChips(items) {
    chipsBox.replaceChildren(
      ...items.map((item) => {
        const label = typeof item === "string" ? item : item.label;
        const chip = el("button", "chip-btn", label);
        chip.type = "button";
        if (typeof item === "object" && item.action) chip.dataset.action = item.action;
        return chip;
      })
    );
  }

  function clear() {
    log.replaceChildren(el("div", "msg msg--sys", "Cleared. Ask me anything, or type help."));
    setChips(DEFAULT_CHIPS);
  }

  function addUser(text) {
    const msg = el("div", "msg msg--user");
    const prompt = el("span", "msg__prompt", "❯");
    prompt.setAttribute("aria-hidden", "true");
    msg.append(prompt, document.createTextNode(` ${text}`));
    log.append(msg);
    scrollDown();
  }

  function addSys(content, className = "msg msg--sys") {
    const msg = el("div", className);
    if (typeof content === "string") msg.textContent = content;
    else msg.append(...[].concat(content));
    log.append(msg);
    scrollDown();
    return msg;
  }

  function addTool(name, args) {
    const wrap = el("div", "msg msg--tool");
    const btn = el("button", "tool");
    btn.type = "button";
    btn.disabled = true;
    btn.dataset.toolToggle = "";
    btn.setAttribute("aria-expanded", "false");
    const status = el("span", "tool__status");
    status.setAttribute("aria-hidden", "true");
    status.append(icon("i-check"));
    const call = el("span", "tool__call");
    call.append(el("span", "tool__name", name), el("span", "tool__args", formatArgs(args)));
    const meta = el("span", "tool__meta", "running…");
    btn.append(status, call, meta, icon("i-chevron", "icon tool__chev"));
    const out = el("pre", "tool__out");
    out.hidden = true;
    wrap.append(btn, out);
    log.append(wrap);
    scrollDown();
    return { btn, status, meta, out };
  }

  function finishTool(tool, result, miss) {
    tool.status.classList.add(miss ? "is-miss" : "is-done");
    const count = Array.isArray(result) ? result.length : miss ? 0 : 1;
    tool.meta.textContent = miss ? "0 matches" : `${count} record${count === 1 ? "" : "s"}`;
    tool.out.innerHTML = `<code>${highlightJson(result)}</code>`;
    tool.btn.disabled = false;
  }

  async function streamInline(container, segments, run, caret) {
    container.append(caret);
    for (const seg of segments) {
      let target;
      if (seg.t === "text") {
        target = document.createTextNode("");
        container.insertBefore(target, caret);
      } else {
        const node = el(seg.t === "b" ? "strong" : seg.t === "code" ? "code" : "a");
        if (seg.t === "a") {
          node.href = seg.href;
          if (/^https?:/.test(seg.href)) {
            node.target = "_blank";
            node.rel = "noopener";
          } else if (/\.pdf$/.test(seg.href)) {
            node.setAttribute("download", "");
          }
        }
        container.insertBefore(node, caret);
        target = node.appendChild(document.createTextNode(""));
      }
      for (const token of seg.text.match(/\S+\s*|\s+/g) || []) {
        target.data += token;
        if (!run.fast) {
          scrollDown();
          await sleep(14 + Math.random() * 30);
        }
      }
    }
  }

  async function streamAnswer(md, run) {
    const msg = el("div", "msg msg--ai");
    const caret = el("span", "caret");
    caret.setAttribute("aria-hidden", "true");
    log.append(msg);
    for (const block of parseBlocks(md)) {
      if (block.type === "p") {
        const p = el("p");
        msg.append(p);
        await streamInline(p, block.inline, run, caret);
      } else {
        const ul = el("ul");
        msg.append(ul);
        for (const item of block.items) {
          const li = el("li");
          ul.append(li);
          await streamInline(li, item, run, caret);
        }
      }
    }
    caret.remove();
    scrollDown();
  }

  function goTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function openUrl(url) {
    const a = el("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  function downloadResume() {
    const a = el("a");
    a.href = ctx.cvUrl;
    a.download = "Ajmal_Noushad_CV.pdf";
    a.click();
  }

  // Returns true when the input was handled as a shell-style command.
  async function runCommand(raw, run) {
    const [cmd = "", ...rest] = raw.trim().split(/\s+/);
    const name = cmd.toLowerCase();
    const arg = rest.join(" ").toLowerCase();

    switch (name) {
      case "help":
      case "?":
      case "commands": {
        if (arg) return false;
        const pre = el("pre", "help");
        pre.textContent = [
          "Ask anything in plain English, or try a command:",
          "",
          "  ls                  list what's on this site",
          "  open <section>      jump to work, experience, toolbox or contact",
          "  open github         also: linkedin, resume",
          "  theme [dark|light]  switch the colour theme",
          "  whoami              who's asking?",
          "  clear               clear the conversation",
          "  sudo hire ajmal     you know you want to",
        ].join("\n");
        addSys(pre);
        setChips(DEFAULT_CHIPS);
        return true;
      }
      case "clear":
      case "cls":
        if (arg) return false;
        clear();
        return true;
      case "ls": {
        const pre = el("pre", "help");
        pre.textContent = "about.md   work/   experience/   toolbox.json   contact.txt   resume.pdf";
        addSys(pre);
        setChips(["open work", "open experience", "open resume"]);
        return true;
      }
      case "whoami":
        addSys("A curious visitor. I'm Ajmal: full-stack engineer, currently building AI agents at Deel.");
        return true;
      case "open":
      case "cd":
      case "cat": {
        const target = arg.replace(/^[~./]+/, "").replace(/[/.].*$/, "");
        if (SECTIONS[target]) {
          addSys(`Opening ~/${target === "top" || target === "home" || target === "about" ? "" : SECTIONS[target]}…`);
          await pause(run, 250);
          goTo(SECTIONS[target]);
          return true;
        }
        if (target === "github" || target === "linkedin") {
          addSys(`Opening ${target === "github" ? "GitHub" : "LinkedIn"} in a new tab…`);
          openUrl(target === "github" ? "https://github.com/ajmaln" : "https://www.linkedin.com/in/ajmaln");
          return true;
        }
        if (target === "resume" || target === "cv") {
          addSys("Downloading Ajmal_Noushad_CV.pdf…");
          downloadResume();
          return true;
        }
        return false;
      }
      case "resume":
      case "cv":
        if (arg) return false;
        addSys("Downloading Ajmal_Noushad_CV.pdf…");
        downloadResume();
        return true;
      case "theme": {
        const next = arg === "dark" || arg === "light" ? arg : ctx.getTheme() === "dark" ? "light" : "dark";
        ctx.setTheme(next);
        addSys(`Theme set to ${next}.`);
        return true;
      }
      case "date":
      case "time":
        if (arg) return false;
        addSys(`${ctx.istTime()} IST in India.`);
        return true;
      case "echo":
        addSys(raw.trim().slice(5) || " ");
        return true;
      case "sudo": {
        if (!/^hire\b/.test(arg)) {
          addSys("visitor is not in the sudoers file. This incident will be reported. (Try: sudo hire ajmal)");
          return true;
        }
        addSys("[sudo] password for visitor: ••••••••");
        await pause(run, 700);
        await streamAnswer(`Access granted. Let's talk: **${EMAIL}**`, run);
        setChips([{ label: "Copy email", action: "copy" }, "What are you working on now?"]);
        return true;
      }
      case "rm":
        addSys("Permission denied: this portfolio is read-only.", "msg msg--error");
        return true;
      case "exit":
      case "quit":
        if (arg) return false;
        addSys(`There's no exit. Scroll on, or press ${ctx.modKey} to jump anywhere.`);
        return true;
      default:
        return false;
    }
  }

  async function respond(q, run) {
    addUser(q);
    if (await runCommand(q, run)) return;

    const intent = matchIntent(q);
    const thinking = addSys("thinking…", "msg msg--sys thinking");
    await pause(run, 380 + Math.random() * 320);
    thinking.remove();

    if (intent.tool) {
      const [name, args] = intent.tool;
      const tool = addTool(name, args ?? { query: q.slice(0, 60) });
      await pause(run, 420 + Math.random() * 380);
      const result = intent.miss
        ? { query: q.slice(0, 60), matches: [], note: "No match in CV. Not guessing." }
        : typeof intent.result === "function"
          ? intent.result(ctx)
          : intent.result;
      finishTool(tool, result, intent.miss);
      await pause(run, 180);
    }

    const answer = typeof intent.answer === "function" ? intent.answer(ctx) : intent.answer;
    await streamAnswer(answer, run);
    setChips(intent.chips || DEFAULT_CHIPS);
  }

  async function ask(raw) {
    const q = String(raw).trim().slice(0, 200);
    if (!q) return;
    if (current) {
      current.fast = true;
      await current.done;
    }
    let finish;
    const run = { fast: reducedMotion(), done: new Promise((resolve) => (finish = resolve)) };
    current = run;
    history.unshift(q);
    historyIndex = -1;
    stick = true;
    log.setAttribute("aria-busy", "true");
    try {
      await respond(q, run);
    } catch (err) {
      addSys("Something went wrong rendering that answer. Try again?", "msg msg--error");
      console.error(err);
    } finally {
      log.setAttribute("aria-busy", "false");
      current = null;
      finish();
    }
  }

  return {
    ask(q, { focus = false } = {}) {
      if (focus) input.focus({ preventScroll: true });
      return ask(q);
    },
    focus() {
      input.focus({ preventScroll: true });
    },
  };
}
