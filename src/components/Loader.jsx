// src/components/Loader.jsx
export default function Loader({ isAi = false }) {
    // --- Styles ---

    // This is the AI typing bubble style
    const bubbleStyle = {
        background: "rgba(35, 35, 45, 0.8)", // Dark glass for AI
        color: "white",
        padding: "14px 20px",
        borderRadius: "16px",
        maxWidth: "75%",
        alignSelf: "flex-start",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
    };

    const roleStyle = {
        fontSize: "0.8rem",
        fontWeight: "700",
        color: "#a0a0b0",
        marginBottom: "6px",
        textTransform: "uppercase"
    };

    const dotStyle = {
        height: "8px",
        width: "8px",
        background: "#a0a0b0",
        borderRadius: "50%",
        margin: "0 3px",
        animation: "typing 1.4s infinite",
    };

    const dot1Style = { ...dotStyle, animationDelay: "0s" };
    const dot2Style = { ...dotStyle, animationDelay: "0.2s" };
    const dot3Style = { ...dotStyle, animationDelay: "0.4s" };

    // Generic full-page loader
    const pageLoaderStyle = {
        padding: "40px",
        textAlign: "center",
        color: "#a0a0b0",
        fontSize: "1.2rem",
        fontWeight: "500",
    };

    return (
        <>
            {/* This adds the <style> tag to the head for the animation */}
            <style>
                {`
        @keyframes typing {
          0% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
          100% { opacity: 0.2; transform: translateY(0); }
        }
        `}
            </style>

            {isAi ? (
                <div style={{ alignSelf: 'flex-start' }}>
                    <div style={roleStyle}>AI Assistant</div>
                    <div style={bubbleStyle}>
                        <div style={dot1Style}></div>
                        <div style={dot2Style}></div>
                        <div style={dot3Style}></div>
                    </div>
                </div>
            ) : (
                <div style={pageLoaderStyle}>
                    Loading...
                </div>
            )}
        </>
    );
}