/* reply.js (MIT): draws {"ui":[blocks]} from <script type="application/json" id="ui">, each
   outcome opening a card, in the host's theme variables. A bad block shows as plain text
   and logs console.error, so the card is never blank. */
(() => {
  // Quiet tints derived from the text color, so they show on any theme's surface.
  const mix = (v, p) => `color-mix(in oklch,var(--${v}) ${p}%,transparent)`;
  const LINE = mix("foreground", 9), FILL = mix("foreground", 7), CSS =
  ".ru{display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.5;color:var(--foreground)}.ru *{box-sizing:border-box}" +
  `.ru-card{display:flex;flex-direction:column;padding:16px 18px;background:var(--card);border:1px solid ${LINE};border-radius:calc(var(--radius) + 4px);box-shadow:0 1px 2px ${mix("foreground", 4)}}` +
  `.ru-card>*+*{margin-top:14px;padding-top:14px;border-top:1px solid ${mix("foreground", 6)}}.ru-card>.ru-out+*{border-top:0;padding-top:0}` +
  ".ru-k,.ru-m,.ru-note,.ru th,.ru-raw,.ru-pill,.ru-flow>.ru-i,.ru-bars>span:nth-child(3n+1){color:var(--muted-foreground)}.ru-k{font-size:12px;font-weight:500;margin-bottom:8px}" +
  ".ru-mono{font-family:var(--font-mono);font-size:12px}.ru-num,.ru td{font-variant-numeric:tabular-nums}" +
  ".ru-i{flex:none;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
  ".ru-tone{color:var(--tf);background:" + mix("t", 14) + "}" +
  ".ru-out{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;line-height:1.35}" +
  ".ru-badge{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-size:13px}" +
  ".ru-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}.ru-end{margin-left:auto}" +
  ".ru-big{font-size:24px;font-weight:600;letter-spacing:-.01em;line-height:1.2}" +
  ".ru-pill{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}" +
  `.ru-pill:not(.ru-tone){background:${FILL}}` +
  ".ru-bars{display:grid;grid-template-columns:minmax(0,7.5em) 1fr 4em;gap:8px 12px;align-items:center;margin-top:12px;font-size:12px}" +
  ".ru-bars>span:nth-child(3n+1){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ru-bars>span:nth-child(3n){text-align:right}" +
  `.ru-bar{height:6px;border-radius:3px;background:${FILL}}.ru-bar i{display:block;height:100%;min-width:3px;border-radius:3px;background:var(--accent)}` +
  ".ru a{color:inherit;text-decoration-color:" + LINE + ";text-underline-offset:2px}.ru-pr{font-weight:600}" +
  ".ru-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}" +
  `.ru-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 9px 2px 7px;border:1px solid ${LINE};border-radius:999px;font-size:12px}.ru-chip .ru-i{color:var(--success)}` +
  ".ru-note{margin-top:6px}" +
  ".ru-col{display:flex;flex-direction:column;gap:6px}" +
  `.ru-opt{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid ${LINE};border-radius:var(--radius)}` +
  `.ru-key{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:${FILL};font:600 12px/1 var(--font-mono)}` +
  ".ru-rec{border-color:" + mix("accent", 55) + ";background:" + mix("accent", 7) + "}.ru-rec .ru-key{background:var(--accent);color:var(--accent-foreground)}" +
  ".ru-rec .ru-pill{margin-left:auto;color:var(--accent);background:" + mix("accent", 12) + "}" +
  ".ru-table{margin-inline:-8px;overflow-x:auto}.ru table{border-collapse:collapse;width:100%}.ru th{text-align:left;font-size:12px;font-weight:500;padding:0 12px 8px 8px}" +
  `.ru td{padding:8px 12px 8px 8px;border-top:1px solid ${mix("foreground", 6)};vertical-align:top}` +
  ".ru-pick td{background:" + mix("accent", 8) + ";font-weight:600}.ru-pick td:first-child{border-radius:6px 0 0 6px}.ru-pick td:last-child{border-radius:0 6px 6px 0}" +
  ".ru-pick td:first-child .ru-i{color:var(--accent);margin-right:6px;vertical-align:-2px}" +
  ".ru-check{display:flex;align-items:baseline;gap:10px}.ru-check .ru-i{transform:translateY(2px)}" +
  ".ru-flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}.ru-flow>.ru-i{width:14px;height:14px}" +
  ".ru-end-state{font-weight:600;padding:2px 9px;border-radius:999px;background:" + mix("accent", 14) + "}" +
  `.ru-raw{margin:0;padding:10px 12px;border:1px dashed ${mix("foreground", 18)};border-radius:var(--radius);white-space:pre-wrap;word-break:break-word}`;

  // 16-unit stroke icons, drawn at one size and weight.
  const ICON = {
    check: "M3.5 8.5l3 3 6-7", x: "M4.5 4.5l7 7m0-7l-7 7", alert: "M8 3.5v5.5M8 12.5v.01", minus: "M4 8h8",
    wait: "M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11M8 5.5V8l1.75 1.25", arrow: "M3 8h10M9 4l4 4-4 4",
    down: "M8 3v10M4 9l4 4 4-4", up: "M8 13V3M4 7l4-4 4 4",
  };
  const STATUS = { done: ["check", "success"], risk: ["alert", "warning"], blocked: ["x", "destructive"], working: ["wait", "info"] };
  const CHECK = { fail: STATUS.blocked, warn: STATUS.risk, wait: STATUS.working, skip: ["minus", "muted"], pass: STATUS.done };
  const STATE = { draft: "muted", open: "info", fixing: "warning", blocked: "destructive", merged: "success", closed: "muted" };

  // Each block's fields as [required, test], mirroring catalog.schema.json.
  const str = (v) => typeof v == "string";
  const num = (v) => typeof v == "number";
  const int = (v) => Number.isInteger(v);
  const like = (re) => (v) => str(v) && re.test(v);
  const one = (set) => (v) => str(v) && Object.hasOwn(set, v);
  const list = (test, max) => (v) => Array.isArray(v) && v.length >= 1 && v.length <= max && v.every(test);
  const obj = (spec) => (o) => !fields(o, spec);
  const SPEC = {
    outcome: { status: [1, one(STATUS)], text: [1, str] },
    delta: { label: [1, str], now: [1, str], was: [1, str], bars: [0, list((b) => Array.isArray(b) && b.length == 2 && str(b[0]) && num(b[1]) && b[1] >= 0, 6)] },
    change: { pr: [1, int], state: [1, one(STATE)], title: [0, str], sha: [0, like(/^[0-9a-f]{7,40}$/)],
      checks: [0, (v) => Array.isArray(v) && v.every(str)], diff: [0, str], note: [0, str], url: [0, like(/^https:\/\//)] },
    decision: { question: [0, str], options: [1, list(obj({ key: [1, like(/^[a-z]$/)], text: [1, str], rec: [0, (v) => v === !!v] }), 6)] },
    table: { columns: [1, list(str, 6)], rows: [1, list(list((c) => str(c) || num(c), 6), 6)], pick: [0, int] },
    flow: { label: [0, str], steps: [1, list(str, 8)], mark: [0, int] },
  };
  const CHECKS = list(obj({ status: [1, one(CHECK)], text: [1, str] }), 12);

  function fields(o, spec) {
    if (!o || typeof o != "object" || Array.isArray(o)) return "not an object";
    for (const k in o) if (!Object.hasOwn(spec, k)) return "unknown field " + k;
    for (const k in spec) {
      if (o[k] === undefined) { if (spec[k][0]) return "missing " + k; }
      else if (!spec[k][1](o[k])) return "invalid " + k + ": " + JSON.stringify(o[k]);
    }
    return "";
  }
  const problem = (type, body) =>
    type == "checks" ? (CHECKS(body) ? "" : "needs a list of {status, text}")
    : Object.hasOwn(SPEC, type) ? fields(body, SPEC[type]) : "unknown block type";

  function h(tag, cls, kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const c of [].concat(kids)) if (c != null && c !== "") e.append(c);
    return e;
  }
  function icon(name) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 16 16");
    s.setAttribute("class", "ru-i");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = `<path d="${ICON[name]}"/>`;
    return s;
  }
  // Sets an element's tone: its color, and its tint where the class draws one.
  function tone(e, name) {
    const base = name == "muted" ? "muted-foreground" : name;
    e.style.setProperty("--t", `var(--${base})`);
    e.style.setProperty("--tf", `var(--${name == "muted" ? base : name + "-foreground"})`);
    e.style.color = "var(--tf)";
    return e;
  }
  const label = (text) => (text ? h("div", "ru-k", text) : null);
  // A positive number with optional thousands commas and a point decimal, then a unit with
  // no digits. Anything else, such as "0,15", "1 500", a range, or a negative, gets no
  // percent rather than a wrong one.
  const parse = (s) => /^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?![\d.,])\s*(\D*)$/.exec(s);
  function change(now, was) {
    const a = parse(now), b = parse(was), n = (m) => parseFloat(m[1].replace(/,/g, "") + (m[2] || ""));
    if (!a || !b || a[3] != b[3] || !n(b)) return null;
    const p = Math.round(((n(a) - n(b)) / n(b)) * 100);
    return h("span", "ru-pill ru-num", [p ? icon(p < 0 ? "down" : "up") : null, Math.abs(p) + "%"]);
  }

  const DRAW = {
    outcome(b) {
      const [glyph, name] = STATUS[b.status];
      return h("div", "ru-out", [tone(h("span", "ru-badge ru-tone", icon(glyph)), name), h("span", "", b.text)]);
    },
    delta(b) {
      const bars = b.bars || [], top = Math.max(0, ...bars.map((r) => r[1]));
      const cells = bars.flatMap(([name, value]) => {
        const bar = h("span", "ru-bar", h("i"));
        bar.firstChild.style.width = (top ? (value / top) * 100 : 0) + "%";
        return [h("span", "", name), bar, h("span", "ru-m ru-mono ru-num", String(value))];
      });
      return h("div", "", [label(b.label), h("div", "ru-row", [h("span", "ru-big ru-num", b.now), h("span", "ru-m ru-num", "from " + b.was), change(b.now, b.was)]),
        cells.length ? h("div", "ru-bars", cells) : null]);
    },
    change(b) {
      const pr = h(b.url ? "a" : "span", "ru-pr", "#" + b.pr), meta = (b.checks || []).map((c) => h("span", "ru-chip", [icon("check"), c]));
      if (b.url) pr.href = b.url;
      if (b.diff) meta.push(h("span", "ru-m ru-mono ru-end", b.diff));
      return h("div", "", [
        h("div", "ru-row", [pr, tone(h("span", "ru-pill ru-tone", b.state), STATE[b.state]), b.title ? h("span", "", b.title) : null, b.sha ? h("span", "ru-m ru-mono ru-end", b.sha) : null]),
        meta.length ? h("div", "ru-meta", meta) : null, b.note ? h("div", "ru-note", b.note) : null]);
    },
    decision: (b) => h("div", "", [label(b.question || "Next"), h("div", "ru-col", b.options.map((o) =>
      h("div", "ru-opt" + (o.rec ? " ru-rec" : ""), [h("span", "ru-key", o.key), h("span", "", o.text), o.rec ? h("span", "ru-pill", "Recommended") : null])))]),
    table: (b) => h("div", "", h("div", "ru-table", h("table", "", [h("thead", "", h("tr", "", b.columns.map((c) => h("th", "", c)))),
      h("tbody", "", b.rows.map((r, i) => h("tr", i === b.pick ? "ru-pick" : "", r.map((c, j) => h("td", "", [i === b.pick && !j ? icon("check") : null, String(c)])))))]))),
    checks: (b) => h("div", "ru-col", b.map((c) => h("div", "ru-check", [tone(icon(CHECK[c.status][0]), CHECK[c.status][1]), h("span", "", c.text)]))),
    flow(b) {
      const end = b.mark ?? b.steps.length - 1;
      return h("div", "", [label(b.label), h("div", "ru-flow", b.steps.flatMap((s, i) =>
        [i ? icon("arrow") : null, h("span", i === end ? "ru-end-state" : "", s)]))]);
    },
  };

  function raw(value, why) {
    console.error("reply.js: " + why);
    return h("div", "", h("pre", "ru-raw ru-mono", str(value) ? value : JSON.stringify(value, null, 1)));
  }
  function block(b, i) {
    const keys = b && typeof b == "object" && !Array.isArray(b) ? Object.keys(b) : [], type = keys[0];
    if (keys.length != 1) return raw(b, `block ${i}: needs exactly one key, its type`);
    const why = problem(type, b[type]);
    if (why) return raw(b, `block ${i} (${type}): ${why}`);
    try { return DRAW[type](b[type]); } catch (e) { return raw(b, `block ${i} (${type}): ${e.message}`); }
  }

  function render() {
    const src = document.getElementById("ui"), root = h("div", "ru");
    let data, card;
    const add = (e, opens) => {
      if (opens || !card) root.append((card = h("div", "ru-card")));
      card.append(e);
    };
    document.head.append(h("style", "", CSS));
    if (!src) add(raw("reply.js: no payload", 'no <script id="ui"> payload'));
    else {
      try { data = JSON.parse(src.textContent); } catch (e) { data = e; }
      if (data instanceof Error) add(raw(src.textContent.trim() || "(empty)", "payload is not JSON: " + data.message));
      else if (!Array.isArray(data?.ui) || !data.ui.length) add(raw(data, 'payload needs a non-empty "ui" list'));
      else data.ui.forEach((b, i) => add(block(b, i), b && Object.hasOwn(b, "outcome")));
    }
    // A page with no <body> tag, once a host puts a <head> before it, has its scripts parsed
    // into the head, which never shows: draw there only when the payload sits in the body.
    document.body.contains(src) ? src.before(root) : document.body.append(root);
  }
  document.readyState == "loading" ? document.addEventListener("DOMContentLoaded", render) : render();
})();
