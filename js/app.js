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

// ── Bootstrap & Auth Flow ─────────────────────────────────────

// Listen to Firebase Auth state
onAuthReady((user) => {
  const authOverlay = document.getElementById('auth-overlay');
  
  if (user) {
    // ── Logged In ──
    authOverlay.classList.remove('open');
    
    // 1. Migrate any old v2 localStorage data
    _migrateIfNeeded(TODAY_WEEK_KEY);
    
    // 2. Load custom exercises (Firestore)
    loadCustomExercises();
    
    // 3. Load current week (Firestore)
    loadState(TODAY_WEEK_KEY);
    
    // 4. Paint the UI
    renderAll();
    updateWeekUI();

  } else {
    // ── Logged Out ──
    authOverlay.classList.add('open');
    
    // Hide UI and clear state
    clearAllState();
    clearCustomExercises();
    
    document.getElementById('user-profile').style.display = 'none';
  }
});
