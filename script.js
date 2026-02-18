(function () {
  const STORAGE_MEALS_WEEK1 = 'mealPlanner_meals_week1';
  const STORAGE_MEALS_WEEK3 = 'mealPlanner_meals_week3';
  const STORAGE_NOTES_WEEK1 = 'mealPlanner_notes_week1';
  const STORAGE_NOTES_WEEK3 = 'mealPlanner_notes_week3';

  const DEFAULT_HEADERS = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Night Checklist', 'Morning Checklist'];
  const WEEKS = {
    week1: ['Friday, 02/20', 'Saturday, 02/21', 'Sunday, 02/22', 'Monday, 02/23', 'Tuesday, 02/24', 'Wednesday, 02/25', 'Thursday, 02/26', 'Friday, 02/27', 'Saturday, 02/28', 'Sunday, 03/01', 'Monday, 03/02'],
    week3: ['Monday, 03/09', 'Tuesday, 03/10', 'Wednesday, 03/11', 'Thursday, 03/12', 'Friday, 03/13', 'Saturday, 03/14', 'Sunday, 03/15']
  };

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

  let isEditMode = false;
  let activeTab = 'week1';
  // Current table state (dates and rows) – rebuilt on load, then modified by add/remove
  let tableState = {
    columnHeaders: DEFAULT_HEADERS.slice(),
    dates: [],
    rows: []
  };

  function getStorageKeys() {
    return activeTab === 'week1'
      ? { meals: STORAGE_MEALS_WEEK1, notes: STORAGE_NOTES_WEEK1 }
      : { meals: STORAGE_MEALS_WEEK3, notes: STORAGE_NOTES_WEEK3 };
  }

  function migrateLegacyStorage() {
    const keys = [STORAGE_MEALS_WEEK1, STORAGE_MEALS_WEEK3];
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
          const numCols = parsed[0].length;
          const headers = DEFAULT_HEADERS.slice(0, numCols);
          while (headers.length < numCols) headers.push('Column');
          const dates = key === STORAGE_MEALS_WEEK1 ? WEEKS.week1.slice(0, parsed.length) : WEEKS.week3.slice(0, parsed.length);
          const pad = key === STORAGE_MEALS_WEEK1 ? WEEKS.week1 : WEEKS.week3;
          while (dates.length < parsed.length) dates.push(pad[dates.length] || '—');
          localStorage.setItem(key, JSON.stringify({ columnHeaders: headers, dates, rows: parsed }));
        }
      } catch (_) {}
    });
    const legacyBefore = localStorage.getItem('mealPlanner_meals_before');
    const legacyAfter = localStorage.getItem('mealPlanner_meals_after');
    const legacyMeals = localStorage.getItem('mealPlanner_meals');
    if (legacyBefore) {
      localStorage.setItem(STORAGE_MEALS_WEEK1, legacyBefore);
      localStorage.removeItem('mealPlanner_meals_before');
    }
    if (legacyAfter) {
      localStorage.setItem(STORAGE_MEALS_WEEK3, legacyAfter);
      localStorage.removeItem('mealPlanner_meals_after');
    }
    if (legacyMeals && !localStorage.getItem(STORAGE_MEALS_WEEK1)) {
      localStorage.setItem(STORAGE_MEALS_WEEK1, legacyMeals);
      localStorage.removeItem('mealPlanner_meals');
    }
    const legacyNotesBefore = localStorage.getItem('mealPlanner_notes_before');
    const legacyNotesAfter = localStorage.getItem('mealPlanner_notes_after');
    const legacyNotes = localStorage.getItem('mealPlanner_notes');
    if (legacyNotesBefore !== null) {
      localStorage.setItem(STORAGE_NOTES_WEEK1, legacyNotesBefore);
      localStorage.removeItem('mealPlanner_notes_before');
    }
    if (legacyNotesAfter !== null) {
      localStorage.setItem(STORAGE_NOTES_WEEK3, legacyNotesAfter);
      localStorage.removeItem('mealPlanner_notes_after');
    }
    if (legacyNotes !== null && !localStorage.getItem(STORAGE_NOTES_WEEK1)) {
      localStorage.setItem(STORAGE_NOTES_WEEK1, legacyNotes);
      localStorage.removeItem('mealPlanner_notes');
    }
  }

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

  function saveTableData() {
    syncStateFromDOM();
    const keys = getStorageKeys();
    localStorage.setItem(keys.meals, JSON.stringify({
      columnHeaders: tableState.columnHeaders,
      dates: tableState.dates,
      rows: tableState.rows
    }));
  }

  function loadSavedData() {
    migrateLegacyStorage();
    const keys = getStorageKeys();
    try {
      const raw = localStorage.getItem(keys.meals);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.columnHeaders && data.dates && data.rows) {
          tableState = {
            columnHeaders: data.columnHeaders,
            dates: data.dates,
            rows: data.rows
          };
        } else if (Array.isArray(data) && data.length > 0) {
          const defaultDates = activeTab === 'week1' ? WEEKS.week1 : WEEKS.week3;
          const numCols = Array.isArray(data[0]) ? data[0].length : DEFAULT_HEADERS.length;
          const headers = DEFAULT_HEADERS.slice(0, numCols);
          while (headers.length < numCols) headers.push('Column');
          const dates = defaultDates.slice(0, data.length);
          while (dates.length < data.length) dates.push('—');
          tableState = { columnHeaders: headers, dates, rows: data };
        }
      } else {
        const defaultDates = activeTab === 'week1' ? WEEKS.week1.slice() : WEEKS.week3.slice();
        const numCols = DEFAULT_HEADERS.length;
        tableState = {
          columnHeaders: DEFAULT_HEADERS.slice(),
          dates: defaultDates,
          rows: defaultDates.map(() => Array(numCols).fill(''))
        };
      }
    } catch (e) {
      const defaultDates = activeTab === 'week1' ? WEEKS.week1.slice() : WEEKS.week3.slice();
      tableState = {
        columnHeaders: DEFAULT_HEADERS.slice(),
        dates: defaultDates,
        rows: defaultDates.map(() => Array(DEFAULT_HEADERS.length).fill(''))
      };
    }
    renderTable();

    try {
      const savedNotes = localStorage.getItem(keys.notes);
      weeklyNotes.value = savedNotes !== null ? savedNotes : '';
    } catch (_) {}
  }

  function saveNotes() {
    const keys = getStorageKeys();
    localStorage.setItem(keys.notes, weeklyNotes.value);
  }

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

  editBtn.addEventListener('click', () => setEditMode(!isEditMode));
  tabWeek1.addEventListener('click', () => switchTab('week1'));
  tabWeek3.addEventListener('click', () => switchTab('week3'));
  addRowBtn.addEventListener('click', addRow);
  removeRowBtn.addEventListener('click', removeRow);
  addColBtn.addEventListener('click', addColumn);
  removeColBtn.addEventListener('click', removeColumn);

  loadSavedData();
  weeklyNotes.disabled = true;
})();
