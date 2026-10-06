/**
 * firebase.js
 * ─────────────────────────────────────────────────────────────
 * Firebase initialization + Firestore helpers.
 * Uses the compat SDK (v9) loaded via CDN in index.html.
 *
 * ⚠️  Firestore Security Rules (set in Firebase Console → Firestore → Rules):
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /gymtracker/{document=**} {
 *         allow read, write: if true;
 *       }
 *     }
 *   }
 *
 * Firestore data structure:
 *   gymtracker/{deviceId}                     ← device document
 *     .customExercises: [{name, videoUrl}]    ← custom exercise list
 *     weeks/{weekKey}                         ← one doc per week
 *       .monday:    [{name, videoUrl, sets}]
 *       .wednesday: [...]
 *       ...
 */

// ── Firebase config ───────────────────────────────────────────
const _FB_CONFIG = {
  apiKey:            'AIzaSyAw0PJl4kj1KBJllw7CBQzB_uWFlHBPh58',
  authDomain:        'gym-tracker-af952.firebaseapp.com',
  projectId:         'gym-tracker-af952',
  storageBucket:     'gym-tracker-af952.firebasestorage.app',
  messagingSenderId: '459175675699',
  appId:             '1:459175675699:web:c8e58b209d36862cfea046',
  measurementId:     'G-2EPD8XDXZ7T',
};

firebase.initializeApp(_FB_CONFIG);
const _db = firebase.firestore();

// ── Device ID ─────────────────────────────────────────────────
// A stable anonymous ID for this browser. Stored in localStorage.
function _getDeviceId() {
  let id = localStorage.getItem('gymtracker_device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('gymtracker_device_id', id);
  }
  return id;
}

const DEVICE_ID = _getDeviceId();

// Firestore path helpers
const _deviceRef = ()    => _db.collection('gymtracker').doc(DEVICE_ID);
const _weekRef   = (key) => _deviceRef().collection('weeks').doc(key);

// ── Week data ─────────────────────────────────────────────────

async function saveWeekCloud(weekKey, data) {
  try {
    await _weekRef(weekKey).set(data);
    _setCloudBadge('synced');
  } catch (e) {
    _setCloudBadge('error');
    console.error('[Firebase] saveWeek:', e.message);
  }
}

async function loadWeekCloud(weekKey) {
  try {
    const snap = await _weekRef(weekKey).get();
    _setCloudBadge('synced');
    return snap.exists ? snap.data() : null;
  } catch (e) {
    _setCloudBadge('error');
    console.error('[Firebase] loadWeek:', e.message);
    return null;
  }
}

function deleteWeekCloud(weekKey) {
  _weekRef(weekKey).delete().catch(e => console.error('[Firebase] deleteWeek:', e.message));
}

// ── Custom exercises ──────────────────────────────────────────

function saveCustomExCloud(exercises) {
  _deviceRef()
    .set({ customExercises: exercises }, { merge: true })
    .catch(e => console.error('[Firebase] saveCustomEx:', e.message));
}

async function loadCustomExCloud() {
  try {
    const snap = await _deviceRef().get();
    return snap.exists && Array.isArray(snap.data().customExercises)
      ? snap.data().customExercises
      : [];
  } catch (e) {
    console.error('[Firebase] loadCustomEx:', e.message);
    return [];
  }
}

// ── Cloud badge ───────────────────────────────────────────────
let _badgeTimer = null;

function showCloudSyncing() { _setCloudBadge('syncing'); }

function _setCloudBadge(type) {
  const el = document.getElementById('cloud-indicator');
  if (!el) return;
  el.className = 'cloud-indicator'; // reset all modifier classes
  clearTimeout(_badgeTimer);

  if (type === 'syncing') {
    el.innerHTML = '<span class="cloud-spin">↻</span> Syncing';
    el.classList.add('cloud-syncing', 'visible');
    // Auto-clear after 8 s in case the response never comes
    _badgeTimer = setTimeout(() => el.classList.remove('visible'), 8000);
  } else if (type === 'synced') {
    el.innerHTML = '☁ Saved';
    el.classList.add('cloud-synced', 'visible');
    _badgeTimer = setTimeout(() => el.classList.remove('visible'), 2500);
  } else if (type === 'error') {
    el.innerHTML = '✕ Offline';
    el.classList.add('cloud-error', 'visible');
    _badgeTimer = setTimeout(() => el.classList.remove('visible'), 3000);
  }
}
