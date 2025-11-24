import { useState } from "react";
import { Link } from "react-router-dom";

const TOOL_DATA = [
    { name: "Caption Generator", icon: "✨", description: "Create 3 high-quality captions with tone and hashtags.", route: "/caption-generator", isNew: true },
    { name: "Content Ideas", icon: "💡", description: "Get a list of viral-style ideas for any topic (Reels, Carousels).", route: "/idea-generator" },
    { name: "Post Generator", icon: "✍️", description: "Generate a full post with body, CTA, and image ideas.", route: "/post-generator", isNew: true },
    { name: "Video Script Writer", icon: "🎬", description: "Create structured scripts for YouTube, TikTok, and Reels.", route: "/video-script-generator" },
    { name: "Tweet Composer", icon: "🐦", description: "Generate punchy, short-form posts for Twitter/X.", route: "/tweet-generator" },
    { name: "AI Video Generation", icon: "🎥", description: "Turn text into video (Coming Soon).", route: "/video-generator", isSoon: true },
];

const styles = `
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(140,100,255,0.7); } 70% { box-shadow: 0 0 0 10px rgba(140,100,255,0); } 100% { box-shadow: 0 0 0 0 rgba(140,100,255,0); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@media (min-width: 768px) { .generator-grid { grid-template-columns: repeat(2, 1fr) !important; } }
@media (min-width: 1024px) { .generator-grid { grid-template-columns: repeat(3, 1fr) !important; } }
`;

const ToolCard = ({ tool }) => {
    const [hover, setHover] = useState(false);

    return (
        <Link
            to={tool.route}
            style={{
                background: "var(--bg-card)",
                borderRadius: "clamp(16px, 4vw, 20px)",
                border: "1px solid var(--border-color)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                padding: "clamp(20px, 5vw, 28px)",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.35s ease",
                transform: hover ? "translateY(-6px) scale(1.04)" : "translateY(0)",
                boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
                position: "relative",
                pointerEvents: tool.isSoon ? "none" : "auto",
                opacity: tool.isSoon ? 0.7 : 1,
                textDecoration: "none"
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {tool.isSoon && <div style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                background: "#fca5a5",
                color: "#450a0a"
            }}>COMING SOON</div>}

            {tool.isNew && <div style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                background: "#8b5cf6",
                color: "#fff",
                animation: "pulse 2s infinite"
            }}>NEW</div>}

            <div style={{
                fontSize: "clamp(2rem, 6vw, 2.7rem)",
                marginBottom: "14px",
                background: "linear-gradient(45deg,#8b5cf6,#4f46e5)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
            }}>
                {tool.icon}
            </div>

            <h2 style={{
                fontSize: "clamp(1.1rem, 4vw, 1.4rem)",
                fontWeight: "700",
                color: "var(--text-primary)",
                marginBottom: "8px",
            }}>
                {tool.name}
            </h2>

            <p style={{
                fontSize: "clamp(0.85rem, 3vw, 0.95rem)",
                color: tool.isSoon ? "#fca5a5" : "var(--text-secondary)",
                flexGrow: 1,
                lineHeight: 1.5,
            }}>
                {tool.description}
            </p>
        </Link>
    );
};

export default function GeneratorHub() {
    return (
        <div style={{
            padding: "clamp(20px, 5vw, 50px)",
            maxWidth: "1400px",
            margin: "0 auto",
        }}>
            <style>{styles}</style>

            <h1 style={{
                fontSize: "clamp(2rem, 6vw, 2.7rem)",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginBottom: "10px",
                letterSpacing: "-1px",
                animation: "fadeIn 0.5s ease-out",
                textAlign: "center",
                // textShadow: "0 0 20px rgba(140,100,255,0.3)", // Reduced shadow for cleaner look
            }}>
                🔥 Generator Hub
            </h1>

            <p style={{
                fontSize: "clamp(1rem, 3vw, 1.15rem)",
                color: "var(--text-secondary)",
                marginBottom: "clamp(32px, 6vw, 50px)",
                textAlign: "center",
                animation: "fadeIn 0.5s ease-out",
            }}>
                Pick a specialized AI tool to start generating amazing content instantly.
            </p>

            <div className="generator-grid" style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "clamp(16px, 4vw, 28px)",
            }}>
                {TOOL_DATA.map(tool => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    );
}
