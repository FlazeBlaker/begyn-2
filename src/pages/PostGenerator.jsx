import React, { useState, useEffect } from "react";
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload";
import { auth, logUserAction, db, uploadImageToStorage } from "../services/firebase";
import { generateContent } from "../services/aiApi";

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
            ✍️ Smart Post Generator
        </h1>
        <p style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)", color: "#a0a0b0", marginBottom: "24px", lineHeight: "1.6", textAlign: "center", maxWidth: "600px" }}>
            Generate complete, ready-to-use social media posts. I'll write the copy
            and generate a **Hyper-Relevant AI Image** based on your inputs.
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

// --- SUB-COMPONENT: Post Preview Card ---
const PostPreviewCard = ({ post, onInteract }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const text = `${post.caption}\n\n${post.hashtags}`;
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
                .replace(/^-|-$/g, '')
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
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "white", fontWeight: "600" }}>
                {post.title}
            </div>

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
                {formatText(post.caption)}
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

// --- MAIN COMPONENT: PostGenerator ---
export default function PostGenerator() {
    const [platform, setPlatform] = useState("YouTube Thumbnail");
    const [idea, setIdea] = useState("");
    const [selectedTones, setSelectedTones] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // State variables
    const [result, setResult] = useState([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [autoSave, setAutoSave] = useState(true);
    const [useBrandData, setUseBrandData] = useState(false);

    // Define advancedOptions state
    const [advancedOptions, setAdvancedOptions] = useState({
        numVariations: 1,
        includeImage: true,
        includeHashtags: true,
        includeCTA: true
    });

    // Define the platforms list
    const platforms = [
        "YouTube Thumbnail",
        "Instagram Post",
        "Story",
        "Facebook Post",
        "LinkedIn"
    ];

    // Calculate credit cost dynamically
    const creditCost = React.useMemo(() => {
        let cost = advancedOptions.numVariations; // 1 credit per post text variation
        if (advancedOptions.includeImage) {
            cost += advancedOptions.numVariations * 1; // 1 credit per smart image
        }
        return cost;
    }, [advancedOptions.numVariations, advancedOptions.includeImage]);

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
                    setResult(prev => prev.map(p => p.id === post.id ? { ...p, imageUrl: storageUrl } : p));
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
        setResult([]);

        try {
            // Step 1: Generate text content
            const rawResponse = await generateContent({
                type: "post",
                payload: {
                    topic: idea,
                    platform: platform,
                    tones: selectedTones,
                    image: selectedImage,
                    useBrandData: useBrandData,
                    options: {
                        numVariations: advancedOptions.numVariations,
                        includeImage: advancedOptions.includeImage,
                        includeHashtags: advancedOptions.includeHashtags,
                        includeCTA: advancedOptions.includeCTA
                    }
                }
            });

            // Parse text response
            const lines = rawResponse.split('\n').filter(l => l.trim());
            let caption = '';
            let hashtags = '';
            const hashtagIndex = lines.findIndex(line => line.trim().startsWith('#'));

            if (hashtagIndex !== -1) {
                caption = lines.slice(0, hashtagIndex).join('\n').trim();
                hashtags = lines.slice(hashtagIndex).join(' ').trim();
            } else {
                caption = rawResponse.trim();
            }

            // Create initial posts
            let currentPosts = Array.from({ length: advancedOptions.numVariations }, (_, i) => ({
                id: i,
                title: `Option ${i + 1}`,
                caption: caption,
                hashtags: hashtags,
                imageUrl: null,
                includeImage: advancedOptions.includeImage,
                error: null
            }));

            setResult(currentPosts);

            // Step 2: Generate images if needed (PARALLEL OPTIMIZATION)
            if (advancedOptions.includeImage) {
                const imagePromises = currentPosts.map(async (post, i) => {
                    try {
                        const imageUrlResult = await generateContent({
                            type: "smartImage",
                            payload: {
                                topic: idea,
                                platform: platform,
                                tones: selectedTones,
                                image: selectedImage
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

                        // If Auto-Save is ON, upload to Storage immediately
                        if (autoSave && uid) {
                            try {
                                const storageUrl = await uploadImageToStorage(uid, imageUrl);
                                if (storageUrl) {
                                    imageUrl = storageUrl;
                                }
                            } catch (uploadErr) {
                                console.error("Auto-upload failed:", uploadErr);
                            }
                        }

                        return { ...post, imageUrl: imageUrl };

                    } catch (imgErr) {
                        console.error(`Image generation failed for post ${i + 1}:`, imgErr);
                        return { ...post, error: "Image generation failed" };
                    }
                });

                // Wait for all image generations to complete
                const postsWithImages = await Promise.all(imagePromises);
                setResult(postsWithImages);

                // Update currentPosts for the final auto-save
                currentPosts = postsWithImages;
            }

            setLoading(false);

            // Auto-save if enabled
            if (autoSave) {
                try {
                    await logUserAction(uid, 'generate_post', {
                        source: 'PostGenerator',
                        detail: idea,
                        numVariations: advancedOptions.numVariations,
                        includeImage: advancedOptions.includeImage,
                        results: currentPosts
                    });
                } catch (saveErr) {
                    console.error("Auto-save failed:", saveErr);
                }
            }

        } catch (err) {
            console.error("Generation Error:", err);
            setError("Failed to generate posts. Please try again.");
            setLoading(false);
        }
    };

    return (
        <GeneratorLayout
            header={<PageHeader />}
            topic={{
                label: "What is your post idea or title?",
                placeholder: "e.g., 'Cheapest vs Most Expensive Car', 'Viral News: Cat Rescued'",
                value: idea,
                onChange: (e) => setIdea(e.target.value),
                selectedTones: selectedTones,
                handleToneClick: (t) => setSelectedTones(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
            }}
            imageUploadComponent={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: '#a0a0b0', fontSize: '0.9rem', fontWeight: '500' }}>Platform</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {platforms.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPlatform(p)}
                                    style={{
                                        background: platform === p ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.05)',
                                        border: platform === p ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                        fontWeight: platform === p ? '600' : '400'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ImageUpload
                        selectedImage={selectedImage}
                        onImageChange={setSelectedImage}
                    />
                </div>
            }
            advancedOptionsPanel={
                <AdvancedOptionsPanel open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)}>
                    <StyledSlider
                        label={`Variations: ${advancedOptions.numVariations}`}
                        min={1} max={3} step={1}
                        value={advancedOptions.numVariations}
                        onChange={e => setAdvancedOptions({ ...advancedOptions, numVariations: parseInt(e.target.value) })}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                        <ToggleSwitch
                            label="Use Brand Data 🏷️"
                            checked={useBrandData}
                            onChange={setUseBrandData}
                        />
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
                    </div>
                </AdvancedOptionsPanel>
            }
            generateButtonText={`Generate ${advancedOptions.numVariations} Post${advancedOptions.numVariations > 1 ? 's' : ''} (${creditCost} Credits)`}
            loading={loading}
            handleGenerate={handleGenerate}
            error={error}
            resultPanel={
                result.length > 0 && (
                    <div>
                        <h2 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: "600", color: "#ffffff", marginBottom: "24px", animation: "fadeIn 0.5s ease-out" }}>Your Generated Posts</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                            {result.map(post => (
                                <PostPreviewCard
                                    key={post.id}
                                    post={post}
                                    onInteract={handleInteract}
                                />
                            ))}
                        </div>
                    </div>
                )
            }
            maxWidth="1200px"
        />
    );
}
