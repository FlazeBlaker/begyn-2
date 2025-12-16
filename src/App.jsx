// src/App.jsx
import React, { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, doc, getDoc, onSnapshot } from "./services/firebase";
// import { initializeUserCredits } from "./services/razorpay";

// Core layout components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ImmersiveBackground from "./components/ImmersiveBackground";

// Pages (lazy-loaded to improve startup performance)
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BrandSetup = lazy(() => import("./pages/BrandSetup"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const Generators = lazy(() => import("./pages/Generators"));
const LandingPage = lazy(() => import("./pages/LandingPage"));



const IntroPage = lazy(() => import("./pages/IntroPage"));
const GuideFlow = lazy(() => import("./pages/GuideFlow"));
const YourGuidePage = lazy(() => import("./pages/YourGuidePage"));
const AutomationPage = lazy(() => import("./pages/AutomationPage"));


const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AiSocialMediaGuide = lazy(() => import("./pages/AiSocialMediaGuide"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// --- HOOK: Detect Screen Width ---
const useWindowWidth = () => {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return width;
};

// Small fallback used for Suspense boundaries
const SuspenseFallback = () => (
    <div style={{
        height: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#cbd5e1"
    }}>
        Loading…
    </div>
);

// Full-screen loader while auth initializes
// Full-screen loader while auth initializes
const FullScreenLoader = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at center, #2a0a55 0%, #0b1020 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        gap: '20px'
    }}>
        <style>
            {`
            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 20px rgba(124, 77, 255, 0.2); transform: scale(1); }
                50% { box-shadow: 0 0 40px rgba(124, 77, 255, 0.6); transform: scale(1.05); }
            }
            @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            `}
        </style>
        <div style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Outer Ring */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: '#7C4DFF',
                borderRightColor: '#7C4DFF',
                animation: 'spin-slow 2s linear infinite'
            }} />

            {/* Inner Logo/Icon */}
            <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #7C4DFF, #4A148C)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(124, 77, 255, 0.4)',
                animation: 'pulse-glow 2s ease-in-out infinite'
            }}>
                AI
            </div>
        </div>
        <div style={{
            fontSize: '1.2rem',
            fontWeight: '500',
            letterSpacing: '1px',
            background: 'linear-gradient(to right, #fff, #a0a0b0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
        }}>
            Initializing Studio...
        </div>
    </div>
);

// PrivateRoute: returns children if user authed AND verified
function PrivateRoute({ user, children, onboarded }) {
    if (!user) return <Navigate to="/" replace />;

    // Security Fix: Block unverified users
    if (!user.emailVerified) {
        return <Navigate to="/login" state={{ needsVerification: true }} replace />;
    }

    // Strict Onboarding Check: If explicitly false, redirect to flow
    // We use strict check because undefined/null might mean loading
    if (onboarded === false) {
        return <Navigate to="/flow" replace />;
    }

    return children;
}

// GuideRoute: used for guide pages that need auth but hide layout
function GuideRoute({ user, children }) {
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

// Small Test Page (keeps your previous test flow)
const TestPage = ({ onExit }) => (
    <div style={{ padding: 40, background: '#0f1724', color: 'white', minHeight: '100vh' }}>
        <h2>⚠️ Test Mode</h2>
        <p>Navigation is locked while testing.</p>
        <button onClick={onExit} style={{ marginTop: 20, padding: '10px 14px' }}>Exit Test</button>
    </div>
);

function AppContent() {
    const [user, setUser] = useState(null);
    const [userInfo, setUserInfo] = useState(null); // { planId, credits, onboarded, ... }
    const [authInitializing, setAuthInitializing] = useState(true);
    const [isTestActive, setIsTestActive] = useState(false);

    // sidebar collapsed state (persist locally if you like)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Responsive State
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth <= 768;

    // Close sidebar by default on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    }, [isMobile]);

    // Track the snapshot listener unsubscribe function
    const brandUnsubscribeRef = React.useRef(null);

    // protect against state updates after unmount
    useEffect(() => {
        let mounted = true;

        // Immediate check in case auth is already ready
        if (auth.currentUser) {
            setUser(auth.currentUser);
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!mounted) return;

            // Cleanup previous listener if it exists
            if (brandUnsubscribeRef.current) {
                brandUnsubscribeRef.current();
                brandUnsubscribeRef.current = null;
            }

            // Set user immediately
            setUser(currentUser);

            if (currentUser) {
                // Real-time listener for user data (credits, plan, etc.)
                const userRef = doc(db, "users", currentUser.uid);
                const brandRef = doc(db, "brands", currentUser.uid);

                // We use onSnapshot for the brand doc to get real-time credit updates
                // console.log(`[App] Attaching snapshot listener for user: ${currentUser.uid}`);
                brandUnsubscribeRef.current = onSnapshot(brandRef, async (brandSnap) => {
                    if (!mounted) return;
                    try {
                        const brandData = brandSnap.exists() ? brandSnap.data() : {};
                        // Fetch user data (one-time fetch)
                        const userSnap = await getDoc(userRef);
                        const userData = userSnap.exists() ? userSnap.data() : {};

                        if (mounted) {
                            setUserInfo({
                                uid: currentUser.uid,
                                email: currentUser.email,
                                ...userData,
                                ...brandData, // Merge brand data (credits)
                                onboarded: !!brandData.onboarded,
                                credits: brandData.credits || 0,
                                creditsUsed: brandData.creditsUsed || 0
                            });
                        }
                    } catch (err) {
                        console.error("Error in brand snapshot logic:", err);
                    }
                }, (error) => {
                    // Suppress error if we are already unmounting or logging out
                    if (!mounted || !auth.currentUser) {
                        // console.log("Suppressing snapshot error during logout/unmount:", error.code);
                        return;
                    }

                    console.error("Snapshot listener error:", error);
                    if (error.code === 'permission-denied') {
                        console.warn(`Permission denied for user ${currentUser.uid}. Logging out to clear stale session...`);
                        auth.signOut();
                        setUser(null);
                        setUserInfo(null);
                    }
                });

            } else {
                if (mounted) setUserInfo(null);
            }

            if (mounted) setAuthInitializing(false);
        });

        // pageshow listener to handle bfcache
        const handlePageShow = (e) => { if (e.persisted) window.location.reload(); };
        window.addEventListener("pageshow", handlePageShow);

        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                setAuthInitializing((prev) => {
                    if (prev) {
                        console.warn("Auth initialization timed out, forcing app load.");
                        return false;
                    }
                    return prev;
                });
            }
        }, 10000);

        return () => {
            mounted = false;
            unsubscribe();
            if (brandUnsubscribeRef.current) {
                brandUnsubscribeRef.current();
            }
            window.removeEventListener("pageshow", handlePageShow);
            clearTimeout(safetyTimer);
        };
    }, []);

    // Basic guards (fast path)
    if (authInitializing) return <FullScreenLoader />;

    // Test mode redirect handling
    if (isTestActive) return <TestPage onExit={() => setIsTestActive(false)} />;

    // Hide navbar for these routes
    // We'll render Guide/Login pages without the main layout
    return (
        <>
            <ImmersiveBackground />
            <LayoutRouter
                user={user}
                userInfo={userInfo}
                setUserInfo={setUserInfo}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                setIsTestActive={setIsTestActive}
                isMobile={isMobile}
            />
        </>
    );
}

/* LayoutRouter separates routes that need the main layout (sidebar+navbar)
   from routes that should hide them (login/onboarding). */
function LayoutRouter({ user, userInfo, setUserInfo, isSidebarOpen, setIsSidebarOpen, setIsTestActive, isMobile }) {
    const location = useLocation();
    const onboarded = userInfo?.onboarded;

    // Routes that should hide the main layout
    const hideLayout = location.pathname === "/login" ||
        location.pathname === "/" ||
        location.pathname === "/terms" ||
        location.pathname === "/privacy" ||
        location.pathname === "/intro" ||
        location.pathname === "/flow" ||
        location.pathname === "/ai-social-media-guide" ||
        location.pathname === "/admin";

    // Sidebar width values used by Sidebar component
    // On mobile, sidebar width doesn't push content, so we can set it to 0 or handle it in CSS
    const sidebarMaxWidth = isMobile ? "0px" : (isSidebarOpen ? "300px" : "80px");

    if (hideLayout) {
        return (
            <Suspense fallback={<SuspenseFallback />}>
                <Routes location={location} key={location.pathname}>
                    {/* Landing Page */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Login Page */}
                    <Route path="/login" element={<Login />} />

                    {/* Public Pages (Accessible when logged in) */}
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/ai-social-media-guide" element={<AiSocialMediaGuide />} />

                    {/* Intro Page - Shown only once */}
                    <Route path="/intro" element={
                        <GuideRoute user={user}>
                            <IntroPage setIntroSeenStatus={(status) => {
                                if (setUserInfo) {
                                    setUserInfo(prev => ({ ...prev, introSeen: status }));
                                }
                            }} />
                        </GuideRoute>
                    } />

                    {/* Guide Flow Route */}
                    <Route path="/flow" element={
                        <GuideRoute user={user}>
                            {onboarded ? (
                                <Navigate to="/dashboard" replace />
                            ) : (
                                <GuideFlow setOnboardedStatus={(status) => {
                                    if (setUserInfo) {
                                        setUserInfo(prev => ({ ...prev, onboarded: status }));
                                    }
                                }} />
                            )}
                        </GuideRoute>
                    } />

                    {/* Roadmap Page */}
                    <Route path="/roadmap" element={
                        <GuideRoute user={user}>
                            <YourGuidePage />
                        </GuideRoute>
                    } />

                    {/* Admin Dashboard - Full Screen */}
                    <Route path="/admin" element={
                        <PrivateRoute user={user} onboarded={onboarded}>
                            <AdminDashboard userInfo={userInfo} />
                        </PrivateRoute>
                    } />

                    <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
                </Routes>
            </Suspense >
        );
    }

    // Main app layout with sidebar + navbar
    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <Sidebar
                userInfo={userInfo}
                isTestActive={false}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(v => !v)}
                maxWidth={isMobile ? "280px" : (isSidebarOpen ? "300px" : "80px")} // Mobile drawer width
                isMobile={isMobile}
            />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
                <Navbar
                    isTestActive={false}
                    userInfo={userInfo}
                    isMobile={isMobile}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />

                <div style={{ flex: 1, overflowY: "auto" }}>
                    <Suspense fallback={<SuspenseFallback />}>
                        <Routes location={location} key={location.pathname}>

                            {/* Protected main routes */}
                            <Route path="/dashboard" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <Dashboard />
                                </PrivateRoute>
                            } />

                            <Route path="/brand-setup" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <BrandSetup />
                                </PrivateRoute>
                            } />

                            <Route path="/generate" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <Generators />
                                </PrivateRoute>
                            } />

                            <Route path="/history" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <HistoryPage />
                                </PrivateRoute>
                            } />

                            <Route path="/download" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <DownloadPage />
                                </PrivateRoute>
                            } />

                            <Route path="/automate" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <AutomationPage />
                                </PrivateRoute>
                            } />

                            {/* Roadmap Route */}
                            <Route path="/roadmap" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <YourGuidePage
                                        userInfo={userInfo}
                                        setOnboardedStatus={(status) => {
                                            if (setUserInfo) {
                                                setUserInfo(prev => ({ ...prev, onboarded: status }));
                                            }
                                        }}
                                    />
                                </PrivateRoute>
                            } />

                            {/* Pricing route */}
                            <Route path="/pricing" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <PricingPage />
                                </PrivateRoute>
                            } />

                            <Route path="/payment-success" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <PaymentSuccess />
                                </PrivateRoute>
                            } />

                            <Route path="/settings" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <SettingsPage />
                                </PrivateRoute>
                            } />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

import ScrollToTop from "./components/ScrollToTop";

export default function App() {
    return (
        <Router>
            <ScrollToTop />
            <AppContent />
        </Router>
    );
}
