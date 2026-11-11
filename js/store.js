// Local-first storage with optional sync to a private GitHub repo.
// Every record carries `t` (last change, ms). Deletes are tombstones, so two
// devices can be merged by taking the newer copy of each record.

const KEY = 'fit.v1';
const CFG = 'fit.sync';
const COLLECTIONS = ['sessions', 'food', 'favs', 'body'];

const blank = () => ({
  v: 1,
  settings: { t: 0, kcal: null, proteinMin: 175, proteinMax: 220, goalWeight: 110, lastWeights: {}, reviews: {} },
  sessions: {}, food: {}, favs: {}, body: {},
});

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

function normalise(data) {
  const base = blank();
  if (!data || typeof data !== 'object') return base;
  base.settings = { ...base.settings, ...(data.settings || {}) };
  for (const c of COLLECTIONS) base[c] = data[c] && typeof data[c] === 'object' ? data[c] : {};
  return base;
}

export let state = normalise(read(KEY));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function save() {
  write(KEY, state);
  queueSync();
}
export function put(coll, rec) {
  rec.t = Date.now();
  state[coll][rec.id] = rec;
  save();
  return rec;
}
export function remove(coll, id) {
  state[coll][id] = { id, del: true, t: Date.now() };
  save();
}
export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch, t: Date.now() };
  save();
}
export const list = coll => Object.values(state[coll]).filter(r => !r.del);

export function merge(a, b) {
  const out = normalise(a);
  const other = normalise(b);
  if ((other.settings.t || 0) > (out.settings.t || 0)) out.settings = other.settings;
  for (const c of COLLECTIONS) {
    for (const [id, rec] of Object.entries(other[c])) {
      const mine = out[c][id];
      if (!mine || (rec.t || 0) > (mine.t || 0)) out[c][id] = rec;
    }
  }
  return out;
}

// ---------- backup ----------

export const exportData = () => JSON.stringify(state, null, 1);
export function importData(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.settings) throw new Error('Not a backup file from this app');
  state = merge(state, data);
  save();
}

// ---------- GitHub sync ----------

export const syncCfg = () => read(CFG) || { repo: '', token: '' };
export function setSyncCfg(cfg) { write(CFG, cfg); }

let status = { state: 'idle', msg: '', at: null };
const listeners = new Set();
export const syncStatus = () => status;
export const onSync = fn => listeners.add(fn);
function setStatus(s, msg = '') {
  status = { state: s, msg, at: s === 'ok' ? Date.now() : status.at };
  listeners.forEach(fn => fn(status));
}

const toB64 = text => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

let timer = null;
let running = false;
function queueSync() {
  const cfg = syncCfg();
  if (!cfg.repo || !cfg.token) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow().catch(() => {}), 4000);
}

export async function syncNow(attempt = 0) {
  const cfg = syncCfg();
  if (!cfg.repo || !cfg.token) { setStatus('idle'); return false; }
  if (running && attempt === 0) return false;
  running = true;
  setStatus('syncing');
  const url = `https://api.github.com/repos/${cfg.repo}/contents/data.json`;
  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    let sha, remoteText = null;
    if (res.status === 200) {
      const body = await res.json();
      sha = body.sha;
      remoteText = fromB64(body.content || '');
    } else if (res.status === 401 || res.status === 403) {
      throw new Error('GitHub rejected the token');
    } else if (res.status !== 404) {
      throw new Error(`GitHub returned ${res.status}`);
    }
    let remote = null;
    if (remoteText) { try { remote = JSON.parse(remoteText); } catch { remote = null; } }
    if (remote) {
      state = merge(state, remote);
      write(KEY, state);
    }
    const text = JSON.stringify(state);
    if (!remote || text !== JSON.stringify(normalise(remote))) {
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Update ${new Date().toISOString().slice(0, 16)}`, content: toB64(text), sha }),
      });
      if (putRes.status === 409 && attempt < 2) return await syncNow(attempt + 1);
      if (putRes.status === 404) throw new Error('Repo not found, or the token cannot write to it');
      if (!putRes.ok) throw new Error(`GitHub returned ${putRes.status} when saving`);
    }
    setStatus('ok');
    return true;
  } catch (err) {
    setStatus('error', err instanceof TypeError ? 'No connection' : err.message);
    throw err;
  } finally {
    if (attempt === 0) running = false;
  }
}
