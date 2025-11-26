// src/pages/Dashboard.jsx - Mobile Responsive Version
import { useState, useEffect, useMemo } from "react";
import { auth, db, collection, query, where, onSnapshot, doc, getDoc } from "../services/firebase";
import { Link, Navigate } from "react-router-dom";

// Mobile-responsive inline CSS
const responsiveCSS = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    @media (min-width: 768px) {
        .dashboard-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    
    @media (min-width: 1024px) {
        .stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
`;

// CircularProgress Component
const CircularProgress = ({ percentage, size = 100 }) => {
    const radius = (size - 20) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (percentage / 100) * circ;

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#grad)" strokeWidth="10"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            <defs>
                <linearGradient id="grad">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="clamp(20px, 5vw, 28px)" fontWeight="700"
                fill="#fff" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
                {percentage}%
            </text>
        </svg>
    );
};

// Mission Status Card
const MissionStatusCard = ({ completion }) => (
    <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.1))',
        border: '2px solid rgba(168,85,247,0.3)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center',
        animation: 'fadeIn 0.6s'
    }}>
        <h3 style={{
            fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: '700', marginBottom: '16px',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
        }}>
            🚀 Mission Status
        </h3>
        <CircularProgress percentage={completion} />
        <p style={{ marginTop: '16px', fontSize: '0.9rem', color: '#a0a0b0' }}>Brand Profile Completion</p>
    </div>
);

// Quick Access Card
const QuickAccessCard = () => (
    <div className="card" style={{
        animation: 'fadeIn 0.7s'
    }}>
        <h3 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: '700', marginBottom: '16px', color: '#fff' }}>
            ⚡ Quick Access
        </h3>
        {[
            { to: '/generate', icon: '✨', label: 'Generator Hub' },
            { to: '/brand-setup', icon: '🎨', label: 'Brand Setup' },
            { to: '/guide', icon: '📖', label: 'Your Guide (Complete to earn 10 credits!)' }
        ].map(item => (
            <Link key={item.to} to={item.to} style={{
                display: 'block',
                padding: '12px 16px',
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '12px',
                marginBottom: '12px',
                color: '#fff',
                textDecoration: 'none',
                transition: 'all 0.3s'
            }}>
                <span style={{ fontSize: '1.3rem', marginRight: '12px' }}>{item.icon}</span>
                {item.label}
            </Link>
        ))}
    </div>
);

// Stat Card
const StatCard = ({ icon, value, label, color }) => (
    <div className="card" style={{
        textAlign: 'center',
        animation: 'fadeIn 0.8s',
        border: `1px solid ${color}33` // Keep color border override
    }}>
        <div style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', marginBottom: '12px' }}>{icon}</div>
        <div style={{ fontSize: 'clamp(2rem, 6vw, 2.5rem)', fontWeight: '800', color, marginBottom: '8px' }}>
            {value}
        </div>
        <div style={{ fontSize: '0.95rem', color: '#a0a0b0' }}>{label}</div>
    </div>
);

// Missing Fields Alert
const MissingAlert = ({ fields }) => {
    if (!fields || fields.length === 0) return null;

    return (
        <div style={{
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
        }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fbbf24', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Complete Your Brand Profile
            </div>
            <ul style={{ color: '#fde68a', fontSize: '0.9rem', marginLeft: '20px', marginBottom: '16px' }}>
                {fields.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <Link to="/brand-setup" style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: '700',
                textDecoration: 'none'
            }}>
                Complete Setup →
            </Link>
        </div>
    );
};

// Main Dashboard
export default function Dashboard() {
    const [stats, setStats] = useState({ posts: 0, ideas: 0, captions: 0, tweets: 0, scripts: 0, chats: 0 });
    const [brandData, setBrandData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [onboarded, setOnboarded] = useState(true);
    const uid = auth.currentUser?.uid;

    // Brand completion
    const brandCompletion = useMemo(() => {
        if (!brandData) return 0;
        const fields = ['brandName', 'industry', 'tone', 'audience', 'colors'];
        const filled = fields.filter(f => {
            const val = brandData[f];
            if (!val) return false;
            if (typeof val === 'string') return val.trim().length > 0;
            if (Array.isArray(val)) return val.length > 0;
            return true;
        });
        return Math.round((filled.length / fields.length) * 100);
    }, [brandData]);

    // Missing fields
    const missingFields = useMemo(() => {
        if (!brandData) return [];
        const labels = {
            brandName: 'Brand Name',
            industry: 'Industry & Niche',
            tone: 'Tone of Voice',
            audience: 'Target Audience',
            colors: 'Brand Colors'
        };
        const missing = [];
        Object.keys(labels).forEach(f => {
            const val = brandData[f];
            if (!val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && !val.length)) {
                missing.push(labels[f]);
            }
        });
        return missing;
    }, [brandData]);

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            return;
        }

        // 1. Fetch brand data
        const fetchBrand = async () => {
            try {
                const docRef = doc(db, "brands", uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setBrandData(data);
                    setOnboarded(data.onboarded || false);
                }
            } catch (e) {
                console.error("Error fetching brand:", e);
            }
        };
        fetchBrand();

        let histCounts = { posts: 0, ideas: 0, captions: 0, tweets: 0, scripts: 0 };
        let chatCount = 0;

        // 2. History Listener (Counts your generated content)
        const historyRef = collection(db, "users", uid, "history");
        const unsubHist = onSnapshot(historyRef, (snap) => {
            const counts = { posts: 0, ideas: 0, captions: 0, tweets: 0, scripts: 0 };

            snap.docs.forEach((doc) => {
                const item = doc.data();
                if (item.type === "generate_post") counts.posts += 1;
                if (item.type === "generate_idea") counts.ideas += 1;
                if (item.type === "generate_caption") counts.captions += 1;
                if (item.type === "generate_tweet") counts.tweets += 1;
                if (item.type === "generate_video_script") counts.scripts += 1;
            });

            histCounts = counts;
            // Merge history stats with current chat stats
            setStats(prev => ({ ...prev, ...histCounts }));
            setLoading(false);
        }, (error) => {
            console.error("History snapshot error:", error);
            setLoading(false);
        });

        // 3. Chats Listener (Counts your active chats)
        const chatRef = collection(db, "chats");
        const chatQ = query(chatRef, where("uid", "==", uid));
        const unsubChat = onSnapshot(chatQ, (snap) => {
            chatCount = snap.size;
            // Merge chat stats with current history stats
            setStats(prev => ({ ...prev, chats: chatCount }));
        }, (error) => {
            console.error("Chat snapshot error:", error);
        });

        // Cleanup listeners on unmount
        return () => {
            unsubHist();
            unsubChat();
        };
    }, [uid]);

    const statsList = useMemo(() => {
        const total = stats.chats + stats.captions + stats.ideas + stats.tweets + stats.scripts;
        return [
            { icon: "📝", value: total, label: "Text Generated", color: "#a855f7" },
            { icon: "✍️", value: stats.posts, label: "Posts Generated", color: "#ec4899" },
            { icon: "💬", value: stats.chats, label: "AI Conversations", color: "#8b5cf6" }
        ];
    }, [stats]);

    if (!loading && !onboarded) return <Navigate to="/guide/onboarding" replace />;
    if (loading) return <div style={{ padding: '40px', color: '#a0a0b0' }}>Loading...</div>;

    return (
        <>
            <style>{responsiveCSS}</style>
            <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '24px', animation: 'fadeIn 0.5s' }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 6vw, 3rem)',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                        lineHeight: '1.2'
                    }}>
                        Mission Control 🚀
                    </h1>
                    <p style={{ fontSize: 'clamp(0.95rem, 3vw, 1.2rem)', color: '#a0a0b0' }}>
                        Your AI-powered content creation dashboard
                    </p>
                </div>

                {/* Missing Fields Alert */}
                <MissingAlert fields={missingFields} />

                {/* Main Grid */}
                <div className="dashboard-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <MissionStatusCard completion={brandCompletion} />
                    <QuickAccessCard />
                </div>

                {/* Stats Section */}
                <h2 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.8rem)', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>
                    📊 Your Stats
                </h2>
                <div className="stats-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '16px'
                }}>
                    {statsList.map(stat => <StatCard key={stat.label} {...stat} />)}
                </div>
            </div>
        </>
    );
}