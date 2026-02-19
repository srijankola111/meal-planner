
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { STORAGE_MEALS_WEEK1, STORAGE_MEALS_WEEK3 } from "@/lib/constants";

export default function CalendarView({ user, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ allMeals: [], columnMeta: { columnHeaders: [], columnColors: {} } });

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            const allMeals = [];
            let columnMeta = null;
            const keys = [
                { name: 'week1', key: STORAGE_MEALS_WEEK1 },
                { name: 'week3', key: STORAGE_MEALS_WEEK3 }
            ];

            for (const k of keys) {
                let pageData = null;
                try {
                    const snap = await getDoc(doc(db, 'planner', k.key));
                    if (snap.exists()) {
                        pageData = snap.data();
                    }
                } catch (e) { console.error("Calendar fetch error:", e); }

                if (pageData && pageData.dates && pageData.rows) {
                    // Normalize rows
                    let rows = pageData.rows;
                    if (rows.length > 0 && !Array.isArray(rows[0]) && rows[0].cells) {
                        rows = rows.map(r => r.cells);
                    }
                    allMeals.push({ dates: pageData.dates, rows: rows });

                    if (!columnMeta && pageData.columnHeaders && pageData.columnHeaders.length) {
                        columnMeta = {
                            columnHeaders: pageData.columnHeaders,
                            columnColors: pageData.columnColors || {}
                        };
                    }
                }
            }

            setData({
                allMeals,
                columnMeta: columnMeta || { columnHeaders: [], columnColors: {} }
            });
            setLoading(false);
        }

        fetchData();
    }, [user]);

    if (loading) return <div className="p-8 text-center">Loading Calendar...</div>;

    const { allMeals, columnMeta } = data;
    const { columnHeaders, columnColors } = columnMeta;

    // Fixed Range: Feb 15, 2026 to Mar 14, 2026 (28 Days)
    const startDate = new Date(2026, 1, 15);
    startDate.setHours(0, 0, 0, 0);
    const totalDays = 28;
    const today = new Date();

    // Map Data
    const mealsMap = new Map();
    allMeals.forEach(dataset => {
        dataset.dates.forEach((dStr, index) => {
            if (!dStr) return;
            let targetYear, targetMonth, targetDay;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
                const parts = dStr.split('-');
                targetYear = parseInt(parts[0]);
                targetMonth = parseInt(parts[1]) - 1;
                targetDay = parseInt(parts[2]);
            } else {
                // Legacy "Friday, 02/20"
                const parts = dStr.split(', ');
                if (parts.length > 1) {
                    const [m, d] = parts[1].split('/');
                    targetMonth = parseInt(m) - 1;
                    targetDay = parseInt(d);
                    targetYear = 2026;
                }
            }

            if (targetMonth !== undefined && targetDay !== undefined) {
                const key = `${targetYear}-${targetMonth}-${targetDay}`;
                mealsMap.set(key, dataset.rows[index]);
            }
        });
    });

    const days = [];
    for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        days.push(currentDate);
    }

    const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div className="calendar-view">
            <div className="calendar-controls" style={{ justifyContent: 'center' }}>
                <h2 id="calendarTitle">Feb 15 - Mar 14, 2026</h2>
            </div>
            <div className="calendar-grid-header">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div id="calendarGrid" className="calendar-grid">
                {days.map((date, i) => {
                    const dNum = date.getDate();
                    const dMonth = date.getMonth();
                    const dYear = date.getFullYear();
                    const isToday = dNum === today.getDate() && dMonth === today.getMonth() && dYear === today.getFullYear();
                    const key = `${dYear}-${dMonth}-${dNum}`;
                    const meals = mealsMap.get(key) || [];

                    return (
                        <div key={i} className={`calendar-day ${isToday ? 'today' : ''}`}>
                            <span className="day-number">
                                {(dNum === 1 || i === 0) ? `${monthShort[dMonth]} ${dNum}` : dNum}
                            </span>
                            {meals.length > 0 && (
                                <div className="meal-items">
                                    {meals.slice(0, 6).map((m, idx) => (
                                        m && m.trim() ? (
                                            <div
                                                key={idx}
                                                className="meal-pill"
                                                title={m}
                                                style={{
                                                    borderLeftColor: columnColors[columnHeaders[idx]] || 'var(--accent)',
                                                    borderLeftWidth: '3px'
                                                }}
                                            >
                                                {m}
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
