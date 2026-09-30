/**
 * app.js
 * ─────────────────────────────────────────────────────────────
 * Application entry point.
 *
 * Load order in index.html:
 *   1. data.js   – EXERCISE_DB, DAYS
 *   2. state.js  – state, loadState, saveState, resetState, _migrateIfNeeded
 *   3. render.js – renderAll, rerenderCard, CRUD helpers
 *   4. modal.js  – openModal, closeModal, openConfirm, …
 *   5. week.js   – TODAY_WEEK_KEY, prevWeek, nextWeek, updateWeekUI, renderStats
 *   6. app.js    – this file (runs last)
 */

// ── Global keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
  // ← → arrow keys for week navigation (when no input is focused)
  if (document.activeElement.tagName !== 'INPUT') {
    if (e.key === 'ArrowLeft')  prevWeek();
    if (e.key === 'ArrowRight') nextWeek();
  }
});

// ── Bootstrap ─────────────────────────────────────────────────

// 1. Migrate any old v2 data into the current week's slot
_migrateIfNeeded(TODAY_WEEK_KEY);

// 2. Load current week and paint the UI
loadState(TODAY_WEEK_KEY);
renderAll();
updateWeekUI();
