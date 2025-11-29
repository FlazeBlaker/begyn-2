import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel,
    SelectionButton
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload";
import { auth, logUserAction, db, uploadImageToStorage } from "../services/firebase";
import { generateContent } from "../services/aiApi";

// --- CONSTANTS ---
const GENERATOR_TYPES = [
    { id: "post", name: "Post", icon: "🎨" }, // Changed icon to Palette to signify Image focus
    { id: "tweet", name: "Tweet", icon: "🐦" },
    { id: "caption", name: "Caption", icon: "✨" },
    { id: "idea", name: "Idea", icon: "💡" },
    { id: "videoScript", name: "Script", icon: "🎬" }
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
    const initialType = searchParams.get("type") || "post";

    // State
    const [currentType, setCurrentType] = useState(initialType);
    const [topic, setTopic] = useState("");
    const [generatedContent, setGeneratedContent] = useState(null); // Changed to null to handle object
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Advanced Options State
    const [advancedOptions, setAdvancedOptions] = useState({
        length: "Medium",
        language: "English",
        platform: "linkedin", // Default platform
        includeHashtags: true,
        includeEmojis: true,
        aspectRatio: "1:1",
        includeBody: false // New: Toggle for text generation in Post
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
    }, [searchParams]);

    // Auto-set platform for Tweet type
    useEffect(() => {
        if (currentType === "tweet") {
            setAdvancedOptions(prev => ({ ...prev, platform: "twitter" }));
        }
    }, [currentType]);

    // Handle Generation
    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Please enter a topic or description.");
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
                finalContent.image = imageResult.content || imageResult;

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
                        topic: topic,
                        platform: advancedOptions.platform,
                        tones: ["Professional", "Witty", "Friendly"],
                        image: selectedImage,
                        length: advancedOptions.length,
                        language: advancedOptions.language,
                        includeHashtags: advancedOptions.includeHashtags,
                        includeEmojis: advancedOptions.includeEmojis
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

    // Result Panel Content
    const renderResultPanel = () => {
        if (!generatedContent) return null;

        // generatedContent is now an object { image?, text?, imageUrl? }
        // Or string (legacy support if needed, but we switched to object)
        const content = typeof generatedContent === 'string' ? { text: generatedContent } : generatedContent;

        return (
            <div style={{ padding: "20px", color: "#000" }}>
                <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Generated Result</h3>
                    {content.image && (
                        <a
                            href={content.image}
                            download={`generated-image-${Date.now()}.png`}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", background: "#f3f4f6",
                                border: "none", cursor: "pointer", fontWeight: "600", color: "#374151",
                                textDecoration: "none", display: "inline-block"
                            }}
                        >
                            Download Image
                        </a>
                    )}
                    {content.text && !content.image && (
                        <button
                            onClick={() => navigator.clipboard.writeText(content.text)}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", background: "#f3f4f6",
                                border: "none", cursor: "pointer", fontWeight: "600", color: "#374151"
                            }}
                        >
                            Copy Text
                        </button>
                    )}
                </div>

                {content.image && (
                    <div
                        style={{ display: "flex", justifyContent: "center", background: "#f0f0f0", borderRadius: "12px", padding: "10px", marginBottom: "20px", cursor: "zoom-in" }}
                        onClick={() => {
                            setModalImage(content.image);
                            setShowImageModal(true);
                        }}
                    >
                        <img
                            src={content.image}
                            alt="Generated Result"
                            style={{ maxWidth: "100%", maxHeight: "500px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        />
                    </div>
                )}

                {content.text && (
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "1rem" }}>
                        {formatText(content.text)}
                    </div>
                )}
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
                    label: currentType === "post" ? "Describe the image you want to create" : "What should we create today?",
                    value: topic,
                    onChange: (e) => setTopic(e.target.value),
                    placeholder: currentType === "post" ? "e.g., A futuristic city with flying cars at sunset..." : "e.g., A LinkedIn post about the future of AI in marketing..."
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
