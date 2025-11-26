import React, { useState, useEffect, useMemo } from "react";
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel,
    ToneButton
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload";
import { auth, logUserAction, db, uploadImageToStorage } from "../services/firebase";
import { generateContent } from "../services/aiApi";

// --- CONSTANTS ---
const GENERATOR_TYPES = [
    { id: "post", name: "Social Post", icon: "✍️" },
    { id: "tweet", name: "Tweet/Thread", icon: "🐦" },
    { id: "caption", name: "Caption", icon: "✨" },
    { id: "idea", name: "Content Idea", icon: "💡" },
    { id: "videoScript", name: "Video Script", icon: "🎬" }
];

const PLATFORMS = [
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "twitter", name: "Twitter/X", icon: "🐦" },
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "facebook", name: "Facebook", icon: "👥" },
    { id: "youtube", name: "YouTube", icon: "▶️" }
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

// --- HELPER: Convert to PNG ---
const convertToPng = (dataUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            console.error("Image load failed during PNG conversion", err);
            reject(err);
        };
        img.src = dataUrl;
    });
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
            Unified Content Generator
        </h1>
        <p style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)", color: "#a0a0b0", marginBottom: "24px", lineHeight: "1.6", textAlign: "center", maxWidth: "600px" }}>
            Create posts, tweets, captions, ideas, and video scripts with AI power.
        </p>
        <style>{`
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 20px rgba(140, 100, 255, 0.3); }
            }
        `}</style>
    </div>
);

// --- SUB-COMPONENT: Type Selector ---
const TypeSelector = ({ currentType, onChange }) => {
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

    const scrollContainerStyle = {
        display: "flex",
        gap: "12px",
        paddingBottom: "4px",
        flexWrap: "wrap"
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <label style={labelStyle}>
                    <span style={{ fontSize: "1.2rem" }}>🎯</span>
                    Select Generator Type
                </label>
            </div>
            <div style={scrollContainerStyle} className="custom-scrollbar">
                {GENERATOR_TYPES.map(type => (
                    <ToneButton
                        key={type.id}
                        tone={`${type.icon} ${type.name}`}
                        isSelected={currentType === type.id}
                        isDisabled={false}
                        onClick={() => onChange(type.id)}
                    />
                ))}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Script Editor Panel ---
const ScriptEditorPanel = ({ script }) => {
    const [activeTab, setActiveTab] = useState("hook");
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const text = activeTab === 'hook' ? script.hook : activeTab === 'script' ? script.script : script.cta;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const content = activeTab === 'hook' ? script.hook : activeTab === 'script' ? script.script : script.cta;

    const renderContent = (text) => {
        if (!text) return null;
        return text.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i} style={{ color: "var(--text-primary)" }}>{part}</strong> : part
        );
    };

    return (
        <div style={{
            background: "rgba(10, 10, 15, 0.3)", backdropFilter: "blur(10px)",
            borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
            animation: "fadeIn 0.5s ease-out"
        }}>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.05)" }}>
                {['hook', 'script', 'cta'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1, padding: "16px", background: activeTab === tab ? "rgba(255, 255, 255, 0.1)" : "transparent",
                            border: "none", borderBottom: activeTab === tab ? "2px solid #a855f7" : "2px solid transparent",
                            color: activeTab === tab ? "#fff" : "#a0a0b0", fontWeight: "600", cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>
            <div style={{ padding: "24px", flex: 1, overflowY: "auto", color: "#e0e0e0", lineHeight: "1.6", whiteSpace: "pre-wrap" }} className="custom-scrollbar">
                {renderContent(content)}
            </div>
            <div style={{ padding: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "right" }}>
                <button onClick={handleCopy} style={{
                    padding: "10px 20px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: copied ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.1)",
                    color: copied ? "#4ade80" : "#fff", cursor: "pointer", fontWeight: "600",
                    transition: "all 0.2s"
                }}>
                    {copied ? "Copied!" : "Copy Content"}
                </button>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Post Preview Card ---
const PostPreviewCard = ({ post, onInteract }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const text = `${post.caption || post.content}\n\n${post.hashtags || ""}`;
        await navigator.clipboard.writeText(text.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onInteract) onInteract(post, 'copy');
    };

    const handleDownload = async () => {
        if (!post.imageUrl) return;

        console.log("Starting download process for post:", post.id);

        // Create a sanitized filename
        let baseFilename = post.caption
            ? post.caption.substring(0, 30)
                .replace(/[^a-z0-9]/gi, '-')
                .replace(/-+/g, '-')
                .replace(/-+/g, '')
                .toLowerCase()
            : 'post-image';
        if (!baseFilename) baseFilename = 'post-image';
        const filename = `${baseFilename}.png`;

        try {
            let blob;

            // CASE 1 — BASE64 IMAGE
            if (post.imageUrl.startsWith("data:image")) {
                const base64 = post.imageUrl.split(",")[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);

                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }

                blob = new Blob([bytes], { type: "image/png" });

            }
            // CASE 2 — REMOTE STORAGE URL
            else {
                const response = await fetch(post.imageUrl);
                const arrayBuffer = await response.arrayBuffer();
                blob = new Blob([arrayBuffer], { type: "image/png" });
            }

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 80);

            if (onInteract) onInteract(post, 'download');

        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to download image. Please try right-clicking and 'Save Image As'.");
        }
    };


    return (
        <div style={{
            background: "rgba(10, 10, 15, 0.3)",
            backdropFilter: "blur(5px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.7s ease-out",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)"
        }}>
            {post.title && (
                <div style={{ padding: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "white", fontWeight: "600" }}>
                    {post.title}
                </div>
            )}

            {post.includeImage && (
                <div style={{
                    minHeight: "clamp(200px, 40vw, 300px)",
                    background: "rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    position: "relative"
                }}>
                    {post.imageUrl ? (
                        <img
                            src={post.imageUrl}
                            alt="AI Generated"
                            style={{ width: "100%", height: "auto", display: "block" }}
                        />
                    ) : post.error ? (
                        <div style={{ textAlign: "center", color: "#ef4444", padding: "20px" }}>
                            <div style={{ fontSize: "30px", marginBottom: "10px" }}>⚠️</div>
                            <p style={{ fontSize: "0.9rem" }}>Image generation failed.</p>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", color: "#a0a0b0", padding: "20px" }}>
                            <div style={{
                                width: "30px", height: "30px",
                                border: "3px solid rgba(140, 100, 255, 0.3)",
                                borderTopColor: "#a855f7",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                                margin: "0 auto 15px"
                            }} />
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            <p style={{ fontSize: "0.9rem" }}>Generating AI Image...</p>
                            <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>(Powered by Nano Banana 🍌)</p>
                        </div>
                    )}
                </div>
            )}

            <div style={{ padding: "20px", color: "#e0e0e0", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap", flexGrow: 1 }}>
                {formatText(post.caption || post.content)}
            </div>

            {post.hashtags && (
                <div style={{ padding: "0 20px 20px", color: "#a0a0b0", fontSize: "0.9rem", fontStyle: "italic" }}>
                    {post.hashtags}
                </div>
            )}

            <div style={{ padding: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                    onClick={handleCopy}
                    style={{
                        flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", border: "none",
                        background: copied ? "#22c55e" : "rgba(140, 100, 255, 0.8)",
                        color: "white", transition: "all 0.2s",
                        minHeight: "44px",
                        minWidth: "120px"
                    }}
                >
                    {copied ? "Copied!" : "Copy Text"}
                </button>
                {post.includeImage && post.imageUrl && (
                    <button
                        onClick={handleDownload}
                        style={{
                            flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "600",
                            background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white",
                            transition: "all 0.2s",
                            minHeight: "44px",
                            minWidth: "120px"
                        }}
                    >
                        Download Image
                    </button>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT: Generators ---
export default function Generators() {
    const [generatorType, setGeneratorType] = useState("post");
    const [idea, setIdea] = useState("");
    const [selectedTones, setSelectedTones] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // State variables
    const [result, setResult] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [autoSave, setAutoSave] = useState(true);
    const [useBrandData, setUseBrandData] = useState(false);

    // Define advancedOptions state
    const [advancedOptions, setAdvancedOptions] = useState({
        numVariations: 1,
        includeImage: true,
        includeHashtags: true,
        includeCTA: true,
        videoLength: "180",
        platform: "linkedin"
    });

    // Calculate credit cost dynamically
    const creditCost = useMemo(() => {
        if (generatorType === 'videoScript') return selectedImage ? 2 : 1;
        if (generatorType === 'idea') return 1;
        if (generatorType === 'tweet') return advancedOptions.numVariations; // 1 credit per tweet variation

        let cost = advancedOptions.numVariations; // 1 credit per post text variation
        if (advancedOptions.includeImage) {
            cost += advancedOptions.numVariations * 1; // 1 credit per smart image
        }
        return cost;
    }, [generatorType, advancedOptions.numVariations, advancedOptions.includeImage, selectedImage]);

    // Fetch user's auto-save preference
    useEffect(() => {
        const fetchPreferences = async () => {
            const uid = auth.currentUser?.uid;
            if (uid) {
                try {
                    const { getDoc, doc } = await import("firebase/firestore");
                    const userDoc = await getDoc(doc(db, "users", uid));
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

    // Reset result and update options when type changes
    useEffect(() => {
        setResult(null);
        setError("");

        // Completely reset options based on type (not merge)
        if (generatorType === 'tweet') {
            setAdvancedOptions({
                numVariations: 1,
                includeImage: false,
                includeHashtags: true,
                includeCTA: true,
                videoLength: "180",
                platform: 'twitter'
            });
        } else if (generatorType === 'videoScript') {
            setAdvancedOptions({
                numVariations: 1,
                includeImage: false,
                includeHashtags: true,
                includeCTA: true,
                videoLength: "180",
                platform: 'linkedin'
            });
        } else if (generatorType === 'idea') {
            setAdvancedOptions({
                numVariations: 5,
                includeImage: false,
                includeHashtags: true,
                includeCTA: true,
                videoLength: "180",
                platform: 'linkedin'
            });
        } else if (generatorType === 'caption') {
            setAdvancedOptions({
                numVariations: 1,
                includeImage: true,
                includeHashtags: true,
                includeCTA: true,
                videoLength: "180",
                platform: 'linkedin'
            });
        } else {
            // Post generator (default)
            setAdvancedOptions({
                numVariations: 1,
                includeImage: true,
                includeHashtags: true,
                includeCTA: true,
                videoLength: "180",
                platform: 'linkedin'
            });
        }
    }, [generatorType]);

    const handleInteract = async (post, action) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        let finalImageUrl = post.imageUrl;

        // If image is base64, upload it now (on interaction)
        if (post.imageUrl && post.imageUrl.startsWith('data:')) {
            try {
                const storageUrl = await uploadImageToStorage(uid, post.imageUrl);
                if (storageUrl) {
                    finalImageUrl = storageUrl;
                    // Update local state to prevent re-upload
                    setResult(prev => Array.isArray(prev) ? prev.map(p => p.id === post.id ? { ...p, imageUrl: storageUrl } : p) : prev);
                }
            } catch (err) {
                console.error("Upload failed during interaction:", err);
            }
        }

        // If auto-save is OFF, we save to history on manual interaction
        if (!autoSave) {
            try {
                await logUserAction(uid, 'generate_post', {
                    source: 'PostGenerator',
                    detail: idea || "Generated Post",
                    numVariations: 1,
                    includeImage: post.includeImage,
                    results: [{ ...post, imageUrl: finalImageUrl }],
                    savedFromAction: action
                });
                console.log(`Manual save triggered by ${action}`);
            } catch (err) {
                console.error("Manual save failed:", err);
            }
        }
    };

    const handleGenerate = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setError("You must be logged in.");
            return;
        }
        if (!idea && !selectedImage) {
            setError("Please enter an idea/title or upload an image.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            let apiType = generatorType;
            let payload = {
                topic: idea,
                tones: selectedTones,
                image: selectedImage,
                platform: advancedOptions.platform,
                useBrandData: useBrandData,
                options: advancedOptions
            };

            // Map UI types to API types if needed
            if (generatorType === 'post') apiType = 'post';
            if (generatorType === 'tweet') apiType = 'tweet';
            if (generatorType === 'caption') apiType = 'caption';
            if (generatorType === 'idea') apiType = 'idea';
            if (generatorType === 'videoScript') apiType = 'videoScript';

            const rawResult = await generateContent({ type: apiType, payload });

            // --- PROCESS RESULT BASED ON TYPE ---

            if (generatorType === 'videoScript') {
                // Parse Video Script
                const hookMatch = rawResult.match(/Hook:\s*([\s\S]*?)(?=Intro:|Main Content:|CTA:|$)/i);
                const scriptMatch = rawResult.match(/Main Content:\s*([\s\S]*?)(?=CTA:|$)/i);
                const ctaMatch = rawResult.match(/CTA:\s*([\s\S]*?)(?=$)/i);
                const introMatch = rawResult.match(/Intro:\s*([\s\S]*?)(?=Main Content:|CTA:|$)/i);

                const scriptData = {
                    hook: hookMatch ? hookMatch[1].trim() : "Could not parse Hook.",
                    script: (introMatch ? "**Intro:**\n" + introMatch[1].trim() + "\n\n" : "") + (scriptMatch ? scriptMatch[1].trim() : rawResult),
                    cta: ctaMatch ? ctaMatch[1].trim() : "Could not parse CTA."
                };
                setResult(scriptData);

                if (autoSave) await logUserAction(uid, 'generate_video_script', { source: 'Unified', detail: idea, results: scriptData });

            } else if (generatorType === 'idea') {
                // Parse Ideas (Assuming list format)
                const ideas = rawResult.split(/\n\d+\.\s+/).filter(i => i.trim()).map((content, i) => ({
                    id: i,
                    content: content.trim(),
                    includeImage: false
                }));
                setResult(ideas);
                if (autoSave) await logUserAction(uid, 'generate_ideas', { source: 'Unified', detail: idea, results: ideas });

            } else {
                // Post, Tweet, Caption (Standard Array Format)
                let posts = [];

                // Parse text response
                const lines = rawResult.split('\n').filter(l => l.trim());
                let caption = '';
                let hashtags = '';
                const hashtagIndex = lines.findIndex(line => line.trim().startsWith('#'));

                if (hashtagIndex !== -1) {
                    caption = lines.slice(0, hashtagIndex).join('\n').trim();
                    hashtags = lines.slice(hashtagIndex).join(' ').trim();
                } else {
                    caption = rawResult.trim();
                }

                // Create initial posts
                posts = Array.from({ length: advancedOptions.numVariations }, (_, i) => ({
                    id: i,
                    title: `Option ${i + 1}`,
                    caption: caption, // Note: This duplicates the same caption for all variations if API returns one string. 
                    // Ideally, API should return multiple variations if requested.
                    // For now, we'll assume single generation repeated or handle it if API returns JSON.
                    hashtags: hashtags,
                    imageUrl: null,
                    includeImage: advancedOptions.includeImage,
                    error: null
                }));

                // If API returns JSON array (for multiple variations), use that
                if (typeof rawResult === 'string' && (rawResult.startsWith('[') || rawResult.startsWith('{'))) {
                    try {
                        const parsed = JSON.parse(rawResult);
                        if (Array.isArray(parsed)) {
                            posts = parsed.map((p, i) => ({
                                id: i,
                                title: `Option ${i + 1}`,
                                caption: p.content || p.caption || p,
                                hashtags: p.hashtags || "",
                                imageUrl: null,
                                includeImage: advancedOptions.includeImage
                            }));
                        }
                    } catch (e) {
                        // Fallback to string parsing above
                    }
                }

                setResult(posts);

                // Image Generation for Posts
                if (advancedOptions.includeImage && (generatorType === 'post' || generatorType === 'caption')) {
                    const imagePromises = posts.map(async (post, i) => {
                        try {
                            const imageUrlResult = await generateContent({
                                type: "smartImage",
                                payload: {
                                    topic: idea,
                                    platform: advancedOptions.platform,
                                    tones: selectedTones,
                                    image: selectedImage,
                                    // YouTube-specific thumbnail parameters
                                    aspectRatio: advancedOptions.platform === 'youtube' ? '16:9' : '1:1',
                                    faceOverlay: advancedOptions.platform === 'youtube' && selectedImage ? true : false,
                                    facePosition: 'bottom-left'
                                }
                            });

                            let imageUrl = imageUrlResult.result || imageUrlResult || null;

                            if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('data:')) {
                                imageUrl = `data:image/png;base64,${imageUrl}`;
                            }

                            try {
                                imageUrl = await convertToPng(imageUrl);
                            } catch (pngErr) {
                                console.warn("PNG conversion failed:", pngErr);
                            }

                            // Auto-upload
                            if (autoSave && uid) {
                                try {
                                    const storageUrl = await uploadImageToStorage(uid, imageUrl);
                                    if (storageUrl) imageUrl = storageUrl;
                                } catch (e) { console.error("Auto-upload failed", e); }
                            }
                            return { ...post, imageUrl };
                        } catch (e) {
                            console.error("Image gen failed", e);
                            return { ...post, error: "Image generation failed" };
                        }
                    });
                    const postsWithImages = await Promise.all(imagePromises);
                    setResult(postsWithImages);
                    posts = postsWithImages;
                }

                if (autoSave) await logUserAction(uid, `generate_${generatorType}`, { source: 'Unified', detail: idea, results: posts });
            }

        } catch (err) {
            console.error("Generation Error:", err);
            setError("Failed to generate content. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <GeneratorLayout
            header={<PageHeader />}
            topic={{
                label: generatorType === 'videoScript' ? "What is your video about?" : "What is your post idea or title?",
                placeholder: generatorType === 'videoScript' ? "e.g. 'How to bake a cake in 5 minutes'" : "e.g., 'Cheapest vs Most Expensive Car', 'Viral News: Cat Rescued'",
                value: idea,
                onChange: (e) => setIdea(e.target.value),
                selectedTones: selectedTones,
                handleToneClick: (t) => setSelectedTones(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
            }}
            typeSelector={
                <TypeSelector currentType={generatorType} onChange={setGeneratorType} />
            }
            imageUploadComponent={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <ImageUpload
                        selectedImage={selectedImage}
                        onImageChange={setSelectedImage}
                    />
                </div>
            }
            advancedOptionsPanel={
                <AdvancedOptionsPanel open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)}>

                    {/* Platform Selector (Only for Post) */}
                    {generatorType === 'post' && (
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", color: "#a0a0b0", fontSize: "0.9rem", marginBottom: "8px", fontWeight: "500" }}>Platform</label>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {PLATFORMS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setAdvancedOptions(prev => ({ ...prev, platform: p.id }))}
                                        style={{
                                            padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)",
                                            background: advancedOptions.platform === p.id ? "#a855f7" : "rgba(255,255,255,0.05)",
                                            color: advancedOptions.platform === p.id ? "#fff" : "#a0a0b0",
                                            cursor: "pointer", fontSize: "0.8rem",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {p.icon} {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Video Length (Only for Video Script) */}
                    {generatorType === 'videoScript' && (
                        <div style={{ marginBottom: "16px" }}>
                            <StyledSlider
                                label={`Video Length: ${advancedOptions.videoLength === "60" ? "Short (~1m)" : advancedOptions.videoLength === "300" ? "Long (~5m)" : "Medium (~3m)"}`}
                                min={60} max={300} step={120}
                                value={parseInt(advancedOptions.videoLength)}
                                onChange={e => setAdvancedOptions(prev => ({ ...prev, videoLength: e.target.value.toString() }))}
                            />
                        </div>
                    )}

                    {/* Num Variations (Only for Idea/Post/Caption/Tweet) */}
                    {(generatorType === 'post' || generatorType === 'caption' || generatorType === 'idea' || generatorType === 'tweet') && (
                        <StyledSlider
                            label={`Variations: ${advancedOptions.numVariations}`}
                            min={1} max={generatorType === 'idea' ? 10 : 3} step={1}
                            value={advancedOptions.numVariations}
                            onChange={e => setAdvancedOptions({ ...advancedOptions, numVariations: parseInt(e.target.value) })}
                        />
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                        <ToggleSwitch
                            label="Use Brand Data 🏷️"
                            checked={useBrandData}
                            onChange={setUseBrandData}
                        />

                        {generatorType === 'post' && (
                            <>
                                <ToggleSwitch
                                    label="Generate AI Image (Smart Logic 🧠)"
                                    checked={advancedOptions.includeImage}
                                    onChange={c => setAdvancedOptions({ ...advancedOptions, includeImage: c })}
                                />
                                <ToggleSwitch
                                    label="Include Hashtags"
                                    checked={advancedOptions.includeHashtags}
                                    onChange={c => setAdvancedOptions({ ...advancedOptions, includeHashtags: c })}
                                />
                                <ToggleSwitch
                                    label="Include Call-to-Action"
                                    checked={advancedOptions.includeCTA}
                                    onChange={c => setAdvancedOptions({ ...advancedOptions, includeCTA: c })}
                                />
                            </>
                        )}
                    </div>
                </AdvancedOptionsPanel>
            }
            generateButtonText={`Generate ${GENERATOR_TYPES.find(t => t.id === generatorType)?.name} (${creditCost} Credits)`}
            loading={loading}
            handleGenerate={handleGenerate}
            error={error}
            resultPanel={
                result && (
                    <div>
                        <h2 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: "600", color: "#ffffff", marginBottom: "24px", animation: "fadeIn 0.5s ease-out" }}>
                            Your Generated {GENERATOR_TYPES.find(t => t.id === generatorType)?.name}
                        </h2>

                        {generatorType === 'videoScript' ? (
                            <ScriptEditorPanel script={result} />
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                                {Array.isArray(result) && result.map(post => (
                                    <PostPreviewCard
                                        key={post.id}
                                        post={post}
                                        onInteract={handleInteract}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
            maxWidth="1200px"
        />
    );
}
