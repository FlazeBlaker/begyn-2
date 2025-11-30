// src/components/Sidebar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, useRef, useEffect } from "react";
import { auth } from "../services/firebase";

// --- SUB-COMPONENT: NavLink ---
const NavLink = ({ to, children, icon, isTestActive, isSidebarOpen, onClick }) => {
    const [hover, setHover] = useState(false);
    const location = useLocation();
    const isActive = location.pathname === to;

    const isDisabled = isTestActive;

    const linkStyle = useMemo(
        () => ({
            display: "flex",
            alignItems: "center",
            padding: isSidebarOpen ? "12px 16px" : "12px 0",
            justifyContent: isSidebarOpen ? "flex-start" : "center",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: isActive ? "600" : "500",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            minHeight: "24px",
            cursor: isDisabled ? "not-allowed" : "pointer",
            background: isActive
                ? "linear-gradient(90deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.05))"
                : "transparent",
            color: isActive ? "var(--text-primary)" : "var(--text-muted)",
            borderLeft: isActive ? "3px solid #d946ef" : "3px solid transparent",
            boxShadow: isActive ? "0 4px 12px rgba(168, 85, 247, 0.1)" : "none",
            ...(hover && !isActive && !isDisabled && {
                background: "var(--bg-hover)",
                color: "var(--text-primary)",
                transform: "translateX(4px)",
            }),
            ...(isDisabled && {
                opacity: 0.4,
                pointerEvents: "none",
            }),
        }),
        [isActive, isSidebarOpen, isDisabled, hover]
    );

    const iconStyle = {
        marginRight: isSidebarOpen ? "12px" : "0",
        fontSize: "1.2rem",
        lineHeight: 0,
        flexShrink: 0,
        transition: "all 0.3s ease",
        filter: isActive ? "drop-shadow(0 0 8px rgba(217, 70, 239, 0.5))" : "none",
        transform: isActive ? "scale(1.1)" : "scale(1)",
    };

    const textStyle = useMemo(
        () => ({
            transition: "opacity 0.2s ease-in-out, transform 0.2s ease",
            opacity: isSidebarOpen ? 1 : 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            transform: isSidebarOpen ? "translateX(0)" : "translateX(-10px)",
        }),
        [isSidebarOpen]
    );

    const Content = (
        <div
            style={linkStyle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <span style={iconStyle}>{icon}</span>
            <span style={textStyle}>{isSidebarOpen && children}</span>
        </div>
    );

    return isDisabled ? Content : <Link to={to} onClick={onClick}>{Content}</Link>;
};

// --- SUB-COMPONENT: Profile Menu Item ---
const ProfileMenuItem = ({ to, icon, label, onClick }) => {
    const [hover, setHover] = useState(false);
    return (
        <Link
            to={to}
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                textDecoration: "none",
                color: hover ? "var(--text-primary)" : "var(--text-secondary)",
                background: hover ? "var(--bg-hover)" : "transparent",
                borderRadius: "8px",
                transition: "all 0.2s ease",
                gap: "10px",
                fontSize: "0.9rem"
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <span style={{ fontSize: "1.1rem" }}>{icon}</span>
            <span>{label}</span>
        </Link>
    );
};

// --- SUB-COMPONENT: User Profile with Popup ---
const UserProfile = ({ isSidebarOpen }) => {
    const user = auth.currentUser;
    const photoURL = user?.photoURL;
    const displayName = user?.displayName || "Creator";
    const email = user?.email || "";
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = () => setMenuOpen(!menuOpen);

    return (
        <div style={{ position: "relative" }} ref={menuRef}>
            {/* Popup Menu */}
            {menuOpen && (
                <div style={{
                    position: "absolute",
                    bottom: "100%", // Position above the profile
                    left: "0",
                    width: "220px",
                    background: "var(--bg-tertiary)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "12px",
                    padding: "8px",
                    marginBottom: "12px",
                    boxShadow: "var(--shadow-md)",
                    zIndex: 100,
                    animation: "fadeInUp 0.2s ease-out",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                }}>
                    <div style={{
                        padding: "8px 12px",
                        fontSize: "0.75rem",
                        color: "var(--text-tertiary)",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                    }}>
                        Manage
                    </div>
                    <ProfileMenuItem to="/automate" icon="🤖" label="Automate (Soon)" onClick={() => setMenuOpen(false)} />
                    <ProfileMenuItem to="/history" icon="📚" label="History" onClick={() => setMenuOpen(false)} />
                    <ProfileMenuItem to="/download" icon="📦" label="Download Center" onClick={() => setMenuOpen(false)} />
                    <ProfileMenuItem to="/settings" icon="⚙️" label="Settings" onClick={() => setMenuOpen(false)} />

                    <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />

                    <div
                        onClick={() => auth.signOut()}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 12px",
                            cursor: "pointer",
                            color: "#f87171",
                            borderRadius: "8px",
                            gap: "10px",
                            fontSize: "0.9rem",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248, 113, 113, 0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                        <span>🚪</span>
                        <span>Sign Out</span>
                    </div>

                    <style>{`
                        @keyframes fadeInUp {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}

            {/* Profile Trigger */}
            <div
                onClick={toggleMenu}
                style={{
                    marginTop: "auto",
                    padding: isSidebarOpen ? "16px" : "16px 0",
                    borderTop: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarOpen ? "flex-start" : "center",
                    gap: "12px",
                    transition: "all 0.3s ease",
                    flexShrink: 0,
                    cursor: "pointer",
                    background: menuOpen ? "var(--bg-hover)" : "transparent",
                    borderRadius: "12px"
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #a855f7, #ec4899)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    color: "white",
                    flexShrink: 0,
                    border: "2px solid var(--border-color)",
                    overflow: "hidden"
                }}>
                    {photoURL ? (
                        <img src={photoURL} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        displayName.charAt(0).toUpperCase()
                    )}
                </div>

                {/* Text Info (Hidden when collapsed) */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    opacity: isSidebarOpen ? 1 : 0,
                    width: isSidebarOpen ? "auto" : "0",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    whiteSpace: "nowrap"
                }}>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "600" }}>{displayName}</span>
                    <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>{email}</span>
                </div>

                {/* Chevron indicator */}
                {isSidebarOpen && (
                    <div style={{ marginLeft: "auto", color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
                        {menuOpen ? "▼" : "▲"}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- MAIN COMPONENT: Sidebar ---
export default function Sidebar({
    userInfo,
    isTestActive,
    isSidebarOpen,
    toggleSidebar,
    maxWidth,
    isMobile, // NEW PROP
}) {
    const onboarded = userInfo?.onboarded;
    const guideButtonText = onboarded ? "Your Guide" : "Go to Guide (Earn 10 credits!)";
    const guideButtonPath = onboarded ? "/guide/roadmap" : "/guide/onboarding";

    const sidebarStyle = useMemo(
        () => ({
            width: isMobile ? maxWidth : "100%", // On mobile, width is fixed to maxWidth
            maxWidth: maxWidth,
            minWidth: isMobile ? "0" : "80px", // On mobile, minWidth is 0 to allow full collapse
            height: "100vh",
            flexShrink: 0,
            background: "var(--glass-bg)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
            borderRight: "1px solid var(--glass-border)",
            padding: isSidebarOpen ? "24px 16px" : "24px 8px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
            willChange: "transform, width",
            overflowX: "hidden",
            boxShadow: "var(--glass-shadow)",
            zIndex: isMobile ? 1000 : 50, // Higher z-index on mobile
            position: isMobile ? "fixed" : "relative", // Fixed on mobile
            left: 0,
            top: 0,
            transform: isMobile ? (isSidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none", // Slide in/out on mobile
        }),
        [maxWidth, isSidebarOpen, isMobile]
    );

    const titleContainerStyle = {
        paddingBottom: "0px",
        marginBottom: "5px",
        display: "flex",
        justifyContent: isSidebarOpen ? "space-between" : "center",
        alignItems: "center",
        position: "relative",
        minHeight: "30px",
        flexShrink: 0
    };

    const toggleButtonStyle = useMemo(
        () => ({
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: "1rem",
            padding: "0",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            transform: isSidebarOpen ? "rotate(0deg)" : "rotate(180deg)",
        }),
        [isSidebarOpen]
    );

    const menuHeaderStyle = useMemo(
        () => ({
            color: "#64748b",
            fontSize: "0.75rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "12px",
            marginTop: "32px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            paddingLeft: isSidebarOpen ? "12px" : "0",
            textAlign: isSidebarOpen ? "left" : "center",
            transition: "all 0.3s ease",
            opacity: 0.8,
            flexShrink: 0
        }),
        [isSidebarOpen]
    );

    const navListStyle = {
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    };

    // Backdrop for mobile
    const backdropStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(3px)",
        zIndex: 999,
        opacity: isSidebarOpen ? 1 : 0,
        pointerEvents: isSidebarOpen ? "auto" : "none",
        transition: "opacity 0.3s ease",
    };

    return (
        <>
            {isMobile && (
                <div
                    style={backdropStyle}
                    onClick={toggleSidebar}
                />
            )}
            <div style={sidebarStyle}>
                <div style={titleContainerStyle}>
                    {isSidebarOpen && (
                        <Link to="/dashboard" style={{ textDecoration: "none" }} onClick={isMobile ? toggleSidebar : undefined}>
                            <div
                                style={{
                                    opacity: isSidebarOpen ? 1 : 0,
                                    transition: "opacity 0.3s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    height: "60px",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    gap: "10px"
                                }}
                            >
                                <img
                                    src="/logos/logo.png"
                                    alt="Luma"
                                    style={{
                                        height: "100%",
                                        width: "auto",
                                        objectFit: "contain",
                                    }}
                                />
                            </div>
                        </Link>
                    )}

                    {!isMobile && (
                        <button
                            onClick={toggleSidebar}
                            style={toggleButtonStyle}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                            title={isSidebarOpen ? "Collapse" : "Expand"}
                        >
                            {isSidebarOpen ? "«" : "»"}
                        </button>
                    )}
                    {isMobile && (
                        <button
                            onClick={toggleSidebar}
                            style={{ ...toggleButtonStyle, background: "transparent", border: "none", fontSize: "1.2rem" }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* SCROLLABLE NAVIGATION CONTAINER */}
                <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    paddingRight: isSidebarOpen ? "4px" : "0",
                    marginBottom: "16px"
                }}>
                    {/* MAIN NAVIGATION */}
                    <ul style={navListStyle}>
                        <li>
                            <NavLink
                                to="/dashboard"
                                icon="🏠"
                                isTestActive={isTestActive}
                                isSidebarOpen={isSidebarOpen}
                                onClick={isMobile ? toggleSidebar : undefined}
                            >
                                Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to={guideButtonPath}
                                icon="🗺️"
                                isTestActive={isTestActive}
                                isSidebarOpen={isSidebarOpen}
                                onClick={isMobile ? toggleSidebar : undefined}
                            >
                                {guideButtonText}
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/brand-setup"
                                icon="🔧"
                                isTestActive={isTestActive}
                                isSidebarOpen={isSidebarOpen}
                                onClick={isMobile ? toggleSidebar : undefined}
                            >
                                Brand Setup
                            </NavLink>
                        </li>
                    </ul>

                    <div style={menuHeaderStyle}>Create</div>

                    <ul style={navListStyle}>
                        <li>
                            <NavLink
                                to="/generate"
                                icon="✨"
                                isTestActive={isTestActive}
                                isSidebarOpen={isSidebarOpen}
                                onClick={isMobile ? toggleSidebar : undefined}
                            >
                                Generator
                            </NavLink>
                        </li>

                        <li>
                            <NavLink
                                to="/video-generator"
                                icon="🎥"
                                isTestActive={isTestActive}
                                isSidebarOpen={isSidebarOpen}
                                onClick={isMobile ? toggleSidebar : undefined}
                            >
                                AI Video (Soon)
                            </NavLink>
                        </li>
                    </ul>
                </div>

                {/* USER PROFILE SECTION (NOW CONTAINS MANAGE MENU) */}
                <UserProfile isSidebarOpen={isSidebarOpen} />
            </div >
        </>
    );
}
