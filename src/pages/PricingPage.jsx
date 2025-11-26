import React, { useState, useEffect, useRef } from "react";
import { auth, db, doc, getDoc, updateDoc } from "../services/firebase";
import { getUserCredits, CREDIT_PACKAGES } from "../services/razorpay";
import PaymentModal from "../components/PaymentModal";
import Toast from "../components/Toast";

export default function PricingPage() {
    const [userInfo, setUserInfo] = useState({});
    const [credits, setCredits] = useState(0);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAdLoading, setIsAdLoading] = useState(false);
    const [showFallbackAd, setShowFallbackAd] = useState(false);
    const [adStatus, setAdStatus] = useState("Initializing...");
    const [toast, setToast] = useState(null);
    const [timeLeft, setTimeLeft] = useState(15);
    const [adFinished, setAdFinished] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const adContainerRef = useRef(null);
    const timerRef = useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    setUserInfo(snap.data());
                }

                // Get current credits
                const userCredits = await getUserCredits(user.uid);
                setCredits(userCredits);
            }
        };

        const unsubscribe = auth.onAuthStateChanged(fetchData);
        return () => unsubscribe();
    }, []);

    // Use the credit packages from razorpay service
    const packages = CREDIT_PACKAGES.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        credits: pkg.credits,
        features: [
            `${pkg.credits} AI Generations`,
            "All Tools Unlocked",
            "Caption Generator",
            "Hashtag Generator",
            "Idea Generator",
            "Post Generator"
        ],
        color: pkg.popular ? "from-purple-400 to-purple-600" : "from-blue-400 to-blue-600",
        popular: pkg.popular
    }));

    const handlePurchase = () => {
        const user = auth.currentUser;
        if (!user) {
            showToast("Please log in to purchase credits.", "error");
            return;
        }

        // Open payment modal
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = (newCredits) => {
        setCredits(newCredits);
    };

    const [rewardAmount, setRewardAmount] = useState(1);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setAdFinished(true);
                    handleAdReward(); // Award credit only when timer finishes
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleWatchAd = () => {
        const user = auth.currentUser;
        if (!user) {
            showToast("Please log in to watch ads.", "error");
            return;
        }

        // Clear any existing timer immediately
        if (timerRef.current) clearInterval(timerRef.current);

        setIsAdLoading(true);
        setShowFallbackAd(false);
        setAdStatus("Loading Ad Partner...");
        setTimeLeft(15);
        setRewardAmount(1);
        setAdFinished(false);
        setShowCloseWarning(false);

        // Timer will be started only when ad is confirmed loaded or fallback is shown

        // Wait for next frame to ensure container is visible
        setTimeout(() => {
            try {
                // Check for AdBlocker
                if (!window.adsbygoogle) {
                    console.warn("AdSense script not found (possible AdBlocker)");
                    setAdStatus("Ad Partner Blocked. Switching to House Ad...");
                    setTimeout(() => {
                        setShowFallbackAd(true);
                        startTimer();
                    }, 1500);
                    return;
                }

                if (adContainerRef.current) {
                    // Push the ad
                    try {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    } catch (e) {
                        console.error("AdSense push error:", e);
                    }

                    // Check if ad actually loaded (iframe created) after 4 seconds
                    setTimeout(() => {
                        if (!adContainerRef.current) return;

                        const adIframe = adContainerRef.current.querySelector('iframe');
                        const adIns = adContainerRef.current.querySelector('ins');

                        // If no iframe or ins is hidden/empty, show fallback
                        if (!adIframe || (adIns && adIns.style.display === 'none') || (adIns && adIns.innerHTML === '')) {
                            console.log("AdSense didn't render, showing fallback");
                            setAdStatus("No Ad Available. Switching to House Ad...");
                            setShowFallbackAd(true);
                            startTimer();
                        } else {
                            setAdStatus("Watching Ad...");
                            startTimer();
                        }
                    }, 4000);
                }
            } catch (error) {
                console.error("AdSense error:", error);
                setAdStatus("Error. Switching to House Ad...");
                setShowFallbackAd(true);
                startTimer();
            }
        }, 500);
    };

    const handleCloseAdAttempt = () => {
        if (adFinished) {
            // Already finished, just close
            setIsAdLoading(false);
        } else {
            // Not finished, show warning
            setShowCloseWarning(true);
        }
    };

    const confirmCloseAd = () => {
        // User confirmed they want to close and lose reward
        if (timerRef.current) clearInterval(timerRef.current);
        setIsAdLoading(false);
        setShowCloseWarning(false);
        showToast("Ad closed. No credit awarded.", "info");
    };

    const handleAdReward = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                // Update credits in brands collection (secure location)
                const brandRef = doc(db, "brands", user.uid);
                const newCredits = credits + rewardAmount;
                await updateDoc(brandRef, { credits: newCredits });
                setCredits(newCredits);
                showToast(`🎉 +${rewardAmount} Credit${rewardAmount > 1 ? 's' : ''} earned!`, "success");
            } catch (error) {
                console.error("Error adding ad reward:", error);
                showToast("Failed to add credit. Try again.", "error");
            }
        }
    };

    // Load Google AdSense script
    useEffect(() => {
        // Check if script is already there
        if (document.querySelector('script[src*="adsbygoogle.js"]')) return;

        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6551511547225605";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);

        return () => {
            // We generally don't remove the script on unmount
        };
    }, []);

    return (
        <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #1e293b, #0f172a)", color: "white", fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(20px, 5vw, 40px) clamp(16px, 4vw, 20px)", textAlign: "center" }}>
                <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 800, marginBottom: 10, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Buy Credits
                </h1>
                <p style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)", color: "#94a3b8", marginBottom: "20px" }}>
                    One-time purchase. No subscriptions. All features unlocked.
                </p>

                {/* Current Balance */}
                <div style={{
                    background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                    borderRadius: 16,
                    padding: "16px 24px",
                    display: "inline-block",
                    marginBottom: "clamp(30px, 8vw, 60px)",
                    boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)"
                }}>
                    <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)", marginBottom: 4 }}>Current Balance</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "white" }}>{credits} Credits</div>
                </div>

                {/* Watch Ad Section - Above Packs */}
                <div style={{
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    marginBottom: "clamp(30px, 6vw, 50px)",
                    border: "2px solid #22c55e",
                    boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px"
                }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "1.8rem" }}>📺</span>
                            <h3 style={{ margin: 0, fontSize: "clamp(1.1rem, 4vw, 1.3rem)" }}>Watch Ad, Earn Credits</h3>
                        </div>
                        <p style={{ margin: 0, color: "#e2e8f0", fontSize: "0.9rem", opacity: 0.9 }}>
                            Watch a short ad and get +1 credit instantly • Unlimited uses
                        </p>
                    </div>
                    <button
                        onClick={handleWatchAd}
                        disabled={isAdLoading}
                        style={{
                            padding: "12px 28px",
                            borderRadius: 10,
                            border: "none",
                            background: isAdLoading ? "#94a3b8" : "#ffffff",
                            color: isAdLoading ? "#ffffff" : "#16a34a",
                            fontSize: "1rem",
                            fontWeight: 700,
                            cursor: isAdLoading ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                            whiteSpace: "nowrap"
                        }}
                        onMouseEnter={(e) => !isAdLoading && (e.target.style.transform = "scale(1.05)")}
                        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                    >
                        {isAdLoading ? "Loading Ad..." : "Watch Ad"}
                    </button>
                </div>

                {/* Ad Modal Overlay */}
                {isAdLoading && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.95)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            background: '#1e293b',
                            padding: '30px',
                            borderRadius: '16px',
                            maxWidth: '800px',
                            width: '100%',
                            border: '1px solid #334155',
                            position: 'relative'
                        }}>
                            {/* Close Warning Overlay */}
                            {showCloseWarning && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    zIndex: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    textAlign: 'center'
                                }}>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>⚠️ Wait!</h3>
                                    <p style={{ color: '#cbd5e1', marginBottom: '20px' }}>
                                        If you close now, you won't get your credit.
                                    </p>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button
                                            onClick={() => setShowCloseWarning(false)}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#3b82f6',
                                                color: 'white',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Keep Watching
                                        </button>
                                        <button
                                            onClick={confirmCloseAd}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                border: '1px solid #ef4444',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Close Anyway
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                width: '100%'
                            }}>
                                <div style={{
                                    color: 'white',
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <span>📺</span> {adStatus}
                                </div>
                                <button
                                    onClick={handleCloseAdAttempt}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: '1.5rem',
                                        padding: '5px',
                                        lineHeight: 1
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div ref={adContainerRef} style={{ minHeight: '250px', width: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '8px', position: 'relative' }}>

                                {/* AdSense Container */}
                                <div style={{ display: showFallbackAd ? 'none' : 'block', width: '100%', minHeight: '250px' }}>
                                    <ins className="adsbygoogle"
                                        style={{ display: 'block', width: '100%', minHeight: '250px' }}
                                        data-ad-client="ca-pub-6551511547225605"
                                        data-ad-slot="1059325014"
                                        data-ad-format="auto"
                                        data-full-width-responsive="true"
                                        data-adtest="on">
                                    </ins>
                                </div>

                                {/* Fallback House Ad */}
                                {showFallbackAd && (
                                    <div style={{
                                        width: '100%',
                                        height: '250px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#1e293b',
                                        color: 'white',
                                        textAlign: 'center',
                                        padding: '20px',
                                        border: '1px dashed #475569'
                                    }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
                                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: '#cbd5e1' }}>Ad Failed to Load</h3>
                                        <button
                                            onClick={handleWatchAd}
                                            style={{
                                                padding: '10px 24px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#3b82f6',
                                                color: 'white',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                                            onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                                        >
                                            <span>↻</span> Reload Ad
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Manual Fallback Link - Appears after 5s */}
                            {!showFallbackAd && (
                                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                    <button
                                        onClick={() => {
                                            setShowFallbackAd(true);
                                            startTimer();
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#64748b',
                                            textDecoration: 'underline',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            opacity: 0,
                                            animation: 'fadeIn 0.5s forwards',
                                            animationDelay: '5s'
                                        }}
                                    >
                                        Ad not loading? Click here
                                    </button>
                                    <style>{`
                                        @keyframes fadeIn {
                                            to { opacity: 1; }
                                        }
                                    `}</style>
                                </div>
                            )}

                            <div style={{
                                textAlign: 'center',
                                color: adFinished ? '#22c55e' : '#94a3b8',
                                marginTop: '20px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                transition: 'color 0.3s'
                            }}>
                                {adFinished ? "🎉 Reward Earned! You can close now." : `Reward in: ${timeLeft}s`}
                            </div>
                        </div>
                    </div>
                )}

                {/* Credit Packages */}
                <h2 style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, marginBottom: 30, textAlign: "center" }}>Or Buy Credit Packs</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "clamp(20px, 4vw, 30px)", marginBottom: "80px" }}>
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            style={{
                                background: "linear-gradient(135deg, #1e293b, #334155)",
                                borderRadius: 20,
                                padding: "clamp(24px, 5vw, 40px)",
                                position: "relative",
                                border: pkg.popular ? "2px solid #3b82f6" : "2px solid transparent",
                                boxShadow: pkg.popular ? "0 0 30px rgba(59, 130, 246, 0.3)" : "none",
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >
                            {pkg.popular && (
                                <div style={{
                                    position: "absolute",
                                    top: -15,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                                    color: "white",
                                    padding: "5px 20px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)"
                                }}>
                                    BEST VALUE
                                </div>
                            )}

                            <h3 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", margin: "0 0 10px 0" }}>{pkg.name}</h3>
                            <div style={{ fontSize: "clamp(2.5rem, 8vw, 3rem)", fontWeight: 800, marginBottom: 20 }}>
                                ₹{pkg.price}
                            </div>
                            <p style={{ color: "#e2e8f0", fontWeight: 500, marginBottom: 30, fontSize: "1.1rem" }}>
                                {pkg.credits} Credits
                            </p>

                            <div style={{ flex: 1 }}>
                                {pkg.features.map((feature, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 15, color: "#cbd5e1", fontSize: "clamp(0.9rem, 3vw, 1rem)", textAlign: "left" }}>
                                        <span style={{ marginRight: 10, color: "#3b82f6", fontSize: 18, flexShrink: 0 }}>✓</span>
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handlePurchase}
                                style={{
                                    marginTop: 30,
                                    padding: "16px 30px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: pkg.id === 'starter' ? '#3b82f6' : (pkg.id === 'ultimate' ? '#9333ea' : '#f97316'),
                                    color: "white",
                                    fontSize: "1.1rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "transform 0.2s",
                                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                                    width: "100%",
                                    minHeight: "50px"
                                }}
                                onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                                onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                            >
                                Buy Now
                            </button>
                        </div>
                    ))}
                </div>

                {/* What can credits get you */}
                <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 20, padding: "clamp(24px, 5vw, 40px)", marginBottom: 40 }}>
                    <h2 style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, marginBottom: 30 }}>What can 100 credits get you?</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "20px" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "clamp(2rem, 6vw, 2.5rem)", marginBottom: 10 }}>✍️</div>
                            <div style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, color: "#3b82f6" }}>100</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Captions</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "clamp(2rem, 6vw, 2.5rem)", marginBottom: 10 }}>️⃣</div>
                            <div style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, color: "#8b5cf6" }}>100</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Hashtag Sets</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "clamp(2rem, 6vw, 2.5rem)", marginBottom: 10 }}>💡</div>
                            <div style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, color: "#f59e0b" }}>100</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Content Ideas</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "clamp(2rem, 6vw, 2.5rem)", marginBottom: 10 }}>📱</div>
                            <div style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 700, color: "#10b981" }}>50</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Full Posts</div>
                        </div>
                    </div>
                </div>

                {/* Payment Modal */}
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />

                {/* Toast Notification */}
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div >
    );
}
