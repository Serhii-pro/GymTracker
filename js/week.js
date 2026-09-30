/**
 * week.js
 * ─────────────────────────────────────────────────────────────
 * Week navigation (prev / next / today) + statistics display.
 *
 * Depends on:
 *   data.js  – DAYS
 *   state.js – state, loadState, _migrateIfNeeded
 *   render.js – renderAll
 */

// ── ISO week helpers ──────────────────────────────────────────

/** Returns ISO week key "YYYY-Www" for a given Date object. */
function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay() || 7;           // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dow);   // shift to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo    = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Returns the Monday Date for a given ISO week key. */
function getWeekStartDate(weekKey) {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  // Jan 4 is always in ISO week 1
  const jan4   = new Date(Date.UTC(year, 0, 4));
  const dow    = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7);
  return monday;
}

/** Returns a new week key offset by `delta` weeks. */
function offsetWeekKey(weekKey, delta) {
  const start = getWeekStartDate(weekKey);
  start.setUTCDate(start.getUTCDate() + delta * 7);
  return getISOWeekKey(start);
}

const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** "Sep 29 – Oct 5, 2026" */
function getWeekDateRange(weekKey) {
  const start = getWeekStartDate(weekKey);
  const end   = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sy = start.getUTCFullYear(), ey = end.getUTCFullYear();
  const sm = _MONTHS[start.getUTCMonth()], em = _MONTHS[end.getUTCMonth()];
  const sd = start.getUTCDate(),          ed = end.getUTCDate();
  if (sm === em && sy === ey) return `${sm} ${sd}–${ed}, ${ey}`;
  if (sy === ey)              return `${sm} ${sd} – ${em} ${ed}, ${ey}`;
  return `${sm} ${sd}, ${sy} – ${em} ${ed}, ${ey}`;
}

/** "Week 40" */
function getWeekLabel(weekKey) {
  return `Week ${parseInt(weekKey.split('-W')[1], 10)}`;
}

// ── Active view state ─────────────────────────────────────────

const TODAY_WEEK_KEY  = getISOWeekKey(new Date());
let   currentViewWeek = TODAY_WEEK_KEY;

function _getWeekOffset(weekKey) {
  const a = getWeekStartDate(TODAY_WEEK_KEY).getTime();
  const b = getWeekStartDate(weekKey).getTime();
  return Math.round((b - a) / (7 * 86400000));
}

// ── Navigation ────────────────────────────────────────────────

function prevWeek() { _navigateTo(offsetWeekKey(currentViewWeek, -1)); }
function nextWeek() { _navigateTo(offsetWeekKey(currentViewWeek, +1)); }
function goToCurrentWeek() { _navigateTo(TODAY_WEEK_KEY); }

function _navigateTo(weekKey) {
  currentViewWeek = weekKey;
  loadState(weekKey);
  renderAll();
  updateWeekUI();
  // Scroll to top of the grid smoothly
  document.getElementById('days-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Update the week nav bar ───────────────────────────────────

function updateWeekUI() {
  const isCurrentWeek = currentViewWeek === TODAY_WEEK_KEY;
  const offset        = _getWeekOffset(currentViewWeek);

  // Labels
  document.getElementById('week-label').textContent      = getWeekLabel(currentViewWeek);
  document.getElementById('week-date-range').textContent = getWeekDateRange(currentViewWeek);

  // Context badge
  const ctxEl = document.getElementById('week-context');
  if (isCurrentWeek) {
    ctxEl.textContent = 'Current Week';
    ctxEl.className   = 'week-context-badge badge-current';
  } else if (offset < 0) {
    ctxEl.textContent = offset === -1 ? 'Last Week' : `${Math.abs(offset)} weeks ago`;
    ctxEl.className   = 'week-context-badge badge-past';
  } else {
    ctxEl.textContent = offset === 1 ? 'Next Week' : `In ${offset} weeks`;
    ctxEl.className   = 'week-context-badge badge-future';
  }

  // Today button
  const todayBtn = document.getElementById('btn-today');
  if (todayBtn) {
    todayBtn.disabled     = isCurrentWeek;
    todayBtn.style.opacity = isCurrentWeek ? '.35' : '1';
    todayBtn.style.cursor  = isCurrentWeek ? 'default' : 'pointer';
  }

  renderStats();
}

// ── Stats computation ─────────────────────────────────────────

function _computeStats() {
  let totalExercises = 0, totalSets = 0, filledSets = 0, daysWithData = 0;
  const activeDays = DAYS.filter(d => d.active);

  activeDays.forEach(day => {
    const exs = state[day.key] || [];
    if (exs.length) daysWithData++;
    totalExercises += exs.length;
    exs.forEach(ex => {
      const sets = ex.sets || [];
      totalSets  += sets.length;
      filledSets += sets.filter(s => s.trim() !== '').length;
    });
  });

  return {
    totalExercises,
    totalSets,
    filledSets,
    daysWithData,
    totalActiveDays : activeDays.length,
    completion      : totalSets > 0 ? Math.round((filledSets / totalSets) * 100) : 0,
  };
}

// ── Render stats bar ──────────────────────────────────────────

function renderStats() {
  const el = document.getElementById('week-stats');
  if (!el) return;

  const s = _computeStats();

  if (s.totalExercises === 0) {
    el.innerHTML = `<div class="stats-empty">No exercises logged for this week yet — add some! 💪</div>`;
    return;
  }

  // Completion colour: green ≥ 80%, orange 40–79%, muted < 40%
  const fillColor = s.completion >= 80
    ? 'var(--neon)'
    : s.completion >= 40
      ? 'var(--neon2)'
      : 'var(--muted)';

  el.innerHTML = `
    <div class="stat-item">
      <div class="stat-value" style="color:var(--neon)">${s.totalExercises}</div>
      <div class="stat-label">Exercises</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" style="color:var(--text)">${s.totalSets}</div>
      <div class="stat-label">Sets Planned</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" style="color:var(--text)">
        ${s.filledSets}<span class="stat-of">/${s.totalSets}</span>
      </div>
      <div class="stat-label">Sets Logged</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" style="color:var(--text)">
        ${s.daysWithData}<span class="stat-of">/${s.totalActiveDays}</span>
      </div>
      <div class="stat-label">Days Active</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item stat-item--progress">
      <div class="stat-value" style="color:${fillColor}">
        ${s.completion}<span class="stat-unit">%</span>
      </div>
      <div class="stat-label">Complete</div>
      <div class="stat-progress-bar">
        <div class="stat-progress-fill" style="width:${s.completion}%; background:${fillColor}"></div>
      </div>
    </div>`;
}
