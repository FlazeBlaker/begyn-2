// src/pages/GenerateContent.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    auth,
    db,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from "../services/firebase";
import { generateContent } from "../services/aiApi";

/* ============================================================
   Responsive hook
   ============================================================ */
const useWindowWidth = () => {
    const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return width;
};

/* ============================================================
   Format helper - supports **bold** tokens
   Returns array of strings / <strong> nodes
   ============================================================ */
const formatText = (text) => {
    if (!text) return "";
    const parts = text.split("**");
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{part}</strong> : part
    );
};

/* ============================================================
   Tone options
   ============================================================ */
const TONE_OPTIONS = [
    "Friendly", "Professional", "Witty", "Cozy", "Bold",
    "Playful", "Inspirational", "Funny", "Urgent", "Calm"
];

/* ============================================================
   Tiny shared style helpers
   ============================================================ */
const shadowPurple = "0 8px 30px rgba(99, 102, 241, 0.12)";

/* ============================================================
   ToneButton - modern rounded chip
   - Accepts isSelected, onClick
   - Allows shrinking so chips wrap on small widths
   ============================================================ */
const ToneButton = ({ tone, isSelected, onClick }) => {
    const [hover, setHover] = useState(false);

    const style = useMemo(() => ({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 14px",
        borderRadius: 999,
        border: isSelected ? "1px solid rgba(140,100,255,0.95)" : "1px solid rgba(255,255,255,0.12)",
        background: isSelected ? "linear-gradient(90deg, rgba(124,58,237,0.22), rgba(168,85,247,0.22))" : "transparent",
        color: isSelected ? "#fff" : "#e8e8ee",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "transform 150ms ease, box-shadow 150ms ease, background 150ms ease",
        boxShadow: hover && isSelected ? shadowPurple : "none",
        whiteSpace: "nowrap",
        // Layout-specific: let chips wrap and shrink if needed
        flex: "0 1 auto",      // flex-grow:0, flex-shrink:1, flex-basis:auto
        minWidth: 0,
        userSelect: "none",
    }), [isSelected, hover]);

    return (
        <button
            type="button"
            aria-pressed={isSelected}
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={style}
        >
            {tone}
        </button>
    );
};

/* ============================================================
   ToneSelector - chips container with wrapping
   ============================================================ */
const ToneSelector = ({ selectedTones, onToneClick }) => {
    const container = {
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        padding: "8px 4px",
        alignItems: "center",
        width: "100%",
        boxSizing: "border-box",
    };

    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ color: "#a0a0b0", fontSize: "0.9rem", marginBottom: 8 }}>Select up to 3 tones (Optional)</div>
            <div style={container}>
                {TONE_OPTIONS.map(tone => (
                    <ToneButton
                        key={tone}
                        tone={tone}
                        isSelected={selectedTones.includes(tone)}
                        onClick={() => onToneClick(tone)}
                    />
                ))}
            </div>
        </div>
    );
};

/* ============================================================
   LoadingBubble - small typing indicator
   ============================================================ */
const LoadingBubble = () => {
    const bubbleStyle = {
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.04)",
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
    };

    const dotBase = {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "#c7c7d6",
        opacity: 0.6,
        transform: "translateY(0)",
        animation: "ld-dots 1s infinite",
    };

    return (
        <div style={{ alignSelf: "flex-start" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a0a0b0", marginBottom: 6 }}>AI Assistant</div>
            <div style={bubbleStyle}>
                <div style={{ ...dotBase, animationDelay: "0s" }} />
                <div style={{ ...dotBase, animationDelay: "0.15s" }} />
                <div style={{ ...dotBase, animationDelay: "0.3s" }} />
                <style>{`
                    @keyframes ld-dots {
                        0% { transform: translateY(0); opacity: 0.5; }
                        50% { transform: translateY(-6px); opacity: 1; }
                        100% { transform: translateY(0); opacity: 0.5; }
                    }
                `}</style>
            </div>
        </div>
    );
};

/* ============================================================
   MessageBubble - futuristic purple gradient for user + AI
   ============================================================ */
const MessageBubble = ({ message }) => {
    const isUser = message.role === "user";
    const [hover, setHover] = useState(false);
    const [copied, setCopied] = useState(false);

    const userGradient = "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #8b5cf6 100%)";
    const aiGradient = "linear-gradient(180deg, rgba(40,40,55,0.75), rgba(30,30,40,0.7))";

    const bubbleStyle = {
        background: isUser ? userGradient : aiGradient,
        color: "#fff",
        padding: "14px 18px",
        borderRadius: 16,
        maxWidth: "88%",
        alignSelf: isUser ? "flex-end" : "flex-start",
        whiteSpace: "pre-wrap",
        lineHeight: 1.6,
        boxShadow: isUser ? "0 10px 30px rgba(124,58,237,0.15)" : "0 6px 18px rgba(0,0,0,0.35)",
        border: isUser ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.02)",
        position: "relative",
        animation: "msgIn 260ms ease-out",
    };

    const roleStyle = {
        fontSize: 11,
        fontWeight: 700,
        color: isUser ? "rgba(255,255,255,0.9)" : "#b6b6c6",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    };

    const copyBtn = {
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(0,0,0,0.28)",
        border: "none",
        color: copied ? "#4ade80" : "#fff",
        padding: "6px 8px",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
        opacity: hover ? 1 : 0,
        transition: "opacity 160ms ease, transform 160ms",
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (err) {
            console.error("copy failed", err);
        }
    };

    return (
        <div
            style={bubbleStyle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-live="polite"
        >
            <div style={roleStyle}>{isUser ? "You" : "AI Assistant"}</div>
            <div>{formatText(message.content)}</div>
            {!isUser && (
                <button style={copyBtn} onClick={handleCopy} aria-label="Copy message">
                    {copied ? "Copied!" : "Copy"}
                </button>
            )}
            <style>{`
                @keyframes msgIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

/* ============================================================
   StyledInput + SendButton - glass input with floating send
   ============================================================ */
const StyledInput = ({ isMobile, value, onChange, disabled, placeholder }) => {
    const [focus, setFocus] = useState(false);

    const style = {
        flex: 1,
        padding: isMobile ? "14px 18px" : "16px 20px",
        paddingRight: isMobile ? "120px" : "140px",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        color: "#fff",
        outline: "none",
        fontSize: isMobile ? 14 : 15,
        transition: "box-shadow 180ms ease, border-color 180ms ease, transform 120ms ease",
        boxShadow: focus ? `0 8px 30px rgba(139,92,246,0.12)` : "none",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
    };

    return (
        <input
            aria-label="Message input"
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={style}
        />
    );
};

const SendButton = ({ onClick, disabled, isMobile }) => {
    const [hover, setHover] = useState(false);

    const wrapper = {
        position: "absolute",
        right: isMobile ? 8 : 12,
        top: isMobile ? 8 : 10,
        bottom: isMobile ? 8 : 10,
        display: "flex",
        alignItems: "center",
    };

    const style = {
        padding: "10px 18px",
        borderRadius: 12,
        background: hover ? "linear-gradient(90deg, #a855f7, #7c3aed)" : "linear-gradient(90deg, #7c3aed, #a855f7)",
        color: "#fff",
        border: "none",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        transform: hover && !disabled ? "translateY(-2px)" : "none",
        boxShadow: hover && !disabled ? shadowPurple : "0 6px 18px rgba(0,0,0,0.25)",
        transition: "all 160ms ease",
    };

    return (
        <div style={wrapper}>
            <button
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={style}
                aria-label="Send"
            >
                Send
            </button>
        </div>
    );
};

/* ============================================================
   Main Page: GenerateContent
   ============================================================ */
export default function GenerateContent() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedTones, setSelectedTones] = useState([]);

    const chatEndRef = useRef(null);
    const { chatId } = useParams();
    const navigate = useNavigate();
    const uid = auth.currentUser?.uid;
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;

    // Fetch messages for chat
    useEffect(() => {
        if (!uid) return;
        if (!chatId) {
            setMessages([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt"));
        const unsub = onSnapshot(q, (snap) => {
            const history = [];
            let aiResponding = false;
            snap.forEach(doc => {
                const d = doc.data();
                history.push({ id: doc.id, ...d });
                if (d.role === "assistant" && d.status === "streaming") aiResponding = true;
                // Note: your data model may vary; keep aiResponding detection as needed
            });
            setMessages(history);
            setLoading(aiResponding);
        }, (err) => {
            console.error("messages listen error", err);
            navigate("/generate");
        });
        return () => unsub();
    }, [chatId, uid, navigate]);

    // Auto-scroll when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, loading]);

    // Tone selection handler (max 3)
    const handleToneClick = useCallback((tone) => {
        setSelectedTones(prev => {
            if (prev.includes(tone)) return prev.filter(t => t !== tone);
            if (prev.length < 3) return [...prev, tone];
            return prev; // ignore if already 3
        });
    }, []);

    // Send / generate handler
    const handleGenerate = async (e) => {
        if (e) e.preventDefault();
        if (!input?.trim() || isSending) return;

        setIsSending(true);
        const topic = input.trim();
        setInput("");

        const currentUid = auth.currentUser?.uid;
        if (!currentUid) {
            alert("Please log in to continue.");
            setIsSending(false);
            return;
        }

        // user message to DB
        const userMessage = { role: "user", content: topic, createdAt: serverTimestamp() };

        // payload for AI
        const payload = { topic, tones: selectedTones, chatId: chatId || null };

        try {
            setLoading(true);
            if (!chatId) {
                // create chat then add user message
                const chatRef = collection(db, "chats");
                const newChatDoc = await addDoc(chatRef, {
                    uid: currentUid,
                    title: topic,
                    createdAt: serverTimestamp()
                });
                const newChatId = newChatDoc.id;
                const messagesRef = collection(db, "chats", newChatId, "messages");
                await addDoc(messagesRef, userMessage);

                // trigger generation with new chat id
                await generateContent({ type: "custom", payload: { ...payload, chatId: newChatId } });

                navigate(`/generate/${newChatId}`);
            } else {
                const messagesRef = collection(db, "chats", chatId, "messages");
                await addDoc(messagesRef, userMessage);

                await generateContent({ type: "custom", payload });
            }
        } catch (err) {
            console.error("generate error", err);
            setLoading(false);
        } finally {
            setIsSending(false);
        }
    };

    /* ===========================
       Layout & styles
       =========================== */
    const pageStyle = {
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 70px)",
        width: "100%",
        maxWidth: 980,
        margin: "0 auto",
        padding: isMobile ? 12 : 20,
        boxSizing: "border-box",
    };

    const containerStyle = {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 14,
    };

    const chatAreaStyle = {
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "12px" : "18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "linear-gradient(180deg, rgba(6,6,8,0.36), rgba(8,8,12,0.22))",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "inset 0 -6px 20px rgba(0,0,0,0.35)",
    };

    const inputWrapper = {
        marginTop: 8,
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
    };

    const formStyle = {
        display: "flex",
        width: "100%",
        alignItems: "center",
    };

    /* ===========================
       Render
       =========================== */
    return (
        <div style={pageStyle}>
            {/* Tone selector (top) */}
            <ToneSelector selectedTones={selectedTones} onToneClick={handleToneClick} />

            <div style={containerStyle}>
                <div style={chatAreaStyle} role="log" aria-live="polite">
                    {messages.length === 0 && !loading && (
                        <div style={{
                            textAlign: "center",
                            color: "#a0a0b0",
                            padding: 26,
                        }}>
                            <h2 style={{
                                margin: 0,
                                marginBottom: 8,
                                fontSize: 22,
                                color: "white",
                                fontWeight: 700,
                                letterSpacing: 0.2
                            }}>AI Content Studio</h2>
                            <div style={{ color: "#bfbfd8" }}>Choose a tone above and ask anything to get started.</div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <MessageBubble key={msg.id || `${msg.createdAt?.seconds || Math.random()}`} message={msg} />
                    ))}

                    {loading && <LoadingBubble />}

                    <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                <form style={formStyle} onSubmit={handleGenerate}>
                    <div style={inputWrapper}>
                        <StyledInput
                            isMobile={isMobile}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || isSending}
                            placeholder={loading ? "AI is thinking..." : "Ask me anything..."}
                        />

                        <SendButton
                            isMobile={isMobile}
                            onClick={handleGenerate}
                            disabled={loading || isSending || !input.trim()}
                        />
                    </div>
                </form>
            </div>

            {/* Small footer help */}
            <div style={{ marginTop: 10, color: "#9494a6", fontSize: 13, textAlign: "center" }}>
                Pro tip: select up to 3 tones for better tailored output.
            </div>
        </div>
    );
}
