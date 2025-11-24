// src/pages/VideoGenerator.jsx
import { useState } from "react";

const styles = `
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes iconFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
`;

const NotifyButton = () => {
  const [hover, setHover] = useState(false);

  return (
    <button
      style={{
        marginTop: "16px",
        padding: "clamp(12px, 3vw, 16px) clamp(24px, 6vw, 32px)",
        minHeight: "48px",
        color: "white",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontSize: "clamp(0.9rem, 3vw, 1rem)",
        fontWeight: "600",
        transition: "all 0.3s ease-in-out",
        position: "relative",
        overflow: "hidden",
        background: hover ? "rgba(140, 100, 255, 1)" : "rgba(140, 100, 255, 0.8)",
        boxShadow: hover ? "0 0 20px rgba(140, 100, 255, 0.5)" : "none",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => alert("You'll be the first to know!")}
    >
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
        backgroundSize: "400% 100%",
        animation: "shimmer 3s infinite linear",
        opacity: hover ? 1 : 0,
        transition: "opacity 0.3s"
      }} />
      Notify Me When It's Ready
    </button>
  );
};

export default function VideoGenerator() {
  return (
    <div style={{
      padding: "clamp(16px, 5vw, 40px)",
      maxWidth: "900px",
      margin: "clamp(20px, 5vw, 40px) auto 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <style>{styles}</style>

      <div style={{
        background: "rgba(35, 35, 45, 0.5)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "clamp(12px, 3vw, 16px)",
        padding: "clamp(24px, 6vw, 48px)",
        textAlign: "center",
        width: "100%",
        maxWidth: "600px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        animation: "fadeIn 0.7s ease-out",
      }}>
        <div style={{
          fontSize: "clamp(3rem, 10vw, 4rem)",
          marginBottom: "clamp(16px, 4vw, 24px)",
          display: "inline-block",
          animation: "iconFloat 3s ease-in-out infinite",
        }}>
          🎥
        </div>

        <h1 style={{
          fontSize: "clamp(1.5rem, 6vw, 2.25rem)",
          fontWeight: "700",
          color: "#ffffff",
          marginBottom: "16px",
          letterSpacing: "-1px"
        }}>
          AI Video Generation
        </h1>

        <p style={{
          fontSize: "clamp(0.9rem, 3vw, 1rem)",
          color: "#a0a0b0",
          lineHeight: "1.6",
          maxWidth: "450px",
          margin: "0 auto 32px auto"
        }}>
          <strong>This is the future.</strong> We are actively working on integrating
          next-generation AI video models.
          <br /><br />
          Soon, you'll be able to turn your generated scripts
          into complete, ready-to-post videos, all in one place.
        </p>

        <NotifyButton />
      </div>
    </div>
  );
}