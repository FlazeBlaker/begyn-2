import React from "react";
import { auth } from "../services/firebase";
import { Link, useLocation } from "react-router-dom";

export default function Navbar({ isTestActive, userInfo, isMobile, onMenuClick }) {
    const location = useLocation();
    const user = auth.currentUser;
    const credits = userInfo?.credits || 0;
    // Helper to get page title based on route
    const getPageTitle = (pathname) => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/brand-setup") return "Brand Setup";
        if (pathname === "/generate") return "Generator Hub";
        if (pathname === "/history") return "History";
        if (pathname === "/settings") return "Settings";
        if (pathname === "/pricing") return "Buy Credits";
        if (pathname === "/download") return "Downloads";
        if (pathname.includes("generator")) return "Create Content";
        return "Dashboard";
    };

    const pageTitle = getPageTitle(location.pathname);

    return (
        <nav style={{
            height: "70px",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "var(--glass-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: "var(--glass-shadow)"
        }}>
            {/* Left: Page Title (and Menu Button on Mobile) */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {isMobile && (
                    <button
                        onClick={onMenuClick}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-primary)",
                            fontSize: "1.5rem",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "8px",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                        ☰
                    </button>
                )}
                <h2 style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em"
                }}>
                    {pageTitle}
                </h2>
            </div>

            {/* Right: Credits & Upgrade */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Credits Counter */}
                {!isTestActive && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "var(--bg-card)",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "var(--text-secondary)"
                    }}>
                        <span style={{ fontSize: "1.1rem" }}>⚡</span>
                        <span>{credits} Credits</span>
                    </div>
                )}

                {/* Buy Credits Button */}
                {!isTestActive && (
                    <Link to="/pricing" style={{ textDecoration: "none" }}>
                        <button style={{
                            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px 16px",
                            color: "white",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                            transition: "transform 0.2s",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            <span>+</span>
                            <span>Buy Credits</span>
                        </button>
                    </Link>
                )}
            </div>
        </nav>
    );
}
