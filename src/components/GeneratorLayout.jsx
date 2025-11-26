import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

// --- TONE OPTIONS ---
export const TONE_OPTIONS = [
    "Friendly", "Professional", "Witty", "Cozy", "Bold",
    "Playful", "Inspirational", "Funny", "Urgent", "Calm",
    "Excited", "Mysterious"
];

// --- STYLES & ANIMATIONS (SHARED) ---
export const KeyframeStyles = () => (
    <style>
        {`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes slideDown {
        from { max-height: 0; opacity: 0; transform: translateY(-10px); }
        to { max-height: 1000px; opacity: 1; transform: translateY(0); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(140, 100, 255, 0.3); }
        50% { box-shadow: 0 0 40px rgba(140, 100, 255, 0.6); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }

      /* Scrollbar Hiding for Tone Selector */
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      
      /* Custom Slider Styles - Ultra Thin & Smooth */
      input[type=range].styled-slider { 
          -webkit-appearance: none; 
          width: 100%; 
          height: 4px; /* Very thin */
          border-radius: 10px; 
          outline: none; 
          border: none;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.1);
      }
      
      /* The Thumb - Minimal & Rounded */
      input[type=range].styled-slider::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          appearance: none; 
          width: 16px; 
          height: 16px; 
          background: #ffffff; 
          border: 2px solid #a855f7; 
          border-radius: 50%; 
          cursor: grab; 
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          margin-top: -6px; /* (4 - 16) / 2 = -6 */
          transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      input[type=range].styled-slider::-webkit-slider-thumb:hover { 
          transform: scale(1.2); 
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
      }
      
      input[type=range].styled-slider::-webkit-slider-thumb:active { 
          cursor: grabbing;
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.6);
      }
      
      /* Custom Scrollbar for Tone Selector */
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.5);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, 0.7);
      }
    `}
    </style>
);

// --- SUB-COMPONENT: AI Avatar ---
export const AIAvatar = () => {
    return (
        <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            marginBottom: '20px',
            animation: 'float 3s ease-in-out infinite, glow 2s ease-in-out infinite'
        }}>
            🤖
        </div>
    );
};

// --- SUB-COMPONENT: Tone Button (REUSABLE) ---
export const ToneButton = ({ tone, isSelected, isDisabled, onClick }) => {
    const [hover, setHover] = useState(false);

    const style = useMemo(() => ({
        padding: "12px 20px",
        border: "1px solid",
        borderRadius: "12px",
        background: isSelected
            ? "linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(236, 72, 153, 0.9))"
            : "var(--bg-card)",
        backdropFilter: "blur(10px)",
        color: "var(--text-primary)",
        fontSize: "0.9rem",
        fontWeight: isSelected ? "600" : "500",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        borderColor: isSelected
            ? "rgba(168, 85, 247, 0.5)"
            : "var(--border-color)",
        boxShadow: isSelected
            ? "0 4px 15px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
        opacity: isDisabled ? 0.4 : 1,
        transform: hover && !isDisabled ? "translateY(-2px)" : "translateY(0)",
        whiteSpace: "nowrap",
        userSelect: "none",
        ...(hover && !isSelected && !isDisabled && {
            borderColor: "rgba(168, 85, 247, 0.4)",
            background: "rgba(168, 85, 247, 0.15)",
            boxShadow: "0 4px 12px rgba(168, 85, 247, 0.2)"
        })
    }), [isSelected, isDisabled, hover]);

    return (
        <button
            style={style}
            onClick={onClick}
            disabled={isDisabled}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {isSelected && "✓ "}{tone}
        </button>
    );
};

// --- SUB-COMPONENT: Tone Selector (REUSABLE) ---
export const ToneSelector = ({ selectedTones, onToneClick }) => {
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        animation: "fadeIn 0.5s ease-out",
        marginBottom: "28px",
        padding: "20px",
        background: "var(--bg-card)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        boxSizing: "border-box",
        maxWidth: "100%",
        overflow: "hidden"
    };

    const headerStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
        flexWrap: "wrap",
        gap: "8px"
    };

    const labelStyle = {
        fontSize: "1.05rem",
        fontWeight: "600",
        background: "linear-gradient(135deg, #ffffff, #d0d0d0)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        display: "flex",
        alignItems: "center",
        gap: "8px"
    };

    const counterStyle = {
        fontSize: "0.85rem",
        color: selectedTones.length >= 3 ? "#fbbf24" : "#a0a0b0",
        background: selectedTones.length >= 3
            ? "rgba(251, 191, 36, 0.1)"
            : "rgba(255, 255, 255, 0.05)",
        padding: "4px 12px",
        borderRadius: "20px",
        border: `1px solid ${selectedTones.length >= 3 ? "rgba(251, 191, 36, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
        fontWeight: "500"
    };

    const scrollContainerStyle = {
        display: "flex",
        gap: "12px",
        paddingBottom: "4px",
        flexWrap: "wrap",
        maxHeight: isMobile ? "none" : "200px",
        overflowY: isMobile ? "visible" : "auto"
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <label style={labelStyle}>
                    <span style={{ fontSize: "1.2rem" }}>🎨</span>
                    Select Tone
                    <span style={{ fontSize: "0.85rem", opacity: 0.7, fontWeight: "400" }}>(Optional)</span>
                </label>
                <span style={counterStyle}>
                    {selectedTones.length}/3 selected
                </span>
            </div>
            <div style={scrollContainerStyle} className="custom-scrollbar">
                {TONE_OPTIONS.map(tone => (
                    <ToneButton
                        key={tone}
                        tone={tone}
                        isSelected={selectedTones.includes(tone)}
                        isDisabled={!selectedTones.includes(tone) && selectedTones.length >= 3}
                        onClick={() => onToneClick(tone)}
                    />
                ))}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Styled Textarea (REUSABLE) ---
export const StyledTextarea = ({ label, placeholder, value, onChange }) => {
    const [focus, setFocus] = useState(false);
    const containerStyle = { display: "flex", flexDirection: "column", width: "100%", animation: "fadeIn 0.5s ease-out" };
    const labelStyle = { fontSize: "1rem", fontWeight: "500", color: "#f0f0f0", marginBottom: "12px", display: "block" };
    const textareaStyle = useMemo(() => ({
        padding: "14px 16px", border: "1px solid", borderRadius: "8px",
        color: "#ffffff",
        fontSize: "1rem", width: "100%", boxSizing: "border-box", transition: "all 0.2s ease-in-out", outline: "none",
        resize: "vertical", minHeight: "120px", fontFamily: "inherit",
        borderColor: focus ? "rgba(140, 100, 255, 0.8)" : "rgba(255, 255, 255, 0.1)",
        boxShadow: focus ? "0 0 15px rgba(140, 100, 255, 0.3)" : "0 4px 10px rgba(0, 0, 0, 0.2)",
        background: focus ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.2)",
    }), [focus]);

    return (
        <div style={containerStyle}>
            <label style={labelStyle}>{label}</label>
            <textarea style={textareaStyle} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
        </div>
    );
};

// --- SUB-COMPONENT: Styled Slider (REUSABLE) ---
export const StyledSlider = ({ label, min, max, step, value, onChange }) => {
    const containerStyle = { width: "100%", padding: "10px 0" };
    const labelStyle = {
        color: "#e0e0e0",
        fontSize: "0.9rem",
        marginBottom: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "500"
    };

    // Calculate percentage for gradient fill
    const percentage = ((value - min) / (max - min)) * 100;

    const sliderStyle = {
        background: `linear-gradient(to right, #a855f7 0%, #ec4899 ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%, rgba(255, 255, 255, 0.1) 100%)`
    };

    return (
        <div style={containerStyle}>
            <div style={labelStyle}>
                <span>{label}</span>
                <span style={{
                    opacity: 0.8,
                    fontSize: "0.85rem",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: "8px"
                }}>
                    {value}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                className="styled-slider"
                style={sliderStyle}
            />
        </div>
    );
};

// --- SUB-COMPONENT: Toggle Switch (REUSABLE) ---
export const ToggleSwitch = ({ label, checked, onChange }) => {
    const containerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center" };
    const labelStyle = { color: "#c0c0c0", fontSize: "0.9rem", flex: 1, marginRight: '10px' };
    const switchStyle = { position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer", flexShrink: 0 };
    const trackStyle = useMemo(() => ({
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: checked ? "rgba(140, 100, 255, 0.8)" : "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "34px", transition: "background 0.3s ease-in-out",
    }), [checked]);
    const thumbStyle = useMemo(() => ({
        position: "absolute", height: "18px", width: "18px", left: "3px", bottom: "2px",
        background: "#ffffff", borderRadius: "50%", transition: "transform 0.3s ease-in-out",
        transform: checked ? "translateX(20px)" : "translateX(0)",
    }), [checked]);

    return (
        <div style={containerStyle}>
            <span style={labelStyle}>{label}</span>
            <div style={switchStyle} onClick={() => onChange(!checked)}>
                <div style={trackStyle}></div>
                <div style={thumbStyle}></div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Generate Button (REUSABLE) ---
export const GenerateButton = ({ loading, children, ...props }) => {
    const [hover, setHover] = useState(false);
    const style = useMemo(() => ({
        marginTop: "24px", padding: "18px", width: "100%", color: "white", borderRadius: "12px", border: "none",
        fontSize: "1.1rem", fontWeight: "700", transition: "all 0.3s ease-in-out", position: "relative",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
        background: hover ? "linear-gradient(135deg, #a855f7, #ec4899)" : "linear-gradient(135deg, #8b5cf6, #a855f7)",
        boxShadow: hover ? "0 10px 30px rgba(140, 100, 255, 0.4)" : "0 4px 15px rgba(0, 0, 0, 0.3)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer",
    }), [hover, loading]);

    const shimmerStyle = useMemo(() => ({
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
        backgroundSize: "400% 100%", animation: "shimmer 3s infinite linear",
        opacity: hover && !loading ? 1 : 0, transition: "opacity 0.3s"
    }), [hover, loading]);

    const spinnerStyle = {
        width: "18px", height: "18px", border: "2px solid rgba(255, 255, 255, 0.5)",
        borderTopColor: "#ffffff", borderRadius: "50%", animation: "spin 1s linear infinite",
    };

    return (
        <button {...props} style={style} disabled={loading} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <div style={shimmerStyle}></div>
            {loading ? (<><div style={spinnerStyle}></div>Generating...</>) : (children || "Generate Content")}
        </button>
    );
};

// --- SUB-COMPONENT: Advanced Options Panel ---
export const AdvancedOptionsPanel = ({ open, onToggle, children, title = "Advanced Options" }) => {
    const panelStyle = {
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "var(--bg-input)",
        borderRadius: "8px",
        marginTop: "24px",
        animation: "fadeIn 0.5s ease-out",
        overflow: "hidden",
    };

    const toggleButtonStyle = {
        background: "none", border: "none", padding: "16px", width: "100%",
        textAlign: "left", color: "#f0f0f0", fontSize: "1rem", fontWeight: "500",
        display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
    };

    const arrowStyle = {
        transition: "transform 0.3s ease-in-out",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        fontSize: "1.2rem",
    };

    const contentStyle = {
        padding: "0 16px 24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        animation: "slideDown 0.4s ease-out forwards"
    };

    return (
        <div style={panelStyle}>
            <button style={toggleButtonStyle} onClick={onToggle}>
                {title}
                <span style={arrowStyle}>▼</span>
            </button>
            {open && (
                <div style={contentStyle}>
                    {children}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT: GeneratorLayout ---
export default function GeneratorLayout({
    header,
    topic,
    typeSelector,
    imageUploadComponent,
    advancedOptionsPanel,
    generateButtonText,
    loading,
    handleGenerate,
    error,
    resultPanel,
    maxWidth = "800px"
}) {
    const navigate = useNavigate();
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;

    const pageStyle = {
        padding: isMobile ? "16px" : "40px",
        maxWidth: maxWidth,
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "calc(100vh - 70px)", // Adjust for navbar
        display: "flex",
        flexDirection: "column",
        gap: "32px",
    };

    const inputContainerStyle = {
        background: "var(--bg-secondary)",
        backdropFilter: "blur(20px)",
        'WebkitBackdropFilter': "blur(20px)",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: isMobile ? "24px" : "32px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        animation: "fadeIn 0.7s ease-out",
    };

    const errorStyle = {
        color: "#fca5a5",
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        padding: "12px",
        borderRadius: "8px",
        textAlign: "center",
        fontSize: "0.9rem",
        marginTop: "20px",
        animation: "fadeIn 0.3s ease-out",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px"
    };

    const buyCreditsButtonStyle = {
        background: "#22c55e",
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.9rem",
        transition: "background 0.2s",
    };

    return (
        <div style={pageStyle}>
            <KeyframeStyles />

            {header}

            <div style={inputContainerStyle}>
                {typeSelector}

                {topic && topic.selectedTones && (
                    <ToneSelector
                        selectedTones={topic.selectedTones}
                        onToneClick={topic.handleToneClick}
                    />
                )}

                {topic && topic.label && (
                    <StyledTextarea
                        label={topic.label}
                        placeholder={topic.placeholder}
                        value={topic.value}
                        onChange={topic.onChange}
                    />
                )}

                {imageUploadComponent}

                {advancedOptionsPanel}

                <GenerateButton loading={loading} onClick={handleGenerate}>
                    {generateButtonText}
                </GenerateButton>

                {error && (
                    <div style={errorStyle}>
                        <span>{error}</span>
                        {error.toLowerCase().includes("credit") && (
                            <button
                                style={buyCreditsButtonStyle}
                                onClick={() => navigate("/pricing")}
                                onMouseOver={(e) => e.target.style.background = "#16a34a"}
                                onMouseOut={(e) => e.target.style.background = "#22c55e"}
                            >
                                Buy Credits
                            </button>
                        )}
                    </div>
                )}
            </div>

            {resultPanel}
        </div>
    );
}