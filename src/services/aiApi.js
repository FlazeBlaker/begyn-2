// src/services/aiApi.js
import { auth } from "./firebase";

export async function generateContent({ type, payload = {} }) {
    // 1. Ensure user is logged in
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Not logged in");
    }

    // 2. Get Firebase ID token (needed for Authorization)
    const idToken = await user.getIdToken(true);

    // 3. Ensure chatId exists (your backend requires it)
    const securePayload = {
        ...payload,
        chatId:
            payload.chatId ||
            `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };

    // 4. Call your Firebase HTTPS function
    const res = await fetch(
        // "", // Production
        "https://us-central1-ai-social-media-19b8b.cloudfunctions.net/generateContent", // Emulator
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({
                type,
                payload: securePayload
            })
        }
    );

    // 5. Parse server response
    const data = await res.json();

    if (!res.ok) {
        console.error("Backend Error:", data);
        throw new Error(data.error || "Server error");
    }

    return data.result;
}
