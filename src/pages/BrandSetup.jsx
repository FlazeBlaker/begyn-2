// src/pages/BrandSetup.jsx
import { useState, useEffect, useMemo } from "react";
import { db, auth } from "../services/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// --- ANIMATIONS ---
const KeyframeStyles = () => (
    <style>
        {`
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
}

@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}

@keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(140, 100, 255, 0.3); }
    50% { box-shadow: 0 0 30px rgba(140, 100, 255, 0.6); }
}
`}
    </style>
);

// --- AI AVATAR COMPONENT ---
const AIAvatar = () => {
    return (
        <div style={{
            width: 'clamp(60px, 15vw, 80px)',
            height: 'clamp(60px, 15vw, 80px)',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(2rem, 5vw, 2.5rem)',
            animation: 'float 3s ease-in-out infinite, glow 2s ease-in-out infinite',
            marginBottom: '20px'
        }}>
            🤖
        </div>
    );
};

// --- ENHANCED INPUT FIELD ---
const EnhancedInput = ({ label, placeholder, description, value, onChange, characterLimit }) => {
    const [focus, setFocus] = useState(false);
    const charCount = value?.length || 0;
    const percentage = characterLimit ? (charCount / characterLimit) * 100 : 0;

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        animation: "fadeIn 0.5s ease-out",
        marginBottom: "24px"
    };

    const labelStyle = {
        fontSize: "clamp(0.95rem, 3vw, 1rem)",
        fontWeight: "600",
        color: "var(--text-primary)",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.3s ease"
    };

    const descriptionStyle = {
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        marginBottom: "12px",
        lineHeight: "1.5"
    };

    const inputWrapperStyle = {
        position: "relative",
        width: "100%"
    };

    const inputStyle = {
        padding: "16px 18px",
        border: "2px solid",
        borderRadius: "12px",
        background: focus ? "var(--bg-secondary)" : "var(--bg-input)",
        color: "var(--text-primary)",
        fontSize: "16px", // Prevent zoom on iOS
        width: "100%",
        boxSizing: "border-box",
        transition: "all 0.3s ease-in-out",
        outline: "none",
        borderColor: focus ? "rgba(140, 100, 255, 0.8)" : "var(--border-color)",
        boxShadow: focus ? "0 0 20px rgba(140, 100, 255, 0.3)" : "var(--shadow-sm)",
        minHeight: "50px" // Touch target
    };

    const charCounterStyle = {
        position: "absolute",
        right: "12px",
        bottom: "-24px",
        fontSize: "0.75rem",
        color: percentage > 90 ? "#f87171" : percentage > 70 ? "#fbbf24" : "var(--text-muted)",
        fontWeight: "500"
    };

    const progressBarStyle = {
        height: "2px",
        background: "var(--border-color)",
        borderRadius: "2px",
        marginTop: "8px",
        overflow: "hidden"
    };

    const progressFillStyle = {
        height: "100%",
        width: `${Math.min(percentage, 100)}%`,
        background: percentage > 90 ? "linear-gradient(90deg, #f87171, #ef4444)" :
            percentage > 70 ? "linear-gradient(90deg, #fbbf24, #f59e0b)" :
                "linear-gradient(90deg, #a855f7, #ec4899)",
        transition: "width 0.3s ease",
        borderRadius: "2px"
    };

    return (
        <div style={containerStyle}>
            <label style={labelStyle}>
                {focus && <span style={{ animation: 'pulse 1s infinite' }}>✨</span>}
                {label}
            </label>
            <p style={descriptionStyle}>{description}</p>
            <div style={inputWrapperStyle}>
                <input
                    style={inputStyle}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    maxLength={characterLimit}
                />
                {characterLimit && (
                    <span style={charCounterStyle}>
                        {charCount}/{characterLimit}
                    </span>
                )}
            </div>
            {characterLimit && (
                <div style={progressBarStyle}>
                    <div style={progressFillStyle} />
                </div>
            )}
        </div>
    );
};

// --- ENHANCED TEXTAREA ---
const EnhancedTextarea = ({ label, placeholder, description, value, onChange, characterLimit }) => {
    const [focus, setFocus] = useState(false);
    const charCount = value?.length || 0;
    const percentage = characterLimit ? (charCount / characterLimit) * 100 : 0;

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        animation: "fadeIn 0.5s ease-out",
        marginBottom: "24px"
    };

    const labelStyle = {
        fontSize: "clamp(0.95rem, 3vw, 1rem)",
        fontWeight: "600",
        color: "var(--text-primary)",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
    };

    const descriptionStyle = {
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        marginBottom: "12px",
        lineHeight: "1.5"
    };

    const textareaWrapperStyle = {
        position: "relative",
        width: "100%"
    };

    const textareaStyle = {
        padding: "16px 18px",
        border: "2px solid",
        borderRadius: "12px",
        background: focus ? "var(--bg-secondary)" : "var(--bg-input)",
        color: "var(--text-primary)",
        fontSize: "16px", // Prevent zoom on iOS
        width: "100%",
        boxSizing: "border-box",
        transition: "all 0.3s ease-in-out",
        outline: "none",
        resize: "vertical",
        minHeight: "120px",
        fontFamily: "inherit",
        lineHeight: "1.6",
        borderColor: focus ? "rgba(140, 100, 255, 0.8)" : "var(--border-color)",
        boxShadow: focus ? "0 0 20px rgba(140, 100, 255, 0.3)" : "var(--shadow-sm)"
    };

    const charCounterStyle = {
        position: "absolute",
        right: "12px",
        bottom: "-24px",
        fontSize: "0.75rem",
        color: percentage > 90 ? "#f87171" : percentage > 70 ? "#fbbf24" : "var(--text-muted)",
        fontWeight: "500"
    };

    const progressBarStyle = {
        height: "2px",
        background: "var(--border-color)",
        borderRadius: "2px",
        marginTop: "8px",
        overflow: "hidden"
    };

    const progressFillStyle = {
        height: "100%",
        width: `${Math.min(percentage, 100)}%`,
        background: percentage > 90 ? "linear-gradient(90deg, #f87171, #ef4444)" :
            percentage > 70 ? "linear-gradient(90deg, #fbbf24, #f59e0b)" :
                "linear-gradient(90deg, #a855f7, #ec4899)",
        transition: "width 0.3s ease",
        borderRadius: "2px"
    };

    return (
        <div style={containerStyle}>
            <label style={labelStyle}>
                {focus && <span style={{ animation: 'pulse 1s infinite' }}>✨</span>}
                {label}
            </label>
            <p style={descriptionStyle}>{description}</p>
            <div style={textareaWrapperStyle}>
                <textarea
                    style={textareaStyle}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    maxLength={characterLimit}
                />
                {characterLimit && (
                    <span style={charCounterStyle}>
                        {charCount}/{characterLimit}
                    </span>
                )}
            </div>
            {characterLimit && (
                <div style={progressBarStyle}>
                    <div style={progressFillStyle} />
                </div>
            )}
        </div>
    );
};

// --- SAVE BUTTON ---
const SaveButton = ({ loading, saved, completionPercentage, ...props }) => {
    const [hover, setHover] = useState(false);

    const style = {
        marginTop: "32px",
        padding: "18px",
        width: "100%",
        color: "white",
        borderRadius: "12px",
        border: "none",
        cursor: "pointer",
        fontSize: "1.1rem",
        fontWeight: "700",
        transition: "all 0.3s ease-in-out",
        position: "relative",
        overflow: "hidden",
        background: saved
            ? "linear-gradient(135deg, #22c55e, #16a34a)"
            : (hover
                ? "linear-gradient(135deg, #a855f7, #ec4899)"
                : "linear-gradient(135deg, #8b5cf6, #a855f7)"),
        boxShadow: hover && !saved
            ? "0 0 30px rgba(140, 100, 255, 0.6)"
            : (saved ? "0 0 30px rgba(34, 197, 94, 0.6)" : "0 4px 15px rgba(0, 0, 0, 0.3)"),
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        opacity: loading ? 0.7 : 1,
        minHeight: "56px" // Touch target
    };

    const shimmerStyle = {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
        backgroundSize: "400% 100%",
        animation: "shimmer 3s infinite linear",
        opacity: hover && !saved ? 1 : 0,
        transition: "opacity 0.3s"
    };

    let buttonText = `Save Brand Settings (${completionPercentage}% Complete)`;
    if (loading) buttonText = "Saving...";
    if (saved) buttonText = "✓ Saved Successfully!";

    return (
        <button
            {...props}
            style={style}
            disabled={loading}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div style={shimmerStyle}></div>
            <span style={{ position: 'relative', zIndex: 1 }}>{buttonText}</span>
        </button>
    );
};

// --- MAIN COMPONENT ---
export default function BrandSetup() {
    const [brandName, setBrandName] = useState("");
    const [industry, setIndustry] = useState("");
    const [tone, setTone] = useState("");
    const [audience, setAudience] = useState("");

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const uid = auth.currentUser?.uid;

    // Calculate completion percentage
    const completionPercentage = useMemo(() => {
        const fields = [brandName, industry, tone, audience];
        const filledFields = fields.filter(field => {
            if (!field) return false;
            if (typeof field === 'string') return field.trim().length > 0;
            if (Array.isArray(field)) return field.length > 0;
            return true;
        });
        return Math.round((filledFields.length / fields.length) * 100);
    }, [brandName, industry, tone, audience]);

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            return;
        }
        const fetchBrand = async () => {
            setLoading(true);
            const ref = doc(db, "brands", uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                setBrandName(data.brandName || "");
                setIndustry(data.industry || "");
                setTone(data.tone || "");
                setAudience(data.audience || "");

            }
            setLoading(false);
        };
        fetchBrand();
    }, [uid]);

    const saveBrand = async () => {
        if (!uid) return;
        setIsSaving(true);
        setSaved(false);
        const ref = doc(db, "brands", uid);
        try {
            await setDoc(ref, { brandName, industry, tone, audience }, { merge: true });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error("Error saving brand: ", e);
            alert("Failed to save brand settings.");
        }
        setIsSaving(false);
    };

    const pageStyle = {
        padding: "clamp(16px, 5vw, 40px)",
        maxWidth: "800px",
        margin: "0 auto"
    };

    const headerStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "clamp(32px, 5vw, 48px)",
        animation: "fadeIn 0.5s ease-out"
    };

    const titleStyle = {
        fontSize: "clamp(2rem, 6vw, 2.5rem)",
        fontWeight: "800",
        background: "linear-gradient(135deg, #a855f7, #ec4899)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        marginBottom: "12px",
        letterSpacing: "-1px",
        textAlign: "center"
    };

    const subtitleStyle = {
        fontSize: "clamp(0.95rem, 3vw, 1.1rem)",
        color: "var(--text-secondary)",
        marginBottom: "24px",
        lineHeight: "1.6",
        textAlign: "center",
        maxWidth: "600px"
    };

    const progressContainerStyle = {
        width: "100%",
        maxWidth: "400px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "20px",
        marginTop: "20px"
    };

    const progressTextStyle = {
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        marginBottom: "12px",
        textAlign: "center"
    };

    const progressBarContainerStyle = {
        width: "100%",
        height: "8px",
        background: "var(--border-color)",
        borderRadius: "8px",
        overflow: "hidden"
    };

    const progressBarFillStyle = {
        height: "100%",
        width: `${completionPercentage}%`,
        background: completionPercentage === 100
            ? "linear-gradient(90deg, #22c55e, #16a34a)"
            : "linear-gradient(90deg, #a855f7, #ec4899)",
        transition: "width 0.5s ease",
        borderRadius: "8px"
    };

    const progressPercentStyle = {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: completionPercentage === 100 ? "#22c55e" : "#a855f7",
        marginTop: "12px",
        textAlign: "center"
    };

    const formContainerStyle = {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    };

    if (loading) {
        return (
            <div style={pageStyle}>
                <div style={headerStyle}>
                    <AIAvatar />
                    <h1 style={titleStyle}>Loading...</h1>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <KeyframeStyles />

            <div style={headerStyle}>
                <AIAvatar />
                <h1 style={titleStyle}>AI Brand Setup</h1>
                <p style={subtitleStyle}>
                    Train your AI assistant by providing detailed information about your brand.
                    The more you share, the better your content will be! ✨
                </p>

                <div style={progressContainerStyle}>
                    <p style={progressTextStyle}>Brand Profile Completion</p>
                    <div style={progressBarContainerStyle}>
                        <div style={progressBarFillStyle} />
                    </div>
                    <div style={progressPercentStyle}>{completionPercentage}%</div>
                </div>
            </div>

            <div style={formContainerStyle}>
                <EnhancedInput
                    label="Brand Name"
                    description="What is your brand's official name?"
                    placeholder="e.g., 'The Daily Grind Cafe'"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    characterLimit={50}
                />

                <EnhancedTextarea
                    label="Industry & Niche"
                    description="Describe your industry and what makes you unique."
                    placeholder="e.g., 'Specialty coffee shop & roastery focusing on sustainable, single-origin beans.'"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    characterLimit={200}
                />

                <EnhancedTextarea
                    label="Tone of Voice"
                    description="How should your brand sound? List 3-5 keywords or describe your personality."
                    placeholder="e.g., 'Friendly, witty, passionate, educational, and slightly irreverent.'"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    characterLimit={150}
                />

                <EnhancedTextarea
                    label="Target Audience"
                    description="Who are you talking to? Be specific about demographics and interests."
                    placeholder="e.g., 'Remote workers, university students, and coffee aficionados (ages 20-40) who value quality and community.'"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    characterLimit={200}
                />



                <SaveButton
                    loading={isSaving}
                    saved={saved}
                    completionPercentage={completionPercentage}
                    onClick={saveBrand}
                />
            </div>
        </div>
    );
}