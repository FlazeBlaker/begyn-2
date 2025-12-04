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


const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const GuideFlow = lazy(() => import("./pages/GuideFlow"));
const YourGuidePage = lazy(() => import("./pages/YourGuidePage"));
const AutomationPage = lazy(() => import("./pages/AutomationPage"));


const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

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
const FullScreenLoader = () => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', background: '#0b1020', color: 'white',
        fontSize: '1.25rem', fontFamily: 'system-ui, sans-serif'
    }}>
        Loading Studio...
    </div>
);

// PrivateRoute: returns children if user authed and onboarded (if required)
function PrivateRoute({ user, onboarded, onboardedRequired = true, children }) {
    if (!user) return <Navigate to="/login" replace />;
    if (onboardedRequired && onboarded === false) return <Navigate to="/guide/onboarding" replace />;
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
        location.pathname === "/guide/onboarding" ||
        location.pathname === "/guide/flow";

    // Sidebar width values used by Sidebar component
    // On mobile, sidebar width doesn't push content, so we can set it to 0 or handle it in CSS
    const sidebarMaxWidth = isMobile ? "0px" : (isSidebarOpen ? "300px" : "80px");

    if (hideLayout) {
        return (
            <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/guide/onboarding" element={
                        <GuideRoute user={user}>
                            {onboarded ? <Navigate to="/dashboard" replace /> : <OnboardingPage setOnboardedStatus={(v) => { /* map as needed */ }} />}
                        </GuideRoute>
                    } />
                    <Route path="/guide/flow" element={
                        <GuideRoute user={user}>
                            <GuideFlow setOnboardedStatus={(status) => {
                                if (setUserInfo) {
                                    setUserInfo(prev => ({ ...prev, onboarded: status }));
                                }
                            }} />
                        </GuideRoute>
                    } />
                    <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
                </Routes>
            </Suspense>
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
                        <Routes>

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



                            <Route path="/guide/roadmap" element={
                                <PrivateRoute user={user} onboarded={onboarded}>
                                    <YourGuidePage userInfo={userInfo} />
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
