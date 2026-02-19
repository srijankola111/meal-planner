
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// Calendar DOM
const tableWrapper = document.querySelector('.table-wrapper');
const calendarView = document.getElementById('calendarView');
const viewToggleBtn = document.getElementById('viewToggleBtn');
const calendarGrid = document.getElementById('calendarGrid');
const calendarTitle = document.getElementById('calendarTitle');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');

// Auth DOM
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const emailLoginBtn = document.getElementById('emailLoginBtn');
const emailSignUpBtn = document.getElementById('emailSignUpBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const loginError = document.getElementById('loginError');

// Settings / User Info
let logoutBtn = document.getElementById('logoutBtn');
let userProfile = document.getElementById('loggedInView');
let userAvatar = document.getElementById('userAvatar');
const syncStatus = document.getElementById('syncStatus');
const authContainer = document.getElementById('authContainer');
const loggedInView = document.getElementById('loggedInView');
const loggedOutView = document.getElementById('loggedOutView');
const userName = document.getElementById('userName');

// Settings DOM
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const columnColorSettings = document.getElementById('columnColorSettings');
const themeBtns = document.querySelectorAll('.theme-btn');


// --- State ---
let isEditMode = false;
let isCalendarView = false;
let calendarDate = new Date();
let activeTab = 'week1';
let tableState = {
  columnHeaders: DEFAULT_HEADERS.slice(),
  dates: [],
  rows: [],
  // Stores custom colors for headers: { "Breakfast": "#ff0000" }
  columnColors: {}
};
let currentTheme = 'default';

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

    // Apply custom color if exists
    if (tableState.columnColors && tableState.columnColors[h]) {
      th.style.color = tableState.columnColors[h];
      th.style.borderColor = tableState.columnColors[h]; // Optional: tint border
    }

    if (isEditMode) {
      th.setAttribute('contenteditable', 'true');
      th.dataset.colIndex = String(i);
    }
    tableHeadRow.appendChild(th);
  });
}

// --- Render Helpers ---
function formatDateForDisplay(isoDate) {
  if (!isoDate) return '';
  // Try to parse YYYY-MM-DD
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    // Format: "Friday, 2/20"
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
  }
  return isoDate; // Fallback for old data or invalid format
}

function buildRow(dateLabel, rowData, rowIndex) {
  const tr = document.createElement('tr');
  tr.dataset.rowIndex = String(rowIndex);

  const tdDate = document.createElement('td');
  tdDate.className = 'date-cell';

  if (isEditMode) {
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'date-input';
    // Try to convert "Friday, 02/20" to "2026-02-20" if needed, or use existing ISO
    // The previous app used "Friday, 02/20". We want to migrate to YYYY-MM-DD.
    // If dateLabel matches YYYY-MM-DD, use it.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateLabel)) {
      input.value = dateLabel;
    } else {
      // Attempt conversion from "Friday, 02/20" assuming current year?
      // Or just empty if not standard.
      // Let's force user to pick new date to fix data.
      input.value = '';
    }
    tdDate.appendChild(input);
  } else {
    tdDate.textContent = formatDateForDisplay(dateLabel);
  }

  tr.appendChild(tdDate);

  const numCols = tableState.columnHeaders.length;
  for (let c = 0; c < numCols; c++) {
    const td = document.createElement('td');
    td.className = 'editable';
    td.textContent = rowData[c] ?? '';
    if (isEditMode) td.setAttribute('contenteditable', 'true');
    // Apply column theme color so it shows on all tabs
    const headerName = tableState.columnHeaders[c];
    if (tableState.columnColors && tableState.columnColors[headerName]) {
      const col = tableState.columnColors[headerName];
      td.style.borderLeft = `3px solid ${col}`;
    }
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
  tableBody.querySelectorAll('tr').forEach((row, rowIndex) => {
    // If edit mode, read input value; else read textContent
    // Wait, simple textContent read won't work if we want to save ISO dates but display formatted text.
    // We must rely on tableState for non-edited rows or read the input if present.
    // Actually, syncStateFromDOM is called BEFORE save.
    // If we are NOT in edit mode, the DOM has "Friday, 2/20". We don't want to save that as the date key if we want ISO.
    // So syncStateFromDOM should only be called when we are modifying data (which happens in edit mode or add/remove row).

    // Better Logic:
    // If in edit mode, read the inputs.
    // If NOT in edit mode, we shouldn't be updating tableState from DOM for dates, 
    // because DOM has formatted text. But addRow/removeRow might call this.
    // The previous app relied on DOM being the source of truth.
    // Problem: formatted text is lossy (no year).
    // Solution: Only update dates from DOM if we are in Edit Mode (input values).
    // If not in edit mode, use existing tableState.dates.

    const dateInput = row.querySelector('.date-input');
    if (dateInput) {
      dates.push(dateInput.value); // YYYY-MM-DD or empty
    } else {
      // View mode: prioritize existing ISO date from memory over formatted DOM text
      if (tableState.dates[rowIndex]) {
        dates.push(tableState.dates[rowIndex]);
      } else {
        // Fallback legacy text
        const dateCell = row.querySelector('.date-cell');
        dates.push(dateCell ? dateCell.textContent.trim() : '');
      }
    }

    const cells = row.querySelectorAll('td.editable');
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

  // Firestore doesn't support nested arrays (Array of Arrays).
  // We must wrap the inner arrays in objects.
  const serializedRows = tableState.rows.map(r => ({ cells: r }));

  const data = {
    columnHeaders: tableState.columnHeaders,
    dates: tableState.dates,
    rows: serializedRows,
    columnColors: tableState.columnColors || {}
  };

  if (currentUser && db) {
    try {
      updateSyncStatus('Saving...', true);
      await setDoc(doc(db, 'planner', keys.meals), data);
      // Keep column colors in sync on the other tab too
      const otherMealsKey = keys.meals === STORAGE_MEALS_WEEK1 ? STORAGE_MEALS_WEEK3 : STORAGE_MEALS_WEEK1;
      const otherSnap = await getDoc(doc(db, 'planner', otherMealsKey));
      if (otherSnap.exists()) {
        const otherData = otherSnap.data();
        await setDoc(doc(db, 'planner', otherMealsKey), { ...otherData, columnColors: data.columnColors });
      }
      updateSyncStatus('Saved', true);
    } catch (e) {
      console.error("Save error:", e);
      updateSyncStatus('Error Saving', false);
      alert("Error saving data: " + e.message);
    }
  } else {
    localStorage.setItem(keys.meals, JSON.stringify(data));
    // Sync column colors to the other week locally too
    const otherMealsKey = keys.meals === STORAGE_MEALS_WEEK1 ? STORAGE_MEALS_WEEK3 : STORAGE_MEALS_WEEK1;
    try {
      const raw = localStorage.getItem(otherMealsKey);
      const otherData = raw ? JSON.parse(raw) : {};
      if (otherData && (otherData.dates || otherData.rows || otherData.columnHeaders)) {
        localStorage.setItem(otherMealsKey, JSON.stringify({ ...otherData, columnColors: data.columnColors }));
      }
    } catch (_) { }
    updateSyncStatus('Saved locally', true);
  }
}

async function saveNotes() {
  const keys = getStorageKeys();
  const noteContent = weeklyNotes.value;

  if (currentUser && db) {
    try {
      updateSyncStatus('Saving...', true);
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
  if (data && Array.isArray(data.columnHeaders) && Array.isArray(data.dates) && Array.isArray(data.rows)) {
    console.log("Applying loaded data to tableState");

    // Check if rows are in object wrapper format (Firestore fix) or legacy array format
    let deserializedRows = data.rows;
    if (deserializedRows.length > 0 && !Array.isArray(deserializedRows[0]) && deserializedRows[0].cells) {
      deserializedRows = deserializedRows.map(r => r.cells);
    } else if (deserializedRows.length > 0 && !Array.isArray(deserializedRows[0])) {
      // no-op
    }

    let columnColors = data.columnColors || {};
    // If this tab has no column colors, use the other tab's so colors show on Week 3 too
    if (Object.keys(columnColors).length === 0) {
      const otherMealsKey = keys.meals === STORAGE_MEALS_WEEK1 ? STORAGE_MEALS_WEEK3 : STORAGE_MEALS_WEEK1;
      let otherData = null;
      if (db) {
        try {
          const otherSnap = await getDoc(doc(db, 'planner', otherMealsKey));
          if (otherSnap.exists()) otherData = otherSnap.data();
        } catch (_) { }
      }
      if (!otherData) {
        try {
          const raw = localStorage.getItem(otherMealsKey);
          if (raw) otherData = JSON.parse(raw);
        } catch (_) { }
      }
      if (otherData && otherData.columnColors && Object.keys(otherData.columnColors).length > 0) {
        columnColors = otherData.columnColors;
      }
    }

    tableState = {
      columnHeaders: data.columnHeaders,
      dates: data.dates,
      rows: deserializedRows,
      columnColors
    };
  } else {
    // Default / Fallback (if no data OR data is invalid)
    console.log("No valid data found, initializing defaults.");
    const defaultDates = activeTab === 'week1' ? WEEKS.week1.slice() : WEEKS.week3.slice();
    const numCols = DEFAULT_HEADERS.length;
    tableState = {
      columnHeaders: DEFAULT_HEADERS.slice(),
      dates: defaultDates,
      rows: defaultDates.map(() => Array(numCols).fill('')),
      columnColors: {}
    };
  }

  renderTable();
  renderColorSettings(); // Refresh color settings UI
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

    // Change Icon to Checkmark or "Save" text? 
    // Button is now an icon button. Use SVG.
    editBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    editBtn.title = "Save Changes";
    editBtn.classList.add('editing'); // Green background style

    tableToolbar.classList.add('visible');
    tableToolbar.setAttribute('aria-hidden', 'false');
  } else {
    weeklyNotes.disabled = true;
    weeklyNotes.classList.remove('edit-mode');

    // Icon back to Pencil
    editBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
      </svg>
    `;
    editBtn.title = "Edit Week";
    editBtn.classList.remove('editing');

    tableToolbar.classList.remove('visible');
    tableToolbar.setAttribute('aria-hidden', 'true');
  }
}

// --- Calendar Logic ---

// Helper to fetch ALL weeks data for the universal calendar
async function fetchAllMeals() {
  const allMeals = [];
  let columnMeta = null;
  const keys = [
    { name: 'week1', key: STORAGE_MEALS_WEEK1 },
    { name: 'week3', key: STORAGE_MEALS_WEEK3 }
  ];

  // We need to fetch both. 
  // Optimization: If we already have activeTab data in tableState, use it?
  // But safest is to just fetch fresh or use cache.
  // Since we want "universal", we must fetch the non-active tab too.

  for (const k of keys) {
    let data = null;
    // 1. Try Cloud
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'planner', k.key));
        if (snap.exists()) {
          data = snap.data();
        }
      } catch (e) { console.error("Calendar fetch error:", e); }
    }

    // 2. Fallback Local
    if (!data) {
      try {
        const raw = localStorage.getItem(k.key);
        if (raw) data = JSON.parse(raw);
      } catch (_) { }
    }

    if (data && data.dates && data.rows) {
      // Normalize rows
      let rows = data.rows;
      if (rows.length > 0 && !Array.isArray(rows[0]) && rows[0].cells) {
        rows = rows.map(r => r.cells);
      }
      allMeals.push({ dates: data.dates, rows: rows });
      // Use first dataset's column headers/colors for calendar theming
      if (!columnMeta && data.columnHeaders && data.columnHeaders.length) {
        columnMeta = {
          columnHeaders: data.columnHeaders,
          columnColors: data.columnColors || {}
        };
      }
    }
  }
  return { allMeals, columnMeta: columnMeta || { columnHeaders: [], columnColors: {} } };
}

function toggleView() {
  isCalendarView = !isCalendarView;

  if (isCalendarView) {
    tableWrapper.classList.add('hidden');
    calendarView.classList.remove('hidden');
    // Ensure edit mode is off or handled? 
    // Usually calendar is read-only.
    // Let's keep it read-only for now.
    renderCalendar();

    // Update button icon/style?
    // Maybe change icon to "Table" or "List"
    viewToggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    `;
    viewToggleBtn.title = "Switch to Table View";
  } else {
    tableWrapper.classList.remove('hidden');
    calendarView.classList.add('hidden');
    renderTable(); // Refresh table in case data changed (though calendar is read-only for now)

    // Icon back to Calendar
    viewToggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    `;
    viewToggleBtn.title = "Switch to Calendar View";
  }
}

// function changeMonth(offset) -- Removed for single page view
// function updateNavButtons() -- Removed for single page view

async function renderCalendar() {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">Loading...</div>';

  const { allMeals: allData, columnMeta } = await fetchAllMeals();
  const { columnHeaders, columnColors } = columnMeta;

  calendarGrid.innerHTML = '';

  // Fixed Range: Feb 15, 2026 to Mar 14, 2026 (28 Days)
  // Feb 15 2026 is Sunday
  const startDate = new Date(2026, 1, 15); // Month 1 is Feb
  startDate.setHours(0, 0, 0, 0);
  const totalDays = 28;

  // Map Data
  const mealsMap = new Map();
  // Key format: "YYYY-M-D" (no padding for M/D to match easy construction)

  allData.forEach(dataset => {
    dataset.dates.forEach((dStr, index) => {
      if (!dStr) return;

      let targetYear, targetMonth, targetDay;

      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
        const parts = dStr.split('-');
        targetYear = parseInt(parts[0]);
        targetMonth = parseInt(parts[1]) - 1;
        targetDay = parseInt(parts[2]);
      } else {
        const parts = dStr.split(', ');
        if (parts.length > 1) {
          const [m, d] = parts[1].split('/');
          targetMonth = parseInt(m) - 1;
          targetDay = parseInt(d);
          targetYear = 2026; // Assume 2026
        }
      }

      if (targetMonth !== undefined && targetDay !== undefined) {
        const key = `${targetYear}-${targetMonth}-${targetDay}`;
        mealsMap.set(key, dataset.rows[index]);
      }
    });
  });

  // Render Fixed Grid
  const today = new Date();

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const div = document.createElement('div');
    div.className = 'calendar-day';

    // Highlight Today
    if (currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()) {
      div.classList.add('today');
    }

    const dNum = currentDate.getDate();
    const dMonth = currentDate.getMonth(); // 0-11
    const dYear = currentDate.getFullYear();

    // Header for day number (e.g. Feb 15)
    // Show Month Name if it's the 1st of the month OR the very first cell
    const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const num = document.createElement('span');
    num.className = 'day-number';

    if (dNum === 1 || i === 0) {
      num.textContent = `${monthShort[dMonth]} ${dNum}`;
    } else {
      num.textContent = dNum;
    }
    div.appendChild(num);

    const key = `${dYear}-${dMonth}-${dNum}`;

    if (mealsMap.has(key)) {
      const meals = mealsMap.get(key);
      const container = document.createElement('div');
      container.className = 'meal-items';

      meals.slice(0, 6).forEach((m, idx) => {
        if (m && m.trim()) {
          const p = document.createElement('div');
          p.className = 'meal-pill';
          p.textContent = m;
          p.title = m;
          // Apply column theme color on calendar
          const headerName = columnHeaders[idx];
          if (headerName && columnColors[headerName]) {
            p.style.borderLeftColor = columnColors[headerName];
            p.style.borderLeftWidth = '3px';
          }
          container.appendChild(p);
        }
      });
      div.appendChild(container);
    }

    calendarGrid.appendChild(div);
  }
}

// --- Settings Modal ---
function toggleSettings() {
  if (!settingsModal) return;
  settingsModal.classList.toggle('hidden');
}

function handleThemeChange(e) {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  const theme = btn.dataset.theme;
  if (!theme) return;
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  try { localStorage.setItem('mealPlanner_theme', theme); } catch (_) { }
}

function renderColorSettings() {
  if (!columnColorSettings) return;
  columnColorSettings.innerHTML = '';
  tableState.columnHeaders.forEach((header) => {
    const row = document.createElement('div');
    row.className = 'color-row';
    const label = document.createElement('span');
    label.textContent = header;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = tableState.columnColors[header] || '#BA8E23';
    input.title = `Color for ${header}`;
    input.addEventListener('change', () => {
      tableState.columnColors[header] = input.value;
      buildHeaderRow();
      renderTable(); // refresh body cells so column theme shows on all tabs
      saveTableData();
    });
    row.appendChild(label);
    row.appendChild(input);
    columnColorSettings.appendChild(row);
  });
}

// --- Auth Logic ---

function showLoginError(msg) {
  if (loginError) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
  }
}

function handleGoogleLogin() {
  if (!auth) {
    showLoginError("Firebase is not configured.");
    return;
  }
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch((error) => {
    console.error(error);
    showLoginError("Google Sign-In failed: " + error.message);
  });
}

function handleEmailLogin() {
  if (!auth) return;
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError("Please enter email and password.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in 
      loginError.classList.add('hidden');
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      if (errorCode === 'auth/invalid-credential') {
        showLoginError("Invalid email or password.");
      } else {
        showLoginError(errorMessage);
      }
    });
}

function handleEmailSignUp() {
  if (!auth) return;
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError("Please enter email and password.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up 
      loginError.classList.add('hidden');
      alert("Account created successfully!");
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      if (errorCode === 'auth/email-already-in-use') {
        showLoginError("Email already in use. Try signing in.");
      } else if (errorCode === 'auth/weak-password') {
        showLoginError("Password should be at least 6 characters.");
      } else {
        showLoginError(errorMessage);
      }
    });
}

function handleLogout() {
  if (isEditMode) {
    alert("Please click 'Save' to save your changes before logging out.");
    return;
  }
  if (auth) {
    signOut(auth);
  }
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      // User is signed in
      loginPage.classList.add('hidden');
      mainApp.classList.remove('hidden');

      // Update User Profile in Settings
      userProfile.classList.remove('hidden');
      userProfile.style.display = 'flex';
      userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
      if (userName && user.displayName) userName.textContent = user.displayName;
      else if (userName) userName.textContent = user.email;

      editBtn.style.display = 'block'; // Show edit button (or flex)

      // Load cloud data
      loadSavedData();
    } else {
      // User is signed out
      loginPage.classList.remove('hidden');
      mainApp.classList.add('hidden');

      // Reset inputs
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
      if (loginError) loginError.classList.add('hidden');

      userProfile.classList.add('hidden');
      currentUser = null;
      editBtn.style.display = 'none';
      setEditMode(false);
      // Do not load data if logged out, or clear table?
      // Since we want full protection, we just hide the mainApp.
      // But maybe clear tableState to be safe?
      tableState.rows = [];
      tableState.dates = [];
      renderTable();
    }
  });
} else {
  // If no auth (e.g. config error), show main app or error?
  // Let's assume auth is configured. If not, maybe show login page with error.
  console.log("Auth not initialized");
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  // Re-fetch some elements or attach listeners to global consts

  if (settingsBtn) settingsBtn.addEventListener('click', toggleSettings);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', toggleSettings);
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) toggleSettings();
  });
  if (themeBtns) themeBtns.forEach(btn => btn.addEventListener('click', handleThemeChange));

  if (editBtn) editBtn.addEventListener('click', () => setEditMode(!isEditMode));
  if (tabWeek1) tabWeek1.addEventListener('click', () => switchTab('week1'));
  if (tabWeek3) tabWeek3.addEventListener('click', () => switchTab('week3'));
  if (addRowBtn) addRowBtn.addEventListener('click', addRow);
  if (removeRowBtn) removeRowBtn.addEventListener('click', removeRow);
  if (addColBtn) addColBtn.addEventListener('click', addColumn);
  if (removeColBtn) removeColBtn.addEventListener('click', removeColumn);

  if (viewToggleBtn) viewToggleBtn.addEventListener('click', toggleView);

  // New Auth View Listeners
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);
  if (emailLoginBtn) emailLoginBtn.addEventListener('click', handleEmailLogin);
  if (emailSignUpBtn) emailSignUpBtn.addEventListener('click', handleEmailSignUp);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Initial Load
  if (weeklyNotes) weeklyNotes.disabled = true;
  // Restore theme
  const savedTheme = localStorage.getItem('mealPlanner_theme') || 'default';
  currentTheme = savedTheme;
  document.body.setAttribute('data-theme', savedTheme);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === savedTheme));
});

