// src/pages/HistoryPage.jsx
import React, { useState, useEffect } from "react";
import { db, auth } from "../services/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import ReactMarkdown from 'react-markdown';

// Helper function to format text (convert **text** to bold)
const formatText = (text) => {
    if (!text) return "";
    const parts = text.split("**");
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <strong key={index} style={{ fontWeight: "700" }}>{part}</strong>;
        }
        return part;
    });
};

export default function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                // Fetch from users/{uid}/history
                const q = query(
                    collection(db, "users", user.uid, "history"),
                    orderBy("timestamp", "desc")
                );
                const querySnapshot = await getDocs(q);
                const historyData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setHistory(historyData);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteDoc(doc(db, "users", auth.currentUser.uid, "history", id));
                setHistory(history.filter(item => item.id !== id));
            } catch (error) {
                console.error("Error deleting item:", error);
            }
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getIconForType = (type) => {
        if (!type) return '📄';
        const t = type.toLowerCase();
        if (t.includes('caption')) return '✨';
        if (t.includes('idea')) return '💡';
        if (t.includes('post')) return '📝';
        if (t.includes('hashtag')) return '#️⃣';
        if (t.includes('script')) return '🎬';
        if (t.includes('tweet')) return '🐦';
        if (t.includes('image')) return '🖼️';
        return '📄';
    };

    const handleCopy = (text, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    const handleCopyAll = (item, e) => {
        e.stopPropagation();
        const contentText = typeof item.content === 'string'
            ? item.content
            : JSON.stringify(item.content, null, 2);
        navigator.clipboard.writeText(contentText);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownloadImage = async (imageUrl, caption, e) => {
        e.stopPropagation();
        try {
            let baseFilename = caption
                ? caption.substring(0, 30)
                    .replace(/[^a-z0-9]/gi, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .toLowerCase()
                : 'post-image';
            if (!baseFilename) baseFilename = 'post-image';

            // Ensure filename always ends with .png
            const filename = baseFilename.endsWith('.png') ? baseFilename : `${baseFilename}.png`;

            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: 'image/png' });

            // Use different approach for IE/Edge vs modern browsers
            if (window.navigator.msSaveBlob) {
                window.navigator.msSaveBlob(blob, filename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                a.setAttribute('download', filename); // Explicitly set download attribute
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to download image.");
        }
    };

    const renderContent = (item) => {
        const { content, type } = item;

        // If content is a string, render it as markdown
        if (typeof content === 'string') {
            return <ReactMarkdown>{content}</ReactMarkdown>;
        }

        // If content is an object
        if (typeof content === 'object' && content !== null) {
            // Check if it's data with a results array
            if (content.results && Array.isArray(content.results)) {
                // Determine content type
                const hasImages = content.results.some(r => r.imageUrl || r.includeImage);
                const isCaption = type?.toLowerCase().includes('caption');
                const isPost = type?.toLowerCase().includes('post') || hasImages;

                if (isPost) {
                    // Render POST format
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {content.results.map((post, idx) => (
                                <div key={idx} style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                        Post {idx + 1}
                                    </strong>

                                    {post.imageUrl && (
                                        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                                            <img
                                                src={post.imageUrl}
                                                alt={`Post ${idx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '400px',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)'
                                                }}
                                            />
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '8px 12px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                color: '#fca5a5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span>⚠️</span>
                                                <span>Images will be deleted after 30 days. Make sure to download them.</span>
                                            </div>
                                        </div>
                                    )}

                                    {post.caption && (
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Caption:
                                            </div>
                                            <p style={{
                                                whiteSpace: 'pre-wrap',
                                                margin: '0',
                                                color: 'var(--text-primary)',
                                                lineHeight: '1.6'
                                            }}>
                                                {formatText(post.caption)}
                                            </p>
                                        </div>
                                    )}

                                    {post.hashtags && (
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                Hashtags:
                                            </div>
                                            <p style={{
                                                color: '#a855f7',
                                                margin: '0',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {post.hashtags}
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const text = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
                                                navigator.clipboard.writeText(text);
                                                alert('Copied!');
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                padding: '8px 16px',
                                                fontSize: '0.9rem',
                                                color: 'var(--text-primary)',
                                                fontWeight: '500'
                                            }}
                                        >
                                            📋 Copy Text
                                        </button>
                                        {post.imageUrl && (
                                            <button
                                                onClick={(e) => handleDownloadImage(post.imageUrl, post.caption, e)}
                                                style={{
                                                    background: 'rgba(140, 100, 255, 0.1)',
                                                    border: '1px solid rgba(140, 100, 255, 0.3)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    padding: '8px 16px',
                                                    fontSize: '0.9rem',
                                                    color: '#a855f7',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                ⬇️ Download Image
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                } else if (isCaption) {
                    // Render CAPTION format
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {content.results.map((captionObj, idx) => (
                                <div key={idx} style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Caption {idx + 1}</strong>
                                    <p style={{
                                        whiteSpace: 'pre-wrap',
                                        marginTop: '8px',
                                        marginBottom: '8px',
                                        color: 'var(--text-primary)',
                                        lineHeight: '1.6'
                                    }}>
                                        {formatText(captionObj.caption || captionObj)}
                                    </p>
                                    {captionObj.hashtags && (
                                        <p style={{
                                            color: '#a855f7',
                                            marginTop: '8px',
                                            marginBottom: '8px',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word'
                                        }}>
                                            {captionObj.hashtags}
                                        </p>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const text = captionObj.caption || captionObj;
                                            const fullText = captionObj.hashtags
                                                ? `${text}\n\n${captionObj.hashtags}`
                                                : text;
                                            navigator.clipboard.writeText(fullText);
                                            alert('Copied!');
                                        }}
                                        style={{
                                            marginTop: '8px',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            padding: '6px 12px',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                } else {
                    // Render TWEET format
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {content.results.map((result, idx) => (
                                <div key={idx} style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <strong>Option {idx + 1}</strong>
                                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '5px', color: 'var(--text-primary)' }}>
                                        {result.caption || result}
                                    </p>
                                    <button
                                        onClick={(e) => handleCopy(result.caption || result, e)}
                                        style={{
                                            marginTop: '5px',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                }
            }

            // Fallback for unknown format
            return (
                <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'var(--text-primary)' }}>
                    {JSON.stringify(content, null, 2)}
                </pre>
            );
        }

        return null;
    };

    return (
        <div style={{
            padding: "clamp(16px, 5vw, 40px)",
            maxWidth: "800px",
            margin: "0 auto",
            minHeight: "100vh",
            color: "var(--text-primary)"
        }}>
            <h1 style={{
                fontSize: "clamp(2rem, 6vw, 2.5rem)",
                marginBottom: "10px",
                background: "linear-gradient(90deg, var(--text-primary), #94a3b8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}>
                History
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "clamp(24px, 5vw, 40px)", fontSize: "clamp(0.9rem, 3vw, 1rem)" }}>
                Your previously generated content.
            </p>

            {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>Loading history...</div>
            ) : history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "40px", marginBottom: "16px" }}>📭</div>
                    <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>No history yet</h3>
                    <p style={{ color: "var(--text-secondary)", margin: 0 }}>Generate some content to see it here!</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {history.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => toggleExpand(item.id)}
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "16px",
                                padding: "clamp(16px, 4vw, 24px)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                position: "relative",
                                overflow: "hidden",
                                boxShadow: "var(--shadow-sm)"
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: expandedId === item.id ? "16px" : "0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{
                                        fontSize: "24px",
                                        background: "var(--bg-secondary)",
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "10px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0
                                    }}>
                                        {getIconForType(item.type)}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: "0 0 4px 0", fontSize: "clamp(1rem, 4vw, 1.1rem)", color: "var(--text-primary)" }}>
                                            {item.type ? item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Content"}
                                        </h3>
                                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                            {item.timestamp?.toDate().toLocaleDateString()} • {item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={(e) => handleCopyAll(item, e)}
                                        style={{
                                            background: copiedId === item.id ? "rgba(34, 197, 94, 0.2)" : "transparent",
                                            border: "1px solid var(--border-color)",
                                            color: copiedId === item.id ? "#4ade80" : "var(--text-primary)",
                                            cursor: "pointer",
                                            padding: "8px 12px",
                                            borderRadius: "8px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minHeight: "44px",
                                            fontSize: "0.85rem",
                                            fontWeight: "500",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {copiedId === item.id ? "✓ Copied" : "📋 Copy"}
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            padding: "8px",
                                            borderRadius: "8px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minHeight: "44px",
                                            minWidth: "44px"
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {expandedId === item.id && (
                                <div style={{
                                    borderTop: "1px solid var(--border-color)",
                                    paddingTop: "16px",
                                    marginTop: "16px",
                                    animation: "fadeIn 0.3s ease-out"
                                }}>
                                    <div style={{
                                        background: "var(--bg-input)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        fontSize: "0.95rem",
                                        lineHeight: "1.6",
                                        color: "var(--text-primary)",
                                        overflowX: "auto"
                                    }}>
                                        {renderContent(item)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}