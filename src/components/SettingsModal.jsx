
"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";

export default function SettingsModal({
    isOpen,
    onClose,
    user,
    onLogout,
    currentTheme,
    setTheme,
    columnHeaders,
    columnColors,
    setColor,
    forceMobileView,
    setForceMobileView
}) {
    if (!isOpen) return null;

    return (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {/* Auth Section */}
                    <div className="settings-section">
                        <h3>Account</h3>
                        <div className="auth-section">
                            {user ? (
                                <div className="user-info-row" style={{ display: 'flex' }}>
                                    <div className="user-details">
                                        <img
                                            className="user-avatar"
                                            src={user.photoURL || 'https://via.placeholder.com/32'}
                                            alt="User"
                                        />
                                        <span>{user.displayName || user.email}</span>
                                    </div>
                                    <button className="btn btn-outline" onClick={onLogout}>Sign Out</button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted">You are not logged in.</p>
                            )}
                        </div>
                    </div>

                    {/* Appearance Section */}
                    <div className="settings-section">
                        <h3>Theme</h3>
                        <div className="theme-options">
                            {['default', 'ocean', 'forest', 'sunset'].map(t => (
                                <button
                                    key={t}
                                    className={`theme-btn ${currentTheme === t ? 'active' : ''}`}
                                    onClick={() => setTheme(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'default' ? 'Dark' : ''}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* View Settings */}
                    <div className="settings-section">
                        <h3>View Mode</h3>
                        <div className="user-info-row" style={{ marginTop: '0.5rem' }}>
                            <div className="user-details" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                                <span>Force Mobile View</span>
                                <span className="desc" style={{ margin: 0, fontSize: '0.75rem' }}>Always use the list layout</span>
                            </div>
                            <button
                                className={`btn ${forceMobileView ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setForceMobileView(!forceMobileView)}
                                style={{ width: 'auto', minWidth: '60px' }}
                            >
                                {forceMobileView ? 'On' : 'Off'}
                            </button>
                        </div>
                    </div>

                    {/* Meal Colors Section */}
                    <div className="settings-section">
                        <h3>Meal Column Colors</h3>
                        <p className="desc">Customize the color for each meal type.</p>
                        <div className="color-settings-grid">
                            {columnHeaders.map((header) => (
                                <div key={header} className="color-row">
                                    <span>{header}</span>
                                    <input
                                        type="color"
                                        value={columnColors[header] || '#BA8E23'}
                                        onChange={(e) => setColor(header, e.target.value)}
                                        title={`Color for ${header}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
