// The daily plan and the scoring built on top of it.
// Gym and protein tick themselves from the training and food logs and cannot be ticked by hand
// (`locked`); the rest are ticked by hand.

import { START, SESSIONS } from './programme.js';
import * as store from './store.js';
import { parse, today, addDays } from './util.js';

export const GOAL_PTS = 20;
export const LEVEL_PTS = 300;
export const MAX_GOALS = 3;
const GYM_DOW = [0, 2, 4]; // Monday, Wednesday, Friday

export const dow = s => (parse(s).getDay() + 6) % 7; // 0 = Monday
export const mondayOf = s => addDays(s, -dow(s));
export const gymSlot = s => s >= START && GYM_DOW.includes(dow(s));

// Rebuilt once per render, so scoring many days does not rescan the logs each time.
let idx = { protein: {}, gym: {} };
export function refresh() {
  const protein = {}, gym = {};
  for (const f of store.list('food')) protein[f.date] = (protein[f.date] || 0) + (f.protein || 0);
  for (const s of store.list('sessions')) if (s.end) gym[s.date] = s;
  idx = { protein, gym };
}

// The session that covers a slot: one logged on the slot day or before the next slot,
// so Wednesday's session done on Thursday still ticks Wednesday.
function slotSession(slot) {
  for (let d = slot, i = 0; i < 7; i++) {
    if (idx.gym[d]) return idx.gym[d];
    d = addDays(d, 1);
    if (gymSlot(d)) break;
  }
  return null;
}

const manual = date => {
  const r = store.state.days[date];
  return r && !r.del && r.done ? r.done : {};
};

export function tasksFor(date) {
  const d = dow(date), s = store.state.settings, out = [];
  if (gymSlot(date)) {
    const session = slotSession(date);
    const late = session && session.date !== date ? parse(session.date).toLocaleDateString('en-GB', { weekday: 'long' }) : '';
    out.push({
      id: 'gym', pts: 30, auto: !!session, locked: true, t: d === 4 ? '12:30' : '18:15',
      name: session ? `Home gym: ${SESSIONS[session.type].name}` : 'Home gym session',
      meta: session ? (late ? `Done on ${late}.` : 'Session logged.') : `${d === 4 ? 'At lunch, after the dog walk' : '30 minutes, after the evening walk'}. Ticks itself when you finish the session.`,
    });
  }
  if (d <= 3) {
    out.push({ id: 'walk_am', t: '05:45', name: 'Walk Roo, then her breakfast', meta: '45 minutes. Get ready from 06:30, leave for work at 07:00.', pts: 10 });
    out.push({ id: 'walk_pm', t: '17:30', name: 'Evening walk with Roo', meta: 'Straight after getting home.', pts: 10 });
  } else if (d === 4) {
    out.push({ id: 'walk_am', t: '06:45', name: 'Walk Roo, then her breakfast', meta: '30 minutes. Working from home today.', pts: 10 });
  } else {
    out.push({ id: 'out_am', t: '08:30', name: 'Morning out with Roo', meta: 'An hour or more, with Anna.', pts: 15 });
    out.push({ id: 'walk_pm', t: d === 5 ? '17:30' : '17:45', name: 'Evening walk with Roo', meta: 'With Anna.', pts: 10 });
  }
  if (d === 6) out.push({ id: 'checkin', t: '17:30', name: 'Week check-in', meta: 'On the Week tab: look back, set next week’s goals, enter the spending total.', pts: 15 });

  const min = s.proteinMin, got = Math.round(idx.protein[date] || 0);
  out.push({
    id: 'protein', t: '20:00', name: 'Protein target hit', pts: 10, auto: !!min && got >= min, locked: !!min,
    meta: min ? `${got} of ${min} g logged. Ticks itself at ${min} g.` : 'Tick it when you have hit your target.',
  });
  if (d <= 3 || d === 6) {
    out.push({
      id: 'lights', t: s.lights || '21:30', name: 'Lights out', pts: 10,
      meta: d === 3 ? 'Up for the 06:45 walk tomorrow.' : 'Up at 05:30 for the 05:45 walk tomorrow.',
    });
  }
  return out.sort((a, b) => a.t.localeCompare(b.t));
}

export const isDone = (date, task) => (task.locked ? !!task.auto : !!manual(date)[task.id]);
export const ptsFor = date => tasksFor(date).reduce((n, k) => n + (isDone(date, k) ? k.pts : 0), 0);
export const maxFor = date => tasksFor(date).reduce((n, k) => n + k.pts, 0);

export function weekRec(monday) {
  const w = store.state.weeks[monday];
  const live = w && !w.del ? w : {};
  return { goals: Array.isArray(live.goals) ? live.goals : [], spend: typeof live.spend === 'number' ? live.spend : null };
}
const goalPts = monday => weekRec(monday).goals.filter(g => g && g.d).length * GOAL_PTS;
const weekDays = monday => [0, 1, 2, 3, 4, 5, 6].map(i => addDays(monday, i));
export const weekPts = monday => weekDays(monday).reduce((n, d) => n + ptsFor(d), goalPts(monday));
export const weekMax = monday => weekDays(monday).reduce((n, d) => n + maxFor(d), 0);
export function weekTarget(monday) {
  const set = Number(store.state.settings.target);
  return set > 0 ? set : Math.round((weekMax(monday) * 0.8) / 10) * 10;
}
export const budget = () => {
  const b = store.state.settings.budget;
  return typeof b === 'number' && b >= 0 ? b : 104;
};

export function lifetime() {
  // Every day from the first thing logged up to today.
  const known = [...Object.keys(idx.gym), ...Object.keys(idx.protein), ...store.list('days').map(r => r.id)].filter(d => /^\d{4}-\d\d-\d\d$/.test(d)).sort();
  let n = 0;
  if (known.length) for (let d = known[0], t = today(), i = 0; d <= t && i < 3000; i++, d = addDays(d, 1)) n += ptsFor(d);
  for (const w of store.list('weeks')) n += goalPts(w.id);
  return n;
}

// Sessions in a row without missing a slot. A slot stays open until the next one
// (Monday's until Wednesday), so a session done a day late still counts.
export function gymStreak() {
  const t = today();
  let next = addDays(t, 1);
  for (let i = 0; i < 400 && !gymSlot(next); i++) next = addDays(next, 1);
  let n = 0;
  for (let s = t, i = 0; i < 400 && s >= START; i++, s = addDays(s, -1)) {
    if (!gymSlot(s)) continue;
    if (slotSession(s)) n++;
    else if (next <= t) break;
    next = s;
  }
  return n;
}
// Mornings in a row with Roo walked. Today only counts once it is ticked.
export function walkStreak() {
  let n = 0;
  for (let s = today(), i = 0; i < 400; i++, s = addDays(s, -1)) {
    const m = manual(s);
    if (m.walk_am || m.out_am) n++;
    else if (i > 0) break;
  }
  return n;
}

// Starting deadlines, taken from the budget notes and the gym programme.
// Fixed ids and an old timestamp, so any edit or delete on any device wins over them.
export function seed() {
  store.seed('admin', [
    { id: 'sa-register', text: 'Register for Self Assessment as self-employed', due: '', done: false },
    { id: 'hmrc-address', text: 'Update address with HMRC and GAC payroll', due: '', done: false },
    { id: 'money-check-nov', text: 'Monthly financial health check for November', due: '2026-12-01', done: false },
    { id: 'gym-review-1', text: 'Gym programme review', due: '2026-12-11', done: false },
    { id: 'gym-review-2', text: 'Full gym programme review, decide what comes next', due: '2027-02-05', done: false },
  ]);
}
