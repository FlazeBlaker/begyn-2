import { useState, useEffect } from "react";
import { auth, db, collection, onSnapshot, doc } from "../services/firebase";
import { Link, useNavigate } from "react-router-dom";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Zap, TrendingUp, Award, Star,
    Layout, Image as ImageIcon, PenTool, Twitter, Linkedin, FileText,
    Mic, Download, Save, Globe, Server, Cloud, Shuffle, MoreHorizontal, Flame,
    Lightbulb, Video
} from 'lucide-react';

// --- STYLES & ANIMATIONS ---
const dashboardStyles = `
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(124, 77, 255, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(124, 77, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(124, 77, 255, 0); } }
    @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
    
    .glass-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        transition: all 0.3s ease;
        overflow: hidden;
        position: relative;
    }
    .glass-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(124, 77, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .gradient-text {
        background: linear-gradient(135deg, #7C4DFF, #CE93D8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .bento-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-auto-rows: minmax(clamp(100px, 15vh, 150px), auto);
        gap: 20px;
    }
    /* Responsive Grid */
    @media (max-width: 1200px) { 
        .bento-grid { grid-template-columns: repeat(3, 1fr); } 
        .span-4 { grid-column: span 3; }
    }
    @media (max-width: 900px) { 
        .bento-grid { grid-template-columns: repeat(2, 1fr); } 
        .span-4 { grid-column: span 2; }
    }
    @media (max-width: 600px) { 
        /* Keep 2 columns on mobile so stats can be side-by-side */
        .bento-grid { grid-template-columns: repeat(2, 1fr); } 
        /* Force larger items to full width */
        .span-2, .span-4 { grid-column: 1 / -1; }
    }

    /* Helper Classes for Grid Spans */
    .span-2 { grid-column: span 2; }
    .span-4 { grid-column: span 4; }

    /* Mobile Optimization */
    @media (max-width: 768px) {
        .glass-card { padding: 16px !important; }
        h1 { fontSize: 1.8rem !important; }
        .bento-grid { gap: 12px; }
        .quick-actions-container { 
            justify-content: center !important; 
            flex-wrap: wrap;
        }
        .quick-actions-container > a { flex: 1 1 40%; } 
    }
`;

const NewsTicker = () => (
    <div style={{
        background: 'rgba(124, 77, 255, 0.1)',
        borderBottom: '1px solid rgba(124, 77, 255, 0.2)',
        padding: '8px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
        marginBottom: '24px'
    }}>
        <div style={{
            display: 'inline-block',
            animation: 'ticker 30s linear infinite',
            color: '#CE93D8',
            fontSize: '0.9rem',
            fontWeight: '500'
        }}>
            🚀 New Feature: AI Video Scripts are now live! • 💡 Tip: Use "Surprise Me" for instant inspiration • 🌟 Pro Plan users get 2x faster generation speeds • 📢 Join our Discord community for daily tips!
        </div>
    </div>
);

const WelcomeHeader = ({ user }) => (
    <div style={{ marginBottom: '32px', animation: 'slideUp 0.5s ease-out' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', color: 'white' }}>
            Welcome back, <span className="gradient-text">{user?.displayName?.split(' ')[0] || 'Creator'}</span>! 👋
        </h1>
        <p style={{ color: '#a0a0b0', fontSize: '1.1rem' }}>Ready to create something amazing today?</p>
    </div>
);

const StatWidget = ({ icon: Icon, label, value, subtext, color, trend, className }) => (
    <div className={`glass-card ${className || ''}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
                background: `${color}20`,
                padding: '10px',
                borderRadius: '12px',
                color: color
            }}>
                <Icon size={24} />
            </div>
            {trend && (
                <span style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#4ade80',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                }}>
                    {trend}
                </span>
            )}
        </div>
        <div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#a0a0b0', fontWeight: '500' }}>
                {label}
            </div>
            {subtext && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{subtext}</div>}
        </div>
    </div>
);

const QuickAction = ({ icon: Icon, label, to, color }) => (
    <Link to={to} style={{ textDecoration: 'none' }}>
        <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            border: '1px solid transparent',
            cursor: 'pointer'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}15`;
                e.currentTarget.style.borderColor = `${color}40`;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <Icon size={24} color={color} />
            <span style={{ fontSize: '0.85rem', color: '#e0e0e0', fontWeight: '500' }}>{label}</span>
        </div>
    </Link>
);

const AnalyticsCard = ({ usageData, timeRange, setTimeRange }) => (
    <div className="glass-card span-4" style={{ padding: '24px', minHeight: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="#CE93D8" /> Activity Overview
            </h3>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '4px' }}>
                {['7d', '30d'].map(range => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        style={{
                            background: timeRange === range ? 'rgba(124, 77, 255, 0.2)' : 'transparent',
                            color: timeRange === range ? '#CE93D8' : '#a0a0b0',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        {range === '7d' ? '7 Days' : '30 Days'}
                    </button>
                ))}
            </div>
        </div>
        <div style={{ height: '200px', width: '100%', minWidth: 0 }}>
            {usageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <AreaChart data={usageData}>
                        <defs>
                            <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C4DFF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7C4DFF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#1e202d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#CE93D8' }}
                            labelStyle={{ color: '#a0a0b0' }}
                        />
                        <Area type="monotone" dataKey="usage" stroke="#7C4DFF" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0a0b0' }}>
                    No activity data yet
                </div>
            )}
        </div>
    </div>
);

const SurpriseMe = () => {
    const navigate = useNavigate();

    const SURPRISE_PROMPTS = [
        "A futuristic city where plants glow in the dark",
        "Top 5 productivity hacks for remote workers",
        "The secret to making the perfect cup of coffee",
        "Why AI will change the way we learn forever",
        "A motivational quote about never giving up",
        "Review of the latest tech gadget in 2025",
        "How to start a side hustle with zero capital",
        "The most beautiful travel destinations in Japan",
        "Explain quantum computing to a 5-year-old",
        "A funny story about a cat who thinks he's a dog"
    ];

    const handleSurprise = () => {
        const types = ['tweet', 'idea', 'videoScript', 'caption'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
        navigate(`/generate?type=${randomType}&topic=${encodeURIComponent(randomPrompt)}`);
    };

    return (
        <button onClick={handleSurprise} className="glass-card span-4" style={{
            padding: '20px', width: '100%', textAlign: 'left', cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(124, 77, 255, 0.2), rgba(206, 147, 216, 0.2))',
            border: '1px solid rgba(124, 77, 255, 0.3)'
        }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shuffle size={16} /> Surprise Me
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#e0e0e0' }}>Don't know what to create? Let AI decide.</p>
        </button>
    );
};

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState(0);
    const [streak, setStreak] = useState(1);
    const [usageData, setUsageData] = useState([]);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        let unsubBrand = null;
        let unsubHistory = null;

        const unsubscribe = auth.onAuthStateChanged((u) => {
            // Clean up previous listeners
            if (unsubBrand) { unsubBrand(); unsubBrand = null; }
            if (unsubHistory) { unsubHistory(); unsubHistory = null; }

            setUser(u);
            if (u) {
                // 1. Fetch User Stats (Credits, Streak)
                unsubBrand = onSnapshot(doc(db, "brands", u.uid), (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        setCredits(data.credits || 0);
                        setStreak(data.streak || 1);
                    }
                }, (error) => {
                    if (error.code !== 'permission-denied') console.error("Brand snapshot error:", error);
                });

                // 2. Fetch History & Process for Usage
                unsubHistory = onSnapshot(collection(db, "users", u.uid, "history"), (snap) => {
                    const data = snap.docs.map(d => d.data()).sort((a, b) => b.timestamp - a.timestamp);
                    setHistory(data);
                    setLoading(false);
                }, (error) => {
                    if (error.code !== 'permission-denied') console.error("History snapshot error:", error);
                });

            } else {
                setLoading(false);
            }
        });

        return () => {
            if (unsubBrand) unsubBrand();
            if (unsubHistory) unsubHistory();
            unsubscribe();
        };
    }, []);

    // Recalculate usage data when history or timeRange changes
    useEffect(() => {
        if (!history.length) return;

        const days = timeRange === '7d' ? 7 : 30;
        const dateLabels = [...Array(days)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            return d.toISOString().split('T')[0];
        });

        const usageMap = history.reduce((acc, item) => {
            if (item.timestamp) {
                const date = new Date(item.timestamp.toDate()).toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
            }
            return acc;
        }, {});

        const chartData = dateLabels.map(date => ({
            day: new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
            usage: usageMap[date] || 0
        }));
        setUsageData(chartData);

    }, [history, timeRange]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#a0a0b0' }}>Initializing Mission Control...</div>;

    return (
        <div style={{ maxWidth: '95vw', margin: '0 auto' }}>
            <style>{dashboardStyles}</style>

            <NewsTicker />

            <div style={{ padding: '0 24px 24px 24px' }}>
                <WelcomeHeader user={user} />

                <div className="bento-grid">
                    {/* ROW 1: Stats */}
                    <StatWidget icon={Zap} label="Credits Left" value={credits} subtext="Refills monthly" color="#fbbf24" />
                    <StatWidget icon={Flame} label="Daily Streak" value={streak} subtext="Keep it up!" color="#f97316" trend="+1" />


                    {/* ROW 3: Analytics */}
                    <AnalyticsCard usageData={usageData} timeRange={timeRange} setTimeRange={setTimeRange} />

                    {/* ROW 2: Quick Actions */}
                    <div className="glass-card span-2" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px', color: 'white' }}>Quick Actions</h3>
                            <p style={{ fontSize: '0.8rem', color: '#a0a0b0' }}>Jump straight into creation.</p>
                        </div>
                        <div className="quick-actions-container" style={{ flex: '2 1 auto', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <QuickAction icon={Twitter} label="Tweet" to="/generate?type=tweet" color="#1da1f2" />
                            <QuickAction icon={FileText} label="Caption" to="/generate?type=caption" color="#CE93D8" />
                            <QuickAction icon={Lightbulb} label="Idea" to="/generate?type=idea" color="#fbbf24" />
                            <QuickAction icon={Video} label="Script" to="/generate?type=videoScript" color="#ef4444" />
                        </div>
                    </div>
                    {/* ROW 4: Widgets */}
                    <SurpriseMe />
                </div>
            </div>
        </div>
    );
}