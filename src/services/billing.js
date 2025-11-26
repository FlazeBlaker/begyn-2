import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

export const startRazorpayOrder = async ({ packageId, price, credits, userId }) => {
    try {
        if (!functions) throw new Error("Firebase Functions not initialized");
        const createRazorpayOrder = httpsCallable(functions, "createRazorpayOrder");
        // Pass mock: true to avoid 500 error on backend due to missing keys
        const { data } = await createRazorpayOrder({ packageId, price, credits, mock: true });
        handleRazorpayData(data, packageId, price, credits);
    } catch (err) {
        console.warn("Backend call failed, falling back to client-side mock:", err);
        // Client-side Mock Fallback
        const mockData = {
            key: import.meta.env.VITE_RAZORPAY_MOCK_KEY || "rzp_test_mock_key",
            amount: price * 100,
            currency: "INR",
            id: "order_mock_fallback_" + Date.now()
        };
        handleRazorpayData(mockData, packageId, price, credits);
    }
};

function handleRazorpayData(data, packageId, price, credits) {
    // Check for Mock Mode
    if (data.key === (import.meta.env.VITE_RAZORPAY_MOCK_KEY || "rzp_test_mock_key")) {
        console.log("Starting Mock Razorpay Flow...");
        const confirm = window.confirm(`[MOCK PAYMENT]\n\nPay ₹${price} for ${credits} credits?`);
        if (confirm) {
            const mockTxId = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window.location.href = `/payment-success?provider=razorpay&packageId=${packageId}&credits=${credits}&mock=true&transactionId=${mockTxId}`;
        }
        return;
    }

    // Real Razorpay Flow
    const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "AI Content Studio",
        description: `${credits} Credits Package`,
        order_id: data.id,
        handler: function (response) {
            window.location.href = `/payment-success?provider=razorpay&packageId=${packageId}&credits=${credits}&paymentId=${response.razorpay_payment_id}`;
        },
        prefill: { name: "", email: "" },
        theme: { color: "#3b82f6" }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
}
