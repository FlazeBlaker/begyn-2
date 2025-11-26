import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { functions } from "../services/firebase";
import { httpsCallable } from "firebase/functions";

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("verifying"); // verifying | success | error
    const [errorMessage, setErrorMessage] = useState("");

    const processedRef = React.useRef(false);

    useEffect(() => {
        const verifyPayment = async () => {
            // Prevent double processing in React Strict Mode or rapid re-renders
            if (processedRef.current) return;

            const packageId = searchParams.get("packageId");
            const credits = searchParams.get("credits");
            const provider = searchParams.get("provider");
            const mock = searchParams.get("mock");
            const transactionId = searchParams.get("transactionId");

            // If no params, it means we likely already processed and cleared them, or user navigated here directly
            if (!packageId || !credits) {
                // If we don't have params but status is still verifying, it's an error or invalid access
                if (status === "verifying") {
                    // Check if we just finished processing (optional: could use local storage state)
                    // For now, just redirect or show error if accessed without params
                    setStatus("error");
                    setErrorMessage("Invalid or missing payment details.");
                }
                return;
            }

            processedRef.current = true;

            try {
                // Call backend to confirm and update credits
                const confirmPayment = httpsCallable(functions, "confirmPayment");
                await confirmPayment({ packageId, credits: parseInt(credits), provider, mock, transactionId });

                setStatus("success");

                // Clear URL params to prevent re-processing on refresh
                // We replace the current entry in history so the back button doesn't take them back to the parameterized URL
                navigate("/payment-success", { replace: true });

            } catch (err) {
                console.error("Backend verification failed:", err);
                setErrorMessage(err.message || "Unknown error");
                setStatus("error");
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    return (
        <div style={{
            minHeight: "100vh",
            background: "#070712",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, system-ui"
        }}>
            <div style={{ textAlign: "center", padding: 40, background: "rgba(255,255,255,0.03)", borderRadius: 20 }}>
                {status === "verifying" && (
                    <>
                        <h2 style={{ fontSize: 24, marginBottom: 10 }}>Verifying Payment...</h2>
                        <p style={{ color: "#94a3b8" }}>Please wait while we update your account.</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
                        <h2 style={{ fontSize: 28, marginBottom: 10, color: "#10b981" }}>Payment Successful!</h2>
                        <p style={{ color: "#cbd5e1", marginBottom: 30 }}>Your credits have been added to your account.</p>
                        <button
                            onClick={() => navigate("/")}
                            style={{
                                padding: "12px 24px",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: "pointer"
                            }}
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <h2 style={{ fontSize: 24, marginBottom: 10, color: "#ef4444" }}>Something went wrong</h2>
                        <p style={{ color: "#94a3b8", marginBottom: 30 }}>
                            We couldn't verify your payment. <br />
                            <span style={{ fontSize: "0.8em", color: "#64748b" }}>{errorMessage}</span>
                        </p>
                        <button
                            onClick={() => navigate("/")}
                            style={{
                                padding: "12px 24px",
                                background: "rgba(255,255,255,0.1)",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                cursor: "pointer"
                            }}
                        >
                            Back Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
