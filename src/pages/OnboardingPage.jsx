// src/pages/OnboardingPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, doc, setDoc } from "../services/firebase";

// --- SUB-COMPONENT: Choice Card needs this too ---
const KeyframeStyles = () => (
    <style>
        {`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
    `}
    </style>
);

// --- SUB-COMPONENT: Choice Card ---
const ChoiceCard = ({ icon, title, description, onClick, isPrimary, isMobile }) => {
    const [hover, setHover] = useState(false);

    const cardStyle = {
        background: isPrimary ? "rgba(140, 100, 255, 0.3)" : "rgba(35, 35, 45, 0.5)",
        backdropFilter: "blur(15px)",
        WebkitBackdropFilter: "blur(15px)",
        border: isPrimary ? "1px solid rgba(140, 100, 255, 0.8)" : "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: isMobile ? "clamp(20px, 5vw, 30px)" : "30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        boxShadow: hover ? "0 10px 30px rgba(140, 100, 255, 0.3)" : "0 4px 15px rgba(0, 0, 0, 0.2)",
        transition: "all 0.3s ease-in-out",
        transform: hover ? "translateY(-5px)" : "translateY(0)",
        cursor: "pointer",
        flex: 1,
        minHeight: isMobile ? "auto" : "320px",
    };

    const iconStyle = {
        fontSize: isMobile ? "clamp(2.5rem, 10vw, 3rem)" : "3rem",
        marginBottom: "15px",
    };

    const titleStyle = {
        fontSize: isMobile ? "clamp(1.2rem, 5vw, 1.5rem)" : "1.5rem",
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: "10px",
        lineHeight: "1.3",
    };

    const descriptionStyle = {
        fontSize: isMobile ? "clamp(0.85rem, 3.5vw, 0.9rem)" : "0.9rem",
        color: "#a0a0b0",
        lineHeight: "1.6",
    };

    const buttonStyle = {
        marginTop: isMobile ? "16px" : "20px",
        padding: isMobile ? "14px 24px" : "12px 24px",
        background: isPrimary ? "rgba(140, 100, 255, 1)" : "rgba(255, 255, 255, 0.1)",
        color: isPrimary ? "white" : "#f0f0f0",
        borderRadius: "8px",
        border: "none",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: isPrimary ? "0 0 10px rgba(140, 100, 255, 0.5)" : "none",
        width: "100%",
        fontSize: isMobile ? "clamp(0.95rem, 4vw, 1rem)" : "1rem",
        minHeight: "48px", // Touch-friendly on mobile
    };

    return (
        <div
            style={cardStyle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={onClick}
        >
            <div style={iconStyle}>{icon}</div>
            <h2 style={titleStyle}>{title}</h2>
            <p style={descriptionStyle}>{description}</p>
            <button style={buttonStyle}>{isPrimary ? "Start Guide" : "Go to Dashboard"}</button>
        </div>
    );
};

// --- MAIN COMPONENT: OnboardingPage ---
export default function OnboardingPage({ setOnboardedStatus }) {
    const navigate = useNavigate();
    const uid = auth.currentUser?.uid;
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Handle window resize for responsive design
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Function to skip the guide and mark the user as onboarded
    const handleGoToTools = async () => {
        if (!uid) return;
        setLoading(true);

        const ref = doc(db, "brands", uid);
        try {
            await setDoc(ref, { onboarded: true }, { merge: true });
            setOnboardedStatus(true); // Update local state

            // FIX: Explicitly navigate to the dashboard
            navigate("/dashboard");
        } catch (e) {
            console.error("Failed to skip onboarding:", e);
            setLoading(false);
        }
    };

    // Function to start the guide flow
    const handleStartGuide = () => {
        if (!loading) {
            navigate("/guide/flow"); // Redirect to the first step of the guide
        }
    };

    const pageStyle = {
        padding: isMobile ? 'clamp(20px, 5vw, 40px)' : '40px',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 'clamp(24px, 6vw, 40px)' : '40px',
        minHeight: 'calc(100vh - 70px)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: loading ? 0.6 : 1,
        pointerEvents: loading ? 'none' : 'auto',
    };

    const cardContainerStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '20px' : '24px',
        width: '100%',
    };

    const titleStyle = {
        fontSize: isMobile ? 'clamp(1.8rem, 8vw, 2.5rem)' : '2.5rem',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '12px',
        textAlign: 'center',
        lineHeight: '1.2',
    };

    const subtitleStyle = {
        fontSize: isMobile ? 'clamp(1rem, 4vw, 1.2rem)' : '1.2rem',
        color: '#a0a0b0',
        marginBottom: isMobile ? '24px' : '40px',
        textAlign: 'center',
        lineHeight: '1.5',
    };

    return (
        <div style={pageStyle}>
            <KeyframeStyles />
            <h1 style={titleStyle}>Welcome to AI Content Studio!</h1>
            <p style={subtitleStyle}>
                How would you like to begin?
            </p>

            <div style={cardContainerStyle}>
                <ChoiceCard
                    icon="🚀"
                    title="Start as New Creator"
                    description="Let the AI guide you step-by-step to create your brand identity, content pillars, and a custom posting schedule. Complete the guide to earn 10 credits! (First-time only)"
                    onClick={handleStartGuide}
                    isPrimary={true}
                    isMobile={isMobile}
                />
                <ChoiceCard
                    icon="🛠️"
                    title="Go To Tools"
                    description="Skip the guide and jump straight to the dashboard and individual content generators. (Requires manual setup.)"
                    onClick={handleGoToTools}
                    isPrimary={false}
                    isMobile={isMobile}
                />
            </div>
        </div>
    );
}