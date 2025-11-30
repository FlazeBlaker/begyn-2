import React, { useState, useEffect } from "react";
import { auth, db, doc, getDoc } from "../services/firebase";
import { getUserCredits, CREDIT_PACKAGES } from "../services/razorpay";
import PaymentModal from "../components/PaymentModal";
import Toast from "../components/Toast";

export default function PricingPage() {
    const [userInfo, setUserInfo] = useState({});
    const [credits, setCredits] = useState(0);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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

                {/* Pricing Cards */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "clamp(20px, 4vw, 30px)",
                    justifyContent: "center",
                    marginBottom: "60px"
                }}>
                    {packages.map((pkg) => (
                        <div key={pkg.id} style={{
                            background: "rgba(30, 41, 59, 0.6)",
                            backdropFilter: "blur(10px)",
                            borderRadius: 24,
                            padding: "30px",
                            border: pkg.popular ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                            transform: "translateY(0)",
                            cursor: "default"
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-10px)";
                                e.currentTarget.style.boxShadow = pkg.popular ? "0 20px 40px rgba(168, 85, 247, 0.2)" : "0 20px 40px rgba(0,0,0,0.3)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            {pkg.popular && (
                                <div style={{
                                    position: "absolute",
                                    top: -12,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "#a855f7",
                                    color: "white",
                                    padding: "4px 16px",
                                    borderRadius: 20,
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    boxShadow: "0 4px 10px rgba(168, 85, 247, 0.4)"
                                }}>
                                    MOST POPULAR
                                </div>
                            )}

                            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 10 }}>{pkg.name}</h3>
                            <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px" }}>
                                <span style={{ fontSize: "1.5rem", opacity: 0.7 }}>₹</span>{pkg.price}
                            </div>

                            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 30px 0", textAlign: "left", flex: 1 }}>
                                {pkg.features.map((feature, i) => (
                                    <li key={i} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1" }}>
                                        <span style={{ color: "#22c55e", fontSize: "1.2rem" }}>✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={handlePurchase}
                                style={{
                                    width: "100%",
                                    padding: "16px",
                                    borderRadius: 16,
                                    border: "none",
                                    background: pkg.popular ? "linear-gradient(135deg, #a855f7, #ec4899)" : "rgba(255,255,255,0.1)",
                                    color: "white",
                                    fontSize: "1.1rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = 0.9}
                                onMouseLeave={(e) => e.target.style.opacity = 1}
                            >
                                Buy Now
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 40, color: "#64748b", fontSize: "0.9rem" }}>
                    Secure payment via Razorpay. Credits never expire.
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
    );
}
