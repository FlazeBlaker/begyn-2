// src/pages/DownloadPage.jsx
import React from "react";

export default function DownloadPage() {
    const downloads = [
        {
            id: 1,
            title: "30-Day Content Calendar Template",
            description: "Plan your social media content for the entire month with this easy-to-use spreadsheet.",
            type: "Excel / Google Sheets",
            size: "1.2 MB",
            icon: "📅",
            color: "from-blue-400 to-blue-600",
            link: "https://firebasestorage.googleapis.com/v0/b/ai-social-media-19b8b.firebasestorage.app/o/downloads%2F30-Day_Content_Calendar_Premium.xlsx?alt=media&token=d8a963d1-a7dd-4b06-a826-502da963e7cc",
            disabled: false
        },
        {
            id: 2,
            title: "Ultimate Hashtag Guide 2024",
            description: "Learn how to find and use the best hashtags to explode your reach on Instagram and TikTok.",
            type: "PDF Guide",
            size: "4.5 MB",
            icon: "#️⃣",
            color: "from-purple-400 to-purple-600",
            link: "#",
            disabled: true
        },
        {
            id: 3,
            title: "Viral Hook Library",
            description: "100+ proven hooks to grab attention in the first 3 seconds of your videos.",
            type: "PDF Guide",
            size: "2.1 MB",
            icon: "🎣",
            color: "from-orange-400 to-orange-600",
            link: "#",
            disabled: true
        },
        {
            id: 4,
            title: "Reels & TikTok Script Templates",
            description: "Fill-in-the-blank scripts for educational, entertaining, and promotional videos.",
            type: "Word / Google Docs",
            size: "1.8 MB",
            icon: "🎬",
            color: "from-pink-400 to-pink-600",
            link: "#",
            disabled: true
        },
        {
            id: 5,
            title: "Canva Brand Kit Templates",
            description: "Editable templates for quotes, carousels, and stories to keep your brand consistent.",
            type: "Canva Link",
            size: "N/A",
            icon: "🎨",
            color: "from-teal-400 to-teal-600",
            link: "#",
            disabled: true
        },
        {
            id: 6,
            title: "Social Media Analytics Tracker",
            description: "Track your growth, engagement, and best-performing posts to optimize your strategy.",
            type: "Excel / Google Sheets",
            size: "1.5 MB",
            icon: "📈",
            color: "from-indigo-400 to-indigo-600",
            link: "#",
            disabled: true
        }
    ];

    return (
        <div style={{ padding: "clamp(16px, 5vw, 40px)", maxWidth: "1200px", margin: "0 auto", color: "white", minHeight: "100vh" }}>
            <div style={{ textAlign: "center", marginBottom: "clamp(30px, 8vw, 60px)" }}>
                <h1 style={{
                    fontSize: "clamp(2rem, 6vw, 3rem)",
                    fontWeight: 800,
                    marginBottom: "16px",
                    background: "linear-gradient(to right, #fff, #94a3b8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                }}>
                    Resources & Downloads
                </h1>
                <p style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)", color: "#94a3b8", maxWidth: "600px", margin: "0 auto" }}>
                    Free templates, guides, and tools to help you level up your social media game.
                </p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "clamp(20px, 4vw, 30px)"
            }}>
                {downloads.map((item) => (
                    <div
                        key={item.id}
                        className="card"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            cursor: item.disabled ? "default" : "pointer",
                            position: "relative",
                            overflow: "hidden",
                            opacity: item.disabled ? 0.7 : 1
                        }}
                    >
                        <div style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "16px",
                            background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "30px",
                            marginBottom: "20px",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                            {item.icon}
                        </div>

                        <h3 style={{ fontSize: "clamp(1.1rem, 4vw, 1.25rem)", fontWeight: 700, marginBottom: "10px", lineHeight: "1.4" }}>
                            {item.title}
                        </h3>
                        <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "20px", flex: 1 }}>
                            {item.description}
                        </p>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 600 }}>{item.type}</span>
                                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.size}</span>
                            </div>

                            {item.disabled ? (
                                <button disabled style={{
                                    background: "rgba(255,255,255,0.1)",
                                    color: "#94a3b8",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "8px 16px",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    cursor: "not-allowed",
                                    display: "flex",
                                    alignItems: "center",
                                    minHeight: "44px"
                                }}>
                                    Coming Soon
                                </button>
                            ) : (
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: 'none' }}
                                >
                                    <button style={{
                                        background: "white",
                                        color: "black",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "8px 16px",
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        minHeight: "44px"
                                    }}>
                                        <span>Download</span>
                                        <span style={{ fontSize: "1.1rem" }}>↓</span>
                                    </button>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}