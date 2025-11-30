// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { updateProfile, deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from "firebase/auth";
// *** FIX: Import setDoc instead of updateDoc ***
import { doc, setDoc, deleteDoc, getDoc, onSnapshot } from "firebase/firestore";

const Section = ({ title, children }) => (
    <div style={{
        background: "var(--bg-card)",
        borderRadius: "16px",
        padding: "clamp(16px, 4vw, 24px)",
        marginBottom: "24px",
        border: "1px solid var(--border-color)"
    }}>
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "var(--text-primary)", fontSize: "clamp(1.1rem, 4vw, 1.2rem)" }}>{title}</h3>
        {children}
    </div>
);

const InputGroup = ({ label, value, onChange, type = "text", disabled = false }) => (
    <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "8px", fontSize: "0.9rem" }}>{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                background: disabled ? "var(--bg-input)" : "var(--bg-input)",
                border: "1px solid var(--border-color)",
                color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.2s",
                cursor: disabled ? "not-allowed" : "text",
                opacity: disabled ? 0.5 : 1,
                boxSizing: "border-box",
                minHeight: "44px"
            }}
            onFocus={(e) => !disabled && (e.target.style.borderColor = "#a855f7")}
            onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"}
        />
    </div>
);

const Toggle = ({ label, checked, onChange, disabled = false }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", minHeight: "44px" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "clamp(0.9rem, 3vw, 1rem)" }}>{label}</span>
        <div
            onClick={() => !disabled && onChange(!checked)}
            style={{
                width: "48px",
                height: "24px",
                background: checked ? "#a855f7" : "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                position: "relative",
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "background 0.3s ease",
                opacity: disabled ? 0.5 : 1,
                flexShrink: 0
            }}
        >
            <div style={{
                width: "20px",
                height: "20px",
                background: "#fff",
                borderRadius: "50%",
                position: "absolute",
                top: "2px",
                left: checked ? "26px" : "2px",
                transition: "left 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }} />
        </div>
    </div>
);

export default function SettingsPage() {
    const [user, setUser] = useState(auth.currentUser);
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [loading, setLoading] = useState(false);
    const [prefsLoading, setPrefsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const [darkMode, setDarkMode] = useState(true);
    const [autoSave, setAutoSave] = useState(true);

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, "users", user.uid);

        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDarkMode(data.darkMode ?? true);
                setAutoSave(data.autoSave ?? true);
            }
        }, (error) => {
            console.error("Settings snapshot error:", error);
            // Suppress permission errors if auth is in flux
            if (error.code !== 'permission-denied') {
                setMessage({ type: "error", text: "Could not load settings." });
            }
        });

        return () => unsubscribe();
    }, [user]);

    const savePreferences = async (updates) => {
        if (!user) return;

        setPrefsLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            // *** FIX: Use setDoc with merge: true ***
            // This creates the document if it's missing, or updates it if it exists.
            await setDoc(userRef, updates, { merge: true });

            setMessage({ type: "success", text: "Preferences saved!" });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (error) {
            console.error("Error saving preferences:", error);
            setMessage({ type: "error", text: `Failed to save: ${error.message}` });
        }
        setPrefsLoading(false);
    };



    const handleDarkModeChange = (value) => {
        setDarkMode(value);
        savePreferences({ darkMode: value });
    };

    const handleAutoSaveChange = (value) => {
        setAutoSave(value);
        savePreferences({ autoSave: value });
    };

    const handleUpdateProfile = async () => {
        if (!user) return;

        setLoading(true);
        setMessage({ type: "", text: "" });
        try {
            if (user.displayName !== displayName && displayName.trim()) {
                await updateProfile(user, { displayName: displayName.trim() });
                setMessage({ type: "success", text: "Display name updated successfully!" });
            } else if (!displayName.trim()) {
                setMessage({ type: "error", text: "Display name cannot be empty" });
            } else {
                setMessage({ type: "info", text: "No changes to save" });
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: "error", text: error.message });
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        const confirmText = "Are you sure you want to delete your account? Type 'DELETE' to confirm.";
        const userInput = window.prompt(confirmText);

        if (userInput !== "DELETE") return;

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const userDocRef = doc(db, "users", user.uid);
            const brandDocRef = doc(db, "brands", user.uid);

            // Archive data logic here (omitted for brevity, same as before)

            try {
                await deleteDoc(userDocRef);
                await deleteDoc(brandDocRef);
                await deleteUser(user);
            } catch (error) {
                if (error.code === 'auth/requires-recent-login') {
                    const provider = new GoogleAuthProvider();
                    await reauthenticateWithPopup(user, provider);
                    await deleteDoc(userDocRef);
                    await deleteDoc(brandDocRef);
                    await deleteUser(user);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error("Error deleting account:", error);
            setMessage({ type: "error", text: `Failed to delete account: ${error.message}` });
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "clamp(16px, 5vw, 40px)", maxWidth: "800px", margin: "0 auto", color: "#fff" }}>
            <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2rem)", marginBottom: "10px", background: "linear-gradient(90deg, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Settings</h1>
            <p style={{ color: "#94a3b8", marginBottom: "clamp(24px, 5vw, 40px)", fontSize: "clamp(0.9rem, 3vw, 1rem)" }}>Manage your account preferences and settings.</p>

            {message.text && (
                <div style={{
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : message.type === "info" ? "rgba(59, 130, 246, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    color: message.type === "success" ? "#4ade80" : message.type === "info" ? "#60a5fa" : "#f87171",
                    border: `1px solid ${message.type === "success" ? "rgba(34, 197, 94, 0.2)" : message.type === "info" ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                }}>
                    {message.text}
                </div>
            )}

            <Section title="Profile Information">
                <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "24px" }}>
                    <div style={{
                        width: "clamp(60px, 15vw, 80px)",
                        height: "clamp(60px, 15vw, 80px)",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #a855f7, #ec4899)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(1.5rem, 5vw, 2rem)",
                        fontWeight: "bold",
                        color: "white",
                        boxShadow: "0 4px 20px rgba(168, 85, 247, 0.3)",
                        flexShrink: 0
                    }}>
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="User" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                </div>
                <InputGroup label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <InputGroup label="Email Address (Read-only)" value={user?.email || ""} disabled={true} />
                <button onClick={handleUpdateProfile} disabled={loading} style={{
                    background: "linear-gradient(90deg, #7c3aed, #9333ea)",
                    color: "#fff",
                    border: "none",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    marginTop: "8px",
                    width: "100%",
                    maxWidth: "200px",
                    minHeight: "44px",
                    cursor: loading ? "wait" : "pointer",
                    opacity: loading ? 0.7 : 1
                }}>
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </Section>

            <Section title="App Preferences">

                <Toggle label="Dark Mode" checked={darkMode} onChange={handleDarkModeChange} disabled={prefsLoading} />
                <Toggle label="Auto-save Generated Content" checked={autoSave} onChange={handleAutoSaveChange} disabled={prefsLoading} />
            </Section>

            <Section title="Account Actions">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <h4 style={{ margin: "0 0 4px 0", color: "#f87171", fontSize: "1rem" }}>Delete Account</h4>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Permanently remove your account and all data.</p>
                    </div>
                    <button onClick={handleDeleteAccount} disabled={loading} style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#f87171",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        cursor: loading ? "wait" : "pointer",
                        fontWeight: "600",
                        width: "100%",
                        minHeight: "44px"
                    }}>
                        {loading ? "Processing..." : "Delete Account"}
                    </button>
                </div>
            </Section>
        </div>
    );
}