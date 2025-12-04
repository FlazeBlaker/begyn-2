import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Zap, Layout, PenTool, Image as ImageIcon, CheckCircle,
    MessageSquare, ArrowRight, Shield, Globe, Star, LayoutDashboard, LogIn, Cpu, Video, Plus, Minus
} from 'lucide-react';
import AdUnit from '../components/AdUnit';

// --- COMPONENTS ---

const Navbar = ({ user }) => {
    const handleLogout = () => auth.signOut();

    return (
        <nav className="glass-premium" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 40px', maxWidth: '1200px', margin: '20px auto', borderRadius: '99px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/logos/logo.png" alt="Begyn" style={{ height: '40px' }} />
                <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-1px' }}>Begyn</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                {user ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '6px 16px',
                        borderRadius: '99px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: '700', color: '#fff'
                        }}>
                            {user.displayName?.charAt(0) || 'U'}
                        </div>
                        <span style={{ color: '#e0e0e0', fontWeight: '500', fontSize: '0.95rem' }}>
                            Hi, <span style={{ color: '#fff', fontWeight: '600' }}>{user.displayName?.split(' ')[0]}</span>
                        </span>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#a0a0b0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ff4444'}
                            onMouseLeave={(e) => e.target.style.color = '#a0a0b0'}
                            title="Logout"
                        >
                            <LogIn size={18} />
                        </button>
                    </div>
                ) : (
                    <Link to="/login" style={{ textDecoration: 'none', color: '#fff', fontWeight: '600' }}>Login</Link>
                )}
            </div>
        </nav>
    );
};

const Hero = ({ user }) => {
    const navigate = useNavigate();

    const handleCtaClick = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <section style={{
            textAlign: 'center', padding: '100px 20px', maxWidth: '1000px', margin: '0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
            <div className="stagger-1" style={{
                display: 'inline-block', padding: '6px 16px', borderRadius: '99px',
                background: 'rgba(168, 85, 247, 0.1)', color: '#d8b4fe', marginBottom: '24px',
                border: '1px solid rgba(168, 85, 247, 0.2)', fontSize: '0.9rem', fontWeight: '600'
            }}>
                ✨ The #1 AI Content Suite
            </div>
            <div className="stagger-2" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                marginBottom: '32px', position: 'relative'
            }}>
                <div className="glass-premium hover-lift-glow" style={{
                    padding: '24px 48px', borderRadius: '32px',
                    display: 'flex', alignItems: 'center', gap: '24px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px -10px rgba(168, 85, 247, 0.3)'
                }}>
                    <img
                        src="/logos/logo.png"
                        alt="Begyn Logo"
                        style={{
                            height: 'clamp(60px, 10vw, 100px)',
                            filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))'
                        }}
                    />
                    <h1 style={{
                        fontSize: 'clamp(3.5rem, 8vw, 6rem)',
                        fontWeight: '900',
                        lineHeight: '1',
                        margin: 0,
                        letterSpacing: '-2px',
                        color: '#fff'
                    }}>
                        <span className="aurora-text">Begyn</span>
                    </h1>
                </div>
            </div>
            <p className="stagger-3" style={{ fontSize: '1.2rem', color: '#a0a0b0', maxWidth: '700px', margin: '0 auto 40px' }}>
                Don't know where to start from?
                <br />
                Follow our step-by-step guide to master your social media journey.
            </p>
            <div className="stagger-3" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button onClick={handleCtaClick} className="cyber-button" style={{ padding: '16px 40px', fontSize: '1.1rem', borderRadius: '99px' }}>
                    {user ? (
                        <>Go to Dashboard <ArrowRight size={18} /></>
                    ) : (
                        <>Start Creating Free <ArrowRight size={18} /></>
                    )}
                </button>
            </div>
        </section>
    );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
    <div className="glass-premium hover-lift-glow tech-corners" style={{ padding: '32px', borderRadius: '16px' }}>
        <div style={{
            width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(168, 85, 247, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#a855f7'
        }}>
            <Icon size={28} />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', color: '#fff' }}>{title}</h3>
        <p style={{ color: '#a0a0b0', lineHeight: '1.6' }}>{desc}</p>
    </div>
);

// --- DRAGGABLE MARQUEE COMPONENT ---
const DraggableMarquee = ({ children, speed = 0.5 }) => {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState(0);
    const [singleWidth, setSingleWidth] = useState(0);
    const animationRef = useRef(null);
    const lastX = useRef(0);

    // Measure width and set initial position
    useEffect(() => {
        const measure = () => {
            if (contentRef.current) {
                const total = contentRef.current.scrollWidth;
                const single = total / 3;
                setSingleWidth(single);
                // Start at the middle set to allow bidirectional scrolling immediately
                setOffset(-single);
            }
        };

        measure();
        window.addEventListener('resize', measure);
        // Small delay to ensure fonts/icons loaded
        setTimeout(measure, 100);

        return () => window.removeEventListener('resize', measure);
    }, [children]);

    // Animation Loop
    useEffect(() => {
        if (isDragging || singleWidth === 0) return;

        const animate = () => {
            setOffset(prev => {
                let newOffset = prev - speed;

                // Seamless Loop Logic
                // If we scroll past the start of the first set (moving right), jump to start of second set
                if (newOffset > 0) {
                    newOffset = -singleWidth;
                }
                // If we scroll past the end of the third set (moving left), jump to end of second set
                else if (newOffset < -2 * singleWidth) {
                    newOffset = -singleWidth;
                }

                return newOffset;
            });
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationRef.current);
    }, [isDragging, speed, singleWidth]);

    // Drag handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        lastX.current = e.pageX;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    const handleTouchStart = (e) => {
        setIsDragging(true);
        lastX.current = e.touches[0].pageX;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX;
        const walk = x - lastX.current;
        lastX.current = x;

        setOffset(prev => {
            let newOffset = prev + walk;
            // Apply same wrap logic during drag
            if (singleWidth > 0) {
                if (newOffset > 0) newOffset -= singleWidth;
                else if (newOffset < -2 * singleWidth) newOffset += singleWidth;
            }
            return newOffset;
        });
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX;
        const walk = x - lastX.current;
        lastX.current = x;

        setOffset(prev => {
            let newOffset = prev + walk;
            if (singleWidth > 0) {
                if (newOffset > 0) newOffset -= singleWidth;
                else if (newOffset < -2 * singleWidth) newOffset += singleWidth;
            }
            return newOffset;
        });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    return (
        <div
            className="marquee-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleDragEnd}
            onMouseUp={handleDragEnd}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleDragEnd}
        >
            <div
                className="marquee-track"
                ref={contentRef}
                style={{ transform: `translateX(${offset}px)` }}
            >
                {/* Triplicate children for seamless loop */}
                {children}
                {children}
                {children}
            </div>
        </div>
    );
};

const Features = () => (
    <section style={{ padding: '80px 0', maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px', padding: '0 20px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '16px' }}>Everything You Need</h2>
            <p style={{ color: '#a0a0b0', fontSize: '1.1rem' }}>A complete suite of tools to grow your brand.</p>
        </div>

        <DraggableMarquee speed={0.8}>
            <div style={{ display: 'flex', gap: '32px' }}>
                <FeatureCard
                    icon={PenTool}
                    title="Smart Captions"
                    desc="Generate high-converting captions for Instagram, LinkedIn, and Twitter tailored to your audience."
                />
                <FeatureCard
                    icon={Video}
                    title="Video Scripts"
                    desc="Create viral video scripts for TikTok, Reels, and YouTube Shorts in seconds."
                />
                <FeatureCard
                    icon={Star}
                    title="Brand Voice"
                    desc="Train AI on your unique brand voice so every post sounds exactly like you."
                />
                <FeatureCard
                    icon={Zap}
                    title="Endless Ideas"
                    desc="Never run out of inspiration. Get trending content ideas customized for your niche."
                />
                <FeatureCard
                    icon={Globe}
                    title="Multi-Platform"
                    desc="Write once, publish everywhere. Automatically reformat content for LinkedIn, Twitter, and more."
                />
                <FeatureCard
                    icon={Shield}
                    title="Safe & Secure"
                    desc="Your data is used solely to generate your content. We never sell your personal information to third parties."
                />
            </div>
        </DraggableMarquee>
    </section>
);

const DeepDive = () => {
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('.deep-dive-section');
            sections.forEach((section, index) => {
                const rect = section.getBoundingClientRect();
                if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
                    setActiveStep(index);
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const steps = [
        {
            id: 0,
            title: "Your Personal Roadmap",
            desc: "Stop guessing what to post. Our interactive guide gives you daily tasks tailored to your brand goals. From setting up your profile to your first viral hit, we walk you through every step.",
            icon: "🗺️",
            image: "/assets/guide_preview.png",
            placeholderColor: "rgba(168, 85, 247, 0.1)"
        },
        {
            id: 1,
            title: "Command Center",
            desc: "Track your growth, monitor your streaks, and manage your content pipeline all in one place. The dashboard keeps you focused and motivated to create consistently.",
            icon: "📊",
            image: "/assets/dashboard_preview.png",
            placeholderColor: "rgba(59, 130, 246, 0.1)"
        },
        {
            id: 2,
            title: "AI Powerhouse",
            desc: "Need a caption? A video script? A brand new idea? Our suite of AI generators creates high-quality, brand-safe content in seconds. It's like having a pro marketing team in your pocket.",
            icon: "⚡",
            image: "/assets/generator_preview.png",
            placeholderColor: "rgba(236, 72, 153, 0.1)"
        }
    ];

    return (
        <section style={{ padding: '100px 20px', position: 'relative' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '80px', textAlign: 'center' }}>
                    Master Your Social Game
                </h2>

                <div className="deep-dive-wrapper">
                    {/* Left: Scrolling Text */}
                    <div style={{ flex: 1 }}>
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className="deep-dive-section"
                                style={{
                                    opacity: activeStep === index ? 1 : 0.3,
                                }}
                            >
                                <div style={{
                                    fontSize: '4rem', marginBottom: '24px',
                                    filter: activeStep === index ? 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))' : 'none',
                                    transition: 'all 0.5s ease'
                                }}>
                                    {step.icon}
                                </div>
                                <h3 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '16px', color: '#fff' }}>
                                    {step.title}
                                </h3>
                                <p style={{ fontSize: '1.2rem', color: '#a0a0b0', lineHeight: '1.8', marginBottom: '24px' }}>
                                    {step.desc}
                                </p>

                                {/* Mobile Image */}
                                <div className="mobile-only" style={{ marginBottom: '24px' }}>
                                    <div style={{
                                        borderRadius: '16px', overflow: 'hidden',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: step.placeholderColor,
                                        aspectRatio: '16/9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <img
                                            src={step.image}
                                            alt={step.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                        <div style={{ display: 'none', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                                            {step.title} Preview
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Sticky Image (Desktop Only) */}
                    <div className="desktop-only" style={{ flex: 1, position: 'relative' }}>
                        <div style={{
                            position: 'sticky',
                            top: '20vh',
                            height: '60vh',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: '#0f0f13',
                            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)'
                        }}>
                            {steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: activeStep === index ? 1 : 0,
                                        transition: 'opacity 0.5s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: step.placeholderColor
                                    }}
                                >
                                    {/* Placeholder if image fails or missing */}
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        padding: step.id === 1 ? '10px' : '40px', // Less padding for Command Center (id: 1)
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <img
                                            src={step.image}
                                            alt={step.title}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                borderRadius: '12px',
                                                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                                                display: 'block'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                        <div style={{ display: 'none', fontSize: '1.5rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>
                                            {step.title} Preview
                                            <div style={{ fontSize: '0.9rem', marginTop: '8px', fontWeight: '400' }}>
                                                (Add {step.image.split('/').pop()} to assets)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FAQItem = ({ question, answer, isOpen, onClick }) => (
    <div
        onClick={onClick}
        className="glass-premium hover-lift-glow"
        style={{
            borderRadius: '16px',
            marginBottom: '16px',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
        }}
    >
        <div style={{
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: '#fff' }}>{question}</h3>
            <div style={{
                color: '#a855f7',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
            }}>
                {isOpen ? <Minus size={20} /> : <Plus size={20} />}
            </div>
        </div>
        <div style={{
            maxHeight: isOpen ? '200px' : '0',
            opacity: isOpen ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            padding: isOpen ? '0 24px 24px' : '0 24px'
        }}>
            <p style={{ color: '#a0a0b0', lineHeight: '1.6', margin: 0 }}>{answer}</p>
        </div>
    </div>
);

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "Is it free to use?",
            answer: "Yes! You get free credits every day to generate content. You can upgrade for unlimited access and premium features."
        },
        {
            question: "Can I use the images commercially?",
            answer: "Absolutely. All images generated are royalty-free and yours to use for any commercial or personal project."
        },
        {
            question: "What AI model do you use?",
            answer: "We use advanced models like Gemini Pro and GPT-4 to ensure high-quality, human-like content that resonates with your audience."
        },
        {
            question: "How do you use my data?",
            answer: "We only use your data to personalize your AI content. Your inputs are processed securely via Google Gemini API and are not shared with third parties for marketing purposes."
        },
        {
            question: "Can I cancel my subscription?",
            answer: "Yes, you can cancel anytime from your dashboard. You'll keep access until the end of your billing period."
        }
    ];

    return (
        <section style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '40px', textAlign: 'center' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {faqs.map((faq, index) => (
                    <FAQItem
                        key={index}
                        question={faq.question}
                        answer={faq.answer}
                        isOpen={openIndex === index}
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    />
                ))}
            </div>

            <AdUnit slotId="1234567890" />
        </section>
    );
};

const Footer = () => (
    <footer style={{ padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#a0a0b0', fontSize: '0.9rem' }}>
        <div style={{ marginBottom: '20px' }}>
            <Link to="/terms" className="text-glow-blue" style={{ color: '#e0e0e0', margin: '0 10px', textDecoration: 'none' }}>Terms of Service</Link>
            <Link to="/privacy" className="text-glow-blue" style={{ color: '#e0e0e0', margin: '0 10px', textDecoration: 'none' }}>Privacy Policy</Link>
        </div>
        <p>© 2025 Begyn AI. All rights reserved.</p>
    </footer>
);

export default function LandingPage() {
    const [user, setUser] = useState(null);

    // Check auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div style={{ minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            <Navbar user={user} />
            <Hero user={user} />
            <Features />
            <AdUnit slotId="1234567890" />
            <DeepDive />
            <FAQ />
            <Footer />
        </div>
    );
}
