/**
 * state.js
 * ─────────────────────────────────────────────────────────────
 * In-memory state + dual persistence:
 *   1. localStorage  – instant (offline-first)
 *   2. Firestore     – cloud sync in the background
 *
 * Load strategy:
 *   • Load from localStorage immediately → instant render
 *   • Fetch from Firestore in background → re-render if newer
 *
 * Save strategy:
 *   • Save to localStorage immediately
 *   • Debounce Firestore save (1 s after last change)
 *
 * Depends on: data.js (DAYS), firebase.js (cloud helpers)
 */

const STORAGE_PREFIX  = 'gymtracker_week_';
const STORAGE_KEY_OLD = 'gymtracker_v2';

let state          = {};
let _activeWeekKey = null;

// ── Migrate legacy v2 data ────────────────────────────────────
function _migrateIfNeeded(todayKey) {
  const old = localStorage.getItem(STORAGE_KEY_OLD);
  if (old && !localStorage.getItem(STORAGE_PREFIX + todayKey)) {
    localStorage.setItem(STORAGE_PREFIX + todayKey, old);
    localStorage.removeItem(STORAGE_KEY_OLD);
    console.info('[GYM] Migrated v2 data →', todayKey);
  }
}

// ── Load (offline-first) ──────────────────────────────────────
function loadState(weekKey) {
  _activeWeekKey = weekKey;

  // 1. Immediately load from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + weekKey);
    state = raw ? JSON.parse(raw) : {};
  } catch (e) {
    state = {};
  }
  _ensureDays();

  // 2. Background sync from Firestore
  _syncWeekFromCloud(weekKey);
}

function _ensureDays() {
  DAYS.forEach(d => { if (d.active && !state[d.key]) state[d.key] = []; });
}

async function _syncWeekFromCloud(weekKey) {
  showCloudSyncing();
  const cloudData = await loadWeekCloud(weekKey);

  // Discard if user navigated to another week while we were fetching
  if (weekKey !== _activeWeekKey || !cloudData) return;

  const cloudStr = JSON.stringify(cloudData);
  const localStr = JSON.stringify(state);
  if (cloudStr === localStr) return; // already up-to-date

  // Cloud has different data → update state + localStorage + re-render
  state = cloudData;
  _ensureDays();
  localStorage.setItem(STORAGE_PREFIX + weekKey, JSON.stringify(state));

  if (typeof renderAll      === 'function') renderAll();
  if (typeof updateWeekUI   === 'function') updateWeekUI();
}

// ── Save ──────────────────────────────────────────────────────
let _saveIndicatorTimer = null;
let _cloudSaveTimer     = null;

function saveState() {
  if (!_activeWeekKey) return;

  // 1. localStorage – instant
  localStorage.setItem(STORAGE_PREFIX + _activeWeekKey, JSON.stringify(state));
  _showSaveIndicator();

  // 2. Firestore – debounced 1 s
  showCloudSyncing();
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(() => saveWeekCloud(_activeWeekKey, state), 1000);

  // 3. Refresh stats
  if (typeof renderStats === 'function') renderStats();
}

function _showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(_saveIndicatorTimer);
  _saveIndicatorTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

// ── Reset ─────────────────────────────────────────────────────
function resetState() {
  if (!_activeWeekKey) return;
  localStorage.removeItem(STORAGE_PREFIX + _activeWeekKey);
  deleteWeekCloud(_activeWeekKey);   // fire-and-forget
  state = {};
  _ensureDays();
  saveState();
}
