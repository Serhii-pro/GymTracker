/**
 * state.js
 * ─────────────────────────────────────────────────────────────
 * In-memory application state + LocalStorage persistence.
 *
 * Shape of `state`:
 *   {
 *     monday:    [ { name, videoUrl, sets: ['50kg×8', ...] }, ... ],
 *     wednesday: [ ... ],
 *     ...
 *   }
 *
 * Depends on: data.js  (DAYS constant)
 */

// ── Storage key ───────────────────────────────────────────────
const STORAGE_KEY = 'gymtracker_v2';

// ── Live state object ─────────────────────────────────────────
let state = {};

// ── Load from LocalStorage ────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {
    console.warn('[GYM Tracker] Failed to parse saved state:', e);
    state = {};
  }

  // Ensure every active day has at least an empty array
  DAYS.forEach(d => {
    if (d.active && !state[d.key]) state[d.key] = [];
  });
}

// ── Save to LocalStorage ──────────────────────────────────────
let _saveIndicatorTimer = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  _showSaveIndicator();
}

function _showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(_saveIndicatorTimer);
  _saveIndicatorTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

// ── Reset / clear all data ────────────────────────────────────
function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  state = {};
  DAYS.forEach(d => { if (d.active) state[d.key] = []; });
  saveState();
}
