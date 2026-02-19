
"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
    DEFAULT_HEADERS,
    WEEKS,
    STORAGE_MEALS_WEEK1,
    STORAGE_MEALS_WEEK3,
    STORAGE_NOTES_WEEK1,
    STORAGE_NOTES_WEEK3
} from "@/lib/constants";
import MealTable from "@/components/MealTable";
import CalendarView from "@/components/CalendarView";
import SettingsModal from "@/components/SettingsModal";

export default function MainDashboard() {
    const [activeTab, setActiveTab] = useState('week1');
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
    const [loading, setLoading] = useState(false);

    // Data State
    const [headers, setHeaders] = useState([...DEFAULT_HEADERS]);
    const [dates, setDates] = useState([]);
    const [rows, setRows] = useState([]); // string[][]
    const [columnColors, setColumnColors] = useState({});
    const [notes, setNotes] = useState("");

    const [syncStatus, setSyncStatus] = useState(""); // Saved, Saving..., Error
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState('default');

    const user = auth.currentUser;

    // Helpers
    const getKeys = () => activeTab === 'week1'
        ? { meals: STORAGE_MEALS_WEEK1, notes: STORAGE_NOTES_WEEK1, dateDefaults: WEEKS.week1 }
        : { meals: STORAGE_MEALS_WEEK3, notes: STORAGE_NOTES_WEEK3, dateDefaults: WEEKS.week3 };

    // Load Data
    useEffect(() => {
        if (!user) return;

        async function loadData() {
            setLoading(true);
            const keys = getKeys();

            let loadedData = null;
            let loadedNotes = "";

            // Cloud Fetch
            try {
                updateSyncStatus('Loading...');
                const mealSnap = await getDoc(doc(db, 'planner', keys.meals));
                if (mealSnap.exists()) loadedData = mealSnap.data();

                const noteSnap = await getDoc(doc(db, 'planner', keys.notes));
                if (noteSnap.exists()) loadedNotes = noteSnap.data().content;

                updateSyncStatus('Synced');
            } catch (e) {
                console.error(e);
                updateSyncStatus('Error Loading', false);
            }

            // Apply Data
            if (loadedData) {
                let dRows = loadedData.rows || [];
                if (dRows.length > 0 && !Array.isArray(dRows[0]) && dRows[0].cells) {
                    dRows = dRows.map(r => r.cells);
                }

                setHeaders(loadedData.columnHeaders || [...DEFAULT_HEADERS]);
                setDates(loadedData.dates || [...keys.dateDefaults]);
                setRows(dRows);

                // Merge colors? passing entire object
                setColumnColors(loadedData.columnColors || {});
            } else {
                // Defaults
                setHeaders([...DEFAULT_HEADERS]);
                setDates([...keys.dateDefaults]);
                setRows(keys.dateDefaults.map(() => Array(DEFAULT_HEADERS.length).fill('')));
                setColumnColors({});
            }

            setNotes(loadedNotes || "");
            setLoading(false);
        }

        loadData();
        setEditMode(false); // Reset edit mode on tab switch
    }, [activeTab, user]);

    // Sync Logic
    const updateSyncStatus = (msg, isSuccess = true) => {
        setSyncStatus(msg);
        if (msg === 'Saved') {
            setTimeout(() => setSyncStatus(''), 2000);
        }
    };

    const saveData = async () => {
        if (!user) return;
        const keys = getKeys();

        // Validate rows
        const serializedRows = rows.map(r => ({ cells: r }));
        const data = {
            columnHeaders: headers,
            dates: dates,
            rows: serializedRows,
            columnColors: columnColors
        };

        try {
            updateSyncStatus('Saving...');
            await setDoc(doc(db, 'planner', keys.meals), data);
            await setDoc(doc(db, 'planner', keys.notes), { content: notes });

            // Sync column colors to other tab
            const otherKey = keys.meals === STORAGE_MEALS_WEEK1 ? STORAGE_MEALS_WEEK3 : STORAGE_MEALS_WEEK1;
            const otherSnap = await getDoc(doc(db, 'planner', otherKey));
            if (otherSnap.exists()) {
                await setDoc(doc(db, 'planner', otherKey), { ...otherSnap.data(), columnColors: columnColors });
            }

            updateSyncStatus('Saved');
        } catch (e) {
            console.error(e);
            updateSyncStatus('Error Saving', false);
        }
    };

    // Handlers
    const handleEditToggle = () => {
        if (editMode) {
            saveData();
        }
        setEditMode(!editMode);
    };

    const handleRowAdd = () => {
        setDates([...dates, '—']);
        setRows([...rows, Array(headers.length).fill('')]);
    };

    const handleRowRemove = () => {
        if (dates.length <= 1) return;
        setDates(dates.slice(0, -1));
        setRows(rows.slice(0, -1));
    };

    const handleColAdd = () => {
        setHeaders([...headers, 'New Column']);
        setRows(rows.map(r => [...r, '']));
    };

    const handleColRemove = () => {
        if (headers.length <= 1) return;
        setHeaders(headers.slice(0, -1));
        setRows(rows.map(r => r.slice(0, -1)));
    };

    return (
        <div id="mainApp" className="container">
            <header>
                <h1>Meal Planner</h1>
                <div className="header-actions">
                    {/* Toggle View */}
                    <button className="btn-circle" onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')} title="Toggle View">
                        {viewMode === 'table' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        )}
                    </button>

                    {/* Edit Button */}
                    <button
                        className={`btn-circle ${editMode ? 'editing' : ''}`}
                        onClick={handleEditToggle}
                        title={editMode ? "Save Changes" : "Edit Week"}
                    >
                        {editMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        )}
                    </button>

                    {/* Settings Button */}
                    <button className="btn-circle" onClick={() => setShowSettings(true)} title="Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>
                </div>
            </header>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                user={user}
                onLogout={() => auth.signOut()}
                currentTheme={theme}
                setTheme={(t) => { setTheme(t); document.body.setAttribute('data-theme', t); localStorage.setItem('mealPlanner_theme', t); }}
                columnHeaders={headers}
                columnColors={columnColors}
                setColor={(header, color) => {
                    setColumnColors({ ...columnColors, [header]: color });
                    // Should probably save immediately or let next save handle it?
                    // The original app saved on change.
                    // But we can just rely on manual save or auto-save?
                    // I'll leave it to manual save via "Edit Mode" -> Save usually, but settings is separate.
                    // Better: update state, and if persisted, save.
                }}
            />

            {viewMode === 'calendar' ? (
                <CalendarView user={user} />
            ) : (
                <>
                    <nav className="tabs">
                        <button className={`tab ${activeTab === 'week1' ? 'active' : ''}`} onClick={() => { if (editMode) saveData(); setActiveTab('week1'); }}>Week 1</button>
                        <button className={`tab ${activeTab === 'week3' ? 'active' : ''}`} onClick={() => { if (editMode) saveData(); setActiveTab('week3'); }}>Week 3</button>
                    </nav>

                    {editMode && (
                        <div className="table-toolbar visible" style={{ display: 'flex' }}>
                            <span className="toolbar-label">Table</span>
                            <button className="btn btn-tool" onClick={handleRowAdd}>+ Row</button>
                            <button className="btn btn-tool" onClick={handleRowRemove}>− Row</button>
                            <button className="btn btn-tool" onClick={handleColAdd}>+ Column</button>
                            <button className="btn btn-tool" onClick={handleColRemove}>− Column</button>
                        </div>
                    )}

                    <MealTable
                        headers={headers}
                        dates={dates}
                        rows={rows}
                        columnColors={columnColors}
                        editMode={editMode}
                        onHeaderChange={(i, v) => {
                            const newHeaders = [...headers];
                            newHeaders[i] = v;
                            setHeaders(newHeaders);
                        }}
                        onDateChange={(i, v) => {
                            const newDates = [...dates];
                            newDates[i] = v;
                            setDates(newDates);
                        }}
                        onCellChange={(r, c, v) => {
                            const newRows = [...rows];
                            newRows[r] = [...newRows[r]];
                            newRows[r][c] = v;
                            setRows(newRows);
                        }}
                    />

                    <section className="weekly-notes">
                        <h2>Weekly Notes</h2>
                        <div className="notes-wrapper">
                            <textarea
                                id="weeklyNotes"
                                rows="6"
                                placeholder="Add meal ideas or notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={!editMode}
                                className={editMode ? 'edit-mode' : ''}
                            ></textarea>
                        </div>
                    </section>
                </>
            )}

            {/* Sync Status Overlay or Footer? Original app had it in settings or hidden. 
          But I updated `updateSyncStatus` to set state. 
          I'll show it fixed bottom right or in header?
          Original app: In settings modal.
          I'll add it to header next to buttons?
      */}
            {syncStatus && (
                <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {syncStatus}
                </div>
            )}
        </div>
    );
}
