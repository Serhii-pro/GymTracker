/**
 * stats.js
 * ─────────────────────────────────────────────────────────────
 * Data parsing and Chart.js rendering for the Analytics view.
 */

let _allWeeksData = [];
let _consistencyChart = null;
let _progressionChart = null;

Chart.defaults.color = '#8b8b9e';
Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

// ── View Toggle ────────────────────────────────────────────────

async function openStatsView() {
  document.getElementById('view-workout').style.display = 'none';
  document.getElementById('view-stats').style.display = 'block';
  
  document.getElementById('btn-nav-stats').style.display = 'none';
  document.getElementById('btn-nav-workout').style.display = 'inline-flex';

  showCloudSyncing();
  _allWeeksData = await fetchAllWeeksCloud();
  _setCloudBadge('synced');

  // Sort weeks chronologically (e.g., "2026-W39" before "2026-W40")
  _allWeeksData.sort((a, b) => a.weekKey.localeCompare(b.weekKey));

  _renderConsistencyChart();
  _populateExerciseDropdown();
  updateProgressionChart(); // render default selected
}

function closeStatsView() {
  document.getElementById('view-workout').style.display = 'block';
  document.getElementById('view-stats').style.display = 'none';
  
  document.getElementById('btn-nav-stats').style.display = 'inline-flex';
  document.getElementById('btn-nav-workout').style.display = 'none';
}

// ── Helpers ───────────────────────────────────────────────────

/** Calculate how many active workout days had at least one exercise logged. */
function getWorkoutsInWeek(weekData) {
  let count = 0;
  for (const day of Object.keys(weekData)) {
    if (Array.isArray(weekData[day]) && weekData[day].length > 0) {
      count++;
    }
  }
  return count;
}

/** Parses a set string like "100x8" and returns the max weight (100). */
function parseWeightFromSet(setStr) {
  if (!setStr) return 0;
  // Match first sequence of numbers (supports decimals like "22.5")
  const match = String(setStr).match(/^\s*(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/** Gets the maximum weight logged for a specific exercise in a specific week. */
function getMaxWeightForExercise(weekData, exerciseName) {
  let maxWeight = null;
  for (const day of Object.keys(weekData)) {
    const exercises = weekData[day];
    if (!Array.isArray(exercises)) continue;
    
    for (const ex of exercises) {
      if (ex.name === exerciseName && Array.isArray(ex.sets)) {
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

// ── Rendering ─────────────────────────────────────────────────

function _renderConsistencyChart() {
  const ctx = document.getElementById('consistencyChart').getContext('2d');
  if (_consistencyChart) _consistencyChart.destroy();

  const labels = _allWeeksData.map(w => w.weekKey.replace('-W', ' Wk '));
  const data = _allWeeksData.map(w => getWorkoutsInWeek(w.data));

  _consistencyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Workouts Completed',
        data,
        backgroundColor: '#ff6b00',
        borderRadius: 4,
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, suggestedMax: 7, ticks: { stepSize: 1 } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function _populateExerciseDropdown() {
  const select = document.getElementById('stats-exercise-select');
  select.innerHTML = '';
  
  // Find all unique exercises ever logged
  const uniqueExercises = new Set();
  for (const week of _allWeeksData) {
    for (const day of Object.keys(week.data)) {
      if (Array.isArray(week.data[day])) {
        week.data[day].forEach(ex => uniqueExercises.add(ex.name));
      }
    }
  }

  // Sort and populate
  const sorted = Array.from(uniqueExercises).sort();
  if (sorted.length === 0) {
    select.innerHTML = '<option value="">No exercises logged yet</option>';
    return;
  }

  sorted.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function updateProgressionChart() {
  const select = document.getElementById('stats-exercise-select');
  const exerciseName = select.value;
  if (!exerciseName) return;

  const ctx = document.getElementById('progressionChart').getContext('2d');
  if (_progressionChart) _progressionChart.destroy();

  const labels = _allWeeksData.map(w => w.weekKey.replace('-W', ' Wk '));
  const data = _allWeeksData.map(w => getMaxWeightForExercise(w.data, exerciseName));

  _progressionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Max Weight (${exerciseName})`,
        data,
        borderColor: '#39ff14',
        backgroundColor: 'rgba(57,255,20,0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#0a0a0f',
        pointBorderColor: '#39ff14',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        spanGaps: true, // connect line across weeks where the exercise wasn't performed
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
