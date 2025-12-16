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
        useBrandData: true, // New: Toggle to use brand data or defaults
        outputSize: 40, // New: Character limit for Tweet/Caption
        numOutputs: 3 // New: Number of outputs (Tweets/Captions/Ideas)
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

    // Auto-set defaults when type changes
    useEffect(() => {
        if (currentType === "idea") {
            setAdvancedOptions(prev => ({ ...prev, numOutputs: 5 }));
        } else if (currentType === "tweet" || currentType === "caption") {
            setAdvancedOptions(prev => ({ ...prev, numOutputs: 3, outputSize: 40 }));
        }
    }, [currentType]);

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
                        useBrandData: advancedOptions.useBrandData, // CRITICAL: Tell backend if brand data should be used
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
                        outputSize: advancedOptions.outputSize, // New: Char limit
                        numOutputs: advancedOptions.numOutputs // New: Quantity
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
                                    ? "linear-gradient(135deg, rgba(124, 77, 255, 0.2), rgba(206, 147, 216, 0.15))"
                                    : "transparent",
                                border: activeTab === tab.id ? "1px solid rgba(124, 77, 255, 0.4)" : "1px solid transparent",
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
                        <div style={{
                            background: "rgba(30, 32, 45, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "20px",
                            padding: "32px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                        }}>
                            <ol style={{
                                margin: 0,
                                padding: 0,
                                paddingLeft: "20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px"
                            }}>
                                {data.intro.map((line, idx) => (
                                    <li key={idx} style={{
                                        lineHeight: "1.8",
                                        fontSize: "1.1rem",
                                        color: "#e2e8f0",
                                        fontFamily: "'Inter', sans-serif",
                                        letterSpacing: "0.01em"
                                    }}>
                                        {formatText(typeof line === 'string' ? line : line.text)}
                                    </li>
                                ))}
                            </ol>
                            <button
                                onClick={() => navigator.clipboard.writeText(data.intro.map((l, i) => `${i + 1}. ${typeof l === 'string' ? l : l.text}`).join('\n'))}
                                style={{
                                    marginTop: "32px",
                                    padding: "14px 24px",
                                    borderRadius: "14px",
                                    background: "linear-gradient(135deg, #7C4DFF, #CE93D8)",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                    color: "white",
                                    width: "100%",
                                    fontSize: "1rem",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "10px"
                                }}
                                onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
                                onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
                            >
                                📋 Copy Intro
                            </button>
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
                            {Array.isArray(data.mainContent) ? (
                                <ol style={{
                                    margin: 0,
                                    padding: 0,
                                    paddingLeft: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "16px"
                                }}>
                                    {data.mainContent.map((line, idx) => (
                                        <li key={idx} style={{
                                            lineHeight: "1.9",
                                            fontSize: "1.15rem",
                                            color: "#e2e8f0",
                                            fontFamily: "'Inter', sans-serif",
                                            letterSpacing: "0.01em"
                                        }}>
                                            {formatText(line)}
                                        </li>
                                    ))}
                                </ol>
                            ) : (
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
                            )}
                            <button
                                onClick={() => navigator.clipboard.writeText(
                                    Array.isArray(data.mainContent)
                                        ? data.mainContent.map((l, i) => `${i + 1}. ${l}`).join('\n')
                                        : data.mainContent
                                )}
                                style={{
                                    marginTop: "32px",
                                    padding: "14px 24px",
                                    borderRadius: "14px",
                                    background: "linear-gradient(135deg, #7C4DFF, #CE93D8)",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                    color: "white",
                                    width: "100%",
                                    fontSize: "1rem",
                                    boxShadow: "0 4px 15px rgba(124, 77, 255, 0.3)",
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
                        <div style={{
                            background: "rgba(30, 32, 45, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "20px",
                            padding: "32px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                        }}>
                            <ol style={{
                                margin: 0,
                                padding: 0,
                                paddingLeft: "20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px"
                            }}>
                                {data.outro.map((line, idx) => (
                                    <li key={idx} style={{
                                        lineHeight: "1.8",
                                        fontSize: "1.1rem",
                                        color: "#e2e8f0",
                                        fontFamily: "'Inter', sans-serif",
                                        letterSpacing: "0.01em"
                                    }}>
                                        {formatText(typeof line === 'string' ? line : line.text)}
                                    </li>
                                ))}
                            </ol>
                            <button
                                onClick={() => navigator.clipboard.writeText(data.outro.map((l, i) => `${i + 1}. ${typeof l === 'string' ? l : l.text}`).join('\n'))}
                                style={{
                                    marginTop: "32px",
                                    padding: "14px 24px",
                                    borderRadius: "14px",
                                    background: "linear-gradient(135deg, #7C4DFF, #CE93D8)",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                    color: "white",
                                    width: "100%",
                                    fontSize: "1rem",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "10px"
                                }}
                                onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
                                onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
                            >
                                📋 Copy Outro
                            </button>
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
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", background: "linear-gradient(135deg, #7C4DFF, #CE93D8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        ✨ Generated Results
                    </h3>
                    {content.image && (
                        <a
                            href={content.image}
                            download={`generated-image-${Date.now()}.png`}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", background: "linear-gradient(135deg, #7C4DFF, #CE93D8)",
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
                                background: "rgba(124, 77, 255, 0.05)",
                                borderRadius: "16px",
                                padding: "16px",
                                marginBottom: "24px",
                                cursor: "zoom-in",
                                aspectRatio: advancedOptions.aspectRatio ? advancedOptions.aspectRatio.replace(":", "/") : "1/1",
                                border: "1px solid rgba(124, 77, 255, 0.2)",
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
                                        // Attempt to strip markdown code blocks if present (multiple formats)
                                        let cleanText = content.text
                                            .replace(/```json\s*/gi, "")  // Remove ```json
                                            .replace(/```\s*/g, "")        // Remove remaining ```
                                            .trim();
                                        parsed = JSON.parse(cleanText);
                                    } catch (e) {
                                        // JSON Parse Failed. Try Heuristic Parsing for "Idea" lists.
                                        // The user reported output like: "Video Title: ... \n Length: ... \n Idea: ... \n Explanation: ..."
                                        if (currentType === 'idea') {
                                            const ideas = [];
                                            const blocks = content.text.split(/Video Title:/i).filter(b => b.trim());

                                            if (blocks.length > 0) {
                                                blocks.forEach(block => {
                                                    const titleMatch = block.match(/^(.*?)(?:\n|$)/);
                                                    const lengthMatch = block.match(/Length:\s*(.*?)(?:\n|$)/i);
                                                    const ideaMatch = block.match(/Idea:\s*(.*?)(?:\n|$)/i);

                                                    // Extract explanation (bullet points)
                                                    const explanationMatch = block.match(/Explanation:\s*([\s\S]*?)(?=$|Video Title:)/i);
                                                    let explanation = [];
                                                    if (explanationMatch) {
                                                        explanation = explanationMatch[1]
                                                            .split('\n')
                                                            .map(line => line.trim().replace(/^-\s*/, ''))
                                                            .filter(line => line.length > 0);
                                                    }

                                                    if (titleMatch) {
                                                        ideas.push({
                                                            title: titleMatch[1].trim(),
                                                            length: lengthMatch ? lengthMatch[1].trim() : "Unknown",
                                                            idea: ideaMatch ? ideaMatch[1].trim() : "No summary provided",
                                                            explanation: explanation.length > 0 ? explanation : ["No explanation provided"]
                                                        });
                                                    }
                                                });

                                                if (ideas.length > 0) {
                                                    parsed = ideas;
                                                }
                                            }
                                        }
                                    }
                                }



                                // Handle captions wrapper
                                const captionsArray = parsed.captions;
                                if (captionsArray && Array.isArray(captionsArray)) {
                                    parsed = captionsArray;
                                }

                                // Handle contentIdeas wrapper (backend JSON - handle case variations)
                                const ideasArray = parsed.contentIdeas || parsed.contentideas;
                                if (ideasArray && Array.isArray(ideasArray)) {
                                    parsed = ideasArray.map(item => {
                                        // Prioritize lowercase (new format)
                                        const title = item.title || item["Video Title"] || item["video title"] || item.Title || "Untitled";
                                        const length = item.length || item.Length || "Unknown";
                                        const idea = item.idea || item.Idea || "No description";
                                        const explanation = item.explanation || item.Explanation || [];

                                        return { title, length, idea, explanation };
                                    });
                                }

                                // 1. Handle Video Script (JSON with tabs)
                                if (parsed.intro && parsed.mainContent && parsed.outro) {
                                    return <VideoScriptTabs data={parsed} />;
                                }

                                // 2. Handle Tweets (JSON with array)
                                if (parsed.tweets && Array.isArray(parsed.tweets)) {
                                    const isSingle = parsed.tweets.length === 1;
                                    return (
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "16px",
                                            maxWidth: isSingle ? "800px" : "100%", // Constrain width for single items
                                            margin: isSingle ? "0 auto" : undefined // Center single items
                                        }}>
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
                                    const isSingle = parsed.length === 1;
                                    return (
                                        <div style={{
                                            display: isSingle ? "flex" : "grid",
                                            flexDirection: isSingle ? "column" : undefined,
                                            gridTemplateColumns: isSingle ? undefined : "repeat(auto-fit, minmax(300px, 1fr))",
                                            gap: "20px",
                                            maxWidth: isSingle ? "800px" : "100%", // Constrain width for single items
                                            margin: isSingle ? "0 auto" : undefined // Center single items
                                        }}>
                                            {parsed.map((item, idx) => {
                                                // Check if it's an Idea Object
                                                const isIdea = item.title && item.idea && item.explanation;

                                                return (
                                                    <div key={idx} style={{
                                                        background: isIdea ? "linear-gradient(145deg, rgba(30, 32, 45, 0.8), rgba(20, 22, 35, 0.9))" : "rgba(255, 255, 255, 0.03)",
                                                        border: isIdea ? "1px solid rgba(124, 77, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.05)",
                                                        borderRadius: "20px",
                                                        padding: "24px",
                                                        position: "relative",
                                                        transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
                                                        cursor: "default",
                                                        boxShadow: isIdea ? "0 4px 20px rgba(0,0,0,0.2)" : "none"
                                                    }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "translateY(-4px)";
                                                            e.currentTarget.style.borderColor = "rgba(124, 77, 255, 0.5)";
                                                            e.currentTarget.style.boxShadow = "0 10px 30px rgba(124, 77, 255, 0.15)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                            e.currentTarget.style.borderColor = isIdea ? "rgba(124, 77, 255, 0.2)" : "rgba(255, 255, 255, 0.05)";
                                                            e.currentTarget.style.boxShadow = isIdea ? "0 4px 20px rgba(0,0,0,0.2)" : "none";
                                                        }}
                                                    >
                                                        {isIdea ? (
                                                            <>
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "12px" }}>
                                                                    <h3 style={{ margin: 0, color: "white", fontSize: "1.2rem", lineHeight: "1.4", fontWeight: "700", letterSpacing: "-0.02em" }}>{item.title}</h3>
                                                                    <span style={{
                                                                        background: "rgba(139, 92, 246, 0.15)",
                                                                        color: "#d8b4fe",
                                                                        padding: "6px 12px",
                                                                        borderRadius: "12px",
                                                                        fontSize: "0.75rem",
                                                                        whiteSpace: "nowrap",
                                                                        fontWeight: "700",
                                                                        border: "1px solid rgba(139, 92, 246, 0.3)",
                                                                        textTransform: "uppercase",
                                                                        letterSpacing: "0.05em"
                                                                    }}>
                                                                        {item.length}
                                                                    </span>
                                                                </div>
                                                                <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", marginBottom: "20px", borderLeft: "4px solid #a855f7" }}>
                                                                    <p style={{ margin: 0, color: "#e2e8f0", fontStyle: "italic", fontSize: "1rem", lineHeight: "1.6" }}>"{item.idea}"</p>
                                                                </div>
                                                                <div style={{ marginBottom: "20px" }}>
                                                                    <h4 style={{ margin: "0 0 10px 0", color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>Why it works:</h4>
                                                                    <ul style={{ paddingLeft: "0", listStyle: "none", color: "#cbd5e1", fontSize: "0.95rem", margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                                                                        {Array.isArray(item.explanation) ? item.explanation.map((point, i) => (
                                                                            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                                                                <span style={{ color: "#a855f7", marginTop: "4px" }}>•</span>
                                                                                <span>{point}</span>
                                                                            </li>
                                                                        )) : <li>{item.explanation}</li>}
                                                                    </ul>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div style={{
                                                                whiteSpace: "pre-wrap",
                                                                lineHeight: "1.6",
                                                                color: "#e0e0e0",
                                                                fontSize: "1rem"
                                                            }}>
                                                                {formatText(typeof item === 'string' ? item : item.caption || JSON.stringify(item))}
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                let textToCopy = "";
                                                                if (isIdea) {
                                                                    textToCopy = `Video Title: ${item.title}\nLength: ${item.length}\nIdea: ${item.idea}\nExplanation:\n${Array.isArray(item.explanation) ? item.explanation.map(p => `- ${p}`).join('\n') : item.explanation}`;
                                                                } else {
                                                                    textToCopy = typeof item === 'string' ? item : item.caption || JSON.stringify(item);
                                                                }
                                                                navigator.clipboard.writeText(textToCopy);
                                                            }}
                                                            style={{
                                                                marginTop: "auto",
                                                                padding: "12px 20px",
                                                                borderRadius: "12px",
                                                                background: isIdea ? "linear-gradient(135deg, #8b5cf6, #a855f7)" : "rgba(255, 255, 255, 0.05)",
                                                                border: isIdea ? "none" : "none",
                                                                color: isIdea ? "white" : "#a855f7",
                                                                fontSize: "0.95rem",
                                                                fontWeight: "700",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s",
                                                                width: "100%",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: "8px",
                                                                boxShadow: isIdea ? "0 4px 15px rgba(139, 92, 246, 0.3)" : "none"
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (isIdea) {
                                                                    e.target.style.transform = "translateY(-2px)";
                                                                    e.target.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.4)";
                                                                } else {
                                                                    e.target.style.background = "rgba(168, 85, 247, 0.15)";
                                                                    e.target.style.color = "#c084fc";
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (isIdea) {
                                                                    e.target.style.transform = "translateY(0)";
                                                                    e.target.style.boxShadow = "0 4px 15px rgba(139, 92, 246, 0.3)";
                                                                } else {
                                                                    e.target.style.background = "rgba(255, 255, 255, 0.05)";
                                                                    e.target.style.color = "#a855f7";
                                                                }
                                                            }}
                                                        >
                                                            {isIdea ? "✨ Copy Idea" : "📋 Copy Content"}
                                                        </button>
                                                    </div>
                                                )
                                            })}
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
                                                background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
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

    // Helper to calculate credit cost
    const getCreditCost = () => {
        if (currentType === "idea") {
            const count = advancedOptions.numOutputs || 5;
            return count > 5 ? 2 : 1;
        }
        if (currentType === "post") return 2; // Image + Text
        return 1; // Tweet, Caption, VideoScript
    };

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

                            {/* Tweet & Caption: Size & Count */}
                            {(currentType === "tweet" || currentType === "caption") && (
                                <>
                                    <div style={{ width: "100%", maxWidth: "90%" }}>
                                        <label style={{ display: "block", color: "#a0a0b0", marginBottom: "12px", fontSize: "0.9rem", fontWeight: "600", textTransform: "uppercase" }}>
                                            Size (Words)
                                        </label>
                                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                            {[10, 20, 40].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => setAdvancedOptions(prev => ({ ...prev, outputSize: size }))}
                                                    style={{
                                                        padding: "10px 20px",
                                                        borderRadius: "10px",
                                                        background: advancedOptions.outputSize === size ? "linear-gradient(135deg, #8b5cf6, #ec4899)" : "rgba(255,255,255,0.05)",
                                                        border: advancedOptions.outputSize === size ? "none" : "1px solid rgba(255,255,255,0.1)",
                                                        color: "white",
                                                        fontWeight: "600",
                                                        cursor: "pointer",
                                                        flex: 1
                                                    }}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ width: "100%", maxWidth: "90%", marginTop: "16px" }}>
                                        <StyledSlider
                                            label="Number of Outputs"
                                            min={1} max={3} step={1}
                                            value={advancedOptions.numOutputs || 1}
                                            onChange={(e) => setAdvancedOptions(prev => ({ ...prev, numOutputs: parseInt(e.target.value) }))}
                                        />
                                        <div style={{ textAlign: "center", color: "#a855f7", fontSize: "0.9rem", fontWeight: "600", marginTop: "-10px" }}>
                                            {advancedOptions.numOutputs || 1}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Idea: Number of Ideas */}
                            {currentType === "idea" && (
                                <div style={{ width: "100%", maxWidth: "90%" }}>
                                    <StyledSlider
                                        label="Number of Ideas"
                                        min={1} max={10} step={1}
                                        value={advancedOptions.numOutputs || 5}
                                        onChange={(e) => setAdvancedOptions(prev => ({ ...prev, numOutputs: parseInt(e.target.value) }))}
                                    />
                                    <div style={{ textAlign: "center", color: "#a855f7", fontSize: "0.9rem", fontWeight: "600", marginTop: "-10px" }}>
                                        {(advancedOptions.numOutputs || 5) > 5 ? "2 Credits" : "1 Credit"}
                                    </div>
                                </div>
                            )}

                            {/* Common Toggles (Brand Data, Hashtags, Emojis) */}
                            {(currentType !== "post" || advancedOptions.includeBody) && (
                                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", marginTop: "20px" }}>
                                    <ToggleSwitch
                                        label="🎯 Use Brand Data"
                                        checked={advancedOptions.useBrandData}
                                        onChange={(val) => setAdvancedOptions(prev => ({ ...prev, useBrandData: val }))}
                                    />
                                    {currentType !== "idea" && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </AdvancedOptionsPanel>
                }
                generateButtonText={`Generate ${GENERATOR_TYPES.find(t => t.id === currentType)?.name} (${getCreditCost()} Credit${getCreditCost() > 1 ? 's' : ''})`}
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

