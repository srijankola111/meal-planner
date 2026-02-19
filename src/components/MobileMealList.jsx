
"use client";

import { useState } from "react";

// I'll adhere to dry later, for now inline or use simple format.

function formatDate(isoDate) {
    if (!isoDate || isoDate === '—') return isoDate || '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    }
    return isoDate;
}

export default function MobileMealList({
    headers,
    dates,
    rows,
    columnColors,
    editMode,
    onDateChange,
    onCellChange
}) {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const toggleExpand = (index) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="mobile-meal-list">
            {dates.map((date, rIndex) => {
                const isExpanded = expandedIndex === rIndex;

                return (
                    <div key={rIndex} className={`mobile-day-item ${isExpanded ? 'expanded' : ''}`}>
                        {/* Header / Date Row */}
                        <div className="mobile-day-header" onClick={() => toggleExpand(rIndex)}>
                            <div className="day-label">
                                {editMode ? (
                                    <input
                                        type="date"
                                        className="date-input-mobile"
                                        value={(/^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : ''}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => onDateChange(rIndex, e.target.value)}
                                    />
                                ) : (
                                    <span>{formatDate(date) || "No Date"}</span>
                                )}
                            </div>
                            <div className="expand-icon">
                                {isExpanded ? '−' : '+'}
                            </div>
                        </div>

                        {/* Expanded Content: Meal List */}
                        {isExpanded && (
                            <div className="mobile-day-content">
                                {headers.map((h, cIndex) => {
                                    const cellVal = rows[rIndex]?.[cIndex] || '';
                                    const colColor = columnColors[h] || 'var(--border)';

                                    return (
                                        <div key={cIndex} className="mobile-meal-row" style={{ borderLeft: `4px solid ${colColor}` }}>
                                            <div className="mobile-meal-label" style={{ color: colColor }}>{h}</div>
                                            <div className="mobile-meal-value">
                                                {editMode ? (
                                                    <textarea
                                                        className="mobile-meal-input"
                                                        value={cellVal}
                                                        onChange={(e) => onCellChange(rIndex, cIndex, e.target.value)}
                                                        placeholder="Add meal..."
                                                    />
                                                ) : (
                                                    <div className="meal-text">{cellVal || '—'}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
