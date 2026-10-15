/**
 * stats.js
 * ─────────────────────────────────────────────────────────────
 * Data parsing and Chart.js rendering for the Analytics view.
 * Displays exercise progression charts for all exercises,
 * sorted descending by last logged/updated timestamp.
 */

let _allWeeksData = [];
let _progressionCharts = [];

Chart.defaults.color = '#8b8b9e';
Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

// ── View Toggle ────────────────────────────────────────────────

async function openStatsView() {
  document.getElementById('view-workout').style.display = 'none';
  document.getElementById('view-stats').style.display = 'block';

  // Update Bottom Nav active state
  const tabWorkout = document.getElementById('tab-workout');
  const tabStats = document.getElementById('tab-stats');
  if (tabWorkout) tabWorkout.classList.remove('active');
  if (tabStats) tabStats.classList.add('active');

  // Update Top Nav button state
  const btnTopStats = document.getElementById('btn-top-stats');
  const btnTopWorkouts = document.getElementById('btn-top-workouts');
  if (btnTopStats) btnTopStats.style.display = 'none';
  if (btnTopWorkouts) btnTopWorkouts.style.display = 'inline-flex';

  showCloudSyncing();
  _allWeeksData = await fetchAllWeeksCloud();
  _setCloudBadge('synced');

  // Merge the active in-memory week state so recent edits appear immediately
  if (typeof _activeWeekKey === 'string' && _activeWeekKey && typeof state === 'object' && state) {
    const existingIdx = _allWeeksData.findIndex(w => w.weekKey === _activeWeekKey);
    if (existingIdx >= 0) {
      _allWeeksData[existingIdx] = { weekKey: _activeWeekKey, data: state };
    } else {
      _allWeeksData.push({ weekKey: _activeWeekKey, data: state });
    }
  }

  // Sort weeks chronologically (e.g., "2026-W39" before "2026-W40")
  _allWeeksData.sort((a, b) => a.weekKey.localeCompare(b.weekKey));

  renderAllProgressionCharts();
}

function closeStatsView() {
  document.getElementById('view-workout').style.display = 'block';
  document.getElementById('view-stats').style.display = 'none';

  // Update Bottom Nav active state
  const tabWorkout = document.getElementById('tab-workout');
  const tabStats = document.getElementById('tab-stats');
  if (tabWorkout) tabWorkout.classList.add('active');
  if (tabStats) tabStats.classList.remove('active');

  // Update Top Nav button state
  const btnTopStats = document.getElementById('btn-top-stats');
  const btnTopWorkouts = document.getElementById('btn-top-workouts');
  if (btnTopStats) btnTopStats.style.display = 'inline-flex';
  if (btnTopWorkouts) btnTopWorkouts.style.display = 'none';

  _destroyCharts();
}

function _destroyCharts() {
  _progressionCharts.forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  _progressionCharts = [];
}

// ── Weight Parsing & Progression Helpers ──────────────────────

/**
 * Parses weight from a set string.
 * Supports values like "100x8", "50kg x 8", "22.5", "80 x 10", etc.
 */
function parseWeightFromSet(setStr) {
  if (!setStr) return 0;
  const s = String(setStr).trim();
  const match = s.match(/(\d+(?:\.\d+)?)\s*(?:kg|lbs|x|$)/i) || s.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Gets the maximum weight logged for a specific exercise in a given week's data.
 * Returns null if the exercise wasn't performed or no valid weight was entered.
 */
function getMaxWeightForExercise(weekData, exerciseName) {
  let maxWeight = null;
  if (!weekData || typeof weekData !== 'object') return null;

  for (const day of Object.keys(weekData)) {
    const exercises = weekData[day];
    if (!Array.isArray(exercises)) continue;

    for (const ex of exercises) {
      if (ex && ex.name === exerciseName && Array.isArray(ex.sets)) {
        for (const setStr of ex.sets) {
          const w = parseWeightFromSet(setStr);
          if (w > 0 && (maxWeight === null || w > maxWeight)) {
            maxWeight = w;
          }
        }
      }
    }
  }
  return maxWeight;
}

// ── Exercise Extraction & Timestamp Sorting ───────────────────

const _DAY_INDEX = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6
};

/**
 * Collects all unique exercises across all weeks and sorts them in descending order
 * by their last logged / updated timestamp (most recently updated first).
 */
function getSortedExercises() {
  const exerciseMap = new Map();

  for (const week of _allWeeksData) {
    const weekStart = (typeof getWeekStartDate === 'function')
      ? getWeekStartDate(week.weekKey)
      : null;
    const weekStartTime = weekStart ? weekStart.getTime() : 0;

    for (const dayKey of Object.keys(week.data || {})) {
      const list = week.data[dayKey];
      if (!Array.isArray(list)) continue;

      const dayOffset = _DAY_INDEX[dayKey.toLowerCase()] ?? 0;
      const calendarTimestamp = weekStartTime + dayOffset * 86400000;

      for (const ex of list) {
        if (!ex || !ex.name) continue;
        const name = ex.name.trim();
        if (!name) continue;

        // Use explicit updatedAt if present; fallback to calendar date of that workout day
        let itemTimestamp = calendarTimestamp;
        if (typeof ex.updatedAt === 'number' && !isNaN(ex.updatedAt) && ex.updatedAt > 0) {
          itemTimestamp = Math.max(itemTimestamp, ex.updatedAt);
        }

        const existing = exerciseMap.get(name);
        if (!existing) {
          exerciseMap.set(name, {
            name,
            lastUpdated: itemTimestamp
          });
        } else {
          if (itemTimestamp > existing.lastUpdated) {
            existing.lastUpdated = itemTimestamp;
          }
        }
      }
    }
  }

  const exercises = Array.from(exerciseMap.values());
  // Sort in descending order: most recently updated first
  exercises.sort((a, b) => b.lastUpdated - a.lastUpdated);
  return exercises;
}

/** Formats a timestamp to a friendly short date (e.g., "Oct 15"). */
function _formatShortDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// ── Rendering Charts ──────────────────────────────────────────

/**
 * Builds and renders line progression charts for all exercises in a responsive grid.
 */
function renderAllProgressionCharts() {
  const container = document.getElementById('stats-charts-container');
  if (!container) return;

  _destroyCharts();
  container.innerHTML = '';

  const sortedExercises = getSortedExercises();

  if (sortedExercises.length === 0) {
    container.innerHTML = `
      <div class="stats-empty" style="grid-column: 1 / -1; width: 100%;">
        No exercises logged yet. Log your workouts to see your progression! 💪
      </div>
    `;
    return;
  }

  const labels = _allWeeksData.map(w => w.weekKey.replace('-W', ' Wk '));

  sortedExercises.forEach(item => {
    const exerciseName = item.name;
    const data = _allWeeksData.map(w => getMaxWeightForExercise(w.data, exerciseName));

    // Calculate peak weight to display as a badge and scale axes
    const validWeights = data.filter(v => v !== null && v > 0);
    const peakWeight = validWeights.length ? Math.max(...validWeights) : null;

    // Create Card
    const card = document.createElement('div');
    card.className = 'chart-card';

    const safeName = typeof escHtml === 'function' ? escHtml(exerciseName) : exerciseName;
    const lastDate = _formatShortDate(item.lastUpdated);

    card.innerHTML = `
      <div class="chart-header">
        <div>
          <h3 class="exercise-progression-title">${safeName}</h3>
          <p class="chart-subtitle">Max weight logged per week${lastDate ? ` · Last: ${lastDate}` : ''}</p>
        </div>
        ${peakWeight !== null ? `
          <div class="chart-stat-badge" title="Peak weight logged">
            <span class="badge-num">${peakWeight}</span>
            <span class="badge-unit">kg</span>
          </div>
        ` : ''}
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
    `;

    container.appendChild(card);

    // Initialize Chart.js
    const canvas = card.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Max Weight (${exerciseName})`,
          data,
          borderColor: '#39ff14',
          backgroundColor: 'rgba(57,255,20,0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#0a0a0f',
          pointBorderColor: '#39ff14',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          spanGaps: true, // Connect lines across weeks without entry
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: peakWeight ? Math.ceil(peakWeight * 1.15) : 50,
            grid: {
              color: 'rgba(255,255,255,0.05)'
            },
            ticks: {
              color: '#8b8b9e'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#8b8b9e',
              maxRotation: 45,
              autoSkip: true
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => (ctx.parsed.y !== null ? `Max: ${ctx.parsed.y} kg` : '')
            }
          }
        }
      }
    });

    _progressionCharts.push(chart);
  });
}
