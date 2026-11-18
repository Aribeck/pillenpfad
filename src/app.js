// ===== PillenPfad – Oberfläche (Stil „Klinik-Frisch“) =====
(function () {
  const LS_KEY = "pillenpfad-v1";
  const MAX_HEARTS = 5, REFILL_MS = 20 * 60 * 1000, DAILY_GOAL = 30;
  const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));
  const C = { petrol: "#0E7C7B", petrolS: "#E1F1EF", coral: "#FF6B5B", coralS: "#FFE8E4", sand: "#E9A93A", sandS: "#FCF1DC", line: "#E9E3DA", plum: "#7E62C4", plumS: "#EEE9F8" };
  const DEFAULT = () => ({ v: 1, xp: 0, streak: 0, lastDay: null, hearts: MAX_HEARTS, heartTs: Date.now(), done: {}, ds: {}, daily: { day: null, xp: 0 }, sound: true, disc: false, lessons: 0, right: 0, wrong: 0, updated: 0 });

  // ---------- Speicher ----------
  function sanitize(o) { const d = DEFAULT(); if (!o || typeof o !== "object") return d; return Object.assign(d, o, { daily: Object.assign(d.daily, o.daily || {}), done: o.done || {}, ds: o.ds || {} }); }
  function load() { try { const raw = localStorage.getItem(LS_KEY); if (raw) return sanitize(JSON.parse(raw)); } catch (e) {} return DEFAULT(); }
  let S = load();
  function save() { S.updated = Date.now(); try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} cloudPush(); }

  const cloud = { ref: null, status: "local", writing: false, pending: false, timer: null };
  async function initCloud() {
    try {
      if (!window.claude || typeof window.claude.use !== "function") return;
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      cloud.ref = db.doc("data/users/" + id + "/progress");
      const snap = await Promise.race([cloud.ref.get(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))]);
      cloud.status = "on";
      const remote = snap.exists ? snap.data() : null;
      if (remote && remote.state && (remote.state.updated || 0) > (S.updated || 0)) {
        S = sanitize(JSON.parse(JSON.stringify(remote.state)));
        try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
        if (!L) render();
      } else if (!remote || (S.updated || 0) > ((remote.state && remote.state.updated) || 0)) {
        cloudPush(true);
      }
      if (view === "profil" && !L) render();
    } catch (e) { cloud.ref = null; cloud.status = "local"; }
  }
  function cloudPush(now) { if (!cloud.ref) return; clearTimeout(cloud.timer); cloud.timer = setTimeout(doPush, now ? 0 : 1200); }
  async function doPush() {
    if (!cloud.ref) return;
    if (cloud.writing) { cloud.pending = true; return; }
    cloud.writing = true;
    try { await cloud.ref.set({ state: JSON.parse(JSON.stringify(S)) }); cloud.status = "on"; }
    catch (e) { if (e && e.code === "unavailable") cloud.pending = true; else { cloud.ref = null; cloud.status = "local"; } }
    cloud.writing = false;
    if (cloud.pending) { cloud.pending = false; setTimeout(doPush, 1500 + Math.random() * 1000); }
  }

  // ---------- Hilfen ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function dayKey(d = new Date()) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
  function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
  function streakNow() { return S.lastDay === dayKey() || S.lastDay === yesterdayKey() ? S.streak : 0; }
  function doneToday() { return S.lastDay === dayKey(); }
  function dailyXp() { return S.daily.day === dayKey() ? S.daily.xp : 0; }
  function refillHearts() {
    if (S.hearts >= MAX_HEARTS) { S.heartTs = Date.now(); return; }
    const n = Math.floor((Date.now() - S.heartTs) / REFILL_MS);
    if (n > 0) { S.hearts = Math.min(MAX_HEARTS, S.hearts + n); S.heartTs += n * REFILL_MS; if (S.hearts >= MAX_HEARTS) S.heartTs = Date.now(); }
  }
  function nextHeartMin() { return Math.max(1, Math.ceil((REFILL_MS - (Date.now() - S.heartTs)) / 60000)); }
  function unlocked(node) { const u = UNIT_BY_ID[node.unit]; const i = u.nodes.indexOf(node); return i === 0 || !!S.done[u.nodes[i - 1].id]; }
  function currentNode() { return NODES.find((n) => unlocked(n) && !S.done[n.id]) || null; }
  function learnedCount() { return ALL.filter((d) => S.ds[d.id]).length; }
  const soft = (hex) => hex + "1F";

  // ---------- Icons ----------
  const P = {
    flame: '<path d="M12 2.5c.6 3.2 4.8 5 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.2 1-3.6 2.2-4.8.2 1.8 1 2.8 2.1 3 .2-3.2-.6-5.6.5-8.2z"/>',
    star: '<path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3L2.9 9.4l6.3-.8z"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.8c0 5.7-7.5 10.3-7.5 10.3z"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H18v-3"/><path d="M9 7.5h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.7 4.3-5.5 7.5-5.5s6.1 1.8 7.5 5.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    trophy: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.2A3 3 0 0 0 8 10.2M16 6h3v1.2a3 3 0 0 1-3 3M12 13.5V17M8.5 20h7"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    bolt: '<path d="M13.5 2.5 5 13.5h6.5L10.5 21.5 19 10.5h-6.5z"/>',
    alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.5v.3"/>',
    care: '<path d="M12 20s-6.5-3.8-6.5-8.6A3.7 3.7 0 0 1 12 9.2a3.7 3.7 0 0 1 6.5 2.2C18.5 16.2 12 20 12 20z"/><path d="M12 3.5v4M10 5.5h4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sound: '<path d="M4.5 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
    pill: '<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="M7 7l7 7"/>',
    medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 3.5l2 6M15.5 3.5l-2 6M12 12.5v4"/>',
    chev: '<path d="M9.5 6l6 6-6 6"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    thumbUp: '<path d="M7 10.5V20H4.5v-9.5zM7 10.5l4-7c1.5 0 2.5 1 2.2 2.6L12.6 9.5h5.6a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.7H7"/>',
    thumbDown: '<path d="M7 13.5V4H4.5v9.5zM7 13.5l4 7c1.5 0 2.5-1 2.2-2.6l-.6-3.4h5.6a2 2 0 0 0 2-2.4l-1.3-6.4a2 2 0 0 0-2-1.7H7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    puzzle: '<path d="M9 4h3v2a1.5 1.5 0 0 0 3 0V4h3v5h-2a1.5 1.5 0 0 0 0 3h2v6h-5v-2a1.5 1.5 0 0 0-3 0v2H4v-6h2a1.5 1.5 0 0 0 0-3H4V4z"/>',
    tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.3"/>',
    question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.5.7c0 1.6-2.3 2-2.3 3.5M12 16.8v.2"/>'
  };
  const FILLED = new Set(["flame", "star", "heart", "play"]);
  function ic(name, extra) { return '<svg class="i' + (FILLED.has(name) ? " f" : "") + (extra ? " " + extra : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + P[name] + "</svg>"; }

  function ring(pct, size, stroke, color, inner) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
    return '<div class="ring" style="width:' + size + "px;height:" + size + 'px"><svg width="' + size + '" height="' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + C.line + '" stroke-width="' + stroke + '"/><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="transition:stroke-dashoffset .6s"/></svg><div class="rc">' + (inner || "") + "</div></div>";
  }

  // ---------- Klang ----------
  let AC = null;
  function tone(freqs, dur, type, gap, vol) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = AC.currentTime + 0.01;
      freqs.forEach((f, i) => {
        const o = AC.createOscillator(), g = AC.createGain(), t = t0 + i * gap;
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.03);
      });
    } catch (e) {}
  }
  const SND = {
    ok: () => tone([587, 880], 0.16, "sine", 0.08, 0.13),
    bad: () => { tone([220, 196], 0.22, "triangle", 0.12, 0.09); try { navigator.vibrate && navigator.vibrate(100); } catch (e) {} },
    win: () => tone([523, 659, 784, 988], 0.24, "sine", 0.11, 0.12),
    tap: () => tone([660], 0.04, "sine", 0, 0.04)
  };

  // ---------- Maskottchen „Kapsi“ (mit Schwesternhaube) ----------
  function kapsi(size, mood) {
    mood = mood || "happy";
    const ink = "#16302F";
    const mouth = mood === "sad" ? '<path d="M51 66 Q60 59 69 66" fill="none" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>'
      : mood === "wow" ? '<ellipse cx="60" cy="63" rx="6" ry="7" fill="' + ink + '"/><ellipse cx="60" cy="66" rx="3.5" ry="2.5" fill="#FF8A7D"/>'
      : '<path d="M50 59 Q60 69 70 59" fill="' + ink + '" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/><path d="M54 63 Q60 66 66 63" fill="#FF8A7D"/>';
    const brow = mood === "sad" ? '<path d="M41 36 L52 40 M79 36 L68 40" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>' : "";
    const drop = mood === "sad" ? '<path d="M88 44 q4 7 0 10 q-4 -3 0 -10z" fill="#9ED8F0"/>' : "";
    const ey = mood === "sad" ? 48 : 46, ex = mood === "sad" ? 0 : 2;
    return '<svg viewBox="0 0 120 124" width="' + size + '" height="' + Math.round(size * 124 / 120) + '" aria-hidden="true"><ellipse cx="60" cy="119" rx="27" ry="4" fill="#16302F" opacity=".07"/><g transform="rotate(-18 60 66)">'
      + '<rect x="31" y="12" width="58" height="104" rx="29" fill="#FFFDF9" stroke="#E2DACD" stroke-width="2.5"/>'
      + '<path d="M38 76 V88 a21 21 0 0 0 13 18" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>'
      + '<path d="M31 64 V41 a29 29 0 0 1 58 0 V64 Z" fill="#0E7C7B"/><path d="M31 64 V59 H89 V64 Z" fill="#0A5F5E"/>'
      + '<path d="M41 32 q5 -9 13 -11" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".35"/>'
      + '<path d="M42 19 Q60 4 78 19 L75 26 H45 Z" fill="#fff" stroke="#E2DACD" stroke-width="2"/><rect x="58" y="11.5" width="4" height="11" rx="1" fill="#FF6B5B"/><rect x="54.5" y="15" width="11" height="4" rx="1" fill="#FF6B5B"/>'
      + '<circle cx="47" cy="45" r="9" fill="#fff"/><circle cx="73" cy="45" r="9" fill="#fff"/>'
      + '<circle cx="' + (47 + ex) + '" cy="' + ey + '" r="5" fill="' + ink + '"/><circle cx="' + (73 + ex) + '" cy="' + ey + '" r="5" fill="' + ink + '"/>'
      + '<circle cx="' + (48.5 + ex) + '" cy="' + (ey - 2) + '" r="1.8" fill="#fff"/><circle cx="' + (74.5 + ex) + '" cy="' + (ey - 2) + '" r="1.8" fill="#fff"/>'
      + brow + mouth
      + '<circle cx="38" cy="57" r="4.2" fill="#FF8A7D" opacity=".75"/><circle cx="82" cy="57" r="4.2" fill="#FF8A7D" opacity=".75"/>'
      + drop + "</g></svg>";
  }

  // ---------- Karteikarte ----------
  function card(d, label) {
    const u = UNIT_BY_ID[d.unit];
    const li = (a) => a.map((x) => "<li>" + esc(x) + "</li>").join("");
    return '<div class="card" style="--c:' + u.color + ";--cs:" + soft(u.color) + '">'
      + '<div class="hd"><div class="lbl"><i></i>' + esc(label || u.title) + "</div><h2>" + esc(d.n) + '</h2><div class="brandn">z. B. ' + esc(d.b) + '</div><span class="grp">' + esc(d.g) + "</span></div>"
      + '<div class="sec"><h5>' + ic("target") + "Wofür</h5><ul>" + li(d.u) + "</ul></div>"
      + '<div class="sec"><h5>' + ic("bolt") + "Wirkung</h5><p>" + esc(d.w) + "</p></div>"
      + '<div class="sec warn"><h5>' + ic("alert") + "Nebenwirkungen</h5><ul>" + li(d.nw) + "</ul></div>"
      + '<div class="sec care"><h5>' + ic("care") + "Pflege-Tipps</h5><ul>" + li(d.p) + "</ul></div></div>";
  }

  // ---------- Hauptansichten ----------
  let view = "lernen", openNode = null, lexQ = "", lexUnit = "all", firstRender = true;
  const app = $("#app");

  function topbar() {
    refillHearts();
    return '<header class="topbar"><div class="brand">' + kapsi(30) + "<span>Pillen<em>Pfad</em></span></div>"
      + '<span class="chip-stat fire ' + (doneToday() ? "" : "off") + '" title="Tage in Folge">' + ic("flame") + "<span>" + streakNow() + "</span></span>"
      + '<span class="chip-stat xp" title="Punkte">' + ic("star") + "<span>" + S.xp + "</span></span>"
      + '<button class="chip-stat heart" data-act="hearts" title="Herzen">' + ic("heart") + "<span>" + S.hearts + "</span></button></header>";
  }
  function nav() {
    const b = (id, icon, t) => '<button class="' + (view === id ? "on" : "") + '" data-act="nav" data-v="' + id + '">' + ic(icon) + t + "</button>";
    return '<nav class="nav"><div class="in">' + b("lernen", "home", "Lernen") + b("lexikon", "book", "Lexikon") + b("profil", "user", "Profil") + "</div></nav>";
  }
  function greeting() { const h = new Date().getHours(); return h < 11 ? "Guten Morgen" : h < 17 ? "Hallo" : h < 22 ? "Guten Abend" : "Gute Nacht(schicht)"; }

  function learnView() {
    const cur = currentNode();
    const dx = dailyXp();
    let h = '<div class="hello"><h1>' + greeting() + " 👋</h1><p>" + (cur ? "Weiter geht's mit " + esc(UNIT_BY_ID[cur.unit].title) + "." : "Alle Stationen geschafft – stark!") + "</p></div>";
    h += '<div class="goal">' + ring(dx / DAILY_GOAL, 64, 7, dx >= DAILY_GOAL ? C.petrol : C.coral, '<div style="font-weight:800;font-size:14px">' + Math.min(dx, DAILY_GOAL) + "</div>") + '<div class="txt"><h3>' + (dx >= DAILY_GOAL ? "Tagesziel geschafft" : "Tagesziel") + "</h3><small>" + Math.min(dx, DAILY_GOAL) + " von " + DAILY_GOAL + ' Punkten heute</small></div><button class="btn soft small" data-act="practice">' + ic("repeat") + "Training</button></div>";
    UNITS.forEach((u, ui) => {
      const doneN = u.nodes.filter((n) => S.done[n.id]).length;
      h += '<section class="unit" id="u-' + u.id + '" style="--u:' + u.color + ";--us:" + soft(u.color) + '">';
      h += '<div class="unit-card"><div class="uicon">' + u.icon + '</div><div class="ut"><div class="k">Station ' + (ui + 1) + "</div><h2>" + esc(u.title) + "</h2><p>" + esc(u.sub) + " · " + u.drugs.length + " Mittel</p></div>"
        + '<div class="uprog">' + ring(doneN / u.nodes.length, 40, 4, u.color, '<span style="font-size:11px">' + doneN + "/" + u.nodes.length + "</span>") + "</div></div>";
      h += '<ol class="steps">';
      u.nodes.forEach((n, i) => {
        const isDone = !!S.done[n.id], open = unlocked(n), isCur = cur === n;
        const st = isCur ? "current" : isDone ? "done" : open ? "open" : "locked";
        const dot = isDone ? ic("check") : !open ? ic("lock") : n.type === "review" ? ic("trophy") : String(i + 1);
        const names = n.type === "review" ? "Alle " + n.drugIds.length + " Mittel gemischt" : n.drugIds.map((id) => BY_ID[id].n).join(", ");
        const act = isCur ? (doneN ? "Weiter" : "Start") + ic("chev") : isDone ? ic("repeat") : open ? ic("chev") : "";
        h += '<li class="step ' + st + '"><button class="srow" data-act="node" data-id="' + n.id + '"><span class="dot">' + dot + '</span><span class="st"><b>' + esc(n.title) + "</b><small>" + esc(names) + '</small></span><span class="sact">' + act + "</span></button>";
        if (openNode === n.id) {
          if (!open && !isDone) h += '<div class="sdetail"><p>Schließe zuerst die vorherige Lektion ab, dann geht es hier weiter.</p></div>';
          else {
            const label = n.type === "review" ? (isDone ? "Test wiederholen · +5" : "Test starten · +15") : isDone ? "Wiederholen · +5" : "Lektion starten · +10";
            h += '<div class="sdetail"><div class="pills">' + n.drugIds.map((id) => "<span>" + esc(BY_ID[id].n) + "</span>").join("") + '</div><button class="btn block" data-act="start" data-id="' + n.id + '">' + ic("play") + label + "</button></div>";
          }
        }
        h += "</li>";
      });
      h += "</ol></section>";
    });
    h += '<div class="note" style="margin:26px 16px 8px">Lernhilfe für Pflegekräfte – ersetzt keine Fachinformation, ärztliche Anordnung oder Rücksprache mit der Apotheke. Dosierungen sind bewusst nicht enthalten.</div>';
    return h;
  }

  function lexView() {
    const chips = '<div class="chips"><button class="chip ' + (lexUnit === "all" ? "on" : "") + '" data-act="lexunit" data-id="all">Alle</button>'
      + UNITS.map((u) => '<button class="chip ' + (lexUnit === u.id ? "on" : "") + '" style="--c:' + u.color + '" data-act="lexunit" data-id="' + u.id + '">' + u.icon + " " + esc(u.title) + "</button>").join("") + "</div>";
    return '<div class="page"><h1>Lexikon</h1><input class="search" id="lexq" type="search" placeholder="Wirkstoff, Handelsname, Gruppe …" value="' + esc(lexQ) + '" autocomplete="off">' + chips + '<div id="lexlist">' + lexList() + "</div></div>";
  }
  function lexList() {
    const q = lexQ.trim().toLowerCase();
    let h = "", total = 0;
    UNITS.forEach((u) => {
      if (lexUnit !== "all" && lexUnit !== u.id) return;
      const list = u.drugs.filter((d) => !q || [d.n, d.b, d.g].concat(d.u).join(" ").toLowerCase().includes(q));
      if (!list.length) return;
      total += list.length;
      h += '<div class="lex-group" style="--c:' + u.color + '"><h3><span class="d"></span>' + esc(u.title) + '</h3><div class="lex-list">';
      list.forEach((d) => {
        h += '<button class="drug-row" data-act="drug" data-id="' + d.id + '"><span class="t"><div>' + esc(d.n) + "</div><small>" + esc(d.g) + " · " + esc(d.b) + "</small></span>" + (S.ds[d.id] ? '<span class="ok" title="Gelernt">' + ic("star") + "</span>" : "") + '<span class="chev">' + ic("chev") + "</span></button>";
      });
      h += "</div></div>";
    });
    return total ? h : '<div class="empty">' + kapsi(90, "sad") + "<p>Nichts gefunden. Versuch es mit einem anderen Begriff.</p></div>";
  }

  function profileView() {
    const acc = S.right + S.wrong ? Math.round((S.right / (S.right + S.wrong)) * 100) + " %" : "–";
    const doneNodes = NODES.filter((n) => S.done[n.id]).length;
    const box = (icon, tc, tb, v, t) => '<div class="sbox" style="--tc:' + tc + ";--tb:" + tb + '"><span class="ib">' + ic(icon) + "</span><div><b>" + v + "</b><small>" + t + "</small></div></div>";
    return '<div class="page"><div class="hero">' + kapsi(76) + "<div><h1>Dein Fortschritt</h1><p>Jeden Tag ein bisschen – Kapsi glaubt an dich.</p></div></div>"
      + '<div class="stats">' + box("flame", C.coral, C.coralS, streakNow(), "Tage in Folge") + box("star", C.sand, C.sandS, S.xp, "Punkte gesamt") + box("pill", C.petrol, C.petrolS, learnedCount() + "/" + ALL.length, "Mittel gelernt") + box("medal", C.plum, C.plumS, doneNodes + "/" + NODES.length, "Lektionen") + box("target", C.petrol, C.petrolS, acc, "Trefferquote") + box("heart", C.coral, C.coralS, S.hearts + "/" + MAX_HEARTS, "Herzen") + "</div>"
      + '<div class="setting"><span>' + ic("sound") + 'Töne</span><button class="switch ' + (S.sound ? "on" : "") + '" data-act="sound" aria-label="Töne an/aus"></button></div>'
      + '<div class="syncline"><span class="d ' + (cloud.status === "on" ? "on" : "") + '"></span>' + (cloud.status === "on" ? "Fortschritt wird in deinem Konto gespeichert" : "Fortschritt wird auf diesem Gerät gespeichert") + "</div>"
      + '<div class="note"><b>Wichtiger Hinweis</b><br>PillenPfad ist eine Lernhilfe für Pflegekräfte. Die Inhalte sind vereinfacht und ersetzen keine Fachinformation, ärztliche Anordnung oder Rücksprache mit der Apotheke. Dosierungen sind bewusst nicht enthalten. Handelsnamen sind Beispiele.<br><br><b>Stand:</b> November 2026 – Einnahme- und Anwendungshinweise mit Fachinformationen aus der Gelben Liste abgeglichen.</div>'
      + '<button class="btn danger block" data-act="reset">Fortschritt zurücksetzen</button></div>';
  }

  function render() {
    const main = view === "lexikon" ? lexView() : view === "profil" ? profileView() : learnView();
    app.innerHTML = topbar() + "<main>" + main + "</main>" + nav();
    onScroll();
    if (view === "lernen" && firstRender) {
      firstRender = false;
      const c = $(".step.current");
      if (c && NODES.indexOf(currentNode()) > 0) setTimeout(() => c.scrollIntoView({ block: "center" }), 60);
    }
  }
  function onScroll() { const t = $(".topbar"); if (t) t.classList.toggle("scrolled", window.scrollY > 4); }
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---------- Dialoge ----------
  function dialog(html, opts) {
    closeDialog();
    const o = document.createElement("div");
    o.className = "overlay center"; o.id = "dlg";
    o.innerHTML = '<div class="dialog" role="dialog" aria-modal="true">' + html + "</div>";
    o.addEventListener("click", (e) => { if (e.target === o && !(opts && opts.sticky)) closeDialog(); });
    document.body.appendChild(o);
  }
  function closeDialog() { const d = $("#dlg"); if (d) d.remove(); }
  function sheet(html) {
    closeDialog();
    const o = document.createElement("div");
    o.className = "overlay"; o.id = "dlg";
    o.innerHTML = '<div class="sheet"><div class="grab"></div>' + html + '<div style="height:14px"></div><button class="btn ghost block" data-act="close">Schließen</button></div>';
    o.addEventListener("click", (e) => { if (e.target === o) closeDialog(); });
    document.body.appendChild(o);
  }
  function welcome() {
    dialog(kapsi(110, "wow") + '<h3>Hallo, ich bin Kapsi!</h3><p>Mit mir lernst du die wichtigsten Medikamente in kleinen Häppchen: Gruppe, Einsatz, Wirkung, Nebenwirkungen und Pflege-Tipps.<br><br><b style="color:#16302F">Hinweis:</b> Lernhilfe für Pflegekräfte – ersetzt keine Fachinformation oder ärztliche Anordnung. Keine Dosierungen.</p><div class="row"><button class="btn block" data-act="welcome-ok">Los geht\'s</button></div>', { sticky: true });
  }
  function heartsRow() { let s = '<div class="hearts-big">'; for (let i = 0; i < MAX_HEARTS; i++) s += i < S.hearts ? ic("heart") : '<span class="e">' + ic("heart") + "</span>"; return s + "</div>"; }
  function heartsDialog() {
    refillHearts();
    const full = S.hearts >= MAX_HEARTS;
    dialog(heartsRow() + "<h3>" + S.hearts + " von " + MAX_HEARTS + " Herzen</h3><p>" + (full ? "Deine Herzen sind voll. Jeder Fehler in einer Lektion kostet ein Herz." : "Nächstes Herz in ca. " + nextHeartMin() + " Min. Ein Training füllt alle Herzen sofort wieder auf – dort kosten Fehler nichts.") + '</p><div class="row">' + (full ? "" : '<button class="btn block" data-act="practice">Training starten</button>') + '<button class="btn ghost block" data-act="close">OK</button></div>');
  }
  function noHearts() {
    dialog(kapsi(100, "sad") + '<h3>Keine Herzen mehr</h3><p>Mach ein kurzes Training: Dort kosten Fehler nichts und danach sind alle Herzen wieder voll.</p><div class="row"><button class="btn block" data-act="practice">Training starten</button><button class="btn ghost block" data-act="close">Später</button></div>');
  }

  // ---------- Lektionen ----------
  let L = null;
  const KIND = { use: ["target", "Einsatzgebiet"], group: ["tag", "Gruppe"], nameByGroup: ["pill", "Wirkstoff finden"], nameByUse: ["pill", "Wirkstoff finden"], nw: ["alert", "Nebenwirkung"], pflege: ["care", "Pflege"], wirkung: ["bolt", "Wirkung"], suffix: ["search", "Endungs-Detektiv"], tf: ["question", "Stimmt das?"], match: ["puzzle", "Paare finden"] };
  const kindTag = (k) => '<div class="qkind">' + ic(KIND[k][0]) + KIND[k][1] + "</div>";

  function startNode(id) {
    const node = NODE_BY_ID[id];
    if (!node || (!unlocked(node) && !S.done[node.id])) return;
    refillHearts();
    openNode = null;
    if (S.hearts <= 0) { render(); noHearts(); return; }
    beginLesson({ node, mode: node.type, steps: buildLesson(node), repeat: !!S.done[node.id] });
  }
  function startPractice() {
    closeDialog();
    let seen = ALL.filter((d) => S.ds[d.id]);
    if (seen.length < 3) { const n = currentNode() || NODES[0]; seen = n.drugIds.map((id) => BY_ID[id]); }
    const scored = seen.map((d) => { const s = S.ds[d.id] || { r: 0, w: 0 }; return [d, (s.w + 1) / (s.r + 1) + Math.random() * 0.8]; }).sort((a, b) => b[1] - a[1]);
    beginLesson({ node: { id: "practice", title: "Training" }, mode: "practice", steps: buildPractice(scored.slice(0, 6).map((x) => x[0]), 9), repeat: false });
  }
  function beginLesson(o) {
    L = Object.assign(o, { i: 0, sel: null, phase: "answer", answered: 0, correct: 0, mistakes: 0, start: Date.now(), m: null });
    L.steps = L.steps.filter(Boolean);
    let el = $("#lesson");
    if (!el) { el = document.createElement("div"); el.id = "lesson"; el.className = "lesson"; document.body.appendChild(el); }
    document.body.style.overflow = "hidden";
    renderLesson();
  }
  function endLesson() {
    const el = $("#lesson"); if (el) el.remove();
    document.querySelectorAll(".confetti").forEach((c) => c.remove());
    document.body.style.overflow = "";
    L = null; render();
  }

  function renderLesson() {
    const el = $("#lesson"); if (!el || !L) return;
    const st = L.steps[L.i];
    const pct = (L.i / L.steps.length) * 100;
    const right = L.mode === "practice" ? '<span class="chip-stat" style="color:var(--petrol)">' + ic("repeat") + "<span>Training</span></span>" : '<span class="chip-stat heart">' + ic("heart") + "<span>" + S.hearts + "</span></span>";
    let body = "", foot = "";
    const disabled = L.phase !== "answer" ? " disabled" : "";
    if (st.type === "intro") {
      const d = BY_ID[st.drugId];
      body = '<div class="newtag">' + ic("star") + "Neue Karte</div>" + card(d, UNIT_BY_ID[d.unit].title);
      foot = '<button class="btn block" data-act="next">Verstanden</button>';
    } else if (st.type === "mc") {
      body = kindTag(st.kind) + '<div class="qhead">' + kapsi(64, st.kind === "suffix" ? "wow" : "happy") + '<div class="q">' + st.prompt + '</div></div><div class="opts">'
        + st.options.map((o, i) => '<button class="opt' + optCls(st, o) + '" data-act="opt" data-i="' + i + '"' + disabled + '><span class="k">' + "ABCD"[i] + "</span><span>" + esc(o) + "</span></button>").join("") + "</div>";
      foot = '<button class="btn block" data-act="check"' + (L.sel === null ? " disabled" : "") + ">Prüfen</button>";
    } else if (st.type === "tf") {
      body = kindTag("tf") + '<div class="qhead">' + kapsi(64) + '<div class="q">' + st.prompt + '</div></div><div class="tfrow">'
        + [true, false].map((v, i) => '<button class="opt' + optCls(st, v) + '" data-act="opt" data-i="' + i + '"' + disabled + ">" + ic(v ? "thumbUp" : "thumbDown") + (v ? "Stimmt" : "Stimmt nicht") + "</button>").join("") + "</div>";
      foot = '<button class="btn block" data-act="check"' + (L.sel === null ? " disabled" : "") + ">Prüfen</button>";
    } else if (st.type === "match") {
      if (!L.m) L.m = { left: null, right: null, done: new Set(), rightOrder: shuffle(st.pairs.map((_, i) => i)), errors: 0 };
      const m = L.m;
      body = kindTag("match") + '<div class="qtitle">Wirkstoff ↔ ' + esc(st.label) + '</div><div class="match"><div class="col">'
        + st.pairs.map((p, i) => '<button class="mt' + (m.done.has(i) ? " gone" : m.left === i ? " sel" : "") + '" data-act="ml" data-i="' + i + '">' + esc(p[0]) + "</button>").join("")
        + '</div><div class="col">' + m.rightOrder.map((i) => '<button class="mt' + (m.done.has(i) ? " gone" : m.right === i ? " sel" : "") + '" data-act="mr" data-i="' + i + '">' + esc(st.pairs[i][1]) + "</button>").join("") + "</div></div>";
      foot = '<button class="btn block" disabled>Tippe zusammengehörige Paare an</button>';
    }
    let footHtml = '<div class="lfoot"><div class="in">' + foot + "</div></div>";
    if (L.phase === "feedback") {
      const ok = L.lastOk;
      footHtml = '<div class="feedback ' + (ok ? "ok" : "bad") + '"><div class="in"><div class="fh"><span class="badge">' + ic(ok ? "check" : "x") + "</span><h3>" + (ok ? pick(["Richtig!", "Genau so!", "Sehr gut!", "Stark!"]) : "Nicht ganz") + "</h3></div><p>" + (L.fbText || "") + '</p><button class="btn block ' + (ok ? "" : "coral") + '" data-act="next">Weiter</button></div></div>';
    }
    el.innerHTML = '<div class="lt"><button class="x" data-act="quit" aria-label="Lektion beenden">' + ic("x") + '</button><div class="pbar"><i style="width:' + pct + '%"></i></div>' + right + '</div><div class="lbody">' + body + "</div>" + footHtml;
    const lb = $(".lbody", el); if (lb && L.phase === "answer" && !L.keepScroll) lb.scrollTop = 0;
    L.keepScroll = false;
  }
  function optCls(st, val) {
    const idx = st.type === "tf" ? [true, false].indexOf(val) : st.options.indexOf(val);
    if (L.phase === "feedback") {
      if (val === st.answer) return " right";
      if (idx === L.sel) return " wrong";
      return " dim";
    }
    return idx === L.sel ? " sel" : "";
  }
  function record(drugId, ok) {
    const s = S.ds[drugId] || (S.ds[drugId] = { r: 0, w: 0 });
    if (ok) { s.r++; S.right++; } else { s.w++; S.wrong++; }
  }
  function stripB(s) { return String(s || "").replace(/<[^>]+>/g, ""); }
  function check() {
    const st = L.steps[L.i];
    if (L.sel === null || L.phase !== "answer") return;
    const val = st.type === "tf" ? [true, false][L.sel] : st.options[L.sel];
    const ok = val === st.answer;
    L.answered++;
    record(st.drugId, ok);
    if (ok) { L.correct++; SND.ok(); L.fbText = esc(stripB(st.explain)); }
    else {
      L.mistakes++; SND.bad();
      if (L.mode !== "practice") S.hearts = Math.max(0, S.hearts - 1);
      L.fbText = "Richtig ist: <b>" + esc(st.type === "tf" ? (st.answer ? "Stimmt" : "Stimmt nicht") : st.answer) + "</b><br>" + esc(stripB(st.explain));
      if (!st.retried) L.steps.push(Object.assign({}, st, { retried: true }));
    }
    L.lastOk = ok; L.phase = "feedback"; L.keepScroll = true;
    renderLesson();
  }
  function next() {
    if (L.phase === "feedback" && !L.lastOk && L.mode !== "practice" && S.hearts <= 0) { save(); endLesson(); noHearts(); return; }
    const st = L.steps[L.i];
    if (st && st.type === "intro") { const s = S.ds[st.drugId] || (S.ds[st.drugId] = { r: 0, w: 0 }); s.seen = 1; }
    L.i++; L.sel = null; L.phase = "answer"; L.m = null;
    if (L.i >= L.steps.length) { finish(); return; }
    renderLesson();
  }
  function matchTap(side, i) {
    const st = L.steps[L.i], m = L.m;
    if (m.done.has(i)) return;
    SND.tap();
    if (side === "l") m.left = m.left === i ? null : i; else m.right = m.right === i ? null : i;
    if (m.left !== null && m.right !== null) {
      if (m.left === m.right) {
        m.done.add(m.left); m.left = m.right = null; SND.ok();
        if (m.done.size === st.pairs.length) {
          L.answered++; const ok = m.errors === 0; if (ok) L.correct++;
          st.drugIds.forEach((id) => record(id, ok));
          L.lastOk = true; L.fbText = m.errors ? "Alle Paare gefunden (" + m.errors + " Fehlversuch" + (m.errors > 1 ? "e" : "") + ")." : "Alle Paare auf Anhieb richtig!";
          L.phase = "feedback"; renderLesson(); return;
        }
        renderLesson();
      } else {
        m.errors++; SND.bad();
        const l = m.left, r = m.right; m.left = m.right = null;
        renderLesson();
        const el = $("#lesson");
        [el.querySelector('[data-act="ml"][data-i="' + l + '"]'), el.querySelector('[data-act="mr"][data-i="' + r + '"]')].forEach((x) => x && x.classList.add("bad"));
      }
    } else renderLesson();
  }
  function finish() {
    const first = !L.repeat;
    let xp = L.mode === "practice" ? 10 : L.mode === "review" ? (first ? 15 : 5) : first ? 10 : 5;
    const perfect = L.mistakes === 0;
    if (perfect && L.mode !== "practice") xp += 5;
    const today = dayKey();
    const before = streakNow();
    if (S.lastDay !== today) { S.streak = S.lastDay === yesterdayKey() ? S.streak + 1 : 1; S.lastDay = today; }
    if (S.daily.day !== today) S.daily = { day: today, xp: 0 };
    S.daily.xp += xp; S.xp += xp; S.lessons++;
    if (L.node.id !== "practice") S.done[L.node.id] = (S.done[L.node.id] || 0) + 1;
    if (L.mode === "practice") { S.hearts = MAX_HEARTS; S.heartTs = Date.now(); }
    save();
    SND.win();
    const acc = L.answered ? Math.round((L.correct / L.answered) * 100) : 100;
    const secs = Math.round((Date.now() - L.start) / 1000);
    const time = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
    const streakUp = S.streak > before;
    const tile = (icon, tc, tb, v, t) => '<div class="tile" style="--tc:' + tc + ";--tb:" + tb + '"><div class="ti">' + ic(icon) + '</div><div class="tv">' + v + '</div><div class="th">' + t + "</div></div>";
    const title = L.mode === "practice" ? "Training geschafft!" : perfect ? "Fehlerfrei!" : L.mode === "review" ? "Station gemeistert!" : "Lektion geschafft!";
    $("#lesson").innerHTML = '<div class="lbody"><div class="result">' + kapsi(140, "wow") + "<h2>" + title + "</h2><p>" + (streakUp ? "🔥 " + S.streak + (S.streak === 1 ? " Tag" : " Tage") + " in Folge!" : L.mode === "practice" ? "Deine Herzen sind wieder voll." : "Kapsi ist stolz auf dich.") + '</p><div class="tiles">' + tile("star", C.sand, C.sandS, "+" + xp, "Punkte") + tile("target", C.petrol, C.petrolS, acc + " %", "Treffer") + tile("clock", C.plum, C.plumS, time, "Zeit") + '</div></div></div><div class="lfoot"><div class="in"><button class="btn block" data-act="done">Weiter</button></div></div>';
    confetti();
    L.phase = "result";
  }
  function confetti() {
    const c = document.createElement("div"); c.className = "confetti";
    const cols = ["#0E7C7B", "#FF6B5B", "#E9A93A", "#16A39F", "#FFB4A9", "#7E62C4"];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + "s"; p.style.animationDelay = Math.random() * 0.5 + "s";
      if (i % 3 === 0) { p.style.width = "10px"; p.style.height = "10px"; p.style.borderRadius = "50%"; }
      c.appendChild(p);
    }
    document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
  }
  function quitLesson() {
    if (!L || L.phase === "result") { endLesson(); return; }
    dialog(kapsi(90, "sad") + '<h3>Wirklich aufhören?</h3><p>Dein Fortschritt in dieser Lektion geht verloren.</p><div class="row"><button class="btn block" data-act="close">Weiterlernen</button><button class="btn danger block" data-act="quit-yes">Beenden</button></div>');
  }

  // ---------- Ereignisse ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const a = t.dataset.act, id = t.dataset.id;
    switch (a) {
      case "nav": view = t.dataset.v; openNode = null; location.hash = view; render(); window.scrollTo(0, 0); break;
      case "node": openNode = openNode === id ? null : id; render(); break;
      case "start": startNode(id); break;
      case "practice": closeDialog(); startPractice(); break;
      case "hearts": heartsDialog(); break;
      case "drug": sheet(card(BY_ID[id])); break;
      case "lexunit": lexUnit = id; render(); break;
      case "close": closeDialog(); break;
      case "welcome-ok": S.disc = true; save(); closeDialog(); SND.tap(); break;
      case "sound": S.sound = !S.sound; save(); render(); break;
      case "reset": dialog(kapsi(90, "sad") + '<h3>Alles zurücksetzen?</h3><p>Punkte, Serie und alle Lektionen werden gelöscht.</p><div class="row"><button class="btn coral block" data-act="reset-yes">Zurücksetzen</button><button class="btn ghost block" data-act="close">Abbrechen</button></div>'); break;
      case "reset-yes": { const snd = S.sound; S = DEFAULT(); S.sound = snd; S.disc = true; save(); closeDialog(); render(); break; }
      case "opt": if (L && L.phase === "answer") { L.sel = +t.dataset.i; L.keepScroll = true; SND.tap(); renderLesson(); } break;
      case "check": check(); break;
      case "next": next(); break;
      case "ml": matchTap("l", +t.dataset.i); break;
      case "mr": matchTap("r", +t.dataset.i); break;
      case "quit": quitLesson(); break;
      case "quit-yes": closeDialog(); save(); endLesson(); break;
      case "done": endLesson(); break;
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "lexq") { lexQ = e.target.value; const l = $("#lexlist"); if (l) l.innerHTML = lexList(); }
  });
  document.addEventListener("keydown", (e) => {
    if (!L || $("#dlg")) return;
    const st = L.steps[L.i];
    if (L.phase === "answer" && st && (st.type === "mc" || st.type === "tf")) {
      const max = st.type === "tf" ? 2 : st.options.length;
      let n = parseInt(e.key, 10);
      if (isNaN(n)) { const k = "abcd".indexOf(e.key.toLowerCase()); if (k >= 0) n = k + 1; }
      if (n >= 1 && n <= max) { L.sel = n - 1; L.keepScroll = true; renderLesson(); return; }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (L.phase === "result") endLesson();
      else if (L.phase === "feedback" || (st && st.type === "intro")) next();
      else check();
    }
  });
  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (["lernen", "lexikon", "profil"].includes(h) && h !== view && !L) { view = h; render(); }
  });
  setInterval(() => { if (!L && !$("#dlg") && S.hearts < MAX_HEARTS) { const h = S.hearts; refillHearts(); if (S.hearts !== h) { save(); render(); } } }, 30000);

  // ---------- Start ----------
  const h0 = location.hash.slice(1);
  if (["lernen", "lexikon", "profil"].includes(h0)) view = h0;
  refillHearts();
  render();
  if (!S.disc) welcome();
  initCloud();
})();
