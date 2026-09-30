/**
 * modal.js
 * ─────────────────────────────────────────────────────────────
 * Handles the "Add Exercise" modal and the "Reset Week"
 * confirmation dialog.
 *
 * Depends on: data.js (EXERCISE_DB, DAYS), state.js (state, saveState, resetState),
 *             render.js (rerenderCard, renderAll)
 */

// ── Shared state for modal ────────────────────────────────────
let modalDayKey = null;

// ══════════════════════════════════════════════════════════════
//  Exercise Modal
// ══════════════════════════════════════════════════════════════

function openModal(dayKey) {
  modalDayKey = dayKey;

  const day = DAYS.find(d => d.key === dayKey);
  document.getElementById('modal-day-tag').textContent = day ? day.label : '';
  document.getElementById('modal-search').value = '';

  renderDbList('');

  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('modal-search').focus(), 200);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  modalDayKey = null;
}

/** Close modal when clicking the dark backdrop (not the modal box itself). */
function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/** Called by the search input's oninput event. */
function filterExercises(query) {
  renderDbList(query);
}

/** Rebuild the scrollable exercise list inside the modal. */
function renderDbList(query) {
  const list       = document.getElementById('exercise-db-list');
  const q          = query.trim().toLowerCase();
  const alreadyAdded = new Set((state[modalDayKey] || []).map(e => e.name));

  const filtered = EXERCISE_DB.filter(ex =>
    !q || ex.name.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = '<div class="db-no-results">No exercises found 🔍</div>';
    return;
  }

  list.innerHTML = filtered.map(ex => {
    const added = alreadyAdded.has(ex.name);
    // Safely escape single quotes for inline onclick attribute
    const safeName = ex.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeUrl  = ex.videoUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `
    <div class="db-item${added ? ' already-added' : ''}"
      onclick="${added ? '' : `addExercise('${safeName}','${safeUrl}');`}">
      <span class="db-item-name">${ex.name}${added ? ' ✓' : ''}</span>
      <span class="db-item-add">+ Add</span>
    </div>`;
  }).join('');
}

/** Add an exercise to the current day and refresh the modal list. */
function addExercise(name, videoUrl) {
  if (!modalDayKey) return;
  if (!state[modalDayKey]) state[modalDayKey] = [];

  // Guard against duplicates
  if (state[modalDayKey].some(e => e.name === name)) return;

  state[modalDayKey].push({ name, videoUrl, sets: ['', '', '', ''] });
  saveState();
  rerenderCard(modalDayKey);

  // Refresh the list so the added item is greyed out
  renderDbList(document.getElementById('modal-search').value);
}

// ══════════════════════════════════════════════════════════════
//  Confirm / Reset Dialog
// ══════════════════════════════════════════════════════════════

function openConfirm() {
  document.getElementById('confirm-overlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}

/** Close confirm when clicking the dark backdrop. */
function handleConfirmOverlay(e) {
  if (e.target === document.getElementById('confirm-overlay')) closeConfirm();
}

/** Called when the user clicks "Yes, Reset" in the confirm dialog. */
function confirmReset() {
  resetState();   // wipes localStorage + re-initialises state (state.js)
  closeConfirm();
  renderAll();    // re-draw all cards (render.js)
}
