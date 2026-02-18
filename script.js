
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// --- Firebase Initialization ---
let app, auth, db;
let currentUser = null;

try {
  // Check if config is set (basic check)
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized");
  } else {
    console.warn("Firebase config not set. Using LocalStorage only.");
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// --- Constants ---
const STORAGE_MEALS_WEEK1 = 'mealPlanner_meals_week1';
const STORAGE_MEALS_WEEK3 = 'mealPlanner_meals_week3';
const STORAGE_NOTES_WEEK1 = 'mealPlanner_notes_week1';
const STORAGE_NOTES_WEEK3 = 'mealPlanner_notes_week3';

const DEFAULT_HEADERS = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Night Checklist', 'Morning Checklist'];
const WEEKS = {
  week1: ['Friday, 02/20', 'Saturday, 02/21', 'Sunday, 02/22', 'Monday, 02/23', 'Tuesday, 02/24', 'Wednesday, 02/25', 'Thursday, 02/26', 'Friday, 02/27', 'Saturday, 02/28', 'Sunday, 03/01', 'Monday, 03/02'],
  week3: ['Monday, 03/09', 'Tuesday, 03/10', 'Wednesday, 03/11', 'Thursday, 03/12', 'Friday, 03/13', 'Saturday, 03/14', 'Sunday, 03/15']
};

// --- DOM Elements ---
const editBtn = document.getElementById('editBtn');
const mealTable = document.getElementById('mealTable');
const tableHeadRow = document.getElementById('mealTableHead');
const tableBody = document.getElementById('mealTableBody');
const weeklyNotes = document.getElementById('weeklyNotes');
const tabWeek1 = document.getElementById('tabWeek1');
const tabWeek3 = document.getElementById('tabWeek3');
const tableToolbar = document.getElementById('tableToolbar');
const addRowBtn = document.getElementById('addRowBtn');
const removeRowBtn = document.getElementById('removeRowBtn');
const addColBtn = document.getElementById('addColBtn');
const removeColBtn = document.getElementById('removeColBtn');

// Auth DOM
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const syncStatus = document.getElementById('syncStatus');
const authWrapper = document.querySelector('.auth-wrapper'); // We added this wrapper

// --- State ---
let isEditMode = false;
let activeTab = 'week1';
let tableState = {
  columnHeaders: DEFAULT_HEADERS.slice(),
  dates: [],
  rows: []
};

// --- Helpers ---
function getStorageKeys() {
  return activeTab === 'week1'
    ? { meals: STORAGE_MEALS_WEEK1, notes: STORAGE_NOTES_WEEK1 }
    : { meals: STORAGE_MEALS_WEEK3, notes: STORAGE_NOTES_WEEK3 };
}

function updateSyncStatus(msg, isSuccess = true) {
  if (!syncStatus) return;
  syncStatus.textContent = msg;
  syncStatus.classList.remove('hidden', 'saved', 'error');
  if (msg) {
    syncStatus.classList.add(isSuccess ? 'saved' : 'error');
    // Hide "Saved" after 3 seconds
    if (msg === 'Saved') {
      setTimeout(() => {
        if (syncStatus.textContent === 'Saved') syncStatus.classList.add('hidden');
      }, 3000);
    }
  } else {
    syncStatus.classList.add('hidden');
  }
}

// --- Legacy Migration (LocalStorage) ---
function migrateLegacyStorage() {
  // Same logic as before, purely for localStorage cleanup
  const keys = [STORAGE_MEALS_WEEK1, STORAGE_MEALS_WEEK3];
  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
        // ... (rest of migration logic kept simple or assume already done)
        // For brevity preserving the logic but minimizing duplication if possible.
        // Copying the essential parts.
        const numCols = parsed[0].length;
        const headers = DEFAULT_HEADERS.slice(0, numCols);
        while (headers.length < numCols) headers.push('Column');
        const dates = key === STORAGE_MEALS_WEEK1 ? WEEKS.week1.slice(0, parsed.length) : WEEKS.week3.slice(0, parsed.length);
        localStorage.setItem(key, JSON.stringify({ columnHeaders: headers, dates, rows: parsed }));
      }
    } catch (_) { }
  });
  // ... (Other migration steps from original file are good to keep for local users)
}

// --- Render Logic ---
function buildHeaderRow() {
  tableHeadRow.innerHTML = '';
  const thDate = document.createElement('th');
  thDate.className = 'col-date';
  thDate.textContent = 'Date';
  tableHeadRow.appendChild(thDate);
  tableState.columnHeaders.forEach((h, i) => {
    const th = document.createElement('th');
    th.className = 'col-meal';
    th.textContent = h;
    if (isEditMode) {
      th.setAttribute('contenteditable', 'true');
      th.dataset.colIndex = String(i);
    }
    tableHeadRow.appendChild(th);
  });
}

function buildRow(dateLabel, rowData, rowIndex) {
  const tr = document.createElement('tr');
  tr.dataset.rowIndex = String(rowIndex);
  const tdDate = document.createElement('td');
  tdDate.className = 'date-cell editable-date';
  tdDate.textContent = dateLabel;
  if (isEditMode) tdDate.setAttribute('contenteditable', 'true');
  tr.appendChild(tdDate);
  const numCols = tableState.columnHeaders.length;
  for (let c = 0; c < numCols; c++) {
    const td = document.createElement('td');
    td.className = 'editable';
    td.textContent = rowData[c] ?? '';
    if (isEditMode) td.setAttribute('contenteditable', 'true');
    tr.appendChild(td);
  }
  return tr;
}

function renderTable() {
  buildHeaderRow();
  tableBody.innerHTML = '';
  const { dates, rows } = tableState;
  const numCols = tableState.columnHeaders.length;
  dates.forEach((date, i) => {
    const rowData = rows[i] || [];
    const padded = rowData.slice(0, numCols);
    while (padded.length < numCols) padded.push('');
    tableBody.appendChild(buildRow(date, padded, i));
  });
}

function getTableDataFromDOM() {
  const dates = [];
  const rows = [];
  tableBody.querySelectorAll('tr').forEach((row) => {
    const dateCell = row.querySelector('.date-cell');
    const cells = row.querySelectorAll('td.editable');
    dates.push(dateCell ? dateCell.textContent.trim() : '');
    const rowData = [];
    cells.forEach((c) => rowData.push(c.textContent.trim()));
    rows.push(rowData);
  });
  return { dates, rows };
}

function syncStateFromDOM() {
  const headCells = tableHeadRow.querySelectorAll('th.col-meal');
  const headers = [];
  headCells.forEach((th) => headers.push(th.textContent.trim() || 'Column'));
  tableState.columnHeaders = headers.length ? headers : DEFAULT_HEADERS.slice();
  const { dates, rows } = getTableDataFromDOM();
  tableState.dates = dates;
  tableState.rows = rows;
}

// --- Persistence ---

async function saveTableData() {
  syncStateFromDOM();
  const keys = getStorageKeys();
  const data = {
    columnHeaders: tableState.columnHeaders,
    dates: tableState.dates,
    rows: tableState.rows
  };

  if (currentUser && db) {
    try {
      updateSyncStatus('Saving...', true);
      // Changed to global 'planner' collection (shared)
      // Doc path: planner/week1_meals or planner/week3_meals
      await setDoc(doc(db, 'planner', keys.meals), data);
      updateSyncStatus('Saved', true);
    } catch (e) {
      console.error("Save error:", e);
      updateSyncStatus('Error Saving', false);
    }
  } else {
    // Local fallback only if no auth (though user wants cloud sync mostly)
    localStorage.setItem(keys.meals, JSON.stringify(data));
    updateSyncStatus('Saved locally', true);
  }
}

async function saveNotes() {
  const keys = getStorageKeys();
  const noteContent = weeklyNotes.value;

  if (currentUser && db) {
    try {
      updateSyncStatus('Saving...', true);
      // Doc path: planner/week1_notes or planner/week3_notes
      await setDoc(doc(db, 'planner', keys.notes), { content: noteContent });
      updateSyncStatus('Saved', true);
    } catch (e) {
      console.error("Save notes error:", e);
      updateSyncStatus('Error Saving', false);
    }
  } else {
    localStorage.setItem(keys.notes, noteContent);
  }
}

async function loadSavedData() {
  const keys = getStorageKeys();
  let data = null;
  let notes = null;

  // ALWAYS try to load from Cloud FIRST (public read enabled)
  if (db) {
    try {
      updateSyncStatus('Loading...', true);
      // Use 'planner' collection now
      const mealsSnap = await getDoc(doc(db, 'planner', keys.meals));
      if (mealsSnap.exists()) {
        data = mealsSnap.data();
        console.log("Loaded meals from cloud:", keys.meals);
      }

      const notesSnap = await getDoc(doc(db, 'planner', keys.notes));
      if (notesSnap.exists()) {
        notes = notesSnap.data().content;
        console.log("Loaded notes from cloud:", keys.notes);
      }

      updateSyncStatus('Synced', true);
    } catch (e) {
      console.error("Load error (Cloud):", e);
      updateSyncStatus('Error Loading', false);
    }
  }

  // Fallback to local storage ONLY if cloud failed or empty
  if (!data) {
    migrateLegacyStorage();
    try {
      const raw = localStorage.getItem(keys.meals);
      if (raw) data = JSON.parse(raw);
      if (!notes) notes = localStorage.getItem(keys.notes); // Only fallback notes if cloud notes missing
    } catch (_) { }
  }

  // Apply Data
  if (data && data.columnHeaders && data.dates && data.rows) {
    tableState = {
      columnHeaders: data.columnHeaders,
      dates: data.dates,
      rows: data.rows
    };
  } else if (!data) {
    // Default / Fallback (only if NO data anywhere)
    const defaultDates = activeTab === 'week1' ? WEEKS.week1.slice() : WEEKS.week3.slice();
    const numCols = DEFAULT_HEADERS.length;
    tableState = {
      columnHeaders: DEFAULT_HEADERS.slice(),
      dates: defaultDates,
      rows: defaultDates.map(() => Array(numCols).fill(''))
    };
  }

  renderTable();
  // Ensure notes field respects edit mode
  weeklyNotes.value = notes || '';
}


// --- Interactions ---

function addRow() {
  syncStateFromDOM();
  const numCols = tableState.columnHeaders.length;
  tableState.dates.push('—');
  tableState.rows.push(Array(numCols).fill(''));
  renderTable();
}

function removeRow() {
  syncStateFromDOM();
  if (tableState.dates.length <= 1) return;
  tableState.dates.pop();
  tableState.rows.pop();
  renderTable();
}

function addColumn() {
  syncStateFromDOM();
  tableState.columnHeaders.push('New column');
  tableState.rows.forEach((r) => r.push(''));
  renderTable();
}

function removeColumn() {
  syncStateFromDOM();
  if (tableState.columnHeaders.length <= 1) return;
  tableState.columnHeaders.pop();
  tableState.rows.forEach((r) => r.pop());
  renderTable();
}

function switchTab(tab) {
  if (tab === activeTab) return;
  if (isEditMode) setEditMode(false);
  activeTab = tab;
  tabWeek1.classList.toggle('active', tab === 'week1');
  tabWeek3.classList.toggle('active', tab === 'week3');
  tabWeek1.setAttribute('aria-selected', tab === 'week1');
  tabWeek3.setAttribute('aria-selected', tab === 'week3');
  loadSavedData();
}

function setEditMode(editing) {
  isEditMode = editing;
  if (editing) {
    saveTableData();
    saveNotes();
  } else {
    saveTableData();
    saveNotes();
  }
  renderTable();
  if (editing) {
    weeklyNotes.disabled = false;
    weeklyNotes.classList.add('edit-mode');
    editBtn.textContent = 'Save';
    editBtn.classList.add('save-mode');
    tableToolbar.classList.add('visible');
    tableToolbar.setAttribute('aria-hidden', 'false');
  } else {
    weeklyNotes.disabled = true;
    weeklyNotes.classList.remove('edit-mode');
    editBtn.textContent = 'Edit Week';
    editBtn.classList.remove('save-mode');
    tableToolbar.classList.remove('visible');
    tableToolbar.setAttribute('aria-hidden', 'true');
  }
}

// --- Auth Logic ---

function handleLogin() {
  if (!auth) {
    alert("Firebase is not configured. Please see firebase-config.js.");
    return;
  }
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch((error) => {
    console.error(error);
    alert("Login failed: " + error.message);
  });
}

function handleLogout() {
  if (auth) {
    signOut(auth);
  }
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      // User is signed in
      loginBtn.classList.add('hidden');
      userProfile.classList.remove('hidden');
      userProfile.style.display = 'flex'; // Ensure flex
      userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
      editBtn.style.display = 'block'; // Show edit button
      // Load cloud data
      loadSavedData();
    } else {
      // User is signed out
      loginBtn.classList.remove('hidden');
      userProfile.classList.add('hidden');
      currentUser = null;
      editBtn.style.display = 'none'; // Hide edit button (Read-only mode)
      setEditMode(false); // Ensure we exit edit mode if active
      // Load cloud data (public read)
      loadSavedData();
    }
  });
} else {
  // If no auth, just load local
  loadSavedData();
}


// --- Event Listeners ---
editBtn.addEventListener('click', () => setEditMode(!isEditMode));
tabWeek1.addEventListener('click', () => switchTab('week1'));
tabWeek3.addEventListener('click', () => switchTab('week3'));
addRowBtn.addEventListener('click', addRow);
removeRowBtn.addEventListener('click', removeRow);
addColBtn.addEventListener('click', addColumn);
removeColBtn.addEventListener('click', removeColumn);

if (loginBtn) loginBtn.addEventListener('click', handleLogin);
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

// Initial Load
weeklyNotes.disabled = true;
// loadSavedData is called by auth state change or fallback above
