/* reply.js (MIT): draws the card {"ui":[blocks]} from <script type="application/json" id="ui">.
   Blocks: outcome, delta, change, decision, table, checks, flow. Colors and fonts are the
   host's theme variables, so the card follows light and dark. A bad block shows as plain
   text and logs console.error; the card is never blank. */
(() => {
  const B = "1px solid var(--border)", CSS =
    ".ru{display:flex;flex-direction:column;gap:14px;font-size:13px;line-height:1.45}.ru *{box-sizing:border-box}" +
    ".ru-m,.ru-k,.ru-was,.ru-note,.ru th,.ru-chip,.ru-raw{color:var(--muted-foreground)}.ru-k,.ru th,.ru-chip,.ru-mono{font-size:12px}" +
    ".ru-mono,.ru-opt b{font-family:var(--font-mono)}.ru-k{margin-bottom:4px}.ru b{font-weight:600}.ru a{color:inherit}" +
    ".ru-out{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600}" +
    ".ru-dot{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700}" +
    ".ru-big{font-size:22px;font-weight:600}.ru-row,.ru-flow{display:flex;align-items:baseline;gap:4px 10px;flex-wrap:wrap}" +
    ".ru-flow{gap:4px 6px}.ru-was{text-decoration:line-through}" +
    ".ru-bars{display:grid;grid-template-columns:auto 1fr auto;gap:5px 10px;align-items:center;margin-top:8px;font-size:12px}" +
    ".ru-bar{height:8px;border-radius:4px;background:var(--muted)}.ru-bar i{display:block;height:100%;min-width:2px;border-radius:4px;background:var(--chart-1)}" +
    ".ru-st{font-size:12px}.ru-st:before{content:'\\25CF';margin-right:4px}.ru-sha{margin-left:auto}" +
    ".ru-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ru-chip{padding:1px 8px;border:" + B + ";border-radius:999px}.ru-note{margin-top:4px}" +
    ".ru-opts,.ru-checks{display:flex;flex-direction:column;gap:6px}.ru-checks{gap:3px}" +
    ".ru-opt{display:flex;gap:10px;align-items:baseline;padding:8px 12px;border:" + B + ";border-radius:var(--radius)}" +
    ".ru-rec{border-color:var(--accent)}.ru-rec b,.ru-star{color:var(--accent)}" +
    ".ru table{border-collapse:collapse;width:100%}.ru th{text-align:left;font-weight:500}" +
    ".ru th,.ru td{padding:5px 12px 5px 0;border-bottom:" + B + ";vertical-align:top}.ru-pick td{font-weight:600}" +
    ".ru-check{display:flex;gap:8px}.ru-check span:first-child{width:14px;text-align:center}" +
    ".ru-raw{margin:0;padding:8px 12px;border:1px dashed var(--border);border-radius:var(--radius);white-space:pre-wrap;word-break:break-word}";

  const STATUS = { done: ["✓", "success"], risk: ["!", "warning"], blocked: ["✕", "destructive"], working: ["…", "info"] };
  const CHECK = { fail: STATUS.blocked, warn: STATUS.risk, wait: STATUS.working, skip: ["–", "muted-foreground"], pass: STATUS.done };
  const MUTED = "muted-foreground";
  const STATE = { draft: MUTED, open: MUTED, fixing: "warning", blocked: "destructive", merged: "success", closed: MUTED };

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
  const tint = (e, name) => ((e.style.color = `var(--${name})`), e);
  const label = (text) => (text ? h("div", "ru-k", text) : null);
  function percent(now, was) {
    const a = /^(-?[\d.,]+)\s*(.*)$/.exec(now), b = /^(-?[\d.,]+)\s*(.*)$/.exec(was);
    const n = (m) => parseFloat(m[1].replace(/,/g, ""));
    if (!a || !b || a[2] != b[2] || !n(b)) return "";
    const p = Math.round(((n(a) - n(b)) / n(b)) * 100);
    return (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p) + "%";
  }

  const DRAW = {
    outcome(b) {
      const [mark, color] = STATUS[b.status], dot = h("span", "ru-dot", mark);
      dot.style.cssText = `background:var(--${color});color:var(--${color}-foreground)`;
      return h("div", "ru-out", [dot, h("span", "", b.text)]);
    },
    delta(b) {
      const bars = b.bars || [], top = Math.max(0, ...bars.map((r) => r[1]));
      const cells = bars.flatMap(([name, value]) => {
        const bar = h("span", "ru-bar", h("i"));
        bar.firstChild.style.width = (top ? (value / top) * 100 : 0) + "%";
        return [h("span", "", name), bar, h("span", "ru-m ru-mono", String(value))];
      });
      return h("div", "", [label(b.label), h("div", "ru-row", [h("span", "ru-big", b.now), h("span", "ru-was", b.was), h("span", "ru-m", percent(b.now, b.was))]),
        cells.length ? h("div", "ru-bars", cells) : null]);
    },
    change(b) {
      const pr = h(b.url ? "a" : "span", "", "#" + b.pr), chips = (b.checks || []).map((c) => tint(h("span", "ru-chip", "✓ " + c), "success"));
      if (b.url) pr.href = b.url;
      if (b.diff) chips.push(h("span", "ru-chip ru-mono", b.diff));
      return h("div", "", [h("div", "ru-row", [h("b", "", pr), tint(h("span", "ru-st", b.state), STATE[b.state]), b.title, b.sha ? h("span", "ru-sha ru-m ru-mono", b.sha) : null]),
        chips.length ? h("div", "ru-chips", chips) : null, b.note ? h("div", "ru-note", b.note) : null]);
    },
    decision: (b) => h("div", "", [label(b.question || "Next"), h("div", "ru-opts", b.options.map((o) =>
      h("div", "ru-opt" + (o.rec ? " ru-rec" : ""), [h("b", "", o.key), h("span", "", o.text), o.rec ? h("span", "ru-star", "★") : null])))]),
    table: (b) => h("table", "", [h("thead", "", h("tr", "", b.columns.map((c) => h("th", "", c)))),
      h("tbody", "", b.rows.map((r, i) => h("tr", i === b.pick ? "ru-pick" : "", r.map((c, j) => h("td", "", (i === b.pick && !j ? "★ " : "") + c)))))]),
    checks: (b) => h("div", "ru-checks", b.map((c) => h("div", "ru-check", [tint(h("span", "", CHECK[c.status][0]), CHECK[c.status][1]), h("span", "", c.text)]))),
    flow: (b) => h("div", "", [label(b.label), h("div", "ru-flow", b.steps.flatMap((s, i) =>
      [i ? h("span", "ru-m", "→") : null, h(i === b.mark ? "b" : "span", "", s)]))]),
  };

  function raw(value, why) {
    console.error("reply.js: " + why);
    return h("pre", "ru-raw ru-mono", str(value) ? value : JSON.stringify(value, null, 1));
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
    document.head.append(h("style", "", CSS));
    let data;
    if (!src) root.append(raw("reply.js: no payload", 'no <script id="ui"> payload'));
    else {
      try { data = JSON.parse(src.textContent); } catch (e) { data = e; }
      if (data instanceof Error) root.append(raw(src.textContent.trim() || "(empty)", "payload is not JSON: " + data.message));
      else if (!Array.isArray(data?.ui) || !data.ui.length) root.append(raw(data, 'payload needs a non-empty "ui" list'));
      else data.ui.forEach((b, i) => root.append(block(b, i)));
    }
    // A page with no <body> tag, once a host puts a <head> before it, has its scripts parsed
    // into the head, which never shows: draw there only when the payload sits in the body.
    document.body.contains(src) ? src.before(root) : document.body.append(root);
  }
  document.readyState == "loading" ? document.addEventListener("DOMContentLoaded", render) : render();
})();
