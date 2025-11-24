// src/pages/IdeaGenerator.jsx

import { useState, useMemo, useEffect } from "react";
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload";
import { auth, logUserAction, db } from "../services/firebase";
import { generateContent } from "../services/aiApi";
import ReactMarkdown from 'react-markdown';

// --- HELPER: Parse raw text into an array of ideas ---
const parseIdeasFromText = (text) => {
    if (!text) return [];
    const normalizedText = text.replace(/\r\n/g, '\n');

    // 1. Try splitting by "Video Title:" (New Format)
    // We look for the pattern "Video Title:" to identify blocks
    if (normalizedText.match(/Video Title:/i)) {
        const rawBlocks = normalizedText.split(/Video Title:/i);
        return rawBlocks
            .map(block => block.trim())
            .filter(block => block.length > 10) // Filter out empty/too short blocks (e.g. pre-text)
            .map(block => `Video Title: ${block}`); // Re-attach prefix
    }

    // 2. Fallback: Split by double newlines (Generic)
    const blocks = normalizedText.split(/\n\s*\n/);
    const filteredBlocks = blocks.filter(block => block.trim().length > 0);
    if (filteredBlocks.length > 0) return filteredBlocks;

    // 3. Fallback: Return the whole text as one item if nothing else matches
    return [text];
};

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
            💡
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
            Content Idea Generator
        </h1>
        <p style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)", color: "#a0a0b0", marginBottom: "24px", lineHeight: "1.6", textAlign: "center", maxWidth: "600px" }}>
            Stuck in a rut? Describe a topic, and I'll generate "viral-style"
            content ideas (Reels, Carousels, etc.) for you.
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

// --- SUB-COMPONENT: Individual Idea Card (Enhanced Format) ---
const IdeaCard = ({ idea, index }) => {
    const [copied, setCopied] = useState(false);
    const [hover, setHover] = useState(false);

    // --- PARSING LOGIC ---
    // Extract fields using Regex
    const titleMatch = idea.match(/Video Title:\s*([\s\S]*?)(?=Length:|$)/i);
    const lengthMatch = idea.match(/Length:\s*([\s\S]*?)(?=Idea:|$)/i);
    const ideaMatch = idea.match(/Idea:\s*([\s\S]*?)(?=Explanation:|$)/i);
    const explanationMatch = idea.match(/Explanation:\s*([\s\S]*?)(?=$)/i);

    const videoTitle = titleMatch ? titleMatch[1].trim() : "Untitled Idea";
    const videoLength = lengthMatch ? lengthMatch[1].trim() : "";
    const ideaText = ideaMatch ? ideaMatch[1].trim() : "";
    const explanation = explanationMatch ? explanationMatch[1].trim() : "";

    // Fallback if parsing fails (e.g. old format or partial generation)
    // If we don't find a title or idea, we assume it's raw text.
    const rawBody = !titleMatch && !ideaMatch ? idea : "";

    // --- STYLES ---
    const cardStyle = useMemo(() => ({
        background: "rgba(10, 10, 15, 0.3)",
        backdropFilter: "blur(5px)",
        'WebkitBackdropFilter': 'blur(5px)',
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "clamp(16px, 4vw, 24px)", // Responsive padding
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        transition: "all 0.3s ease-in-out",
        transform: hover ? "scale(1.02)" : "scale(1)",
        boxShadow: hover ? "0 10px 30px rgba(0, 0, 0, 0.3)" : "0 4px 15px rgba(0, 0, 0, 0.2)",
        position: "relative",
        overflow: "hidden"
    }), [hover]);

    const headerStyle = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: "12px",
        flexWrap: "wrap", // Allow wrapping on small screens
        gap: "10px"
    };

    const badgeStyle = {
        color: "#a855f7",
        fontWeight: "700",
        fontSize: "0.85rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        background: "rgba(168, 85, 247, 0.1)",
        padding: "6px 12px",
        borderRadius: "8px",
        border: "1px solid rgba(168, 85, 247, 0.2)"
    };

    const copyButtonStyle = {
        background: copied ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
        border: `1px solid ${copied ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
        color: copied ? "#4ade80" : "#c0c0c0",
        padding: "8px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "0.85rem",
        fontWeight: "600",
        transition: "all 0.2s ease-in-out",
        minHeight: "44px", // Touch target
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    };

    const labelStyle = { color: "#a0a0b0", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" };
    const contentStyle = { color: "#e0e0e0", fontSize: "1rem", lineHeight: "1.6", whiteSpace: "pre-wrap" };
    const titleStyle = { color: "#ffffff", fontSize: "1.2rem", fontWeight: "700", lineHeight: "1.4" };

    const handleCopy = async () => {
        const uid = auth.currentUser?.uid;
        const textToCopy = rawBody || `Title: ${videoTitle}\nLength: ${videoLength}\nIdea: ${ideaText}\n\nExplanation:\n${explanation}`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            if (uid) {
                await logUserAction(uid, 'copy', {
                    source: 'IdeaGenerator',
                    detail: videoTitle || "Generated Idea",
                    text: textToCopy.substring(0, 100)
                });
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy text:", error);
        }
    };

    return (
        <div
            style={cardStyle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {/* Header: Index & Copy */}
            <div style={headerStyle}>
                <span style={badgeStyle}>Idea #{index + 1}</span>
                <button style={copyButtonStyle} onClick={handleCopy}>
                    {copied ? "✓ Copied" : "❐ Copy"}
                </button>
            </div>

            {/* Content */}
            {rawBody ? (
                <div style={contentStyle}><ReactMarkdown>{rawBody}</ReactMarkdown></div>
            ) : (
                <>
                    {/* Video Title */}
                    <div>
                        <div style={labelStyle}>📺 Video Title</div>
                        <div style={titleStyle}>{videoTitle}</div>
                    </div>

                    {/* Length */}
                    {videoLength && (
                        <div>
                            <div style={labelStyle}>⏱️ Length</div>
                            <div style={contentStyle}>{videoLength}</div>
                        </div>
                    )}

                    {/* One Liner Idea */}
                    {ideaText && (
                        <div>
                            <div style={labelStyle}>💡 The Concept</div>
                            <div style={{ ...contentStyle, fontStyle: "italic", borderLeft: "3px solid #a855f7", paddingLeft: "12px" }}>
                                {ideaText}
                            </div>
                        </div>
                    )}

                    {/* Explanation */}
                    {explanation && (
                        <div>
                            <div style={labelStyle}>📝 Explanation</div>
                            <div style={contentStyle}>
                                <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// --- MAIN COMPONENT: IdeaGenerator ---
export default function IdeaGenerator() {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState([]);
    const [selectedTones, setSelectedTones] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [autoSave, setAutoSave] = useState(true);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({
        numIdeas: 5,
        includeReels: false,
        includeCarousels: false,
        includeStatic: false,
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
            setError("Please enter a topic or upload an image to get ideas for.");
            return;
        }

        setLoading(true);
        setError("");
        setResult([]);

        try {
            // Call API
            const generatedText = await generateContent({
                type: "idea",
                payload: {
                    topic: topic,
                    tones: selectedTones,
                    image: selectedImage, // Pass image
                    options: {
                        numIdeas: advancedOptions.numIdeas,
                        includeReels: advancedOptions.includeReels,
                        includeCarousels: advancedOptions.includeCarousels,
                        includeStatic: advancedOptions.includeStatic
                    }
                }
            });

            // Parse text into array
            const parsedIdeas = parseIdeasFromText(generatedText);
            setResult(parsedIdeas);
            setLoading(false);

            // Log Action (only if autoSave is enabled)
            if (autoSave) {
                await logUserAction(uid, 'generate_idea', {
                    source: 'IdeaGenerator',
                    detail: `Generated ${parsedIdeas.length} ideas for topic: ${topic}`,
                    topic: topic,
                    tones: selectedTones,
                    hasImage: !!selectedImage,
                    options: advancedOptions,
                    results: parsedIdeas
                });
            }

        } catch (err) {
            console.error("Generation Error:", err);
            setError(err.message || "Failed to generate ideas.");
            setLoading(false);
        }
    };

    // --- Advanced Options Content ---
    const AdvancedOptionsContent = (
        <>
            <StyledSlider
                label={`Number of Ideas: ${advancedOptions.numIdeas} ideas`}
                min={3} max={10} step={1}
                value={advancedOptions.numIdeas}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, numIdeas: parseInt(e.target.value, 10) }))}
            />

            <div>
                <label style={{ color: "#c0c0c0", fontSize: "0.9rem", marginTop: "8px" }}>
                    Filter by Post Type (Leave all off for a mix)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    <ToggleSwitch
                        label="Reels / Video Ideas Only"
                        checked={advancedOptions.includeReels}
                        onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, includeReels: isChecked, includeCarousels: isChecked ? false : prev.includeCarousels, includeStatic: isChecked ? false : prev.includeStatic }))}
                    />
                    <ToggleSwitch
                        label="Carousel Post Ideas Only"
                        checked={advancedOptions.includeCarousels}
                        onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, includeCarousels: isChecked, includeReels: isChecked ? false : prev.includeReels, includeStatic: isChecked ? false : prev.includeStatic }))}
                    />
                    <ToggleSwitch
                        label="Static Post Ideas Only"
                        checked={advancedOptions.includeStatic}
                        onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, includeStatic: isChecked, includeReels: isChecked ? false : prev.includeReels, includeCarousels: isChecked ? false : prev.includeCarousels }))}
                    />
                </div>
            </div>
        </>
    );

    // --- Results Panel ---
    const ResultsPanel = result.length > 0 && (
        <div style={{ marginTop: "40px", animation: "fadeIn 0.5s ease-out" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#ffffff", marginBottom: "24px" }}>
                Generated Ideas ({result.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                {result.map((ideaText, index) => (
                    <IdeaCard key={index} idea={ideaText} index={index} />
                ))}
            </div>
        </div>
    );

    // Credit Calculation: 1 credit per 5 ideas, +1 if image is used
    const baseCost = Math.ceil(advancedOptions.numIdeas / 5);
    const imageCost = selectedImage ? 1 : 0;
    const creditCost = baseCost + imageCost;

    return (
        <GeneratorLayout
            header={<PageHeader />}
            topic={{
                label: "What topic do you want ideas for?",
                placeholder: "e.g., 'The benefits of drinking water', 'Our new sneaker launch', 'Behind-the-scenes at our cafe'",
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
            generateButtonText={`Generate Ideas (${creditCost} Credit${creditCost > 1 ? 's' : ''})`}
            loading={loading}
            handleGenerate={handleGenerate}
            error={error}
            resultPanel={ResultsPanel}
            maxWidth="900px"
        />
    );
}