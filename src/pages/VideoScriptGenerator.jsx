// src/pages/VideoScriptGenerator.jsx

import { useState, useEffect } from "react";
import { auth, logUserAction, db } from "../services/firebase";
import { generateContent } from "../services/aiApi";
import ImageUpload from "../components/ImageUpload";

// --- CONSTANTS ---
const TONE_OPTIONS = [
    "Friendly", "Professional", "Witty", "Cozy", "Bold",
    "Playful", "Inspirational", "Funny", "Urgent", "Calm",
    "Excited", "Mysterious"
];

// --- RESPONSIVE HOOK ---
const useWindowWidth = () => {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return width;
};

// --- INLINE STYLES & COMPONENTS ---
const KeyframeStyles = () => (
    <style>
        {`
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
      @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(140, 100, 255, 0.3); } 50% { box-shadow: 0 0 40px rgba(140, 100, 255, 0.6); } }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); borderRadius: 3px; }
      input[type=range].styled-slider { -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; outline: none; }
      input[type=range].styled-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: #a855f7; border-radius: 50%; cursor: pointer; transition: transform 0.2s; }
      input[type=range].styled-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
    `}
    </style>
);

const PageHeader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', animation: 'fadeIn 0.6s ease-out' }}>
        <div style={{
            width: 'clamp(60px, 15vw, 70px)', height: 'clamp(60px, 15vw, 70px)', borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)', marginBottom: '16px',
            animation: 'float 3s ease-in-out infinite, glow 2s ease-in-out infinite'
        }}>
            🎬
        </div>
        <h1 style={{
            fontSize: "clamp(1.8rem, 6vw, 2rem)", fontWeight: "800",
            background: "linear-gradient(135deg, #a855f7, #ec4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: "8px", textAlign: "center"
        }}>
            Video Script Generator
        </h1>
        <p style={{ fontSize: "clamp(0.9rem, 3vw, 0.95rem)", color: "var(--text-secondary)", textAlign: "center", maxWidth: "90%" }}>
            Create engaging scripts for YouTube, TikTok, and Reels.
        </p>
    </div>
);

const ToneButton = ({ tone, isSelected, onClick, disabled }) => {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: "10px 16px",
                borderRadius: "24px",
                border: isSelected ? "1px solid #a855f7" : "1px solid var(--border-color)",
                background: isSelected ? "rgba(168, 85, 247, 0.25)" : (hover && !disabled ? "var(--bg-hover)" : "var(--bg-secondary)"),
                color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: disabled ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                fontWeight: isSelected ? "600" : "500",
                transition: "all 0.2s",
                opacity: disabled ? 0.5 : 1,
                boxShadow: isSelected ? "0 2px 8px rgba(168, 85, 247, 0.2)" : "none",
                flex: "1 1 auto",
                textAlign: "center"
            }}
        >
            {tone}
        </button>
    );
};

const ToneSelector = ({ selectedTones, onToneClick }) => (
    <div style={{ marginBottom: "28px", animation: "fadeIn 0.5s ease-out" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>
            <span>🎨</span> Select Tone <span style={{ color: "var(--text-secondary)", fontWeight: "400", fontSize: "0.9rem" }}>(Optional, max 3)</span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TONE_OPTIONS.map(tone => (
                <ToneButton
                    key={tone}
                    tone={tone}
                    isSelected={selectedTones.includes(tone)}
                    disabled={!selectedTones.includes(tone) && selectedTones.length >= 3}
                    onClick={() => onToneClick(tone)}
                />
            ))}
        </div>
    </div>
);

const StyledTextarea = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: "28px", animation: "fadeIn 0.5s ease-out" }}>
        <label style={{ display: "block", color: "var(--text-primary)", fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>
            {label}
        </label>
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={{
                width: "100%", minHeight: "140px", padding: "16px",
                background: "var(--bg-input)", border: "1px solid var(--border-color)",
                borderRadius: "16px", color: "var(--text-primary)", fontSize: "1rem",
                outline: "none", resize: "vertical", fontFamily: "inherit",
                boxSizing: "border-box", lineHeight: "1.6",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
            }}
        />
    </div>
);

const AdvancedOptionsPanel = ({ open, onToggle, children }) => (
    <div style={{
        marginBottom: "28px",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        background: "var(--bg-card)",
        animation: "fadeIn 0.5s ease-out",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
    }}>
        <button
            onClick={onToggle}
            style={{
                width: "100%", padding: "18px 24px",
                background: "var(--bg-hover)",
                border: "none",
                borderBottom: open ? "1px solid var(--border-color)" : "none",
                color: "var(--text-primary)", fontSize: "1rem", fontWeight: "600",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer",
                transition: "background 0.2s"
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span>⚙️</span> Advanced Options
            </div>
            <span style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
                fontSize: "0.8rem", opacity: 0.7
            }}>▼</span>
        </button>
        {open && (
            <div style={{ padding: "24px", animation: "fadeIn 0.3s" }}>
                {children}
            </div>
        )}
    </div>
);

const ToggleSwitch = ({ label, checked, onChange }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{label}</span>
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: "44px", height: "24px",
                background: checked ? "#a855f7" : "var(--bg-secondary)",
                borderRadius: "12px", position: "relative", cursor: "pointer",
                transition: "background 0.2s",
                border: "1px solid var(--border-color)"
            }}
        >
            <div style={{
                width: "20px", height: "20px", background: "#fff", borderRadius: "50%",
                position: "absolute", top: "1px", left: checked ? "21px" : "1px",
                transition: "left 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }} />
        </div>
    </div>
);

const GenerateButton = ({ loading, onClick, children }) => (
    <button
        onClick={onClick}
        disabled={loading}
        style={{
            width: "100%", padding: "16px",
            background: "linear-gradient(135deg, #a855f7, #ec4899)",
            border: "none", borderRadius: "12px",
            color: "#fff", fontSize: "1rem", fontWeight: "700",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.8 : 1,
            boxShadow: "0 4px 15px rgba(168, 85, 247, 0.4)",
            transition: "transform 0.2s",
            minHeight: "56px" // Touch target
        }}
    >
        {loading ? "Generating..." : children}
    </button>
);

// --- SCRIPT EDITOR ---
const ScriptEditorPanel = ({ script, topic }) => {
    const [activeTab, setActiveTab] = useState("hook");
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const text = activeTab === 'hook' ? script.hook : activeTab === 'script' ? script.script : script.cta;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const content = activeTab === 'hook' ? script.hook : activeTab === 'script' ? script.script : script.cta;

    // Helper to render bold text
    const renderContent = (text) => {
        if (!text) return null;
        return text.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i} style={{ color: "var(--text-primary)" }}>{part}</strong> : part
        );
    };

    return (
        <div style={{
            background: "var(--bg-card)", backdropFilter: "blur(10px)",
            borderRadius: "16px", border: "1px solid var(--border-color)",
            display: "flex", flexDirection: "column", height: "100%", overflow: "hidden"
        }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                {['hook', 'script', 'cta'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: "12px", background: activeTab === tab ? "var(--bg-hover)" : "transparent",
                            border: "none", borderBottom: activeTab === tab ? "2px solid #a855f7" : "2px solid transparent",
                            color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: "600", cursor: "pointer",
                            minHeight: "48px" // Touch target
                        }}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>
            <div style={{ padding: "24px", flex: 1, overflowY: "auto", color: "var(--text-secondary)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {renderContent(content)}
            </div>
            <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)", textAlign: "right" }}>
                <button onClick={handleCopy} style={{
                    padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border-color)",
                    background: copied ? "rgba(34, 197, 94, 0.2)" : "var(--bg-hover)",
                    color: copied ? "#4ade80" : "var(--text-primary)", cursor: "pointer",
                    minHeight: "44px" // Touch target
                }}>
                    {copied ? "Copied!" : "Copy Content"}
                </button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export default function VideoScriptGenerator() {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [selectedTones, setSelectedTones] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({ videoLength: "180", platform: "" });
    const [autoSave, setAutoSave] = useState(true);

    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 1024;

    useEffect(() => {
        const fetchPreferences = async () => {
            const uid = auth.currentUser?.uid;
            if (uid) {
                try {
                    const userDoc = await import("firebase/firestore").then(m => m.getDoc(m.doc(db, "users", uid)));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setAutoSave(data.autoSave !== false);
                    }
                } catch (err) {
                    console.error("Error fetching preferences:", err);
                }
            }
        };
        fetchPreferences();
    }, []);

    const handleToneClick = (tone) => {
        setSelectedTones(prev => prev.includes(tone) ? prev.filter(t => t !== tone) : (prev.length < 3 ? [...prev, tone] : prev));
    };

    const handleGenerate = async () => {
        if (!auth.currentUser?.uid) { setError("Please log in."); return; }
        if (!topic && !selectedImage) { setError("Enter a topic or upload an image."); return; }
        setLoading(true); setError(""); setResult(null);
        try {
            const rawText = await generateContent({ type: "videoScript", payload: { topic, tones: selectedTones, image: selectedImage, options: advancedOptions } });
            const hookMatch = rawText.match(/Hook:\s*([\s\S]*?)(?=Intro:|Main Content:|CTA:|$)/i);
            const scriptMatch = rawText.match(/Main Content:\s*([\s\S]*?)(?=CTA:|$)/i);
            const ctaMatch = rawText.match(/CTA:\s*([\s\S]*?)(?=$)/i);
            const introMatch = rawText.match(/Intro:\s*([\s\S]*?)(?=Main Content:|CTA:|$)/i);

            const resultData = {
                hook: hookMatch ? hookMatch[1].trim() : "Could not parse Hook.",
                script: (introMatch ? "**Intro:**\n" + introMatch[1].trim() + "\n\n" : "") + (scriptMatch ? scriptMatch[1].trim() : rawText),
                cta: ctaMatch ? ctaMatch[1].trim() : "Could not parse CTA."
            };

            setResult(resultData);

            if (autoSave) {
                await logUserAction(auth.currentUser.uid, 'generate_video_script', {
                    source: 'VideoScriptGenerator',
                    detail: topic,
                    results: resultData
                });
            }
        } catch (err) { setError("Generation failed."); } finally { setLoading(false); }
    };

    const getLengthLabel = (val) => val === "60" ? "Short (~1 min)" : val === "300" ? "Long (~5 min)" : "Medium (~3 min)";
    const creditCost = selectedImage ? 2 : 1;

    return (
        <div style={{
            padding: isMobile ? "16px" : "32px", width: "100%", boxSizing: "border-box",
            display: "flex", gap: "32px", flexDirection: isMobile ? "column" : "row",
            height: isMobile ? "auto" : "calc(100vh - 70px)", overflow: isMobile ? "visible" : "hidden"
        }}>
            <KeyframeStyles />

            {/* LEFT PANEL */}
            <div style={{
                flex: isMobile ? "1 1 auto" : "0 0 420px", width: isMobile ? "100%" : "420px",
                height: isMobile ? "auto" : "100%", display: "flex", flexDirection: "column",
                overflowY: isMobile ? "visible" : "auto",
                paddingRight: isMobile ? "0" : "8px"
            }} className="custom-scrollbar">
                <PageHeader />

                <ToneSelector selectedTones={selectedTones} onToneClick={handleToneClick} />

                <StyledTextarea
                    label="What is your video about?"
                    placeholder="e.g. 'How to bake sourdough bread'"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                />

                <ImageUpload selectedImage={selectedImage} onImageChange={setSelectedImage} />

                <AdvancedOptionsPanel open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)}>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "8px" }}>
                            Video Length: {getLengthLabel(advancedOptions.videoLength)}
                        </label>
                        <input
                            type="range" min="60" max="300" step="120"
                            value={advancedOptions.videoLength}
                            onChange={e => setAdvancedOptions(prev => ({ ...prev, videoLength: e.target.value }))}
                            className="styled-slider"
                        />
                    </div>
                    <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "12px" }}>Optimize for Platform</label>
                    <ToggleSwitch label="YouTube" checked={advancedOptions.platform === "youtube"} onChange={() => setAdvancedOptions(prev => ({ ...prev, platform: prev.platform === "youtube" ? "" : "youtube" }))} />
                    <ToggleSwitch label="TikTok" checked={advancedOptions.platform === "tiktok"} onChange={() => setAdvancedOptions(prev => ({ ...prev, platform: prev.platform === "tiktok" ? "" : "tiktok" }))} />
                    <ToggleSwitch label="Reels" checked={advancedOptions.platform === "reels"} onChange={() => setAdvancedOptions(prev => ({ ...prev, platform: prev.platform === "reels" ? "" : "reels" }))} />
                </AdvancedOptionsPanel>

                <div style={{ marginTop: "auto", paddingBottom: "20px" }}>
                    {error && <div style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.1)", padding: "12px", borderRadius: "8px", marginBottom: "16px", textAlign: "center" }}>{error}</div>}
                    <GenerateButton loading={loading} onClick={handleGenerate}>
                        Generate Script ({creditCost} Credit{creditCost > 1 ? 's' : ''})
                    </GenerateButton>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
                flex: "1 1 auto",
                height: isMobile ? "600px" : "100%", // Fixed height on mobile for results to be scrollable within
                display: "flex", flexDirection: "column",
                minHeight: "500px"
            }}>
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)", color: "var(--text-secondary)", flexDirection: "column", gap: "16px" }}>
                        <div style={{ width: "30px", height: "30px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                        <p>Generating...</p>
                    </div>
                ) : result ? (
                    <ScriptEditorPanel script={result} topic={topic} />
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)", color: "var(--text-secondary)", flexDirection: "column", gap: "16px" }}>
                        <span style={{ fontSize: "3rem", opacity: 0.2 }}>🎬</span>
                        <p>Your generated script will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}