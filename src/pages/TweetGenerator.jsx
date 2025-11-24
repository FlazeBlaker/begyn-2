// src/pages/TweetGenerator.jsx

import { useState, useMemo, useEffect } from "react";
import GeneratorLayout, {
    StyledSlider,
    ToggleSwitch,
    AdvancedOptionsPanel
} from "../components/GeneratorLayout";
import ImageUpload from "../components/ImageUpload";
import { auth, logUserAction, db } from "../services/firebase";
import { generateContent } from "../services/aiApi";
import { doc, getDoc } from "firebase/firestore";

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
            🐦
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
            Tweet (X) Generator
        </h1>
        <p style={{ fontSize: "clamp(0.95rem, 3vw, 1.1rem)", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: "1.6", textAlign: "center", maxWidth: "600px" }}>
            Generate short, punchy, and viral-style tweets.
            Just provide a topic, and I'll write a thread of options.
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

// --- SUB-COMPONENT: Result Card ---
const ResultCard = ({ title, caption, hashtags }) => {
    const [copied, setCopied] = useState(false);
    const [hover, setHover] = useState(false);

    const cardStyle = useMemo(() => ({
        background: "var(--bg-card)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        borderRadius: "16px",
        border: "1px solid var(--border-color)",
        animation: "fadeIn 0.7s ease-out",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease-in-out",
        transform: hover ? "scale(1.02)" : "scale(1)",
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
    }), [hover]);

    const handleCopy = async () => {
        const uid = auth.currentUser?.uid;
        let textToCopy = caption;
        if (hashtags) {
            textToCopy += `\n\n${hashtags}`;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            if (uid) {
                await logUserAction(uid, 'copy', {
                    source: 'TweetGenerator',
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

    const titleStyle = { fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" };
    const contentStyle = { padding: "20px", color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.7", whiteSpace: "pre-wrap", flexGrow: 1 };
    const hashtagStyle = { padding: "0 20px 20px 20px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6", fontStyle: "italic" };
    const headerStyle = { padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" };
    const copyButtonStyle = {
        border: "1px solid var(--border-color)", color: copied ? "#4ade80" : "var(--text-primary)", padding: "8px 12px", borderRadius: "6px",
        cursor: "pointer", fontSize: "0.85rem", fontWeight: "500", transition: "all 0.2s ease-in-out",
        background: hover ? "var(--bg-hover)" : "transparent",
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
            <div style={contentStyle}>{caption}</div>
            {hashtags && <div style={hashtagStyle}>{hashtags}</div>}
        </div>
    );
};


// --- MAIN COMPONENT: TweetGenerator ---
export default function TweetGenerator() {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState([]);
    const [selectedTones, setSelectedTones] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({
        numTweets: 3,
        includeHashtags: true,
        includeEmojis: true,
        includeCTA: false,
    });

    // Auto-save preference state
    const [autoSave, setAutoSave] = useState(true);

    useEffect(() => {
        const fetchPreferences = async () => {
            const uid = auth.currentUser?.uid;
            if (uid) {
                try {
                    const userDoc = await getDoc(doc(db, "users", uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        // Default to true if not set
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
            setError("Please enter a topic or upload an image for your tweets.");
            return;
        }

        setLoading(true);
        setError("");
        setResult([]);

        try {
            // Call API
            const responseText = await generateContent({
                type: "tweet",
                payload: {
                    topic: topic,
                    tones: selectedTones,
                    image: selectedImage,
                    options: { ...advancedOptions }
                }
            });

            // Parse the numbered list response
            const tweets = [];
            const lines = responseText.split(/\n+/);
            const regex = /^\d+[\.\)]\s*/;

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                if (regex.test(line)) {
                    const cleanLine = line.replace(regex, "");
                    tweets.push(cleanLine);
                } else if (tweets.length > 0) {
                    tweets[tweets.length - 1] += "\n" + line;
                }
            }

            const formattedResults = tweets.map((text, index) => {
                let caption = text;
                let hashtags = "";
                return {
                    id: index + 1,
                    title: `Tweet Option ${index + 1}`,
                    caption: caption,
                    hashtags: hashtags
                };
            });

            setResult(formattedResults);
            setLoading(false);

            // Auto-save logic: Only save if autoSave is enabled
            if (autoSave) {
                await logUserAction(uid, 'generate_tweet', {
                    source: 'TweetGenerator',
                    detail: `Generated ${formattedResults.length} tweets for topic: ${topic}`,
                    topic: topic,
                    tones: selectedTones,
                    hasImage: !!selectedImage,
                    options: advancedOptions,
                    results: formattedResults // Save the actual results too
                });
            }

        } catch (err) {
            console.error("Generation Error:", err);
            setError("Failed to generate tweets. Please try again.");
            setLoading(false);
        }
    };

    // --- Advanced Options Content ---
    const getTweetLabel = (value) => `${value} Tweet${value > 1 ? 's' : ''}`;

    const AdvancedOptionsContent = (
        <>
            <StyledSlider
                label={`Number of Tweets: ${getTweetLabel(advancedOptions.numTweets)}`}
                min={3} max={10} step={1}
                value={advancedOptions.numTweets}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, numTweets: parseInt(e.target.value, 10) }))}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <ToggleSwitch
                    label="Include Hashtags"
                    checked={advancedOptions.includeHashtags}
                    onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, includeHashtags: isChecked }))}
                />
                <ToggleSwitch
                    label="Include Emojis"
                    checked={advancedOptions.includeEmojis}
                    onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, includeEmojis: isChecked }))}
                />
                <ToggleSwitch
                    label="Include Call-to-Action (CTA)"
                    checked={advancedOptions.includeCTA}
                    onChange={(isChecked) => setAdvancedOptions(prev => ({ ...prev, includeCTA: isChecked }))}
                />
            </div>
        </>
    );

    // --- Final Result Panel ---
    const ResultsPanel = result.length > 0 && (
        <div>
            <h2 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: "600", color: "var(--text-primary)", marginBottom: "24px", animation: "fadeIn 0.5s ease-out" }}>Your Generated Tweets</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                {result.map((post) => (
                    <ResultCard
                        key={post.id}
                        title={post.title}
                        caption={post.caption}
                        hashtags={post.hashtags}
                    />
                ))}
            </div>
        </div>
    );

    // Credit Calculation: 1 credit per 3 tweets, +1 if image is used
    const baseCost = Math.ceil(advancedOptions.numTweets / 3);
    const imageCost = selectedImage ? 1 : 0;
    const creditCost = baseCost + imageCost;

    return (
        <GeneratorLayout
            header={<PageHeader />}
            topic={{
                label: "What is your tweet about?",
                placeholder: "e.g., 'React vs. Svelte', 'The future of AI', 'My productivity hack'",
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
            generateButtonText={`Generate Tweets (${creditCost} Credit${creditCost > 1 ? 's' : ''})`}
            loading={loading}
            handleGenerate={handleGenerate}
            error={error}
            resultPanel={ResultsPanel}
            maxWidth="1200px"
        />
    );
}