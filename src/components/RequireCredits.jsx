// src/components/RequireCredits.jsx
import React, { useEffect, useState } from "react";
import { auth } from "../services/firebase";
import { getUserCredits, consumeCredits } from "../services/credits";

export default function RequireCredits({ creditsNeeded = 1, onInsufficient, children }) {
    const [ready, setReady] = useState(false);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const u = auth.currentUser;
            if (!u) {
                if (mounted) {
                    setAllowed(false);
                    setReady(true);
                }
                return;
            }
            const data = await getUserCredits(u.uid);
            if (!mounted) return;
            setAllowed((data.credits || 0) >= creditsNeeded);
            setReady(true);
        })();
        return () => (mounted = false);
    }, [creditsNeeded]);

    if (!ready) return null;
    if (!allowed) {
        return (
            <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>This feature requires {creditsNeeded} credits.</div>
                <div style={{ display: "flex", gap: 8 }}>
                    <a href="/pricing" style={{ padding: "8px 12px", background: "#7c3aed", color: "#fff", borderRadius: 8 }}>Buy Credits</a>
                    <button onClick={() => onInsufficient && onInsufficient()} style={{ padding: "8px 12px" }}>Cancel</button>
                </div>
            </div>
        );
    }

    // Allowed — we expose the children but you should call consumeCredits server-side on actual use
    return <div>{children}</div>;
}
