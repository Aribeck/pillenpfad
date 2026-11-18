// ===== Lern-Engine (ohne DOM, testbar) =====
const ALL = [];
const BY_ID = {};
function slug(s) {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function chunkSizes(n) {
  if (n <= 4) return [n];
  const k = Math.ceil(n / 4), base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}
UNITS.forEach((u) => {
  u.drugs.forEach((d) => {
    d.id = slug(d.n); d.unit = u.id; d.tags = [u.area].concat(d.t || []);
    ALL.push(d); BY_ID[d.id] = d;
  });
  const sizes = chunkSizes(u.drugs.length);
  let i = 0;
  u.nodes = sizes.map((s, li) => {
    const ids = u.drugs.slice(i, i + s).map((d) => d.id); i += s;
    return { id: u.id + "-L" + (li + 1), unit: u.id, type: "lesson", title: "Lektion " + (li + 1), drugIds: ids };
  });
  u.nodes.push({ id: u.id + "-R", unit: u.id, type: "review", title: "Einheitentest", drugIds: u.drugs.map((d) => d.id) });
});
const NODES = UNITS.flatMap((u) => u.nodes);
const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

// --- Zufall ---
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// --- Schutz vor mehrdeutigen Antworten ---
// Ablenker dürfen keine Wortstämme mit dem Ziel-Medikament teilen (sonst könnten sie ebenfalls stimmen).
const SYN = { verstopfung: "obstipation", unterzuckerung: "hypoglykaemie", austrocknung: "exsikkose", herzrasen: "tachykardie", tremor: "zittern", nervenschmerzen: "neuropathische" };
const STOP = new Set(["achte", "beoba", "kontr", "regel", "patie", "einne", "nehme", "geben", "wirkt", "wirku", "nicht", "immer", "sofor", "infor", "selte", "beson", "dauer", "zusam", "möglic", "mögli", "ältere", "älter", "mensc", "gefah", "erhöh", "starke", "stark", "schne", "lassen", "lasse", "durch", "werde", "einer", "einem", "eines", "unter", "sowie", "bei", "nach", "kurzf", "langs", "überw", "zeich", "zusät", "zusät", "ausre", "sicher", "siche", "gleic", "therap", "thera", "behan", "akute", "akuter", "schwe", "leich", "mäßig", "häufi", "dosis", "dosie", "anord", "nachb", "beach", "melde", "verme", "vorhe", "vorsi"]);
function norm(s) { return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss"); }
const STOPN = new Set([...STOP].map((x) => norm(x).slice(0, 5)));
function stems(text) {
  const out = new Set();
  (norm(text).match(/[a-z]+/g) || []).forEach((w) => {
    if (SYN[w]) w = norm(SYN[w]);
    if (w.length < 5) return;
    const p = w.slice(0, 5);
    if (!STOPN.has(p)) out.add(p);
  });
  return out;
}
function fullText(d) { return [d.n, d.g].concat(d.u, [d.w], d.nw, d.p, [d.uq, d.nq, d.pq]).join(" "); }
const STEM_CACHE = {};
function drugStems(d) { return STEM_CACHE[d.id] || (STEM_CACHE[d.id] = stems(fullText(d))); }
function conflicts(target, text) { const t = drugStems(target); for (const s of stems(text)) if (t.has(s)) return true; return false; }
function shareTag(a, b) { return a.tags.some((t) => b.tags.includes(t)); }

// Liefert bis zu n eindeutige Ablenker-Werte für ein Feld
function distractorValues(target, getter, n, opts = {}) {
  const right = getter(target);
  const seen = new Set([right]);
  const pool = shuffle(ALL).filter((d) => d !== target && d.g !== target.g && !shareTag(d, target));
  const out = [];
  for (const d of pool) {
    const v = getter(d);
    if (!v || seen.has(v)) continue;
    if (!opts.noConflict && conflicts(target, v)) continue;
    if (opts.extra && !opts.extra(d)) continue;
    seen.add(v); out.push(v);
    if (out.length >= n) break;
  }
  return out;
}

function mc(d, kind, prompt, right, wrongs, explain) {
  return { type: "mc", kind, drugId: d.id, prompt, options: shuffle([right].concat(wrongs)), answer: right, explain };
}

const GEN = {
  use(d) {
    return mc(d, "use", "Wofür wird <b>" + d.n + "</b> eingesetzt?", d.uq, distractorValues(d, (x) => x.uq, 3), d.n + " → " + d.u.join(", "));
  },
  group(d) {
    return mc(d, "group", "Zu welcher Gruppe gehört <b>" + d.n + "</b>?", d.g, distractorValues(d, (x) => x.g, 3), "Merke: " + d.n + " (" + d.b + ") → " + d.g);
  },
  nameByGroup(d) {
    const w = distractorValues(d, (x) => x.n, 3, { noConflict: true });
    return mc(d, "nameByGroup", "Welcher Wirkstoff gehört zur Gruppe <b>" + d.g + "</b>?", d.n, w, "Merke: " + d.n + " (" + d.b + ") → " + d.g);
  },
  nameByUse(d) {
    // Ablenker-Medikamente, deren eigene Texte nicht zur gesuchten Indikation passen
    const uqStems = stems(d.uq);
    const w = distractorValues(d, (x) => x.n, 3, { noConflict: true, extra: (x) => ![...uqStems].some((s) => drugStems(x).has(s)) });
    return mc(d, "nameByUse", "Welches Medikament setzt man ein bei: <b>" + d.uq + "</b>?", d.n, w, d.n + " → " + d.u.join(", "));
  },
  nw(d) {
    return mc(d, "nw", "Welche Nebenwirkung ist typisch für <b>" + d.n + "</b>?", d.nq, distractorValues(d, (x) => x.nq, 3), "Typisch für " + d.n + ": " + d.nw.join(", "));
  },
  pflege(d) {
    return mc(d, "pflege", "Worauf achtest du in der Pflege bei <b>" + d.n + "</b>?", d.pq, distractorValues(d, (x) => x.pq, 3), "Pflege bei " + d.n + ": " + d.p.join(" · "));
  },
  wirkung(d) {
    return mc(d, "wirkung", "Wie wirkt <b>" + d.n + "</b>?", d.w, distractorValues(d, (x) => x.w, 2), d.n + ": " + d.w);
  },
  tf(d) {
    const variants = [
      { s: (v) => "<b>" + d.n + "</b> gehört zur Gruppe: " + v, right: d.g, get: (x) => x.g },
      { s: (v) => "<b>" + d.n + "</b> setzt man ein bei: " + v, right: d.uq, get: (x) => x.uq },
      { s: (v) => "Eine typische Nebenwirkung von <b>" + d.n + "</b>: " + v, right: d.nq, get: (x) => x.nq }
    ];
    const v = pick(variants);
    const truth = Math.random() < 0.5;
    let shown = v.right;
    if (!truth) { const w = distractorValues(d, v.get, 1); if (w.length) shown = w[0]; }
    const isTrue = shown === v.right;
    return { type: "tf", kind: "tf", drugId: d.id, prompt: v.s(shown), answer: isTrue, explain: isTrue ? "Stimmt!" : "Richtig wäre: " + v.right };
  },
  suffix(d) {
    const sufs = GROUP_SUFFIX[d.g];
    if (!sufs) return null;
    const suf = sufs.slice().sort((a, b) => b.length - a.length).find((s) => norm(d.n).endsWith(norm(s)));
    if (!suf) return null;
    const wrongs = shuffle(Object.keys(GROUP_SUFFIX).filter((g) => g !== d.g)).slice(0, 3);
    return { type: "mc", kind: "suffix", drugId: d.id, prompt: "Endungs-Detektiv 🔍<br>Ein Wirkstoff endet auf <b>„-" + suf + "“</b>. Zu welcher Gruppe gehört er?", options: shuffle([d.g].concat(wrongs)), answer: d.g, explain: "-" + suf + " = " + d.g + " (z. B. " + d.n + ")" };
  }
};

function genMatch(drugs) {
  drugs = drugs.slice(0, 4);
  if (drugs.length < 2) return null;
  const uniq = (f) => new Set(drugs.map(f)).size === drugs.length;
  let key, label;
  const opts = [];
  if (uniq((d) => d.g)) opts.push(["g", "Gruppe"]);
  if (uniq((d) => d.uq)) opts.push(["uq", "Einsatz"]);
  if (uniq((d) => d.b)) opts.push(["b", "Handelsname"]);
  if (!opts.length) return null;
  [key, label] = pick(opts);
  return { type: "match", kind: "match", label, drugIds: drugs.map((d) => d.id), pairs: drugs.map((d) => [d.n, d[key]]) };
}

const KINDS_PRACTICE = ["use", "group", "nameByGroup", "nameByUse", "nw", "pflege", "wirkung", "tf"];
function genKind(d, kind) { const ex = GEN[kind](d); if (ex && ex.type === "mc" && ex.options.length < 3) return null; return ex; }
function genAny(d, kinds) {
  for (const k of shuffle(kinds)) { const ex = genKind(d, k); if (ex) return ex; }
  return GEN.tf(d);
}

function buildLesson(node) {
  const drugs = node.drugIds.map((id) => BY_ID[id]);
  const steps = [];
  if (node.type === "lesson") {
    drugs.forEach((d) => {
      steps.push({ type: "intro", drugId: d.id });
      steps.push(genAny(d, ["use", "group"]));
    });
    const mixed = drugs.map((d) => genAny(d, ["nw", "pflege", "wirkung", "nameByUse", "nameByGroup"]));
    const m = genMatch(drugs); if (m) mixed.push(m);
    mixed.push(GEN.tf(pick(drugs)));
    const sx = shuffle(drugs).map((d) => GEN.suffix(d)).find(Boolean); if (sx) mixed.push(sx);
    return steps.concat(shuffle(mixed));
  }
  return buildPractice(drugs, node.type === "review" ? 11 : 9);
}

function buildPractice(drugs, count) {
  const out = [];
  const pool = shuffle(drugs);
  for (let i = 0; i < count; i++) out.push(genAny(pool[i % pool.length], KINDS_PRACTICE));
  const sx = shuffle(drugs).map((d) => GEN.suffix(d)).find(Boolean); if (sx) out.push(sx);
  const m = genMatch(shuffle(drugs).slice(0, 4)); if (m) out.splice(Math.floor(out.length / 2), 0, m);
  return out;
}

if (typeof module !== "undefined") module.exports = { ALL, BY_ID, UNITS, NODES, GEN, genMatch, buildLesson, buildPractice, distractorValues, conflicts, stems };
