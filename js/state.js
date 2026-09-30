/**
 * state.js
 * ─────────────────────────────────────────────────────────────
 * In-memory application state + per-week LocalStorage persistence.
 *
 * Shape of `state`:
 *   {
 *     monday:    [ { name, videoUrl, sets: ['50kg×8', ...] }, ... ],
 *     wednesday: [ ... ],
 *     ...
 *   }
 *
 * Depends on: data.js (DAYS)
 */

// ── Storage ───────────────────────────────────────────────────
const STORAGE_PREFIX  = 'gymtracker_week_';
const STORAGE_KEY_OLD = 'gymtracker_v2';     // legacy key → migrate on first load

// ── Live state ────────────────────────────────────────────────
let state          = {};
let _activeWeekKey = null;   // set by loadState(weekKey)

// ── Migrate old single-key data to week-based storage ─────────
function _migrateIfNeeded(todayWeekKey) {
  const old = localStorage.getItem(STORAGE_KEY_OLD);
  if (old && !localStorage.getItem(STORAGE_PREFIX + todayWeekKey)) {
    localStorage.setItem(STORAGE_PREFIX + todayWeekKey, old);
    localStorage.removeItem(STORAGE_KEY_OLD);
    console.info('[GYM Tracker] Migrated legacy data → week', todayWeekKey);
  }
}

// ── Load week data from LocalStorage ─────────────────────────
function loadState(weekKey) {
  _activeWeekKey = weekKey;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + weekKey);
    state = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[GYM Tracker] Failed to parse state for', weekKey, e);
    state = {};
  }
  // Ensure every active day has at least an empty array
  DAYS.forEach(d => {
    if (d.active && !state[d.key]) state[d.key] = [];
  });
}

// ── Save current week to LocalStorage ────────────────────────
let _saveIndicatorTimer = null;

function saveState() {
  if (!_activeWeekKey) return;
  localStorage.setItem(STORAGE_PREFIX + _activeWeekKey, JSON.stringify(state));
  _showSaveIndicator();
  // Live-refresh stats whenever anything is saved
  if (typeof renderStats === 'function') renderStats();
}

function _showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(_saveIndicatorTimer);
  _saveIndicatorTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

// ── Reset current week ────────────────────────────────────────
function resetState() {
  if (!_activeWeekKey) return;
  localStorage.removeItem(STORAGE_PREFIX + _activeWeekKey);
  state = {};
  DAYS.forEach(d => { if (d.active) state[d.key] = []; });
  saveState();
}
