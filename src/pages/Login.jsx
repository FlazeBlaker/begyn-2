// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, doc, getDoc, GoogleAuthProvider, signInWithPopup } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const styles = `
@keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); } 50% { box-shadow: 0 0 40px rgba(236, 72, 153, 0.6); } }
@keyframes spin { to { transform: rotate(360deg); } }
`;

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);
    const [error, setError] = useState(null);

    // Robust Auth Check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                navigate('/dashboard', { replace: true });
            } else {
                setAuthChecking(false);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider());
            const userRef = doc(db, "brands", result.user.uid);
            const snap = await getDoc(userRef);
            const onboarded = snap.exists() && snap.data()?.onboarded;
            navigate(onboarded ? '/dashboard' : '/guide/onboarding', { replace: true });
        } catch (err) {
            console.error("Login failed:", err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(`Login failed: ${err.message || "Unknown error"}`);
            }
            setLoading(false);
        }
    };

    // Don't render anything while checking auth status to prevent flicker
    if (authChecking) return null;

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(-45deg, #0f0c29, #302b63, #24243e, #1a1a2e)',
            backgroundSize: '400% 400%',
            animation: 'gradientBG 15s ease infinite',
            overflow: 'hidden',
            padding: '20px'
        }}>
            <style>{styles}</style>

            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'clamp(16px, 4vw, 24px)',
                padding: 'clamp(32px, 8vw, 60px) clamp(20px, 6vw, 40px)',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                animation: 'fadeIn 0.8s'
            }}>
                <div style={{
                    width: 'clamp(60px, 18vw, 80px)',
                    height: 'clamp(60px, 18vw, 80px)',
                    margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(2rem, 6vw, 2.5rem)',
                    animation: 'glow 3s infinite'
                }}>
                    ✨
                </div>

                <h1 style={{
                    fontSize: 'clamp(1.8rem, 6vw, 2.5rem)',
                    fontWeight: '800',
                    marginBottom: '12px',
                    background: 'linear-gradient(to right, #fff, #e0e0e0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    AI Content Studio
                </h1>

                <p style={{
                    color: '#94a3b8',
                    fontSize: 'clamp(0.95rem, 3vw, 1.1rem)',
                    lineHeight: '1.6',
                    marginBottom: 'clamp(24px, 6vw, 40px)'
                }}>
                    Create viral social media content in seconds with AI.
                </p>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        padding: '12px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: 'clamp(14px, 4vw, 16px)',
                        minHeight: '48px',
                        background: 'white',
                        color: '#1e293b',
                        border: 'none',
                        borderRadius: 'clamp(12px, 3vw, 16px)',
                        fontSize: 'clamp(0.95rem, 3vw, 1.1rem)',
                        fontWeight: '700',
                        cursor: loading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.8 : 1,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {loading ? (
                        <>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                border: '3px solid #cbd5e1',
                                borderTopColor: '#475569',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <span>Signing in...</span>
                        </>
                    ) : (
                        <>
                            <img
                                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                alt="Google"
                                style={{ width: '24px', height: '24px' }}
                            />
                            <span>Sign in with Google</span>
                        </>
                    )}
                </button>

                <p style={{
                    marginTop: '32px',
                    color: '#64748b',
                    fontSize: '0.9rem'
                }}>
                    By signing in, you agree to our Terms & Privacy Policy.
                </p>
            </div>
        </div>
    );
}