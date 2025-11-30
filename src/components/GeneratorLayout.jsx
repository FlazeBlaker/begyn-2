import React, { useState, useEffect } from "react";
import "../styles/GeneratorLayout.css";

// --- 1. NEW: Hook to detect screen width ---
const useWindowWidth = () => {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return width;
};

// --- SUB-COMPONENT: Selection Button (Compact for Toolbar) ---
export const SelectionButton = ({ label, isSelected, isDisabled, onClick, isLocked, tooltip }) => {
    const handleClick = () => {
        if (isLocked) {
            alert("🔒 Coming Soon!\\n\\nImage generation feature is currently under development.");
            return;
        }
        if (onClick) {
            onClick();
        }
    };

    return (
        <button
            className={`compact-btn ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
            onClick={handleClick}
            disabled={isDisabled}
            style={{
                opacity: isLocked ? 0.6 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer'
            }}
            title={tooltip}
        >
            {isLocked && "🔒 "}{label}
        </button>
    );
};

// --- SUB-COMPONENT: Styled Slider ---
export const StyledSlider = ({ label, min, max, step, value, onChange }) => (
    <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", color: "#e0e0e0", fontSize: "0.9rem", fontWeight: "500" }}>
            <span>{label}</span>
            <span style={{ color: "#a855f7", fontWeight: "700" }}>{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="styled-slider"
            style={{ width: '100%', accentColor: '#a855f7' }}
        />
    </div>
);

// --- SUB-COMPONENT: Toggle Switch ---
export const ToggleSwitch = ({ label, checked, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ color: "#e0e0e0", fontSize: "0.95rem", fontWeight: "500" }}>{label}</span>
        <div style={{ position: "relative", width: "44px", height: "24px", display: "inline-block" }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
                id={`toggle-${label.replace(/\\s+/g, '-').toLowerCase()}`}
            />
            <label
                htmlFor={`toggle-${label.replace(/\\s+/g, '-').toLowerCase()}`}
                style={{
                    position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: checked ? "rgba(168, 85, 247, 0.5)" : "rgba(255, 255, 255, 0.1)",
                    transition: ".4s", borderRadius: "34px", border: "1px solid rgba(255,255,255,0.1)"
                }}
            >
                <span style={{
                    position: "absolute", content: '""', height: "18px", width: "18px", left: checked ? "22px" : "3px", bottom: "2px",
                    backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }} />
            </label>
        </div>
    </div>
);

// --- SUB-COMPONENT: Advanced Options Panel ---
export const AdvancedOptionsPanel = ({ open, onToggle, children }) => (
    <div className="studio-advanced">
        <button
            onClick={onToggle}
            className="studio-advanced-toggle"
        >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                ⚙️ Advanced Settings
            </span>
            <span style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}>▼</span>
        </button>
        {open && (
            <div className="studio-advanced-content">
                {children}
            </div>
        )}
    </div>
);

// --- MAIN LAYOUT COMPONENT: CREATOR STUDIO ---
const GeneratorLayout = ({
    toolbarLeft, // Type Selector
    toolbarRight, // Platform Selector
    topic,
    imageUploadComponent,
    advancedOptionsPanel,
    generateButtonText,
    loading,
    handleGenerate,
    error,
    resultPanel
}) => {
    return (
        <div className="studio-container">
            {/* 1. Unified Toolbar */}
            <div className="studio-toolbar">
                <div className="toolbar-left">
                    <span className="toolbar-title">Creator Studio</span>
                    <div className="compact-selector">
                        {toolbarLeft}
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="compact-selector">
                        {toolbarRight}
                    </div>
                </div>
            </div>

            {/* 2. Split Workspace */}
            <div className="studio-workspace">
                {/* Left Panel: Input Console */}
                <div className="input-console custom-scrollbar">

                    {/* Topic Input */}
                    <div className="console-section">
                        <label className="studio-label">
                            <span style={{ marginRight: '8px' }}>💡</span>
                            {topic.label}
                        </label>
                        <textarea
                            value={topic.value}
                            onChange={topic.onChange}
                            placeholder={topic.placeholder}
                            className="studio-textarea custom-scrollbar"
                        />
                    </div>

                    {/* Image Upload */}
                    {imageUploadComponent && (
                        <div className="console-section">
                            <label className="studio-label">📸 Reference Image</label>
                            {imageUploadComponent}
                        </div>
                    )}

                    {/* Advanced Options */}
                    <div className="console-section">
                        {advancedOptionsPanel}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="studio-generate-btn"
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite"
                                }} />
                                Generating...
                            </>
                        ) : (
                            <>✨ {generateButtonText}</>
                        )}
                    </button>

                    {error && (
                        <div style={{
                            marginTop: "20px", padding: "16px", background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px",
                            color: "#fca5a5", textAlign: "center"
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Right Panel: Live Preview */}
                <div className="live-preview custom-scrollbar">
                    {resultPanel ? (
                        <div className="preview-device custom-scrollbar">
                            {resultPanel}
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
                            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📱</div>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: "700" }}>Device Preview</h3>
                            <p>Generated content will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratorLayout;