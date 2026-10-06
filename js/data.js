/**
 * data.js
 * ─────────────────────────────────────────────────────────────
 * Built-in exercise database, weekly day definitions,
 * and the runtime custom-exercises list (synced with Firestore).
 */

// ── Built-in Exercise Database ────────────────────────────────
const EXERCISE_DB = [
  { name: '45° Incline Barbell Press',               videoUrl: 'https://youtu.be/vqQ9ok0dEgk'                },
  { name: '45° Incline DB Press',                    videoUrl: 'https://www.youtube.com/watch?v=p2t9daxLpB8' },
  { name: 'Cable Crossover Ladder',                  videoUrl: 'https://youtu.be/0TP9kVcWGic'                },
  { name: 'Wide-Grip Pull-Up',                       videoUrl: 'https://youtu.be/yGnp0HU8BnA'                },
  { name: 'Neutral-Grip Lat Pulldown',               videoUrl: 'https://youtu.be/lA4_1F9EAFU'                },
  { name: 'High-Cable Lateral Raise',                videoUrl: 'https://youtu.be/MnMux3Wc0Ac'                },
  { name: 'Pendlay Deficit Row',                     videoUrl: 'https://youtu.be/MmuyHKYCLps'                },
  { name: 'Chest-Supported Machine Row',             videoUrl: 'https://youtu.be/ijsSiWSzYw0'                },
  { name: 'Overhead Cable Triceps Extension (Rope)', videoUrl: 'https://youtu.be/GYoUoVNlbGc'                },
  { name: 'DB Skull Crusher',                        videoUrl: 'https://youtu.be/fbLTzgTKOR8'                },
  { name: 'Bayesian Cable Curl',                     videoUrl: 'https://youtu.be/CWH5J_7kzjM'                },
  { name: 'Dumbbell Hammer Curl',                    videoUrl: 'https://youtu.be/xY3sQXYhk7A'                },
  { name: 'Dumbbell Preacher Curl',                  videoUrl: 'https://youtu.be/WTkQLAethtg'                },
  { name: 'Lying Leg Curl',                          videoUrl: 'https://youtu.be/sX4tGtcc62k'                },
  { name: 'DB Bulgarian Split Squat',                videoUrl: 'https://youtu.be/htDXu61MPio'                },
  { name: 'Leg Press',                               videoUrl: 'https://youtu.be/1yKAQLVV_XI'                },
  { name: 'Barbell RDL',                             videoUrl: 'https://youtu.be/3fJwfg51cv0'                },
  { name: 'Leg Extension',                           videoUrl: 'https://youtu.be/uFbNtqP966A'                },
  { name: 'Standing Calf Raise',                     videoUrl: 'https://youtu.be/6lR2JdxUh7w'                },
  { name: 'Cable Crunch',                            videoUrl: 'https://youtu.be/epBrpaGHMcg'                },
  { name: 'Machine Hip Adduction',                   videoUrl: 'https://youtu.be/FMSCZYu1JhE'                },
  { name: 'Machine Hip Abduction',                   videoUrl: 'https://youtu.be/pozooPg6PBE'                },
  { name: 'Barbell Bench Press',                     videoUrl: 'https://youtu.be/nQL5ieH39sw'                },
  { name: 'Machine Shoulder Press',                  videoUrl: 'https://youtu.be/SCQVmN1gYsk'                },
];

// ── Weekly Day Definitions ────────────────────────────────────
const DAYS = [
  { key: 'monday',    label: 'Monday',    active: true  },
  { key: 'tuesday',   label: 'Tuesday',   active: false },
  { key: 'wednesday', label: 'Wednesday', active: true  },
  { key: 'thursday',  label: 'Thursday',  active: false },
  { key: 'friday',    label: 'Friday',    active: true  },
  { key: 'saturday',  label: 'Saturday',  active: true  },
  { key: 'sunday',    label: 'Sunday',    active: false },
];

// ── Custom Exercises (runtime, synced with Firestore) ─────────
// Loaded at startup from cloud; updated whenever the user adds a custom exercise.
let CUSTOM_EXERCISES = [];

const _CUSTOM_EX_LS_KEY = 'gymtracker_custom_ex';

/** Load custom exercises: localStorage instantly, Firestore in background. */
function loadCustomExercises() {
  // 1. Immediate load from localStorage cache
  try {
    const cached = localStorage.getItem(_CUSTOM_EX_LS_KEY);
    if (cached) CUSTOM_EXERCISES = JSON.parse(cached);
  } catch (e) {
    CUSTOM_EXERCISES = [];
  }

  // 2. Background sync from Firestore
  loadCustomExCloud().then(exercises => {
    if (!exercises || exercises.length === 0) return;
    CUSTOM_EXERCISES = exercises;
    localStorage.setItem(_CUSTOM_EX_LS_KEY, JSON.stringify(exercises));
  });
}

/**
 * Add a new custom exercise to the in-memory list + persist to
 * localStorage and Firestore.  No-op if the name already exists.
 */
function addCustomExerciseToDb(name, videoUrl) {
  if (CUSTOM_EXERCISES.some(e => e.name === name)) return;
  CUSTOM_EXERCISES.push({ name, videoUrl });
  localStorage.setItem(_CUSTOM_EX_LS_KEY, JSON.stringify(CUSTOM_EXERCISES));
  saveCustomExCloud(CUSTOM_EXERCISES); // fire-and-forget
}

function clearCustomExercises() {
  CUSTOM_EXERCISES = [];
}
