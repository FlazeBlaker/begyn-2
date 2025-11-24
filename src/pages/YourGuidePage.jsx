// src/pages/YourGuidePage.jsx
import { useState, useEffect, useMemo } from "react";
import { auth, db, doc, getDoc, updateDoc } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import "../styles/GuideFlowStyles.css";
import "../styles/MobileMissionControl.css"; // New Mobile Styles
import Roadmap from "./guide/Roadmap";
import MobileRoadmap from "./guide/MobileRoadmap"; // New Mobile Component

// --- HELPER: Format Text (Converts **text** to Bold) ---
const formatText = (text) => {
    if (!text) return "";
    const textString = String(text);
    const parts = textString.split("**");
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <strong key={index} style={{ color: "var(--text-primary)", fontWeight: "700" }}>{part}</strong>;
        }
        return part;
    });
};

const RoadmapTask = ({ item, category, index, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentText, setCurrentText] = useState(item);

    const handleSave = async () => {
        onUpdate(category, index, currentText);
        setIsEditing(false);
    };

    return (
        <li className="roadmap-item mobile-checklist-item" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            marginBottom: 'clamp(8px, 2vw, 12px)',
            padding: 'clamp(10px, 3vw, 16px)',
            borderRadius: '8px'
        }}>
            {isEditing ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                        className="styled-input"
                        value={currentText}
                        onChange={(e) => setCurrentText(e.target.value)}
                        autoFocus
                        style={{
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            padding: 'clamp(10px, 2vw, 12px)',
                            borderRadius: '4px',
                            fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                            flex: '1 1 auto',
                            minWidth: '200px'
                        }}
                    />
                    <button
                        onClick={handleSave}
                        style={{
                            whiteSpace: 'nowrap',
                            background: '#34d399',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 20px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            minHeight: '44px',
                            fontSize: 'clamp(0.9rem, 3vw, 1rem)'
                        }}
                    >
                        Save
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span className="mobile-checklist-text" style={{ flexGrow: 1, color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 3vw, 1rem)', lineHeight: '1.5' }}>{formatText(item)}</span>
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            color: '#a855f7',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                            minHeight: '44px',
                            minWidth: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        aria-label="Edit item"
                    >
                        ✏️
                    </button>
                </div>
            )}
        </li>
    );
};

export default function YourGuidePage({ setOnboardedStatus }) {
    const [brandData, setBrandData] = useState(null);
    const [roadmapProgress, setRoadmapProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile detection
    const navigate = useNavigate();
    const uid = auth.currentUser?.uid;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchBrandData = async () => {
            if (!uid) {
                setLoading(false);
                return;
            }
            const docRef = doc(db, "brands", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBrandData(data.brandData);
                setRoadmapProgress(data.roadmapProgress || {});
            }
            setLoading(false);
        };
        fetchBrandData();
    }, [uid]);

    const updateRoadmapItem = async (category, index, newText) => {
        if (!brandData || !uid) return;
        const newBrandData = JSON.parse(JSON.stringify(brandData));

        // Ensure aiGenerated and the category exist before updating
        if (newBrandData.aiGenerated && Array.isArray(newBrandData.aiGenerated[category])) {
            newBrandData.aiGenerated[category][index] = newText;
            setBrandData(newBrandData);
            await updateDoc(doc(db, "brands", uid), { brandData: newBrandData });
        }
    };

    const handleStepComplete = async (stepId) => {
        if (!uid) return;

        // Update local state immediately for smooth UI
        setRoadmapProgress(prev => ({
            ...prev,
            [stepId]: { completed: true }
        }));

        // Update Firebase
        try {
            await updateDoc(doc(db, "brands", uid), {
                [`roadmapProgress.${stepId}.completed`]: true
            });
        } catch (error) {
            console.error("Error updating roadmap progress:", error);
        }
    };

    const retakeGuide = async () => {
        if (!uid) return;
        if (setOnboardedStatus) setOnboardedStatus(false);
        try { await updateDoc(doc(db, "brands", uid), { onboarded: false }); } catch (e) { console.error(e); }
        navigate("/guide/flow");
    };

    // Calculate Progress
    const progressStats = useMemo(() => {
        if (!brandData?.aiGenerated?.roadmapSteps) return { percent: 0, completed: 0, total: 0, nextStep: null };
        const steps = brandData.aiGenerated.roadmapSteps;
        const total = steps.length;
        const completed = steps.filter(s => roadmapProgress[s.id]?.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const nextStep = steps.find(s => !roadmapProgress[s.id]?.completed) || null;
        return { percent, completed, total, nextStep };
    }, [brandData, roadmapProgress]);

    if (loading) return <div className="guide-container"><div className="ai-loader">Loading Mission Control...</div></div>;

    // Check if brandData exists AND aiGenerated data exists AND the roadmap steps exist
    if (!brandData || !brandData.aiGenerated || !brandData.aiGenerated.roadmapSteps) return (
        <div className="guide-container">
            <div className="step-container" style={{ textAlign: 'center', padding: '40px' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>No Active Mission Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>It looks like you haven't initialized your creator roadmap yet.</p>
                <button onClick={retakeGuide} style={{ background: '#a855f7', color: 'white', padding: '12px 30px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem' }}>
                    Initialize Mission Control
                </button>
            </div>
        </div>
    );

    const gen = brandData.aiGenerated;
    const { coreTopic, primaryGoal } = brandData;
    const sevenDayChecklist = gen.sevenDayChecklist || [];
    const contentPillars = gen.contentPillars || [];
    const dynamicRoadmapSteps = (gen.roadmapSteps && gen.roadmapSteps.length > 0) ? gen.roadmapSteps : [
        {
            id: 'step-1',
            title: 'Define Your Niche',
            description: 'Identify your specific area of focus.',
            detailedDescription: 'Drill down into your niche. Don\'t just say "Gaming", say "Retro RPG Gaming on PS1". This helps target a specific audience.',
            timeEstimate: '45 mins',
            suggestions: ['Check Google Trends', 'Look at competitor hashtags', 'Ask your friends'],
            resources: [{ name: 'Google Trends', url: 'https://trends.google.com' }],
            generatorLink: null,
            completed: false
        },
        {
            id: 'step-2',
            title: 'Create Content Calendar',
            description: 'Plan your first week of content.',
            detailedDescription: 'Use a spreadsheet or our AI tool to plan 7 days of posts. Consistency is key.',
            timeEstimate: '1 hour',
            suggestions: ['Theme your days (e.g., Motivation Monday)', 'Plan for 3 posts/day'],
            resources: [{ name: 'Notion', url: 'https://notion.so' }],
            generatorLink: '/idea-generator',
            completed: false
        },
        {
            id: 'step-3',
            title: 'Generate First Post',
            description: 'Create your first piece of content using AI.',
            detailedDescription: 'Use the Post Generator to create a high-quality post for your primary platform.',
            timeEstimate: '15 mins',
            suggestions: ['Use a strong hook', 'Include a call to action'],
            resources: [],
            generatorLink: '/post-generator',
            completed: false
        }
    ];
    const detailedGuide = gen.detailedGuide || {};

    // Prepare steps with status for MobileRoadmap
    const mobileSteps = dynamicRoadmapSteps.map(step => ({
        ...step,
        status: roadmapProgress[step.id]?.completed ? 'completed' : (step.id === progressStats.nextStep?.id ? 'in-progress' : 'locked')
    }));

    return (
        <div className={`guide-container ${isMobile ? 'mobile-view' : ''}`} style={{
            minHeight: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'clamp(16px, 5vw, 40px)',
            maxWidth: '1400px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
        }}>

            {/* HEADER */}
            <div className="mobile-header" style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'clamp(20px, 5vw, 30px)',
                borderBottom: isMobile ? 'none' : '1px solid var(--border-color)',
                paddingBottom: 'clamp(16px, 4vw, 20px)',
                gap: 'clamp(12px, 4vw, 16px)'
            }}>
                <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                    <h1 style={{
                        fontSize: 'clamp(1.8rem, 6vw, 2.5rem)',
                        margin: 0,
                        background: 'linear-gradient(to right, var(--text-primary), #a855f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: '1.2'
                    }}>
                        Mission Control
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        margin: 'clamp(5px, 2vw, 8px) 0 0 0',
                        fontSize: 'clamp(0.85rem, 3vw, 1rem)'
                    }}>Your command center for content domination.</p>
                </div>
                <button onClick={retakeGuide} style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 20px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: 'clamp(0.85rem, 3vw, 0.9rem)',
                    minHeight: '44px',
                    whiteSpace: 'nowrap'
                }}>
                    🔄 Reset Mission
                </button>
            </div>

            {/* DASHBOARD GRID */}
            <div className={`dashboard-grid ${isMobile ? 'mobile-dashboard' : ''}`} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 'clamp(16px, 4vw, 20px)',
                marginBottom: 'clamp(30px, 6vw, 40px)'
            }}>

                {/* CARD 1: MISSION STATUS */}
                <div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: 'clamp(16px, 4vw, 20px)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h3 style={{
                        color: '#a855f7',
                        fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: 'clamp(12px, 3vw, 15px)'
                    }}>Mission Status</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(15px, 4vw, 20px)', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', width: 'clamp(70px, 15vw, 80px)', height: 'clamp(70px, 15vw, 80px)' }}>
                            <svg width="100%" height="100%" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" strokeWidth="10" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * progressStats.percent) / 100} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1rem, 4vw, 1.2rem)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {progressStats.percent}%
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 'clamp(1.3rem, 5vw, 1.5rem)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{progressStats.completed} / {progressStats.total}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)' }}>Steps Completed</div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: CURRENT OBJECTIVE */}
                <div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: 'clamp(16px, 4vw, 20px)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h3 style={{
                        color: '#34d399',
                        fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: 'clamp(12px, 3vw, 15px)'
                    }}>Current Objective</h3>
                    <div style={{ fontSize: 'clamp(1rem, 4vw, 1.1rem)', fontWeight: '600', marginBottom: 'clamp(5px, 2vw, 8px)', color: 'var(--text-primary)', lineHeight: '1.3' }}>{coreTopic || 'Niche Undefined'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)' }}>Goal: {primaryGoal || 'Growth'}</div>
                    {progressStats.nextStep && (
                        <div style={{ marginTop: 'clamp(12px, 3vw, 15px)', padding: 'clamp(10px, 3vw, 12px)', background: 'rgba(52, 211, 153, 0.1)', borderLeft: '3px solid #34d399', borderRadius: '6px' }}>
                            <div style={{ fontSize: 'clamp(0.75rem, 3vw, 0.8rem)', color: '#34d399', fontWeight: 'bold' }}>NEXT UP:</div>
                            <div style={{ fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>{progressStats.nextStep.title}</div>
                        </div>
                    )}
                </div>

                {/* CARD 3: QUICK ACTIONS */}
                <div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: 'clamp(16px, 4vw, 20px)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h3 style={{
                        color: '#60a5fa',
                        fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: 'clamp(12px, 3vw, 15px)'
                    }}>Quick Access</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(8px, 2vw, 10px)' }}>
                        <button
                            onClick={() => document.getElementById('roadmap-section').scrollIntoView({ behavior: 'smooth' })}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                padding: 'clamp(12px, 3vw, 15px)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
                                minHeight: '60px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)' }}>🗺️</span>
                            <span>Roadmap</span>
                        </button>
                        <button
                            onClick={() => document.getElementById('checklist-section').scrollIntoView({ behavior: 'smooth' })}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                padding: 'clamp(12px, 3vw, 15px)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
                                minHeight: '60px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)' }}>✅</span>
                            <span>Checklist</span>
                        </button>
                        <button
                            onClick={() => {
                                // Scroll to roadmap section first
                                document.getElementById('roadmap-section')?.scrollIntoView({ behavior: 'smooth' });

                                // Then scroll to the current task
                                setTimeout(() => {
                                    if (progressStats.nextStep) {
                                        const stepElement = document.getElementById(`step-${progressStats.nextStep.id}`);
                                        if (stepElement) {
                                            stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            // For mobile, also expand the step
                                            if (isMobile) {
                                                stepElement.click();
                                            }
                                        }
                                    }
                                }, 500);
                            }}
                            disabled={!progressStats.nextStep}
                            style={{
                                background: progressStats.nextStep ? 'linear-gradient(135deg, #34d399, #10b981)' : 'var(--bg-secondary)',
                                border: progressStats.nextStep ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--border-color)',
                                padding: 'clamp(12px, 3vw, 15px)',
                                borderRadius: '8px',
                                color: progressStats.nextStep ? '#fff' : 'var(--text-secondary)',
                                cursor: progressStats.nextStep ? 'pointer' : 'not-allowed',
                                textAlign: 'center',
                                fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
                                minHeight: '60px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                                gridColumn: 'span 2',
                                boxShadow: progressStats.nextStep ? '0 4px 12px rgba(52, 211, 153, 0.2)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)' }}>🎯</span>
                            <span>{progressStats.nextStep ? 'Current Task' : 'All Complete!'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: 'clamp(20px, 5vw, 30px)'
            }}>

                {/* LEFT COL: CHECKLISTS */}
                <div id="checklist-section">
                    <div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                        marginBottom: 'clamp(20px, 5vw, 30px)',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        background: 'var(--bg-card)',
                        padding: 'clamp(16px, 4vw, 20px)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{
                            borderBottom: '1px solid var(--border-color)',
                            paddingBottom: 'clamp(10px, 2vw, 12px)',
                            marginBottom: 'clamp(12px, 3vw, 15px)',
                            color: 'var(--text-primary)',
                            fontSize: 'clamp(1.1rem, 4vw, 1.3rem)'
                        }}>🚀 7-Day Launchpad</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {sevenDayChecklist.map((task, index) => (
                                <RoadmapTask key={index} item={task} category="sevenDayChecklist" index={index} onUpdate={updateRoadmapItem} />
                            ))}
                        </ul>
                    </div>

                    <div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        background: 'var(--bg-card)',
                        padding: 'clamp(16px, 4vw, 20px)',
                        borderRadius: '16px'
                    }}>
                        <h3 style={{
                            borderBottom: '1px solid var(--border-color)',
                            paddingBottom: 'clamp(10px, 2vw, 12px)',
                            marginBottom: 'clamp(12px, 3vw, 15px)',
                            color: 'var(--text-primary)',
                            fontSize: 'clamp(1.1rem, 4vw, 1.3rem)'
                        }}>🏛️ Content Pillars</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {contentPillars.map((pillar, index) => (
                                <RoadmapTask key={index} item={pillar} category="contentPillars" index={index} onUpdate={updateRoadmapItem} />
                            ))}
                        </ul>
                    </div>
                </div>

                {/* RIGHT COL: DETAILED GUIDE */}
                <div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                    height: 'fit-content',
                    maxHeight: '800px',
                    overflowY: 'auto',
                    background: 'var(--bg-card)',
                    padding: 'clamp(16px, 4vw, 20px)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)'
                }}>
                    <h3 style={{
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: 'clamp(10px, 2vw, 12px)',
                        marginBottom: 'clamp(12px, 3vw, 15px)',
                        color: 'var(--text-primary)',
                        fontSize: 'clamp(1.1rem, 4vw, 1.3rem)'
                    }}>📘 Tactical Playbook</h3>

                    {detailedGuide.GEAR_EQUIPMENT && (
                        <div style={{ marginBottom: 'clamp(20px, 4vw, 25px)' }}>
                            <h4 style={{ color: '#d8b4fe', marginBottom: 'clamp(8px, 2vw, 10px)', fontSize: 'clamp(1rem, 3.5vw, 1.1rem)' }}>🛠️ Gear & Tech</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {detailedGuide.GEAR_EQUIPMENT.map((c, i) => <li key={i} style={{ marginBottom: 'clamp(8px, 2vw, 10px)', color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', paddingLeft: 'clamp(12px, 3vw, 15px)', borderLeft: '2px solid var(--border-color)', lineHeight: '1.5' }}>{formatText(c)}</li>)}
                            </ul>
                        </div>
                    )}

                    {detailedGuide.PRODUCTION_WORKFLOW && (
                        <div style={{ marginBottom: 'clamp(20px, 4vw, 25px)' }}>
                            <h4 style={{ color: '#d8b4fe', marginBottom: 'clamp(8px, 2vw, 10px)', fontSize: 'clamp(1rem, 3.5vw, 1.1rem)' }}>🎬 Workflow</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {detailedGuide.PRODUCTION_WORKFLOW.map((c, i) => <li key={i} style={{ marginBottom: 'clamp(8px, 2vw, 10px)', color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', paddingLeft: 'clamp(12px, 3vw, 15px)', borderLeft: '2px solid var(--border-color)', lineHeight: '1.5' }}>{formatText(c)}</li>)}
                            </ul>
                        </div>
                    )}

                    {detailedGuide.GROWTH_MAINTENANCE && (
                        <div>
                            <h4 style={{ color: '#d8b4fe', marginBottom: 'clamp(8px, 2vw, 10px)', fontSize: 'clamp(1rem, 3.5vw, 1.1rem)' }}>📈 Growth Strategy</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {detailedGuide.GROWTH_MAINTENANCE.map((c, i) => <li key={i} style={{ marginBottom: 'clamp(8px, 2vw, 10px)', color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', paddingLeft: 'clamp(12px, 3vw, 15px)', borderLeft: '2px solid var(--border-color)', lineHeight: '1.5' }}>{formatText(c)}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* ROADMAP SECTION */}
            <div id="roadmap-section" style={{ marginTop: 'clamp(40px, 8vw, 50px)' }}>
                {isMobile ? (
                    <MobileRoadmap
                        steps={mobileSteps}
                        onStepComplete={handleStepComplete}
                    />
                ) : (
                    <>
                        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', marginBottom: 'clamp(16px, 4vw, 20px)', color: 'var(--text-primary)' }}>🗺️ The Journey Ahead</h2>
                        <Roadmap steps={dynamicRoadmapSteps} />
                    </>
                )}
            </div>

        </div>
    );
}
