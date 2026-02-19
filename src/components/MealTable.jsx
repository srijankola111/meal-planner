
"use client";

import { useEffect } from "react";

function formatDate(isoDate) {
    if (!isoDate || isoDate === '—') return isoDate || '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    }
    return isoDate;
}

export default function MealTable({
    headers,
    dates,
    rows,
    columnColors,
    editMode,
    onDateChange,
    onCellChange,
    onHeaderChange
}) {
    return (
        <div className="table-wrapper">
            <table id="mealTable">
                <thead>
                    <tr id="mealTableHead">
                        <th className="col-date">Date</th>
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className="col-meal"
                                style={{
                                    color: columnColors[h],
                                    borderColor: columnColors[h]
                                }}
                            >
                                {editMode ? (
                                    <input
                                        className="w-full bg-transparent border-none outline-none text-inherit font-inherit p-0"
                                        value={h}
                                        onChange={(e) => onHeaderChange(i, e.target.value)}
                                    />
                                ) : (
                                    h
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody id="mealTableBody">
                    {dates.map((date, rIndex) => (
                        <tr key={rIndex} data-row-index={rIndex}>
                            <td className="date-cell">
                                {editMode ? (
                                    <input
                                        type="date"
                                        className="date-input"
                                        value={(/^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : ''}
                                        onChange={(e) => onDateChange(rIndex, e.target.value)}
                                    />
                                ) : (
                                    formatDate(date)
                                )}
                            </td>
                            {headers.map((h, cIndex) => {
                                const cellVal = rows[rIndex]?.[cIndex] || '';
                                const colColor = columnColors[h];

                                return (
                                    <td
                                        key={cIndex}
                                        className="editable"
                                        style={{ borderLeft: colColor ? `3px solid ${colColor}` : undefined }}
                                    >
                                        {editMode ? (
                                            <textarea
                                                className="w-full h-full bg-transparent border-none outline-none resize-none"
                                                value={cellVal}
                                                onChange={(e) => onCellChange(rIndex, cIndex, e.target.value)}
                                                style={{ minHeight: '1.5em' }}
                                            />
                                        ) : (
                                            cellVal
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
