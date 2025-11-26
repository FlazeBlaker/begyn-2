// src/services/credits.js
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * getUserCredits(uid)
 * returns { credits: number, planId: string|null, planType: "monthly"|"yearly"|null }
 */
export async function getUserCredits(uid) {
    const ref = doc(db, "brands", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { credits: 0, planId: null, planType: null };
    const data = snap.data();
    return {
        credits: data.credits ?? 0,
        planId: data.planId ?? null,
        planType: data.planType ?? null,
    };
}

/**
 * grantCredits(uid, amount, planId = null, planType = null)
 * Adds credits and optionally sets the plan fields.
 */
export async function grantCredits(uid, amount, planId = null, planType = null) {
    const ref = doc(db, "brands", uid);
    // Use updateDoc to increment, set merge true on server if creating doc
    try {
        // client-side atomic update not available directly; use a transaction in server/Cloud Function or Firestore Transaction
        // Simple best-effort update:
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};
        const newCredits = (data.credits || 0) + amount;
        const payload = { credits: newCredits };
        if (planId) payload.planId = planId;
        if (planType) payload.planType = planType;
        await updateDoc(ref, payload);
        return true;
    } catch (err) {
        console.error("grantCredits error:", err);
        throw err;
    }
}

/**
 * consumeCredits(uid, amount)
 * Deduct amount if available; returns true if succeeded, false if not enough.
 */
export async function consumeCredits(uid, amount) {
    const ref = doc(db, "brands", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    const current = data.credits || 0;
    if (current < amount) return false;
    await updateDoc(ref, { credits: current - amount });
    return true;
}
