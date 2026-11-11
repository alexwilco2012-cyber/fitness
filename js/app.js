import { START, WEEKS, ORDER, SESSIONS, PHASES, START_LIFTS, REVIEW_DATES, REVIEW_QUESTIONS, GUIDE, findExercise } from './programme.js';
import { FORM } from './form.js';
import * as store from './store.js';

// ---------- helpers ----------

const $ = sel => document.querySelector(sel);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const fmt = (s, opts) => parse(s).toLocaleDateString('en-GB', opts);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toNum = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const show = n => (n == null || n === '' ? '' : String(Math.round(n * 100) / 100));
const round25 = n => Math.round(n / 2.5) * 2.5;
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const weekOf = date => Math.floor(daysBetween(START, date) / 7) + 1;
const phaseOf = week => PHASES.find(p => week >= p.from && week <= p.to) || null;
const targetSets = (ex, week) => (week === 7 ? Math.min(ex.sets, 2) : ex.sets);
const range = ex => (ex.lo === ex.hi ? `${ex.lo}` : `${ex.lo}–${ex.hi}`) + (ex.side ? ' each side' : '');
const restText = ex => (ex.rest ? (ex.rest >= 120 ? `${ex.rest / 60} min rest` : `${ex.rest} sec rest`) + (/[ab]$/.test(ex.tag) ? ' after the pair' : '') : `straight to ${ex.next}`);

const finished = () => store.list('sessions').filter(s => s.end).sort((a, b) => a.start - b.start);
const active = () => store.list('sessions').find(s => !s.end) || null;
function nextType() {
  const done = finished();
  if (!done.length) return 'A';
  return ORDER[(ORDER.indexOf(done[done.length - 1].type) + 1) % ORDER.length];
}
function lastSetsFor(exId) {
  const done = finished();
  for (let i = done.length - 1; i >= 0; i--) {
    const sets = (done[i].sets[exId] || []).filter(x => x.done);
    if (sets.length) return { sets, date: done[i].date };
  }
  return null;
}
// What to load on the bar today, and why.
function plan(ex) {
  const last = lastSetsFor(ex.id);
  if (last) {
    const top = last.sets.length >= 2 && last.sets.every(x => (x.r || 0) >= ex.hi);
    if (top && typeof ex.inc === 'number') {
      return { weights: last.sets.map(x => (x.w ? x.w + ex.inc : x.w)), hint: `Every set hit ${ex.hi} last time. Up ${ex.inc} kg today.`, last };
    }
    if (top && ex.inc === 'plate') {
      return { weights: last.sets.map(x => x.w), hint: `Every set hit ${ex.hi} last time. Add one plate or the micro plate.`, last };
    }
    return { weights: last.sets.map(x => x.w), hint: '', last };
  }
  const lw = store.state.settings.lastWeights[ex.id];
  if (lw) return { weights: [round25(lw * 0.725)], hint: `Starting at 70–75% of ${show(lw)} kg.`, last: null };
  return { weights: [], hint: '', last: null };
}
function foodTotals(date) {
  let kcal = 0, protein = 0;
  for (const f of store.list('food')) if (f.date === date) { kcal += f.kcal || 0; protein += f.protein || 0; }
  return { kcal: Math.round(kcal), protein: Math.round(protein) };
}

// ---------- UI state ----------

let foodDate = today();
let liftSel = 'squat';
let sheet = null;
let rest = null;
let audio = null;

const route = () => {
  const r = location.hash.slice(1);
  return ['today', 'train', 'food', 'progress', 'settings'].includes(r) ? r : 'today';
};

function render() {
  const r = route();
  $('#view').innerHTML = views[r]();
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === r));
}

// ---------- shared pieces ----------

function meter(label, value, unit, target, zoneMin) {
  const max = Math.max(target || 0, value, 1);
  const pct = Math.min(100, (value / max) * 100);
  const over = unit === 'kcal' && target && value > target;
  const goal = target ? (zoneMin ? `${zoneMin}–${target} ${unit}` : `${target} ${unit}`) : 'no target set';
  const zone = zoneMin && target ? `<span class="zone" style="left:${(zoneMin / max) * 100}%"></span>` : '';
  return `<div class="meter"><div class="top"><span>${label}</span><span><b>${value}</b> <span class="muted">/ ${goal}</span></span></div>
    <div class="bar${over ? ' over' : ''}"><i style="width:${pct}%"></i>${zone}</div></div>`;
}
function nutritionCard(date, withButton) {
  const s = store.state.settings;
  const t = foodTotals(date);
  return `<div class="card"><h3>${date === today() ? 'Eaten today' : 'Eaten'}</h3>
    ${meter('Protein', t.protein, 'g', s.proteinMax, s.proteinMin)}
    ${meter('Calories', t.kcal, 'kcal', s.kcal)}
    ${withButton ? '<div style="margin-top:14px"><button class="btn block" data-act="food-open">Add food</button></div>' : ''}
  </div>`;
}
function weekDots() {
  const t = today();
  const monday = addDays(t, -((parse(t).getDay() + 6) % 7));
  const done = finished().filter(s => s.date >= monday && s.date <= addDays(monday, 6));
  const cells = [0, 1, 2].map(i => {
    const s = done[i];
    return `<div class="dot${s ? ' done' : ''}">${s ? s.type : '·'}<small>${s ? fmt(s.date, { weekday: 'short' }) : 'to do'}</small></div>`;
  }).join('');
  return `<div class="card"><h3>This week</h3><div class="dots">${cells}</div></div>`;
}
// Setup, movement steps, faults to watch for and a demo link for one exercise.
function howBlock(ex, summary, extra = '') {
  const f = FORM[ex.id] || { how: [], watch: [] };
  const demo = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name.split(',')[0]} ${ex.kit === 'Smith' ? 'smith machine ' : ''}proper form`)}`;
  return `<details class="how"><summary>${summary}</summary>
    <h4>Setup</h4><p>${esc(ex.setup)}</p>
    ${f.how.length ? `<h4>The movement</h4><ol>${f.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${f.watch.length ? `<h4>Watch for</h4><ul>${f.watch.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${extra}
    <a href="${demo}" target="_blank" rel="noopener">Watch a demo on YouTube</a></details>`;
}
const weights = () => store.list('body').filter(b => b.weight).sort((a, b) => a.date.localeCompare(b.date));
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${show(Math.abs(n))}`;
function weightCard() {
  const w = weights();
  const first = w[0], last = w[w.length - 1];
  const goal = store.state.settings.goalWeight;
  let line = 'Log your weight to start the tracker.';
  if (last) {
    const parts = [`Last logged ${last.date === today() ? 'today' : fmt(last.date, { weekday: 'short', day: 'numeric', month: 'short' })}`];
    if (w.length > 1) parts.push(`${signed(last.weight - first.weight)} kg since ${fmt(first.date, { day: 'numeric', month: 'short' })}`);
    if (goal && last.weight > goal) parts.push(`${show(last.weight - goal)} kg to goal`);
    line = parts.join(' · ');
  }
  return `<div class="card"><div class="row between"><h3 style="margin:0">Weight</h3><a class="small" href="#progress" style="color:var(--accent-text);font-weight:600;text-decoration:none">Graph</a></div>
    <div class="row" style="margin-top:8px"><div class="grow"><span class="big num">${last ? show(last.weight) : '–'}</span> <span class="muted">kg</span></div>
      <input id="w-quick" type="text" inputmode="decimal" placeholder="Today, kg" aria-label="Today's weight in kg" style="width:112px"><button class="btn primary" data-act="weight-quick">Log</button></div>
    <p class="muted small" style="margin-top:6px">${line}</p></div>`;
}
function weightStats() {
  const w = weights();
  if (!w.length) return '';
  const first = w[0], last = w[w.length - 1];
  const goal = store.state.settings.goalWeight;
  const tile = (label, value) => `<div class="stat"><span>${label}</span><b class="num">${value}</b></div>`;
  return `<div class="stats">${tile('Start', show(first.weight))}${tile('Now', show(last.weight))}${tile('Change', signed(last.weight - first.weight))}${tile('To goal', goal ? (last.weight > goal ? show(last.weight - goal) : 'Reached') : '–')}</div>`;
}
function lineChart(points, unit, goal = null) {
  if (!points.length) return '<p class="muted small">Nothing logged yet.</p>';
  if (points.length === 1) return `<p class="small"><b>${show(points[0].y)} ${unit}</b> <span class="muted">on ${fmt(points[0].x, { day: 'numeric', month: 'short' })}. One more entry draws the trend.</span></p>`;
  const W = 340, H = 150, L = 36, R = 48, T = 12, B = 22;
  const xs = points.map(p => parse(p.x).getTime());
  const ys = points.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (goal != null) { lo = Math.min(lo, goal); hi = Math.max(hi, goal); }
  if (hi === lo) { hi += 1; lo -= 1; }
  const padY = (hi - lo) * 0.12; lo -= padY; hi += padY;
  const x0 = xs[0], x1 = xs[xs.length - 1] || x0 + 1;
  const px = x => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const py = y => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const grid = [0, 0.5, 1].map(f => {
    const v = lo + (hi - lo) * f, y = py(v);
    return `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${Math.round(v * 10) / 10}</text>`;
  }).join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(xs[i]).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  const dots = points.length <= 30 ? points.map((p, i) => `<circle class="pt" cx="${px(xs[i]).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="3"/>`).join('') : '';
  const lastP = points[points.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend, latest ${show(lastP.y)} ${unit}">
    ${grid}${goal != null ? `<line class="goal" x1="${L}" x2="${W - R}" y1="${py(goal)}" y2="${py(goal)}"/><text x="${W - R + 8}" y="${py(goal) + 4}">Goal</text>` : ''}<path class="ln" d="${path}"/>${dots}
    <text class="last" x="${W - R + 8}" y="${py(lastP.y) + 4}">${show(lastP.y)}</text>
    <text x="${L}" y="${H - 4}">${fmt(points[0].x, { day: 'numeric', month: 'short' })}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end">${fmt(lastP.x, { day: 'numeric', month: 'short' })}</text>
  </svg>`;
}

// ---------- views ----------

const views = {
  today() {
    const t = today();
    const week = weekOf(t);
    const phase = phaseOf(week);
    let status;
    if (week < 1) {
      const n = daysBetween(t, START);
      status = `Programme starts ${fmt(START, { weekday: 'long', day: 'numeric', month: 'long' })}, in ${n} day${n === 1 ? '' : 's'}`;
    } else if (week > WEEKS) status = '12 weeks done. Run the full review and decide what comes next.';
    else status = `Week ${week} of ${WEEKS} · ${phase.name}`;

    const act = active();
    const doneToday = finished().some(s => s.date === t);
    const type = act ? act.type : nextType();
    const S = SESSIONS[type];
    const dow = parse(t).getDay();
    const trainingDay = week >= 1 && [1, 3, 5].includes(dow);
    let sessionCard;
    if (doneToday && !act) {
      sessionCard = `<div class="card"><h3>Training</h3><h2>Done for today</h2><p class="muted small" style="margin-top:4px">Next up: ${SESSIONS[nextType()].name}, ${esc(SESSIONS[nextType()].focus.toLowerCase())}.</p></div>`;
    } else {
      const main = S.exercises.filter(e => !e.finisher && !e.optional).map(e => esc(e.name)).join(', ');
      sessionCard = `<div class="card hl"><h3>${act ? 'In progress' : trainingDay ? 'Today’s session' : 'Next session'}</h3>
        <h2>${S.name}: ${esc(S.focus.toLowerCase())}</h2>
        <p class="muted small" style="margin:4px 0 14px">${main}${!act && !trainingDay ? `. Usually ${S.day}.` : ''}</p>
        <button class="btn primary block" data-act="${act ? 'go-train' : 'start'}" data-type="${type}">${act ? 'Carry on' : 'Start session'}</button></div>`;
    }
    const tips = [];
    if (phase) tips.push(phase.note);
    if (dow === 0 || dow === 2) tips.push('Set the bar, pins and bench up tonight, so 5:30 is only getting dressed and lifting.');
    const review = REVIEW_DATES.find(d => Math.abs(daysBetween(t, d)) <= 3);
    if (review) tips.push(`Review is due ${fmt(review, { weekday: 'long', day: 'numeric', month: 'long' })}. The checklist is on the Progress tab.`);

    return `<div class="head"><div><h1>${fmt(t, { weekday: 'long' })}</h1><div class="sub">${fmt(t, { day: 'numeric', month: 'long' })} · ${status}</div></div></div>
      ${sessionCard}
      ${nutritionCard(t, true)}
      ${weightCard()}
      ${weekDots()}
      ${tips.length ? `<div class="card"><h3>Keep in mind</h3><div class="stack small">${tips.map(x => `<p>${esc(x)}</p>`).join('')}</div></div>` : ''}`;
  },

  train() {
    const act = active();
    if (act) return trainActive(act);
    const next = nextType();
    const cards = ORDER.map(k => {
      const S = SESSIONS[k];
      const lifts = S.exercises.filter(e => !e.optional).map(e => esc(e.name)).join(' · ');
      return `<div class="card${k === next ? ' hl' : ''}">
        <div class="row between"><h2>${S.name}</h2>${k === next ? '<span class="pill">Next in order</span>' : `<span class="pill plain">${S.day}</span>`}</div>
        <p class="small" style="margin-top:2px">${esc(S.focus)} <span class="muted">· ${esc(S.when)}</span></p>
        <p class="muted small" style="margin:6px 0 12px">${lifts}</p>
        <button class="btn ${k === next ? 'primary' : ''} block" data-act="start" data-type="${k}">Start ${S.name}</button>
        <details class="how" style="margin-top:10px"><summary>Exercise guide</summary><div class="guide-list">${S.exercises.map(e => howBlock(e, `${e.tag} · ${esc(e.name)} <span style="font-weight:400">· ${targetSets(e, 1)} × ${range(e)}</span>`)).join('')}</div></details></div>`;
    }).join('');
    const hist = finished().reverse().slice(0, 30).map(s => {
      const S = SESSIONS[s.type];
      const first = S.exercises[0];
      const sets = (s.sets[first.id] || []).filter(x => x.done);
      const total = Object.values(s.sets).reduce((n, a) => n + a.filter(x => x.done).length, 0);
      const mins = Math.max(1, Math.round((s.end - s.start) / 60000));
      return `<div class="item"><div class="grow"><div class="name">${S.name} <span class="muted" style="font-weight:400">· ${fmt(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
        <div class="meta">${sets.length ? `${esc(first.name.split(',')[0])} ${sets.map(x => `${show(x.w)}×${x.r}`).join(', ')} · ` : ''}${total} sets · ${mins} min</div></div>
        <button class="icon-btn" data-act="session-del" data-id="${s.id}" aria-label="Delete session">×</button></div>`;
    }).join('');
    return `<div class="head"><div><h1>Train</h1><div class="sub">Miss one? Do the next in order. Never double up.</div></div></div>
      ${cards}
      <div class="card"><h3>History</h3>${hist || '<p class="muted small">Finished sessions show here.</p>'}</div>`;
  },

  food() {
    const entries = store.list('food').filter(f => f.date === foodDate).sort((a, b) => a.t - b.t);
    const favs = store.list('favs').sort((a, b) => a.name.localeCompare(b.name));
    const favNames = new Set(favs.map(f => f.name));
    const recent = [];
    for (const f of store.list('food').sort((a, b) => b.t - a.t)) {
      if (f.id.startsWith('nc-') || favNames.has(f.name) || recent.some(r => r.name === f.name)) continue;
      recent.push(f);
      if (recent.length >= 8) break;
    }
    const chip = (f, kind) => `<button class="chip" data-act="food-again" data-kind="${kind}" data-id="${f.id}"><b>${esc(f.name)}</b><span>${f.kcal} kcal · ${show(f.protein)} g</span></button>`;
    const chips = [...favs.map(f => chip(f, 'favs')), ...recent.map(f => chip(f, 'food'))].join('');
    const label = foodDate === today() ? 'Today' : foodDate === addDays(today(), -1) ? 'Yesterday' : fmt(foodDate, { weekday: 'short', day: 'numeric', month: 'short' });
    return `<div class="head"><div><h1>Food</h1><div class="sub">${label}</div></div>
        <div class="datenav"><button data-act="food-day" data-d="-1" aria-label="Previous day">‹</button><button data-act="food-day" data-d="1" aria-label="Next day" ${foodDate >= today() ? 'disabled' : ''}>›</button></div></div>
      ${nutritionCard(foodDate, false)}
      <button class="btn primary block" data-act="food-open" style="margin-bottom:8px">Add food</button>
      <button class="btn block" data-act="nc-open" style="margin-bottom:12px">Enter the day’s totals from Nutracheck</button>
      ${chips ? `<div class="card"><h3>Tap to add again</h3><div class="chips">${chips}</div></div>` : ''}
      <div class="card"><h3>Logged</h3>${entries.map(f => `<div class="item"><div class="grow"><div class="name">${esc(f.name)}</div></div>
        <div class="val">${f.kcal} kcal<br><span class="muted">${show(f.protein)} g protein</span></div>
        <button class="icon-btn" data-act="food-del" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">×</button></div>`).join('') || '<p class="muted small">Nothing logged for this day. Protein first, while the appetite lasts.</p>'}</div>`;
  },

  progress() {
    const body = store.list('body').sort((a, b) => a.date.localeCompare(b.date));
    const weight = body.filter(b => b.weight).map(b => ({ x: b.date, y: b.weight }));
    const waist = body.filter(b => b.waist).map(b => ({ x: b.date, y: b.waist }));
    const tracked = ORDER.flatMap(k => SESSIONS[k].exercises).filter(e => !e.optional);
    const liftPts = finished().map(s => {
      const sets = (s.sets[liftSel] || []).filter(x => x.done && x.w);
      return sets.length ? { x: s.date, y: Math.max(...sets.map(x => x.w)) } : null;
    }).filter(Boolean);
    const nowWeek = weekOf(today());
    const done = finished();
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const n = Math.min(3, done.filter(s => weekOf(s.date) === i + 1).length);
      return `<div class="w${i + 1 === nowWeek ? ' now' : ''}">${[2, 1, 0].map(j => `<div class="c${j < n ? ' done' : ''}"></div>`).join('')}<div class="lbl">${i + 1}</div></div>`;
    }).join('');
    const reviews = store.state.settings.reviews || {};
    const reviewCards = REVIEW_DATES.map(d => `<div class="card"><h3>Review · ${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      ${REVIEW_QUESTIONS.map((q, i) => `<label class="check"><input type="checkbox" data-review="${d}" data-i="${i}" ${reviews[d]?.[i] ? 'checked' : ''}><span>${esc(q)}</span></label>`).join('')}</div>`).join('');
    const latest = body[body.length - 1];
    return `<div class="head"><div><h1>Progress</h1><div class="sub">Waist down, lifts holding or rising. That is the result.</div></div></div>
      <div class="card"><h3>Log a measurement</h3>
        <div class="grid2"><label class="field">Weight, kg<input id="b-weight" type="text" inputmode="decimal" placeholder="${latest?.weight ? show(latest.weight) : ''}"></label>
        <label class="field">Waist at navel, cm<input id="b-waist" type="text" inputmode="decimal" placeholder="${latest?.waist ? show(latest.waist) : ''}"></label></div>
        <div class="row" style="margin-top:10px"><input id="b-date" type="date" value="${today()}" max="${today()}" aria-label="Date"><button class="btn primary" data-act="body-save">Save</button></div></div>
      <div class="card"><h3>Body weight, kg</h3>${weightStats()}${lineChart(weight, 'kg', weight.length > 1 ? store.state.settings.goalWeight : null)}</div>
      <div class="card"><h3>Waist, cm</h3>${lineChart(waist, 'cm')}</div>
      <div class="card"><h3>Heaviest set per session, kg</h3>
        <select id="lift-sel" aria-label="Lift">${tracked.map(e => `<option value="${e.id}" ${e.id === liftSel ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
        ${lineChart(liftPts, 'kg')}</div>
      <div class="card"><h3>Sessions by week</h3><div class="weeks">${weeks}</div></div>
      ${reviewCards}
      ${body.length ? `<div class="card"><h3>Measurements</h3>${body.slice().reverse().slice(0, 20).map(b => `<div class="item"><div class="grow"><div class="name">${fmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div></div>
        <div class="val">${b.weight ? `${show(b.weight)} kg` : ''}${b.weight && b.waist ? ' · ' : ''}${b.waist ? `${show(b.waist)} cm` : ''}</div>
        <button class="icon-btn" data-act="body-del" data-id="${b.id}" aria-label="Delete measurement">×</button></div>`).join('')}</div>` : ''}`;
  },

  settings() {
    const s = store.state.settings;
    const cfg = store.syncCfg();
    const rows = START_LIFTS.map(id => {
      const ex = findExercise(id);
      const lw = s.lastWeights[id];
      return `<tr><td>${esc(ex.name)}</td><td class="r"><input type="text" inputmode="decimal" data-lw="${id}" value="${show(lw)}" aria-label="Last working weight, ${esc(ex.name)}"></td>
        <td class="r num">${lw ? `${show(round25(lw * 0.7))}–${show(round25(lw * 0.75))}` : '–'}</td></tr>`;
    }).join('');
    return `<div class="head"><div><h1>More</h1><div class="sub">Targets, starting weights, sync and the programme notes</div></div></div>
      <div class="card"><h3>Daily targets</h3>
        <label class="field">Goal body weight, kg<input type="text" inputmode="decimal" data-set="goalWeight" value="${show(s.goalWeight)}"></label>
        <div class="grid2" style="margin-top:10px"><label class="field">Protein from, g<input type="text" inputmode="numeric" data-set="proteinMin" value="${show(s.proteinMin)}"></label>
        <label class="field">Protein to, g<input type="text" inputmode="numeric" data-set="proteinMax" value="${show(s.proteinMax)}"></label></div>
        <p class="muted small" style="margin-top:6px">1.6–2.0 g per kg of goal weight is ${s.goalWeight ? `${Math.round(s.goalWeight * 1.6)}–${Math.round(s.goalWeight * 2)} g` : 'worked out once a goal weight is set'}. <button class="btn sm ghost" data-act="protein-auto">Use that</button></p>
        <label class="field" style="margin-top:10px">Calories, kcal<input type="text" inputmode="numeric" data-set="kcal" value="${show(s.kcal)}" placeholder="Not set"></label></div>
      <div class="card"><h3>Starting weights</h3>
        <p class="muted small" style="margin-bottom:8px">Enter your last working weight from Hevy. Week 1 starts at 70–75% of it, and the app fills that in when you start a session.</p>
        <table class="plain"><tr><th>Lift</th><th class="r">Last, kg</th><th class="r">Wk 1</th></tr>${rows}</table></div>
      <div class="card"><h3>Sync to your private GitHub repo</h3>
        <p class="muted small" style="margin-bottom:10px">Without this, everything stays on this device only. With it, your log is saved as data.json in a private repo and shared between your phone and computer.</p>
        <div class="stack"><label class="field">Repo<input type="text" id="sync-repo" value="${esc(cfg.repo || 'alexwilco2012-cyber/fitness-data')}" placeholder="username/fitness-data" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <label class="field">Access token<input type="password" id="sync-token" value="${esc(cfg.token)}" placeholder="github_pat_…" autocomplete="off"></label>
        <div class="row"><button class="btn primary grow" data-act="sync-save">Save and sync</button>${cfg.token ? '<button class="btn danger" data-act="sync-off">Turn off</button>' : ''}</div>
        <p class="small" id="sync-stat">${syncText()}</p>
        <details class="small muted"><summary>How to make the token</summary><p style="margin-top:6px">On github.com: Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token. Under Repository access choose “Only select repositories” and pick the data repo. Under Permissions set Contents to “Read and write”. Copy the token and paste it here. It is stored on this device only.</p></details></div></div>
      <div class="card"><h3>Backup</h3><div class="row"><button class="btn grow" data-act="export">Export</button><label class="btn grow">Import<input type="file" id="import-file" accept="application/json,.json" hidden></label></div></div>
      <div class="card"><h3>Programme notes</h3>${GUIDE.map(g => `<details class="guide"><summary>${esc(g.title)}</summary><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`).join('')}
        <details class="guide"><summary>The 12 weeks</summary><ul>${PHASES.map(p => `<li>Week${p.from === p.to ? ` ${p.from}` : `s ${p.from}–${p.to}`}, ${fmt(addDays(START, (p.from - 1) * 7), { day: 'numeric', month: 'short' })} to ${fmt(addDays(START, p.to * 7 - 3), { day: 'numeric', month: 'short' })}: ${esc(p.name)}. ${esc(p.note)}</li>`).join('')}</ul></details></div>`;
  },
};

function trainActive(s) {
  const S = SESSIONS[s.type];
  const phase = phaseOf(s.week);
  const cards = S.exercises.map((ex, exIdx) => {
    const sets = s.sets[ex.id] || [];
    const p = plan(ex);
    const firstW = sets.find(x => x.w)?.w;
    const warm = exIdx === 0 && firstW ? `Warm-up: ${show(round25(firstW * 0.5))} kg, then ${show(round25(firstW * 0.75))} kg.` : exIdx === 0 ? 'Warm-up: two build-up sets, at about half and three-quarters of the working weight.' : '';
    const lastLine = p.last ? `Last time (${fmt(p.last.date, { day: 'numeric', month: 'short' })}): ${p.last.sets.map(x => `${show(x.w) || 'bw'}×${x.r}`).join(', ')}` : '';
    return `<div class="card ex"><div class="title"><span class="tag">${ex.tag}</span><h2>${esc(ex.name)}${ex.optional ? ' <span class="pill plain">Optional</span>' : ''}</h2></div>
      <div class="target">${sets.length} × ${range(ex)} · ${restText(ex)} · ${esc(ex.kit)}</div>
      ${warm ? `<div class="hint">${warm}</div>` : ''}${p.hint ? `<div class="hint">${esc(p.hint)}</div>` : ''}
      ${lastLine ? `<div class="target">${lastLine}</div>` : ''}
      ${howBlock(ex, 'How to do it')}
      <div class="unit"><span></span><span>kg</span><span></span><span>reps</span><span></span></div>
      <div class="sets" style="margin-top:0">${sets.map((x, i) => `<div class="set${x.done ? ' done' : ''}"><span class="n">${i + 1}</span>
        <input type="text" inputmode="decimal" value="${show(x.w)}" data-setin="${ex.id}:${i}:w" aria-label="${esc(ex.name)} set ${i + 1} weight">
        <span class="x">×</span>
        <input type="text" inputmode="numeric" value="${show(x.r)}" placeholder="${ex.lo === ex.hi ? ex.lo : `${ex.lo}–${ex.hi}`}" data-setin="${ex.id}:${i}:r" aria-label="${esc(ex.name)} set ${i + 1} reps">
        <button class="tick" data-act="tick" data-ex="${ex.id}" data-i="${i}" aria-label="Set ${i + 1} done" aria-pressed="${x.done}">${CHECK}</button></div>`).join('')}</div></div>`;
  }).join('');
  return `<div class="head"><div><h1>${S.name}</h1><div class="sub">Week ${s.week}${phase ? ` · ${phase.name}` : ''} · ${esc(S.focus)}</div></div></div>
    ${phase ? `<div class="card small">${esc(phase.note)}</div>` : ''}
    ${cards}
    <button class="btn primary block" data-act="finish">Finish session</button>
    <button class="btn ghost danger block" data-act="discard" style="margin-top:8px;border-color:transparent">Discard</button>`;
}

function syncText() {
  const cfg = store.syncCfg();
  if (!cfg.token || !cfg.repo) return '<span class="muted">Sync is off.</span>';
  const st = store.syncStatus();
  if (st.state === 'syncing') return '<span class="muted">Syncing…</span>';
  if (st.state === 'error') return `<span class="status-bad">Sync failed: ${esc(st.msg)}</span>`;
  if (st.state === 'ok') return `<span class="status-ok">Synced at ${new Date(st.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>`;
  return '<span class="muted">Sync is on.</span>';
}

// ---------- food sheet ----------

function renderSheet() {
  const el = $('#sheet');
  if (!sheet) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  let body;
  if (sheet.nc) {
    el.innerHTML = `<div class="panel stack" role="dialog" aria-label="Nutracheck totals">
      <div class="row between"><h2>Nutracheck totals</h2><button class="icon-btn" data-act="sheet-close" aria-label="Close">×</button></div>
      <p class="muted small">Keep logging food in Nutracheck, then copy the day’s two numbers from its diary here. Entering them again later replaces the earlier figures, so the day is never counted twice.</p>
      <div class="grid2"><label class="field">Calories, kcal<input type="text" inputmode="numeric" data-sh="kcal" value="${esc(sheet.kcal)}"></label>
      <label class="field">Protein, g<input type="text" inputmode="decimal" data-sh="protein" value="${esc(sheet.protein)}"></label></div>
      <button class="btn primary block" data-act="nc-save">Save totals</button></div>`;
    return;
  }
  if (sheet.product) {
    const p = sheet.product;
    body = `<h2>${esc(p.name)}</h2><p class="muted small">Per 100 g: ${Math.round(p.kcal)} kcal · ${show(p.protein)} g protein</p>
      <label class="field">Amount, g<input type="text" inputmode="decimal" data-sh="grams" value="${esc(sheet.grams)}"></label>
      <p id="calc" class="small">${calcText()}</p>
      <label class="check"><input type="checkbox" data-sh="fav" ${sheet.fav ? 'checked' : ''}><span>Keep as a favourite</span></label>
      <div class="row"><button class="btn" data-act="food-back">Back</button><button class="btn primary grow" data-act="food-add-product">Add</button></div>`;
  } else if (sheet.tab === 'search') {
    const res = sheet.loading ? '<p class="muted small">Searching…</p>'
      : sheet.err ? `<p class="status-bad small">${esc(sheet.err)}</p>`
      : sheet.results ? (sheet.results.map((p, i) => `<div class="item"><button class="grow" data-act="food-pick" data-i="${i}" style="all:unset;flex:1;min-width:0;cursor:pointer"><div class="name">${esc(p.name)}</div><div class="meta">${Math.round(p.kcal)} kcal · ${show(p.protein)} g protein per 100 g</div></button></div>`).join('') || '<p class="muted small">No matches with nutrition data. Try fewer words, or use Quick add.</p>')
      : '<p class="muted small">Searches Open Food Facts, a free public food database.</p>';
    body = `<form class="row" data-form="search"><input type="search" data-sh="q" value="${esc(sheet.q)}" placeholder="e.g. skyr, chicken breast" enterkeyhint="search"><button class="btn primary">Search</button></form><div>${res}</div>`;
  } else {
    const favs = store.list('favs').sort((a, b) => a.name.localeCompare(b.name));
    body = `<label class="field">What was it?<input type="text" data-sh="name" value="${esc(sheet.name)}" placeholder="e.g. Whey shake" autocomplete="off"></label>
      <div class="grid2"><label class="field">Calories, kcal<input type="text" inputmode="numeric" data-sh="kcal" value="${esc(sheet.kcal)}"></label>
      <label class="field">Protein, g<input type="text" inputmode="decimal" data-sh="protein" value="${esc(sheet.protein)}"></label></div>
      <label class="check"><input type="checkbox" data-sh="fav" ${sheet.fav ? 'checked' : ''}><span>Keep as a favourite</span></label>
      <button class="btn primary block" data-act="food-add">Add</button>
      ${favs.length ? `<div><h3 class="muted small" style="margin-top:8px">Favourites</h3>${favs.map(f => `<div class="item"><div class="grow"><div class="name">${esc(f.name)}</div><div class="meta">${f.kcal} kcal · ${show(f.protein)} g</div></div><button class="icon-btn" data-act="fav-del" data-id="${f.id}" aria-label="Remove favourite">×</button></div>`).join('')}</div>` : ''}`;
  }
  el.innerHTML = `<div class="panel stack" role="dialog" aria-label="Add food">
    <div class="row between"><h2>Add food</h2><button class="icon-btn" data-act="sheet-close" aria-label="Close">×</button></div>
    ${sheet.product ? '' : `<div class="seg"><button class="${sheet.tab === 'quick' ? 'on' : ''}" data-act="sheet-tab" data-tab="quick">Quick add</button><button class="${sheet.tab === 'search' ? 'on' : ''}" data-act="sheet-tab" data-tab="search">Search</button></div>`}
    ${body}</div>`;
}
function calcPortion() {
  const g = toNum(sheet.grams) || 0;
  return { g, kcal: Math.round((sheet.product.kcal * g) / 100), protein: Math.round((sheet.product.protein * g) / 10) / 10 };
}
function calcText() { const c = calcPortion(); return `<b>${c.kcal} kcal · ${show(c.protein)} g protein</b>`; }

async function searchFood() {
  const q = sheet.q.trim();
  if (!q) return;
  sheet.loading = true; sheet.err = ''; renderSheet();
  try {
    const url = `https://uk.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&fields=product_name,brands,nutriments,serving_quantity`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (!sheet) return;
    sheet.results = (data.products || []).map(p => ({
      name: [p.product_name, p.brands?.split(',')[0]].filter(Boolean).join(', '),
      kcal: Number(p.nutriments?.['energy-kcal_100g']),
      protein: Number(p.nutriments?.proteins_100g) || 0,
      serving: Number(p.serving_quantity) || null,
    })).filter(p => p.name && Number.isFinite(p.kcal));
  } catch {
    if (sheet) sheet.err = 'Search is not reachable right now. Use Quick add instead.';
  }
  if (sheet) { sheet.loading = false; renderSheet(); }
}

function addFood(name, kcal, protein, fav) {
  store.put('food', { id: store.uid(), date: foodDate, name, kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10 });
  if (fav && !store.list('favs').some(f => f.name === name)) store.put('favs', { id: store.uid(), name, kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10 });
}

// ---------- rest timer ----------

function beep() {
  if (!audio) return;
  try {
    [0, 0.25].forEach(at => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.25, audio.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + at + 0.18);
      o.start(audio.currentTime + at); o.stop(audio.currentTime + at + 0.2);
    });
  } catch { /* no sound available */ }
}
function startRest(secs, label) {
  rest = { end: Date.now() + secs * 1000, label, rung: false };
  drawRest();
}
function drawRest() {
  const el = $('#timer');
  if (!rest) { el.hidden = true; return; }
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0 && !rest.rung) { rest.rung = true; beep(); }
  if (left <= -20) { rest = null; el.hidden = true; return; }
  const up = left <= 0;
  const shown = Math.max(0, left);
  el.hidden = false;
  el.classList.toggle('up', up);
  el.innerHTML = `<span class="t">${Math.floor(shown / 60)}:${pad(shown % 60)}</span><span class="l">${up ? 'Go' : esc(rest.label)}</span>
    ${up ? '' : '<button data-act="rest-add">+15s</button>'}<button data-act="rest-skip">${up ? 'OK' : 'Skip'}</button>`;
}
setInterval(() => { if (rest) drawRest(); }, 500);

// ---------- actions ----------

const actions = {
  'go-train'() { location.hash = '#train'; },
  start(el) {
    if (active()) { location.hash = '#train'; return; }
    const type = el.dataset.type;
    const week = Math.min(WEEKS, Math.max(1, weekOf(today())));
    const sets = {};
    for (const ex of SESSIONS[type].exercises) {
      const p = plan(ex);
      sets[ex.id] = Array.from({ length: targetSets(ex, week) }, (_, i) => ({ w: p.weights[i] ?? p.weights[p.weights.length - 1] ?? '', r: '', done: false }));
    }
    store.put('sessions', { id: store.uid(), date: today(), type, week, start: Date.now(), end: null, sets });
    if (route() === 'train') { render(); window.scrollTo(0, 0); } else location.hash = '#train';
  },
  tick(el) {
    const s = active(); if (!s) return;
    const ex = SESSIONS[s.type].exercises.find(e => e.id === el.dataset.ex);
    const set = s.sets[ex.id][+el.dataset.i];
    if (!set.done && !set.r) {
      const input = el.parentElement.querySelector('[data-setin$=":r"]');
      input.classList.add('flash'); input.focus();
      return;
    }
    set.done = !set.done;
    store.put('sessions', s);
    if (set.done) {
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* no audio */ }
      if (ex.rest) startRest(ex.rest, `Rest after ${ex.name.toLowerCase()}`);
      else { rest = null; drawRest(); }
    }
    render();
  },
  finish() {
    const s = active(); if (!s) return;
    const total = Object.values(s.sets).reduce((n, a) => n + a.filter(x => x.done).length, 0);
    if (!total) { if (confirm('No sets ticked. Discard this session?')) actions.discard(null, true); return; }
    for (const id of Object.keys(s.sets)) s.sets[id] = s.sets[id].filter(x => x.done);
    s.end = Date.now();
    store.put('sessions', s);
    rest = null; drawRest();
    location.hash = '#today';
  },
  discard(_, sure) {
    const s = active(); if (!s) return;
    if (!sure && !confirm('Discard this session? Nothing from it will be saved.')) return;
    store.remove('sessions', s.id);
    rest = null; drawRest(); render();
  },
  'session-del'(el) { if (confirm('Delete this session from your history?')) { store.remove('sessions', el.dataset.id); render(); } },
  'rest-add'() { if (rest) { rest.end += 15000; drawRest(); } },
  'rest-skip'() { rest = null; drawRest(); },

  'food-open'() {
    if (route() !== 'food') foodDate = today();
    sheet = { tab: 'quick', name: '', kcal: '', protein: '', fav: false, q: '', results: null, loading: false, err: '', product: null, grams: '' };
    renderSheet();
  },
  'nc-open'() {
    const prev = store.state.food[`nc-${foodDate}`];
    const live = prev && !prev.del ? prev : null;
    sheet = { nc: true, kcal: live ? String(live.kcal) : '', protein: live ? String(live.protein) : '' };
    renderSheet();
  },
  'nc-save'() {
    const kcal = toNum(sheet.kcal), protein = toNum(sheet.protein) || 0;
    if (kcal == null) { alert('Enter the calorie total.'); return; }
    store.put('food', { id: `nc-${foodDate}`, date: foodDate, name: 'Nutracheck day total', kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10 });
    sheet = null; renderSheet(); render();
  },
  'sheet-close'() { sheet = null; renderSheet(); },
  'sheet-tab'(el) { sheet.tab = el.dataset.tab; renderSheet(); },
  'food-add'() {
    const name = sheet.name.trim(), kcal = toNum(sheet.kcal), protein = toNum(sheet.protein) || 0;
    if (!name || kcal == null) { alert('Give it a name and a calorie figure.'); return; }
    addFood(name, kcal, protein, sheet.fav);
    sheet = null; renderSheet(); render();
  },
  'food-pick'(el) {
    const p = sheet.results[+el.dataset.i];
    sheet.product = p; sheet.grams = String(p.serving || 100); sheet.fav = false;
    renderSheet();
  },
  'food-back'() { sheet.product = null; renderSheet(); },
  'food-add-product'() {
    const c = calcPortion();
    if (!c.g) { alert('Enter an amount in grams.'); return; }
    addFood(`${sheet.product.name} (${show(c.g)} g)`, c.kcal, c.protein, sheet.fav);
    sheet = null; renderSheet(); render();
  },
  'food-again'(el) {
    const f = store.state[el.dataset.kind][el.dataset.id];
    if (f) { addFood(f.name, f.kcal, f.protein, false); render(); }
  },
  'food-del'(el) { store.remove('food', el.dataset.id); render(); },
  'fav-del'(el) { store.remove('favs', el.dataset.id); renderSheet(); render(); },
  'food-day'(el) {
    const d = addDays(foodDate, +el.dataset.d);
    if (d <= today()) { foodDate = d; render(); }
  },

  'body-save'() {
    const weight = toNum($('#b-weight').value), waist = toNum($('#b-waist').value), date = $('#b-date').value || today();
    if (weight == null && waist == null) { alert('Enter a weight, a waist measurement, or both.'); return; }
    const prev = store.state.body[date];
    const rec = { id: date, date, weight: prev && !prev.del ? prev.weight : null, waist: prev && !prev.del ? prev.waist : null };
    if (weight != null) rec.weight = weight;
    if (waist != null) rec.waist = waist;
    store.put('body', rec); render();
  },
  'weight-quick'() {
    const input = $('#w-quick');
    const weight = toNum(input.value);
    if (weight == null || weight <= 0) { input.focus(); return; }
    const date = today();
    const prev = store.state.body[date];
    store.put('body', { id: date, date, weight, waist: prev && !prev.del ? prev.waist : null });
    render();
  },
  'body-del'(el) { if (confirm('Delete this measurement?')) { store.remove('body', el.dataset.id); render(); } },

  'protein-auto'() {
    const g = store.state.settings.goalWeight;
    if (g) { store.setSettings({ proteinMin: Math.round(g * 1.6), proteinMax: Math.round(g * 2) }); render(); }
  },
  async 'sync-save'() {
    const repo = $('#sync-repo').value.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    const token = $('#sync-token').value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) { alert('Enter the repo as username/repo-name, and a token.'); return; }
    store.setSyncCfg({ repo, token });
    try { await store.syncNow(); } catch { /* shown in status */ }
    render();
  },
  'sync-off'() { if (confirm('Turn sync off on this device? Your data stays here and in the repo.')) { store.setSyncCfg({ repo: '', token: '' }); render(); } },
  export() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportData()], { type: 'application/json' }));
    a.download = `fitness-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
};

// ---------- events ----------

document.addEventListener('click', e => {
  if (e.target.id === 'sheet') { sheet = null; renderSheet(); return; }
  const el = e.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) actions[el.dataset.act](el);
});

document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.dataset.form === 'search') searchFood();
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.setin) {
    const s = active(); if (!s) return;
    const [exId, i, key] = el.dataset.setin.split(':');
    const v = toNum(el.value);
    s.sets[exId][+i][key] = v == null ? '' : key === 'r' ? Math.round(v) : v;
    el.classList.remove('flash');
    store.put('sessions', s);
  } else if (el.dataset.sh && sheet) {
    sheet[el.dataset.sh] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.sh === 'grams') $('#calc').innerHTML = calcText();
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.set) {
    const v = toNum(el.value);
    store.setSettings({ [el.dataset.set]: v == null ? null : v });
    render();
  } else if (el.dataset.lw) {
    const lastWeights = { ...store.state.settings.lastWeights };
    const v = toNum(el.value);
    if (v == null) delete lastWeights[el.dataset.lw]; else lastWeights[el.dataset.lw] = v;
    store.setSettings({ lastWeights });
    render();
  } else if (el.dataset.review) {
    const reviews = { ...(store.state.settings.reviews || {}) };
    const arr = [...(reviews[el.dataset.review] || [])];
    arr[+el.dataset.i] = el.checked;
    reviews[el.dataset.review] = arr;
    store.setSettings({ reviews });
  } else if (el.id === 'lift-sel') {
    liftSel = el.value; render();
  } else if (el.id === 'import-file' && el.files[0]) {
    el.files[0].text().then(text => { store.importData(text); alert('Backup merged in.'); render(); })
      .catch(err => alert(`Could not import: ${err.message}`));
  }
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
store.onSync(st => {
  const el = $('#sync-stat');
  if (el) el.innerHTML = syncText();
  if (st.state === 'ok' && !sheet && !document.activeElement?.matches('input, select')) render();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    store.syncNow().catch(() => {});
    if (!sheet && !document.activeElement?.matches('input, select')) render();
  }
});

render();
store.syncNow().catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
