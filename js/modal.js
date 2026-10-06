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
  // Always collapse the custom form when the modal is dismissed
  if (typeof cancelCustomForm === 'function') cancelCustomForm();
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

  // Combine built-in and user-added custom exercises
  const allExercises = [...EXERCISE_DB, ...CUSTOM_EXERCISES];

  const filtered = allExercises.filter(ex =>
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
//  Custom Exercise Form (modal footer)
// ══════════════════════════════════════════════════════════════

let _customFormOpen = false;

/** Toggle the custom exercise form open / closed. */
function toggleCustomForm() {
  _customFormOpen = !_customFormOpen;
  _applyCustomFormState();
  if (_customFormOpen) {
    // Focus the name input after the CSS transition
    setTimeout(() => document.getElementById('custom-ex-name').focus(), 180);
  }
}

function _applyCustomFormState() {
  const form    = document.getElementById('custom-exercise-form');
  const toggle  = document.getElementById('btn-custom-toggle');
  if (!form || !toggle) return;

  if (_customFormOpen) {
    form.classList.add('open');
    toggle.classList.add('active');
    // Rotate + icon into × visually via CSS class
  } else {
    form.classList.remove('open');
    toggle.classList.remove('active');
  }
}

/** Cancel: collapse form and clear inputs. */
function cancelCustomForm() {
  _customFormOpen = false;
  _applyCustomFormState();
  _resetCustomInputs();
}

function _resetCustomInputs() {
  const nameEl = document.getElementById('custom-ex-name');
  const urlEl  = document.getElementById('custom-ex-url');
  if (nameEl) nameEl.value = '';
  if (urlEl)  urlEl.value  = '';
  validateCustomForm();
}

/** Enable the "Add Exercise" button only when the name field is non-empty. */
function validateCustomForm() {
  const name = (document.getElementById('custom-ex-name')?.value || '').trim();
  const btn  = document.getElementById('btn-add-custom');
  if (btn) btn.disabled = name.length === 0;
}

/** Submit the custom exercise and add it to the current day. */
function submitCustomExercise() {
  const name = (document.getElementById('custom-ex-name')?.value || '').trim();
  const url  = (document.getElementById('custom-ex-url')?.value  || '').trim();
  if (!name) return;

  // Fall back to a blank anchor if no URL given
  const videoUrl = url || '#';
  
  // 1. Save it to the user's custom DB (syncs to Firestore)
  addCustomExerciseToDb(name, videoUrl);
  
  // 2. Add it to today's active workout list
  addExercise(name, videoUrl);

  // 3. Close the modal footer
  cancelCustomForm();
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
  resetState();                                           // wipe + re-init state
  closeConfirm();
  renderAll();                                            // re-draw all cards
  if (typeof updateWeekUI === 'function') updateWeekUI(); // refresh nav + stats
}
