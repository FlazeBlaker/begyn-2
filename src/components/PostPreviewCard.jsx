import React, { useState } from "react";

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
            {post.title && (
                <div style={{ padding: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "white", fontWeight: "600" }}>
                    {post.title}
                </div>
            )}

            {(post.includeImage || post.imageUrl) && (
                <div style={{
                    width: "100%",
                    maxHeight: "450px",
                    background: "rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    {post.imageUrl ? (
                        <img
                            src={post.imageUrl}
                            alt="AI Generated"
                            style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }}
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
                {(post.includeImage || post.imageUrl) && post.imageUrl && (
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

export default PostPreviewCard;
