// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        // Apply default dark theme immediately
        applyTheme(true);

        // Listen to auth state changes
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                // Default to dark mode if not logged in
                applyTheme(true);
                setIsDarkMode(true);
                return;
            }

            // Listen to user preferences in Firestore
            const userRef = doc(db, 'users', user.uid);
            const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const darkMode = data.darkMode ?? true;
                    setIsDarkMode(darkMode);
                    applyTheme(darkMode);
                    console.log('Theme applied:', darkMode ? 'dark' : 'light');
                }
            }, (error) => {
                console.error("Theme snapshot error:", error);
                // Ignore permission errors during logout
                if (error.code === 'permission-denied') {
                    console.warn("Theme context permission denied (likely logout). Ignoring.");
                }
            });

            // Return cleanup for snapshot listener
            return () => unsubscribeSnapshot();
        });

        return () => unsubscribeAuth();
    }, []);

    const applyTheme = (darkMode) => {
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.style.colorScheme = 'light';
        }
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

