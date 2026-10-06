/**
 * firebase.js
 * ─────────────────────────────────────────────────────────────
 * Firebase Auth & Firestore Initialization.
 */

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
const _auth = firebase.auth();
const _googleProvider = new firebase.auth.GoogleAuthProvider();

// ── Auth State ────────────────────────────────────────────────

let USER_UID = null;

function signIn() {
  _auth.signInWithPopup(_googleProvider).catch(err => {
    console.error("Sign in failed", err);
    alert("Sign in failed: " + err.message);
  });
}

function signOut() {
  _auth.signOut();
}

/** Listen for login/logout and notify app.js */
function onAuthReady(callback) {
  _auth.onAuthStateChanged(user => {
    if (user) {
      USER_UID = user.uid;
      _updateProfileUI(user);
    } else {
      USER_UID = null;
    }
    callback(user);
  });
}

function _updateProfileUI(user) {
  const profileDiv = document.getElementById('user-profile');
  const avatarImg = document.getElementById('user-avatar');
  if (profileDiv && avatarImg) {
    profileDiv.style.display = 'flex';
    avatarImg.src = user.photoURL || '';
    avatarImg.title = user.email || 'Signed in';
  }
}

// ── Firestore Refs ────────────────────────────────────────────
// Data is stored under the authenticated user's UID now.
const _userRef = ()    => {
  if (!USER_UID) throw new Error("Not logged in");
  return _db.collection('gymtracker').doc(USER_UID);
};
const _weekRef = (key) => _userRef().collection('weeks').doc(key);

// ── Week data ─────────────────────────────────────────────────

async function saveWeekCloud(weekKey, data) {
  if (!USER_UID) return;
  try {
    await _weekRef(weekKey).set(data);
    _setCloudBadge('synced');
  } catch (e) {
    _setCloudBadge('error');
    console.error('[Firebase] saveWeek:', e.message);
  }
}

async function loadWeekCloud(weekKey) {
  if (!USER_UID) return null;
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
  if (!USER_UID) return;
  _weekRef(weekKey).delete().catch(e => console.error('[Firebase] deleteWeek:', e.message));
}

// ── Custom exercises ──────────────────────────────────────────

function saveCustomExCloud(exercises) {
  if (!USER_UID) return;
  _userRef()
    .set({ customExercises: exercises }, { merge: true })
    .catch(e => console.error('[Firebase] saveCustomEx:', e.message));
}

async function loadCustomExCloud() {
  if (!USER_UID) return [];
  try {
    const snap = await _userRef().get();
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
  el.className = 'cloud-indicator';
  clearTimeout(_badgeTimer);

  if (type === 'syncing') {
    el.innerHTML = '<span class="cloud-spin">↻</span> Syncing';
    el.classList.add('cloud-syncing', 'visible');
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
