import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, doc, getDoc, GoogleAuthProvider, signInWithPopup } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { Sparkles, ArrowRight, CheckCircle, Shield, Cpu } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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

            const introSeen = snap.exists() && snap.data()?.introSeen;
            const onboarded = snap.exists() && snap.data()?.onboarded;

            if (!introSeen) {
                navigate('/intro', { replace: true });
            } else {
                navigate(onboarded ? '/dashboard' : '/flow', { replace: true });
            }
        } catch (err) {
            console.error("Login failed:", err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(`Login failed: ${err.message || "Unknown error"}`);
            }
            setLoading(false);
        }
    };

    const handleEmailLogin = async () => {
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const userRef = doc(db, "brands", result.user.uid);
            const snap = await getDoc(userRef);

            const introSeen = snap.exists() && snap.data()?.introSeen;
            const onboarded = snap.exists() && snap.data()?.onboarded;

            if (!introSeen) {
                navigate('/intro', { replace: true });
            } else {
                navigate(onboarded ? '/dashboard' : '/flow', { replace: true });
            }
        } catch (err) {
            console.error("Email login failed:", err);
            setError(`Login failed: ${err.message}`);
            setLoading(false);
        }
    };

    if (authChecking) return null;

    return (
        <div className="login-container" style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>
            {/* Background Elements */}
            <div className="orb-glowing" style={{ top: '-10%', left: '-10%' }}></div>
            <div className="orb-glowing" style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(206, 147, 216, 0.4) 0%, transparent 70%)' }}></div>
            <div className="scan-line"></div>

            {/* LEFT SIDE: Visuals */}
            <div className="desktop-only" style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px',
                position: 'relative', zIndex: 1
            }}>
                <div className="stagger-1" style={{ maxWidth: '600px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: '99px',
                        background: 'rgba(124, 77, 255, 0.1)', border: '1px solid rgba(124, 77, 255, 0.2)',
                        color: '#CE93D8', marginBottom: '32px', fontWeight: '600'
                    }} className="reflection">
                        <Cpu size={16} /> AI-Powered Creation Engine
                    </div>
                    <h1 style={{
                        fontSize: '4.5rem', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px',
                        color: '#fff'
                    }}>
                        Turn Ideas into <br />
                        <span className="aurora-text">Viral Content.</span>
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: '#a0a0b0', marginBottom: '40px', lineHeight: '1.6' }} className="shimmer-text">
                        Join thousands of creators using Begyn AI to dominate LinkedIn, Twitter, and Instagram.
                        No design skills needed.
                    </p>

                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div className="hover-lift-glow" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '12px' }}>
                            <div className="status-dot"></div>
                            <span style={{ color: '#e0e0e0', fontWeight: '500' }}>Free Forever Plan</span>
                        </div>
                        <div className="hover-lift-glow" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '12px' }}>
                            <Shield size={20} color="#22c55e" />
                            <span style={{ color: '#e0e0e0', fontWeight: '500' }}>No Credit Card</span>
                            <img src="/logos/logo.png" alt="Logo" style={{ height: '64px' }} />
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '12px', color: '#fff' }}>Welcome Back</h2>
                        <p style={{ color: '#a0a0b0' }}>Sign in to continue to your dashboard</p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#fca5a5', padding: '12px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="cyber-button"
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.8 : 1,
                            position: 'relative', zIndex: 50
                        }}
                    >
                        {loading ? (
                            <span>Initializing...</span>
                        ) : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
                                Continue with Google
                            </>
                        )}
                    </button>

                    {/* Temporary Developer Login */}
                    <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                        <p style={{ color: '#a0a0b0', fontSize: '0.8rem', marginBottom: '12px', textAlign: 'center' }}>Developer Login (Razorpay Test)</p>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                            }}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                            }}
                        />
                        <button
                            onClick={handleEmailLogin}
                            disabled={loading}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: 'rgba(124, 77, 255, 0.2)', border: '1px solid rgba(124, 77, 255, 0.3)',
                                color: '#CE93D8', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Login with Email
                        </button>
                    </div>

                    <div className="neon-separator"></div>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#525252', fontSize: '0.85rem' }}>
                            By continuing, you agree to our <Link to="/terms" className="text-glow-purple" style={{ color: '#a0a0b0' }}>Terms</Link> and <Link to="/privacy" className="text-glow-purple" style={{ color: '#a0a0b0' }}>Privacy Policy</Link>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}