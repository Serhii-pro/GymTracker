/**
 * app.js
 * ─────────────────────────────────────────────────────────────
 * Application entry point.
 *
 * Load order in index.html:
 *   1. Firebase CDN scripts
 *   2. data.js    – EXERCISE_DB, DAYS, CUSTOM_EXERCISES, loadCustomExercises
 *   3. state.js   – state, loadState, saveState, resetState, _migrateIfNeeded
 *   4. render.js  – renderAll, rerenderCard, CRUD helpers
 *   5. modal.js   – openModal, closeModal, addExercise, …
 *   6. week.js    – TODAY_WEEK_KEY, prevWeek, nextWeek, updateWeekUI
 *   7. firebase.js – saveWeekCloud, loadWeekCloud, saveCustomExCloud, …
 *   8. app.js     – this file (runs last)
 */

// ── Global keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
  if (document.activeElement.tagName !== 'INPUT') {
    if (e.key === 'ArrowLeft')  prevWeek();
    if (e.key === 'ArrowRight') nextWeek();
  }
});

// ── Bootstrap ─────────────────────────────────────────────────

// 1. Migrate any old v2 localStorage data
_migrateIfNeeded(TODAY_WEEK_KEY);

// 2. Load custom exercises (localStorage instantly, Firestore in bg)
loadCustomExercises();

// 3. Load current week (localStorage instantly, Firestore in bg)
loadState(TODAY_WEEK_KEY);

// 4. Paint the UI
renderAll();
updateWeekUI();
