/**
 * render.js
 * ─────────────────────────────────────────────────────────────
 * All DOM-building / rendering functions.
 *
 * Depends on: data.js (DAYS), state.js (state)
 */

// ── Utility: escape HTML special chars ───────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ── Render all day cards into #days-grid ──────────────────────
function renderAll() {
  const grid = document.getElementById('days-grid');
  grid.innerHTML = '';

  DAYS.forEach(day => {
    const card = document.createElement('div');
    card.className = 'day-card' + (day.active ? '' : ' rest-day');
    card.id        = 'card-' + day.key;
    card.innerHTML = buildCard(day);
    grid.appendChild(card);
  });
}

// ── Re-render a single day card in place ─────────────────────
function rerenderCard(dayKey) {
  const day  = DAYS.find(d => d.key === dayKey);
  const card = document.getElementById('card-' + dayKey);
  if (!card || !day) return;
  card.innerHTML = buildCard(day);
}

// ── Build full card HTML string ───────────────────────────────
function buildCard(day) {
  const badge = day.active
    ? '<span class="day-badge badge-active">Workout</span>'
    : '<span class="day-badge badge-rest">Rest Day</span>';

  const exCount    = day.active ? (state[day.key] || []).length : 0;
  const countBadge = day.active ? `<span class="ex-count">${exCount}</span>` : '';

  const header = `
    <div class="day-header">
      <div>
        <div class="day-name">${day.label}${countBadge}</div>
        <div class="day-progress">${buildDots(day)}</div>
      </div>
      ${badge}
    </div>`;

  // ── Rest day ──
  if (!day.active) {
    return header + `
      <div class="day-body">
        <div class="rest-content">
          <div class="rest-icon">😴</div>
          <div class="rest-text">Recovery Day · No Training</div>
        </div>
      </div>`;
  }

  // ── Workout day ──
  const exercises = (state[day.key] || [])
    .map((ex, i) => buildExerciseItem(day.key, ex, i))
    .join('');

  return header + `
    <div class="day-body">
      <div class="exercise-list" id="list-${day.key}">
        ${exercises}
      </div>
      <div class="add-exercise-area" style="margin-top:${exCount > 0 ? '14px' : '4px'}">
        <button
          class="btn btn-neon btn-sm"
          style="width:100%; justify-content:center;"
          onclick="openModal('${day.key}')">
          + Add Exercise
        </button>
      </div>
    </div>`;
}

// ── Build progress-dot row ────────────────────────────────────
function buildDots(day) {
  if (!day.active) return '';
  const count = (state[day.key] || []).length;
  const max   = Math.max(count, 4);
  return Array.from({ length: max }, (_, i) =>
    `<div class="dot${i < count ? ' filled' : ''}"></div>`
  ).join('');
}

// ── Build a single exercise card ──────────────────────────────
function buildExerciseItem(dayKey, ex, idx) {
  const sets    = ex.sets || ['', '', '', ''];
  const setsHtml = sets.map((val, si) => `
    <div class="set-row" id="setrow-${dayKey}-${idx}-${si}">
      <span class="set-label">Set ${si + 1}</span>
      <input
        class="set-input"
        type="text"
        value="${escHtml(val)}"
        placeholder="e.g. 50kg × 8"
        oninput="updateSet('${dayKey}', ${idx}, ${si}, this.value)"
      />
      <button
        class="btn-remove-set"
        title="Remove set"
        onclick="removeSet('${dayKey}', ${idx}, ${si})">✕</button>
    </div>`).join('');

  return `
  <div class="exercise-item" id="ex-${dayKey}-${idx}">
    <div class="exercise-header">
      <a
        class="exercise-name-link"
        href="${escHtml(ex.videoUrl)}"
        target="_blank"
        rel="noopener noreferrer">
        ${escHtml(ex.name)}
      </a>
      <button
        class="btn-remove-ex"
        title="Remove exercise"
        onclick="removeExercise('${dayKey}', ${idx})">✕</button>
    </div>
    <div class="sets-container" id="sets-${dayKey}-${idx}">
      ${setsHtml}
    </div>
    <div class="sets-actions">
      <button
        class="btn btn-ghost btn-xs"
        onclick="addSet('${dayKey}', ${idx})">+ Add Set</button>
    </div>
  </div>`;
}

// ── Exercise CRUD (mutate state → save → re-render) ───────────
function removeExercise(dayKey, idx) {
  state[dayKey].splice(idx, 1);
  saveState();
  rerenderCard(dayKey);
}

function addSet(dayKey, idx) {
  state[dayKey][idx].sets.push('');
  saveState();
  rerenderCard(dayKey);
}

function removeSet(dayKey, idx, setIdx) {
  if (state[dayKey][idx].sets.length <= 1) return; // keep at least 1
  state[dayKey][idx].sets.splice(setIdx, 1);
  saveState();
  rerenderCard(dayKey);
}

function updateSet(dayKey, idx, setIdx, value) {
  state[dayKey][idx].sets[setIdx] = value;
  saveState(); // saves on every keystroke
}
