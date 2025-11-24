import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    updateDoc
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Connect to emulator if on localhost
// if (window.location.hostname === "localhost") {
//     connectFunctionsEmulator(functions, "localhost", 5001);
//     console.log("Connected to Functions Emulator");
// }

// --- Helper: Sanitize Content for History ---
const sanitizeContentForHistory = (content) => {
    if (!content) return content;
    try {
        // Create a safe copy with only primitive values
        const sanitize = (obj) => {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(sanitize);

            const clean = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value === null || value === undefined) {
                    clean[key] = value;
                } else if (typeof value === 'string') {
                    // Only truncate data URLs (base64 images), not regular text like captions
                    if (value.startsWith('data:image/') || value.startsWith('data:application/')) {
                        clean[key] = `[TRUNCATED: ${value.length} chars]`;
                    } else {
                        clean[key] = value;
                    }
                } else if (typeof value === 'number' || typeof value === 'boolean') {
                    clean[key] = value;
                } else if (Array.isArray(value)) {
                    clean[key] = sanitize(value);
                } else if (typeof value === 'object') {
                    // Recursively sanitize nested objects instead of stringifying
                    clean[key] = sanitize(value);
                }
            }
            return clean;
        };

        return sanitize(content);
    } catch (err) {
        console.error("Error sanitizing content:", err);
        return { error: "Could not sanitize content", type: content?.type || "unknown" };
    }
};

// --- Helper: Upload Image to Storage ---
/**
 * Uploads a base64 image string to Firebase Storage.
 * @param {string} uid The user's UID.
 * @param {string} base64Data The base64 image data (with or without prefix).
 * @returns {Promise<string>} The public download URL of the uploaded image.
 */
export const uploadImageToStorage = async (uid, base64Data) => {
    if (!uid || !base64Data) return null;

    try {
        // Ensure clean base64 string
        const cleanBase64 = base64Data.includes('base64,') ? base64Data : `data:image/png;base64,${base64Data}`;

        // Create a unique filename
        const filename = `generated_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
        const storageRef = ref(storage, `users/${uid}/${filename}`);

        // Upload
        await uploadString(storageRef, cleanBase64, 'data_url');

        // Get URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log("Image uploaded to storage:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image to storage:", error);
        throw error;
    }
};

// --- Function to Log User Action to History (Exported Inline) ---
/**
 * Logs user actions (copy, download, generate) to the Firestore 'history' subcollection.
 * @param {string} uid The current user's UID.
 * @param {string} type The action type ('copy', 'download', 'generate_post', etc.).
 * @param {object} content The content details (e.g., text, image URL, options).
 */
export const logUserAction = async (uid, type, content) => {
    if (!uid) {
        console.error("Cannot log action: User is not authenticated.");
        return;
    }
    try {
        // Always sanitize content to remove undefined values and flatten nested objects
        const sanitizedContent = sanitizeContentForHistory(content);

        // Save to users/{uid}/history subcollection
        await addDoc(collection(db, "users", uid, "history"), {
            type: type,
            content: sanitizedContent,
            timestamp: serverTimestamp(),
        });
        console.log(`Action logged: ${type}`);
    } catch (e) {
        console.error("Error logging user action:", e);
    }
};

// Export everything else we need
export {
    app,
    auth,
    db,
    functions,
    storage,
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    updateDoc,

    // Exports for Google Sign-In Pop-up flow:
    GoogleAuthProvider,
    signInWithPopup,
};