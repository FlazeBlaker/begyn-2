// src/pages/CaptionGenerator.jsx
import { useState, useMemo, useEffect } from "react";
// Import core layout components
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload"; // Import ImageUpload
// IMPORT FIREBASE UTILS
import { auth, logUserAction, db } from "../services/firebase";
// IMPORT API
import { generateContent } from "../services/aiApi";

// --- SUB-COMPONENT: Page Header ---
const PageHeader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', animation: 'fadeIn 0.6s ease-out' }}>
        <div style={{
            width: 'clamp(60px, 15vw, 70px)',
            height: 'clamp(60px, 15vw, 70px)',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)',
            marginBottom: '20px',
            animation: 'float 3s ease-in-out infinite, glow 2s ease-in-out infinite'
        }}>
            🤖
        </div>
        <h1 style={{
            fontSize: "clamp(1.8rem, 6vw, 2.5rem)",
            fontWeight: "800",
            background: "linear-gradient(135deg, #a855f7, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "12px",
            letterSpacing: "-1px",
            textAlign: "center"
        }}>
            ✨ Caption Generator
        </h1>
        <p style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)", color: "#a0a0b0", marginBottom: "24px", lineHeight: "1.6", textAlign: "center", maxWidth: "600px" }}>
            Describe your post, and I'll generate 3 high-energy captions
            with hashtags, all tuned to your brand's voice.
        </p>
        <style>{`
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 20px rgba(140, 100, 255, 0.3); }
                50% { box-shadow: 0 0 40px rgba(140, 100, 255, 0.6); }
            }
        `}</style>
    </div>
);

// --- SUB-COMPONENT: Caption Card ---
const CaptionCard = ({ title, caption, hashtags }) => {
    const [copied, setCopied] = useState(false);
    const [hover, setHover] = useState(false);

    const cardStyle = useMemo(() => ({
        background: "rgba(10, 10, 15, 0.3)",
        backdropFilter: "blur(5px)",
        'WebkitBackdropFilter': "blur(5px)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        animation: "fadeIn 0.7s ease-out",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease-in-out",
        transform: hover ? "scale(1.02)" : "scale(1)",
        boxShadow: hover ? "0 10px 30px rgba(0, 0, 0, 0.3)" : "0 4px 15px rgba(0, 0, 0, 0.2)",
    }), [hover]);

    const handleCopy = async () => {
        const uid = auth.currentUser?.uid;
        let textToCopy = caption || "";
        if (hashtags) {
            textToCopy += `\n\n${hashtags}`;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            if (uid) {
                await logUserAction(uid, 'copy', {
                    source: 'CaptionGenerator',
                    detail: title,
                    text: textToCopy.trim().substring(0, 500)
                });
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy text:", error);
        }
    };

    const titleStyle = { fontSize: "1.1rem", fontWeight: "600", color: "#ffffff" };
    const contentStyle = { padding: "20px", color: "#e0e0e0", fontSize: "1rem", lineHeight: "1.7", whiteSpace: "pre-wrap", flexGrow: 1 };
    const hashtagStyle = { padding: "0 20px 20px 20px", color: "#a0a0b0", fontSize: "0.9rem", lineHeight: "1.6", fontStyle: "italic" };
    const headerStyle = { padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" };
    const copyButtonStyle = {
        border: "1px solid rgba(255, 255, 255, 0.2)",
        color: copied ? "#4ade80" : "white", padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
        fontSize: "0.85rem", fontWeight: "500", transition: "all 0.2s ease-in-out",
        background: hover ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
        minHeight: "44px", // Touch target
        minWidth: "44px",
        display: "flex", alignItems: "center", justifyContent: "center"
    };

    return (
        <div style={cardStyle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <div style={headerStyle}>
                <h2 style={titleStyle}>{title}</h2>
                <button style={copyButtonStyle} onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <div style={contentStyle}>{caption || "(No caption requested)"}</div>
            {hashtags && <div style={hashtagStyle}>{hashtags}</div>}
        </div>
    );
};

// --- MAIN COMPONENT: CaptionGenerator ---
export default function CaptionGenerator() {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState([]);
    const [selectedTones, setSelectedTones] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null); // State for image
    const [autoSave, setAutoSave] = useState(true);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({
        wordCount: "50",
        noHashtags: false,
        hashtagsOnly: false,
    });

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

    // --- LOGIC HANDLERS ---
    const handleToneClick = (tone) => {
        setSelectedTones(prev => {
            if (prev.includes(tone)) {
                return prev.filter(t => t !== tone);
            } else {
                if (prev.length < 3) {
                    return [...prev, tone];
                }
                return prev;
            }
        });
    };

    const handleGenerate = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setError("You must be logged in to generate content.");
            return;
        }
        if (!topic && !selectedImage) {
            setError("Please enter a topic or upload an image for your post.");
            return;
        }

        setLoading(true);
        setError("");
        setResult([]);

        try {
            // 1. Call the Cloud Function
            const responseString = await generateContent({
                type: "caption",
                payload: {
                    topic: topic,
                    tones: selectedTones,
                    image: selectedImage, // Pass image
                    options: {
                        wordCount: parseInt(advancedOptions.wordCount, 10),
                        noHashtags: advancedOptions.noHashtags,
                        hashtagsOnly: advancedOptions.hashtagsOnly
                    }
                }
            });

            // 2. Parse the JSON string returned by the backend
            let generatedResult = [];
            try {
                // The backend returns a JSON string because response_format is json_object
                const parsed = JSON.parse(responseString);
                // Sometimes OpenAI wraps arrays in a root object like { "captions": [...] } or just returns the array
                // Based on your prompt, it should return the array directly, but let's be safe
                if (Array.isArray(parsed)) {
                    generatedResult = parsed;
                } else if (parsed.captions && Array.isArray(parsed.captions)) {
                    generatedResult = parsed.captions;
                } else {
                    // Fallback: try to find an array in the object values
                    const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
                    generatedResult = possibleArray || [];
                }
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                throw new Error("Failed to parse AI response.");
            }

            setResult(generatedResult);
            setLoading(false);

            // 3. Log Action (only if autoSave is enabled)
            if (autoSave) {
                await logUserAction(uid, 'generate_caption', {
                    source: 'CaptionGenerator',
                    detail: `Generated ${generatedResult.length} captions for topic: ${topic}`,
                    topic: topic,
                    tones: selectedTones,
                    hasImage: !!selectedImage,
                    options: advancedOptions,
                    results: generatedResult
                });
            }

        } catch (err) {
            console.error("Generation Error:", err);
            setError(err.message || "Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    // --- Advanced Options Content ---
    const getWordCountLabel = (value) => {
        if (value === "20") return "Short (~20 words)";
        if (value === "50") return "Medium (~50 words)";
        if (value === "100") return "Long (~100 words)";
        return "Medium";
    };

    const AdvancedOptionsContent = (
        <>
            <StyledSlider
                label={`Approximate Length: ${getWordCountLabel(advancedOptions.wordCount)}`}
                min={20} max={100} step={30}
                value={advancedOptions.wordCount}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, wordCount: e.target.value }))}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <ToggleSwitch
                    label="Remove Hashtags"
                    checked={advancedOptions.noHashtags}
                    onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, noHashtags: isChecked, hashtagsOnly: isChecked ? false : prev.hashtagsOnly }))}
                />
                <ToggleSwitch
                    label="Hashtags Only"
                    checked={advancedOptions.hashtagsOnly}
                    onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, hashtagsOnly: isChecked, noHashtags: isChecked ? false : prev.noHashtags }))}
                />
            </div>
        </>
    );

    // --- Final Result Panel ---
    const ResultsPanel = result.length > 0 && (
        <div>
            <h2 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: "600", color: "#ffffff", marginBottom: "24px", animation: "fadeIn 0.5s ease-out" }}>Your Generated Captions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                {result.map((cap, index) => (
                    <CaptionCard
                        key={cap.id || index}
                        title={cap.title || `Option ${index + 1}`}
                        caption={cap.caption}
                        hashtags={cap.hashtags}
                    />
                ))}
            </div>
        </div>
    );

    const creditCost = selectedImage ? 2 : 1; // Base 1 + 1 for image

    return (
        <GeneratorLayout
            header={<PageHeader />}
            topic={{
                label: "What is your post about?",
                placeholder: "e.g., 'Our new seasonal pumpkin spice latte, made with real pumpkin puree.'",
                value: topic,
                onChange: (e) => setTopic(e.target.value),
                selectedTones: selectedTones,
                handleToneClick: handleToneClick
            }}
            imageUploadComponent={
                <ImageUpload
                    selectedImage={selectedImage}
                    onImageChange={setSelectedImage}
                />
            }
            advancedOptionsPanel={
                <AdvancedOptionsPanel
                    open={advancedOpen}
                    onToggle={() => setAdvancedOpen(!advancedOpen)}
                >
                    {AdvancedOptionsContent}
                </AdvancedOptionsPanel>
            }
            generateButtonText={`Generate Captions (${creditCost} Credit${creditCost > 1 ? 's' : ''})`}
            loading={loading}
            handleGenerate={handleGenerate}
            error={error}
            resultPanel={ResultsPanel}
            maxWidth="1200px"
        />
    );
}