import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowRight, Sparkles, CheckCircle, Star, Zap, TrendingUp, Users } from 'lucide-react';
import ParticleBackground from '../components/ParticleBackground';
import ScrollReveal from '../components/ScrollReveal';

// Modern Minimal Navbar
const Navbar = ({ user }) => (
    <nav className="glass-premium" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', maxWidth: '1400px', margin: '20px auto', borderRadius: '99px',
        position: 'relative', zIndex: 100
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logos/logo.png" alt="Begyn" style={{ height: '40px' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-1px' }}>Begyn</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {user ? (
                <Link to="/dashboard" className="cyber-button" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
                    Dashboard <ArrowRight size={16} />
                </Link>
            ) : (
                <Link to="/login" className="cyber-button" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
                    Sign In
                </Link>
            )}
        </div>
    </nav>
);

// Ultra Modern Hero
const Hero = ({ user }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');

    return (
        <section style={{
            minHeight: '90vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            padding: '60px 20px', position: 'relative', overflow: 'hidden'
        }}>
            {/* Gradient Orbs */}
            <div className="floating-orb" style={{
                position: 'absolute', top: '15%', left: '5%', width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(124, 77, 255, 0.25) 0%, transparent 70%)',
                filter: 'blur(80px)', zIndex: 0
            }} />
            <div className="floating-orb" style={{
                position: 'absolute', bottom: '10%', right: '5%', width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(206, 147, 216, 0.2) 0%, transparent 70%)',
                filter: 'blur(100px)', zIndex: 0, animationDelay: '3s'
            }} />

            <div style={{ maxWidth: '1200px', position: 'relative', zIndex: 1 }}>
                {/* Badge */}
                <ScrollReveal animation="fadeIn">
                    <div className="glow-pulse" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 24px', borderRadius: '99px', marginBottom: '40px',
                        background: 'linear-gradient(135deg, rgba(124, 77, 255, 0.15), rgba(206, 147, 216, 0.15))',
                        border: '1px solid rgba(124, 77, 255, 0.3)', color: '#CE93D8', fontWeight: '700',
                        fontSize: '0.95rem', boxShadow: '0 0 40px rgba(124, 77, 255, 0.2)'
                    }}>
                        <Sparkles size={18} />
                        Powered by Advanced AI
                    </div>
                </ScrollReveal>

                {/* Main Headline */}
                <ScrollReveal animation="fadeUp" delay={0.2}>
                    <h1 style={{
                        fontSize: 'clamp(3rem, 8vw, 7rem)', fontWeight: '900',
                        lineHeight: '1.1', marginBottom: '32px', letterSpacing: '-3px'
                    }}>
                        Master Social Media<br />
                        <span className="gradient-text">With AI Guidance</span>
                    </h1>
                </ScrollReveal>

                {/* Subheadline */}
                <ScrollReveal animation="fadeUp" delay={0.3}>
                    <p style={{
                        fontSize: 'clamp(1.15rem, 2vw, 1.4rem)', color: '#cbd5e1',
                        maxWidth: '800px', margin: '0 auto 48px', lineHeight: '1.6'
                    }}>
                        Your personalized AI roadmap to become an influencer.<br />
                        <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Get daily tasks, viral content ideas, and proven strategies.</span>
                    </p>
                </ScrollReveal>

                {/* CTA */}
                <ScrollReveal animation="scale" delay={0.4}>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
                        {!user && (
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-premium"
                                style={{
                                    padding: '20px 32px', fontSize: '1.05rem', borderRadius: '99px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(0,0,0,0. 25)', backdropFilter: 'blur(10px)',
                                    color: '#fff', outline: 'none', minWidth: '320px'
                                }}
                            />
                        )}
                        <button
                            onClick={() => user ? navigate('/dashboard') : navigate('/login', { state: { email, authMode: 'signup' } })}
                            className="cyber-button ripple-button magnetic-button"
                            style={{
                                padding: '20px 56px', fontSize: '1.2rem', borderRadius: '99px',
                                fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px',
                                boxShadow: '0 15px 40px -10px rgba(124, 77, 255, 0.6)'
                            }}
                        >
                            {user ? 'Go to Dashboard' : 'Start Free Today'} <ArrowRight size={22} />
                        </button>
                    </div>
                    {!user && (
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            ✓ Free forever • ✓ No credit card required • ✓ 10 free credits to start
                        </p>
                    )}
                </ScrollReveal>

                {/* Trust Indicators */}
                <ScrollReveal animation="fadeUp" delay={0.5}>
                    <div style={{
                        display: 'flex', gap: '48px', justifyContent: 'center', marginTop: '80px',
                        flexWrap: 'wrap'
                    }}>
                        {[
                            { icon: Users, value: '10K+', label: 'Active Creators' },
                            { icon: Zap, value: '1M+', label: 'Content Generated' },
                            { icon: TrendingUp, value: '5x', label: 'Avg. Growth Rate' }
                        ].map((stat, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <stat.icon size={32} style={{ color: '#7C4DFF', marginBottom: '12px' }} />
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', marginBottom: '4px' }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
};

// Value Props Section
const ValueProps = () => {
    const props = [
        {
            icon: Star,
            title: 'AI-Powered Roadmap',
            desc: 'Get a personalized, step-by-step plan tailored to your niche and goals.'
        },
        {
            icon: Sparkles,
            title: 'Viral Content Ideas',
            desc: 'Never run out of inspiration with AI-generated trending content ideas.'
        },
        {
            icon: Zap,
            title: 'Instant Generation',
            desc: 'Create captions, scripts, and posts in seconds with our AI suite.'
        }
    ];

    return (
        <section style={{ padding: '120px 20px', maxWidth: '1200px', margin: '0 auto' }}>
            <ScrollReveal animation="fadeUp">
                <h2 style={{
                    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: '800',
                    textAlign: 'center', marginBottom: '80px'
                }}>
                    Everything You Need to <span className="gradient-text">Go Viral</span>
                </h2>
            </ScrollReveal>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '32px'
            }}>
                {props.map((prop, i) => (
                    <ScrollReveal key={i} animation="fadeUp" delay={i * 0.1}>
                        <div className="glass-premium hover-lift-glow perspective-card" style={{
                            padding: '48px 32px', borderRadius: '24px', textAlign: 'center'
                        }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 24px',
                                background: 'linear-gradient(135deg, rgba(124, 77, 255, 0.2), rgba(206, 147, 216, 0.2))',
                                border: '1px solid rgba(124, 77, 255, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <prop.icon size={36} color="#7C4DFF" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: '#fff' }}>
                                {prop.title}
                            </h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.7', fontSize: '1.05rem' }}>
                                {prop.desc}
                            </p>
                        </div>
                    </ScrollReveal>
                ))}
            </div>
        </section>
    );
};

// Final CTA
const FinalCTA = ({ user }) => {
    const navigate = useNavigate();

    return (
        <section style={{ padding: '120px 20px' }}>
            <ScrollReveal animation="scale">
                <div className="glass-premium animated-border" style={{
                    maxWidth: '900px', margin: '0 auto', padding: '80px 48px',
                    borderRadius: '32px', textAlign: 'center'
                }}>
                    <h2 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '900',
                        marginBottom: '24px', lineHeight: '1.2'
                    }}>
                        Ready to Become an <span className="gradient-text">Influencer</span>?
                    </h2>
                    <p style={{ fontSize: '1.2rem', color: '#cbd5e1', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
                        Join thousands of creators already growing their audience with AI-powered guidance.
                    </p>
                    <button
                        onClick={() => user ? navigate('/dashboard') : navigate('/login')}
                        className="cyber-button ripple-button magnetic-button"
                        style={{
                            padding: '22px 64px', fontSize: '1.25rem', borderRadius: '99px',
                            fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '12px',
                            boxShadow: '0 15px 50px -10px rgba(124, 77, 255, 0.7)'
                        }}
                    >
                        {user ? 'Go to Dashboard' : 'Start Your Journey'} <ArrowRight size={24} />
                    </button>
                </div>
            </ScrollReveal>
        </section>
    );
};

// Footer
const Footer = () => (
    <footer style={{
        padding: '48px 20px 32px', borderTop: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center', color: '#94a3b8'
    }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '32px', justifyContent: 'center' }}>
            <Link to="/terms" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Terms</Link>
            <Link to="/privacy" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Privacy</Link>
        </div>
        <p style={{ fontSize: '0.9rem' }}>© 2025 Begyn. All rights reserved.</p>
    </footer>
);

// Main Landing Page
export default function LandingPage() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    return (
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            <ParticleBackground
                particleCount={50}
                particleColor="rgba(124, 77, 255, 0.5)"
                speed={0.25}
                interactive={true}
            />

            <Navbar user={user} />
            <Hero user={user} />
            <ValueProps />
            <FinalCTA user={user} />
            <Footer />
        </div>
    );
}
