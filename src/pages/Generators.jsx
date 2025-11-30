import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel,
    SelectionButton
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload";
import { auth, logUserAction, db, uploadImageToStorage, doc, getDoc } from "../services/firebase";
import { generateContent } from "../services/aiApi";

// --- CONSTANTS ---
const GENERATOR_TYPES = [
    { id: "tweet", name: "Tweet", icon: "🐦" },
    { id: "caption", name: "Caption", icon: "✨" },
    { id: "idea", name: "Idea", icon: "💡" },
    { id: "videoScript", name: "Script", icon: "🎬" },
    { id: "image", name: "Image", icon: "🎨", locked: true }
];

const PLATFORMS = [
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "twitter", name: "X", icon: "🐦" },
    { id: "instagram", name: "Insta", icon: "📸" },
    { id: "facebook", name: "FB", icon: "👥" },
    { id: "youtube", name: "YT", icon: "▶️" }
];

const ASPECT_RATIOS = [
    { id: "1:1", name: "Square (1:1)", icon: "🟦" },
    { id: "16:9", name: "Landscape (16:9)", icon: "▭" },
    { id: "9:16", name: "Story (9:16)", icon: "▯" },
    { id: "4:5", name: "Portrait (4:5)", icon: "📱" },
    { id: "1.91:1", name: "Wide (1.91:1)", icon: "▬" }
];

// --- HELPER: Format Text (Converts **text** to Bold) ---
const formatText = (text) => {
    if (!text) return "";
    const parts = text.split("**");
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <strong key={index} style={{ color: "#ffffff", fontWeight: "700" }}>{part}</strong>;
        }
        return part;
    });
};

// --- HELPER: Get Slider Config ---
const getSliderConfig = (type, value) => {
    if (type === "videoScript") {
        return {
            label: "Duration",
            displayValue: value === "Short" ? "30s" : value === "Medium" ? "60s" : "90s"
        };
    }
    if (type === "idea") {
        return {
            label: "Quantity",
            displayValue: value === "Short" ? "1 Idea" : value === "Medium" ? "3 Ideas" : "5 Ideas"
        };
    }
    return {
        label: "Length",
        displayValue: value
    };
};

// --- SUB-COMPONENT: Type Selector (Compact Row) ---
const TypeSelector = ({ currentType, onChange }) => {
    return (
        <div style={{ display: "flex", gap: "8px" }}>
            {GENERATOR_TYPES.map(type => (
                <SelectionButton
                    key={type.id}
                    label={`${type.icon} ${type.name}`}
                    isSelected={currentType === type.id}
                    isDisabled={false}
                    isLocked={type.locked}
                    tooltip={type.locked ? "Coming Soon" : ""}
                    onClick={() => onChange(type.id)}
                />
            ))}
        </div>
    );
};

// --- SUB-COMPONENT: Platform Selector (Compact Row) ---
const PlatformSelector = ({ currentPlatform, onChange }) => {
    return (
        <div style={{ display: "flex", gap: "8px" }}>
            {PLATFORMS.map(platform => (
                <SelectionButton
                    key={platform.id}
                    label={`${platform.icon} ${platform.name}`}
                    isSelected={currentPlatform === platform.id}
                    isDisabled={false}
                    onClick={() => onChange(platform.id)}
                />
            ))}
        </div>
    );
};

// --- SUB-COMPONENT: Aspect Ratio Selector (Compact Row) ---
const AspectRatioSelector = ({ currentRatio, onChange }) => {
    return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ASPECT_RATIOS.map(ratio => (
                <SelectionButton
                    key={ratio.id}
                    label={`${ratio.icon} ${ratio.name}`}
                    isSelected={currentRatio === ratio.id}
                    isDisabled={false}
                    onClick={() => onChange(ratio.id)}
                />
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

const Generators = () => {
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get("type") || "tweet";
    const initialTopic = searchParams.get("topic") || "";
    const initialPlatform = searchParams.get("platform");

    // State
    const [currentType, setCurrentType] = useState(initialType);
    const [topic, setTopic] = useState(initialTopic);
    const [generatedContent, setGeneratedContent] = useState(null); // Changed to null to handle object
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [brandData, setBrandData] = useState(null); // Brand data from Firestore


    // Advanced Options State
    const [advancedOptions, setAdvancedOptions] = useState({
        length: "Medium",
        language: "English",
        platform: initialPlatform || "linkedin", // Default platform or from URL
        includeHashtags: true,
        includeEmojis: true,
        aspectRatio: "1:1",
        includeBody: false, // New: Toggle for text generation in Post
        videoLength: "Medium", // New: Video script duration (Short/Medium/Long)
        useBrandData: true // New: Toggle to use brand data or defaults
    });

    // Modal State
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImage, setModalImage] = useState(null);

    // Update type from URL if it changes
    useEffect(() => {
        const typeFromUrl = searchParams.get("type");
        if (typeFromUrl) {
            setCurrentType(typeFromUrl);
        }

        const topicFromUrl = searchParams.get("topic");
        if (topicFromUrl) {
            setTopic(topicFromUrl);
        }

        const platformFromUrl = searchParams.get("platform");
        if (platformFromUrl) {
            setAdvancedOptions(prev => ({ ...prev, platform: platformFromUrl }));
        }


    }, [searchParams]);

    // Fetch Brand Data
    useEffect(() => {
        const fetchBrandData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const brandDoc = await getDoc(doc(db, "brands", user.uid));
                if (brandDoc.exists()) {
                    setBrandData(brandDoc.data().brandData);
                }
            } catch (error) {
                console.error("Error fetching brand data:", error);
            }
        };
        fetchBrandData();
    }, []);

    // Auto-set platform for Tweet type (only if not overridden by URL)
    useEffect(() => {
        if (currentType === "tweet" && !initialPlatform) {
            setAdvancedOptions(prev => ({ ...prev, platform: "twitter" }));
        }
    }, [currentType, initialPlatform]);

    // Handle Generation
    const handleGenerate = async () => {
        if (!topic.trim() && !selectedImage) {
            setError("Please enter a topic/description OR upload a reference image.");
            return;
        }

        setLoading(true);
        setError("");
        setGeneratedContent(null);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("You must be logged in.");

            let finalContent = {};

            // 1. Generate Image (if Post type)
            if (currentType === "post") {
                const imageResult = await generateContent({
                    type: "smartImage", // Use internal smartImage type
                    payload: {
                        topic: topic,
                        aspectRatio: advancedOptions.aspectRatio,
                        platform: advancedOptions.platform, // Pass platform for advanced logic
                        image: selectedImage // Pass reference image if available
                    }
                });
                if (imageResult.error) throw new Error(imageResult.error);

                // Handle new backend response format { image: "url" }
                let rawImage = imageResult.content || imageResult;
                if (typeof rawImage === 'object' && rawImage.image) {
                    finalContent.image = rawImage.image;
                } else {
                    finalContent.image = rawImage;
                }

                // Upload Image
                if (typeof finalContent.image === 'string' && finalContent.image.startsWith('data:image')) {
                    try {
                        const downloadUrl = await uploadImageToStorage(user.uid, finalContent.image);
                        if (downloadUrl) finalContent.imageUrl = downloadUrl;
                    } catch (e) {
                        console.error("Image upload failed", e);
                    }
                }
            }

            // 2. Generate Text (if NOT Post, OR if Post + includeBody)
            if (currentType !== "post" || (currentType === "post" && advancedOptions.includeBody)) {
                const textResult = await generateContent({
                    type: currentType, // Use actual type (post, tweet, etc.)
                    payload: {
                        topic: topic.trim() || (selectedImage ? `Analyze this image and create engaging ${currentType === 'tweet' ? 'tweet ideas' : currentType === 'caption' ? 'caption ideas' : 'content'} based on what you see. Be creative and relevant.` : ""),
                        platform: advancedOptions.platform,
                        // Conditionally include brand data or defaults
                        ...(advancedOptions.useBrandData && brandData ? {
                            niche: brandData.coreTopic,
                            tone: brandData.tone,
                            targetAudience: brandData.targetAudience,
                            contentPillars: brandData.aiGenerated?.contentPillars || [],
                            brandVoice: brandData.brandVoice
                        } : {
                            tone: "Professional and engaging",
                            targetAudience: "General audience"
                        }),
                        image: selectedImage,
                        length: advancedOptions.length,
                        language: advancedOptions.language,
                        includeHashtags: advancedOptions.includeHashtags,
                        includeEmojis: advancedOptions.includeEmojis,
                        videoLength: advancedOptions.videoLength, // For video scripts

                    }
                });
                if (textResult.error && currentType !== "post") throw new Error(textResult.error); // Only throw if it's the main action

                if (!textResult.error) {
                    finalContent.text = textResult.content || textResult;
                }
            }

            setGeneratedContent(finalContent);

            // Log History
            let historyContent = { ...finalContent, prompt: topic };
            // If we have a persistent URL, use that for history
            if (finalContent.imageUrl) {
                historyContent.image = finalContent.imageUrl;
            }

            await logUserAction(user.uid, `generated_${currentType}`, historyContent);

        } catch (err) {
            console.error("Generation Error:", err);
            setError(err.message || "Failed to generate content. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Video Script Tabs Component
    const VideoScriptTabs = ({ data }) => {
        const [activeTab, setActiveTab] = useState('intro');

        const tabs = [
            { id: 'intro', label: 'Intro', icon: '🎬' },
            { id: 'main', label: 'Main Content', icon: '📝' },
            { id: 'outro', label: 'Outro', icon: '🎯' }
        ];

        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Tab Navigation */}
                <div style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "24px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    paddingBottom: "16px"
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "12px",
                                background: activeTab === tab.id
                                    ? "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.15))"
                                    : "transparent",
                                border: activeTab === tab.id ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid transparent",
                                cursor: "pointer",
                                fontWeight: activeTab === tab.id ? "700" : "500",
                                color: activeTab === tab.id ? "#ffffff" : "#94a3b8",
                                fontSize: "0.95rem",
                                transition: "all 0.2s",
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            <span style={{ fontSize: "1.2rem" }}>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }} className="custom-scrollbar">
                    {activeTab === 'intro' && data.intro && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            {data.intro.map((option, idx) => (
                                <div key={idx} style={{
                                    background: "rgba(30, 32, 45, 0.6)",
                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                    borderRadius: "20px",
                                    padding: "28px",
                                    position: "relative",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                                }}>
                                    <div style={{
                                        position: "absolute",
                                        top: "-14px",
                                        left: "24px",
                                        background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                                        color: "white",
                                        padding: "6px 16px",
                                        borderRadius: "20px",
                                        fontSize: "0.8rem",
                                        fontWeight: "700",
                                        boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)",
                                        textTransform: "uppercase",
                                        letterSpacing: "1px"
                                    }}>
                                        Option {idx + 1}
                                    </div>
                                    <div style={{
                                        whiteSpace: "pre-wrap",
                                        lineHeight: "1.8",
                                        fontSize: "1.1rem",
                                        color: "#e2e8f0",
                                        marginTop: "12px",
                                        fontFamily: "'Inter', sans-serif",
                                        letterSpacing: "0.01em"
                                    }}>
                                        {formatText(option.text)}
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(option.text)}
                                        style={{
                                            marginTop: "24px",
                                            padding: "12px 20px",
                                            borderRadius: "12px",
                                            background: "rgba(139, 92, 246, 0.1)",
                                            border: "1px solid rgba(139, 92, 246, 0.3)",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                            color: "#d8b4fe",
                                            width: "100%",
                                            fontSize: "0.95rem",
                                            transition: "all 0.2s",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = "rgba(139, 92, 246, 0.2)";
                                            e.target.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = "rgba(139, 92, 246, 0.1)";
                                            e.target.style.color = "#d8b4fe";
                                        }}
                                    >
                                        📋 Copy Intro {idx + 1}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'main' && data.mainContent && (
                        <div style={{
                            background: "rgba(30, 32, 45, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "20px",
                            padding: "32px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{
                                whiteSpace: "pre-wrap",
                                lineHeight: "1.9",
                                fontSize: "1.15rem",
                                color: "#e2e8f0",
                                fontFamily: "'Inter', sans-serif",
                                letterSpacing: "0.01em"
                            }}>
                                {formatText(data.mainContent)}
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(data.mainContent)}
                                style={{
                                    marginTop: "32px",
                                    padding: "14px 24px",
                                    borderRadius: "14px",
                                    background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                    color: "white",
                                    width: "100%",
                                    fontSize: "1rem",
                                    boxShadow: "0 4px 15px rgba(139, 92, 246, 0.3)",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
                                onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
                            >
                                📋 Copy Main Content
                            </button>
                        </div>
                    )}

                    {activeTab === 'outro' && data.outro && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            {data.outro.map((option, idx) => (
                                <div key={idx} style={{
                                    background: "rgba(30, 32, 45, 0.6)",
                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                    borderRadius: "20px",
                                    padding: "28px",
                                    position: "relative",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                                }}>
                                    <div style={{
                                        position: "absolute",
                                        top: "-14px",
                                        left: "24px",
                                        background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                                        color: "white",
                                        padding: "6px 16px",
                                        borderRadius: "20px",
                                        fontSize: "0.8rem",
                                        fontWeight: "700",
                                        boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)",
                                        textTransform: "uppercase",
                                        letterSpacing: "1px"
                                    }}>
                                        Option {idx + 1}
                                    </div>
                                    <div style={{
                                        whiteSpace: "pre-wrap",
                                        lineHeight: "1.8",
                                        fontSize: "1.1rem",
                                        color: "#e2e8f0",
                                        marginTop: "12px",
                                        fontFamily: "'Inter', sans-serif",
                                        letterSpacing: "0.01em"
                                    }}>
                                        {formatText(option.text)}
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(option.text)}
                                        style={{
                                            marginTop: "24px",
                                            padding: "12px 20px",
                                            borderRadius: "12px",
                                            background: "rgba(139, 92, 246, 0.1)",
                                            border: "1px solid rgba(139, 92, 246, 0.3)",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                            color: "#d8b4fe",
                                            width: "100%",
                                            fontSize: "0.95rem",
                                            transition: "all 0.2s",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = "rgba(139, 92, 246, 0.2)";
                                            e.target.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = "rgba(139, 92, 246, 0.1)";
                                            e.target.style.color = "#d8b4fe";
                                        }}
                                    >
                                        📋 Copy Outro {idx + 1}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Result Panel Content
    const renderResultPanel = () => {
        if (!generatedContent) return null;

        const content = typeof generatedContent === 'string' ? { text: generatedContent } : generatedContent;

        return (
            <div style={{ padding: "20px", color: "#e0e0e0", background: "#0a0e1a", height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Header with title and actions */}
                <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", background: "linear-gradient(135deg, #a855f7, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        ✨ Generated Results
                    </h3>
                    {content.image && (
                        <a
                            href={content.image}
                            download={`generated-image-${Date.now()}.png`}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                                border: "none", cursor: "pointer", fontWeight: "600", color: "white",
                                textDecoration: "none", display: "inline-block", fontSize: "0.85rem"
                            }}
                        >
                            ⬇️ Download
                        </a>
                    )}
                </div>

                {/* Scrollable content area */}
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }} className="custom-scrollbar">
                    {content.image && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                background: "rgba(139, 92, 246, 0.05)",
                                borderRadius: "16px",
                                padding: "16px",
                                marginBottom: "24px",
                                cursor: "zoom-in",
                                aspectRatio: advancedOptions.aspectRatio ? advancedOptions.aspectRatio.replace(":", "/") : "1/1",
                                border: "1px solid rgba(139, 92, 246, 0.2)",
                                overflow: "hidden"
                            }}
                            onClick={() => {
                                setModalImage(content.image);
                                setShowImageModal(true);
                            }}
                        >
                            <img
                                src={content.image}
                                alt="Generated Result"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    borderRadius: "12px"
                                }}
                            />
                        </div>
                    )}

                    {content.text && (
                        <div>
                            {(() => {
                                // Try to parse as JSON first
                                let parsed = content.text;
                                if (typeof content.text === 'string') {
                                    try {
                                        parsed = JSON.parse(content.text);
                                    } catch (e) {
                                        // Not JSON, keep as string
                                    }
                                }

                                // 1. Handle Video Script (JSON with tabs)
                                if (parsed.intro && parsed.mainContent && parsed.outro) {
                                    return <VideoScriptTabs data={parsed} />;
                                }

                                // 2. Handle Tweets (JSON with array)
                                if (parsed.tweets && Array.isArray(parsed.tweets)) {
                                    return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                            {parsed.tweets.map((tweet, idx) => (
                                                <div key={idx} style={{
                                                    background: "rgba(30, 32, 45, 0.6)",
                                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                                    borderRadius: "20px",
                                                    padding: "24px",
                                                    position: "relative",
                                                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                                                }}>
                                                    <div style={{
                                                        position: "absolute",
                                                        top: "-12px",
                                                        left: "24px",
                                                        background: "linear-gradient(135deg, #1da1f2, #0ea5e9)",
                                                        color: "white",
                                                        padding: "4px 12px",
                                                        borderRadius: "12px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: "700",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "1px",
                                                        boxShadow: "0 4px 10px rgba(29, 161, 242, 0.3)"
                                                    }}>
                                                        Tweet {idx + 1}
                                                    </div>
                                                    <div style={{
                                                        whiteSpace: "pre-wrap",
                                                        lineHeight: "1.6",
                                                        fontSize: "1.1rem",
                                                        color: "#e2e8f0",
                                                        marginTop: "12px",
                                                        fontFamily: "'Inter', sans-serif"
                                                    }}>
                                                        {formatText(tweet.text)}
                                                    </div>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(tweet.text)}
                                                        style={{
                                                            marginTop: "20px",
                                                            padding: "10px 16px",
                                                            borderRadius: "10px",
                                                            background: "rgba(29, 161, 242, 0.1)",
                                                            border: "1px solid rgba(29, 161, 242, 0.3)",
                                                            cursor: "pointer",
                                                            fontWeight: "600",
                                                            color: "#7dd3fc",
                                                            width: "100%",
                                                            fontSize: "0.9rem",
                                                            transition: "all 0.2s",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "8px"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.background = "rgba(29, 161, 242, 0.2)";
                                                            e.target.style.color = "#fff";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.background = "rgba(29, 161, 242, 0.1)";
                                                            e.target.style.color = "#7dd3fc";
                                                        }}
                                                    >
                                                        📋 Copy Tweet
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                // 3. Handle Arrays (Captions, Ideas, etc.)
                                if (Array.isArray(parsed)) {
                                    return (
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                                            {parsed.map((item, idx) => (
                                                <div key={idx} style={{
                                                    background: "rgba(255, 255, 255, 0.03)",
                                                    border: "1px solid rgba(255, 255, 255, 0.05)",
                                                    borderRadius: "16px",
                                                    padding: "24px",
                                                    position: "relative",
                                                    transition: "transform 0.2s, border-color 0.2s",
                                                    cursor: "default"
                                                }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = "translateY(-2px)";
                                                        e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = "translateY(0)";
                                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                                                    }}
                                                >
                                                    <div style={{
                                                        whiteSpace: "pre-wrap",
                                                        lineHeight: "1.6",
                                                        color: "#e0e0e0",
                                                        fontSize: "1rem"
                                                    }}>
                                                        {formatText(typeof item === 'string' ? item : item.caption || JSON.stringify(item))}
                                                    </div>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(typeof item === 'string' ? item : item.caption || JSON.stringify(item))}
                                                        style={{
                                                            marginTop: "16px",
                                                            padding: "8px 16px",
                                                            borderRadius: "8px",
                                                            background: "rgba(255, 255, 255, 0.05)",
                                                            border: "none",
                                                            color: "#a855f7",
                                                            fontSize: "0.85rem",
                                                            fontWeight: "600",
                                                            cursor: "pointer",
                                                            transition: "background 0.2s",
                                                            width: "100%"
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.background = "rgba(168, 85, 247, 0.1)"}
                                                        onMouseLeave={(e) => e.target.style.background = "rgba(255, 255, 255, 0.05)"}
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                // 4. Handle Plain Text (Fallback)
                                return (
                                    <div style={{
                                        background: "rgba(255, 255, 255, 0.03)",
                                        border: "1px solid rgba(255, 255, 255, 0.05)",
                                        borderRadius: "16px",
                                        padding: "24px"
                                    }}>
                                        <div style={{
                                            whiteSpace: "pre-wrap",
                                            lineHeight: "1.6",
                                            color: "#e0e0e0",
                                            fontSize: "1rem"
                                        }}>
                                            {formatText(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2))}
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2))}
                                            style={{
                                                marginTop: "20px",
                                                padding: "12px 24px",
                                                borderRadius: "12px",
                                                background: "var(--primary-gradient)",
                                                border: "none",
                                                color: "white",
                                                fontSize: "1rem",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                width: "100%"
                                            }}
                                        >
                                            Copy Content
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const sliderConfig = getSliderConfig(currentType, advancedOptions.length);

    return (
        <>
            <GeneratorLayout
                toolbarLeft={
                    <TypeSelector
                        currentType={currentType}
                        onChange={setCurrentType}
                    />
                }
                toolbarRight={
                    // Hide Platform Selector if type is "tweet" (Post uses Aspect Ratio AND Platform now)
                    (currentType === "tweet") ? null : (
                        <PlatformSelector
                            currentPlatform={advancedOptions.platform}
                            onChange={(p) => setAdvancedOptions(prev => ({ ...prev, platform: p }))}
                        />
                    )
                }
                topic={{
                    label: selectedImage
                        ? (currentType === "post" ? "Describe the image (optional - we'll analyze your uploaded image)" : "What to create? (optional - we'll analyze your uploaded image)")
                        : (currentType === "post" ? "Describe the image you want to create" : "What should we create today?"),
                    value: topic,
                    onChange: (e) => setTopic(e.target.value),
                    placeholder: selectedImage
                        ? "e.g., Make this sound professional... (or leave blank to analyze the image)"
                        : (currentType === "post"
                            ? "e.g., A futuristic city with flying cars at flying cars at sunset..."
                            : "e.g., A LinkedIn post about the future of AI in marketing...")
                }}
                imageUploadComponent={
                    <ImageUpload
                        onImageChange={setSelectedImage}
                        selectedImage={selectedImage}
                    />
                }
                advancedOptionsPanel={
                    <AdvancedOptionsPanel open={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>

                            {/* Post Type: Aspect Ratio & Description Toggle */}
                            {currentType === "post" && (
                                <>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", color: "#a0a0b0", marginBottom: "12px", fontSize: "0.9rem", fontWeight: "600", textTransform: "uppercase" }}>
                                            Aspect Ratio
                                        </label>
                                        <AspectRatioSelector
                                            currentRatio={advancedOptions.aspectRatio}
                                            onChange={(ratio) => setAdvancedOptions(prev => ({ ...prev, aspectRatio: ratio }))}
                                        />
                                    </div>
                                    <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                                        <ToggleSwitch
                                            label="📝 Include Description"
                                            checked={advancedOptions.includeBody}
                                            onChange={(val) => setAdvancedOptions(prev => ({ ...prev, includeBody: val }))}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Video Script: Video Length Slider */}
                            {currentType === "videoScript" && (
                                <>
                                    <div style={{ width: "100%", maxWidth: "90%" }}>
                                        <StyledSlider
                                            label="Video Length"
                                            min={1} max={3} step={1}
                                            value={advancedOptions.videoLength === "Short" ? 1 : advancedOptions.videoLength === "Medium" ? 2 : 3}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setAdvancedOptions(prev => ({ ...prev, videoLength: val === 1 ? "Short" : val === 2 ? "Medium" : "Long" }));
                                            }}
                                        />
                                        <div style={{ textAlign: "center", color: "#a855f7", fontSize: "0.9rem", fontWeight: "600", marginTop: "-10px" }}>
                                            {advancedOptions.videoLength === "Short" ? "30sec - 1min" : advancedOptions.videoLength === "Medium" ? "2 - 5min" : "10 - 15min"}
                                        </div>
                                    </div>
                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", width: "100%", marginTop: "20px" }}></div>
                                </>
                            )}

                            {/* Slider & Toggles: Show if NOT Post, OR if Post + includeBody */}
                            {(currentType !== "post" || advancedOptions.includeBody) && (
                                <>
                                    <div style={{ width: "100%", maxWidth: "90%" }}>
                                        <StyledSlider
                                            label={sliderConfig.label}
                                            min={1} max={3} step={1}
                                            value={advancedOptions.length === "Short" ? 1 : advancedOptions.length === "Medium" ? 2 : 3}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setAdvancedOptions(prev => ({ ...prev, length: val === 1 ? "Short" : val === 2 ? "Medium" : "Long" }));
                                            }}
                                        />
                                        <div style={{ textAlign: "center", color: "#a855f7", fontSize: "0.9rem", fontWeight: "600", marginTop: "-10px" }}>
                                            {sliderConfig.displayValue}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
                                        <ToggleSwitch
                                            label="🎯 Use Brand Data"
                                            checked={advancedOptions.useBrandData}
                                            onChange={(val) => setAdvancedOptions(prev => ({ ...prev, useBrandData: val }))}
                                        />
                                        <ToggleSwitch
                                            label="# Hashtags"
                                            checked={advancedOptions.includeHashtags}
                                            onChange={(val) => setAdvancedOptions(prev => ({ ...prev, includeHashtags: val }))}
                                        />
                                        <ToggleSwitch
                                            label="😊 Emojis"
                                            checked={advancedOptions.includeEmojis}
                                            onChange={(val) => setAdvancedOptions(prev => ({ ...prev, includeEmojis: val }))}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </AdvancedOptionsPanel>
                }
                generateButtonText={`Generate ${GENERATOR_TYPES.find(t => t.id === currentType)?.name}`}
                loading={loading}
                handleGenerate={handleGenerate}
                error={error}
                resultPanel={renderResultPanel()}
            />

            {/* IMAGE MODAL */}
            {showImageModal && (
                <div
                    style={{
                        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                        background: "rgba(0,0,0,0.9)", zIndex: 1000,
                        display: "flex", justifyContent: "center", alignItems: "center",
                        cursor: "zoom-out"
                    }}
                    onClick={() => setShowImageModal(false)}
                >
                    <img
                        src={modalImage}
                        alt="Full Size"
                        style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "8px", boxShadow: "0 0 50px rgba(0,0,0,0.5)" }}
                    />
                </div>
            )}
        </>
    );
};

export default Generators;

