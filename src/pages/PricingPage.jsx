import React, { useState, useEffect } from "react";
import { auth, db, doc, getDoc } from "../services/firebase";
import { getUserCredits, CREDIT_PACKAGES } from "../services/razorpay";
import { grantCredits } from "../services/credits";
import PaymentModal from "../components/PaymentModal";
import MockAdModal from "../components/MockAdModal";
import Toast from "../components/Toast";

export default function PricingPage() {
    const [userInfo, setUserInfo] = useState({});
    const [credits, setCredits] = useState(0);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAdModalOpen, setIsAdModalOpen] = useState(false);
    const [toast, setToast] = useState(null);

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
                setCredits(userCredits.credits); // Fix: getUserCredits returns object
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

    const handleWatchAd = () => {
        const user = auth.currentUser;
        if (!user) {
            showToast("Please log in to watch ads.", "error");
            return;
        }
        setIsAdModalOpen(true);
    };

    const handleAdReward = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await grantCredits(user.uid, 1); // Grant 1 credit
            const updated = await getUserCredits(user.uid);
            setCredits(updated.credits);
            showToast("You earned 1 credit!", "success");
        } catch (error) {
            console.error("Error granting ad credits:", error);
            showToast("Failed to grant credits.", "error");
        }
    };

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

                {/* Credit Packages */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "clamp(20px, 4vw, 30px)", marginBottom: "80px" }}>

                    {/* Watch Ad Option */}
                    <div style={{
                        background: "linear-gradient(135deg, #1e293b, #334155)",
                        borderRadius: 20,
                        padding: "clamp(24px, 5vw, 40px)",
                        position: "relative",
                        border: "2px solid #22c55e",
                        boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        <div style={{
                            position: "absolute",
                            top: -15,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "linear-gradient(90deg, #22c55e, #16a34a)",
                            color: "white",
                            padding: "5px 20px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            boxShadow: "0 4px 15px rgba(34, 197, 94, 0.4)"
                        }}>
                            FREE
                        </div>
                        <h3 style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", margin: "0 0 10px 0" }}>Watch Ad</h3>
                        <div style={{ fontSize: "clamp(2.5rem, 8vw, 3rem)", fontWeight: 800, marginBottom: 20 }}>
                            FREE
                        </div>
                        <p style={{ color: "#e2e8f0", fontWeight: 500, marginBottom: 30, fontSize: "1.1rem" }}>
                            1 Credit
                        </p>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 15, color: "#cbd5e1", fontSize: "clamp(0.9rem, 3vw, 1rem)", textAlign: "left" }}>
                                <span style={{ marginRight: 10, color: "#22c55e", fontSize: 18, flexShrink: 0 }}>✓</span>
                                Watch a short video
                            </div>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 15, color: "#cbd5e1", fontSize: "clamp(0.9rem, 3vw, 1rem)", textAlign: "left" }}>
                                <span style={{ marginRight: 10, color: "#22c55e", fontSize: 18, flexShrink: 0 }}>✓</span>
                                Earn credits instantly
                            </div>
                        </div>
                        <button
                            onClick={handleWatchAd}
                            style={{
                                marginTop: 30,
                                padding: "16px 30px",
                                borderRadius: 10,
                                border: "none",
                                background: "#22c55e",
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
                            Watch Video
                        </button>
                    </div>

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

                {/* Mock Ad Modal */}
                <MockAdModal
                    isOpen={isAdModalOpen}
                    onClose={() => setIsAdModalOpen(false)}
                    onReward={handleAdReward}
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
        </div>
    );
}
