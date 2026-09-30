/**
 * app.js
 * ─────────────────────────────────────────────────────────────
 * Application entry point.
 * Registers global event listeners and bootstraps the app.
 *
 * Load order in index.html must be:
 *   1. data.js   – EXERCISE_DB, DAYS
 *   2. state.js  – state, loadState, saveState, resetState
 *   3. render.js – renderAll, rerenderCard, CRUD helpers
 *   4. modal.js  – openModal, closeModal, openConfirm, …
 *   5. app.js    – this file (runs last)
 */

// ── Global keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
});

// ── Bootstrap ─────────────────────────────────────────────────
loadState();   // restore from LocalStorage  (state.js)
renderAll();   // paint all 7 day cards      (render.js)
