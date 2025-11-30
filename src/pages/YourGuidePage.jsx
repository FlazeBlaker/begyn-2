// src/pages/YourGuidePage.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { auth, db, doc, getDoc, updateDoc, setDoc } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { generateContent } from "../services/aiApi";
import "../styles/MobileMissionControl.css"; // New Mobile Styles
import Roadmap from "./guide/Roadmap";
import MobileRoadmap from "./guide/MobileRoadmap"; // New Mobile Component

// --- STATIC TACTICAL PLAYBOOK (Instant Load) ---
const TACTICAL_PLAYBOOK = {
    GEAR_EQUIPMENT: [
        "**Camera:** Start with your smartphone (iPhone 13+ or Pixel 6+ recommended). Clean the lens!",
        "**Audio:** Wireless lavalier mic (e.g., Boya or generic Amazon brand) is a game changer.",
        "**Lighting:** Natural window light is best. If dark, get a cheap ring light or softbox.",
        "**Editing:** CapCut (Mobile/Desktop) is free and powerful. DaVinci Resolve for advanced PC users."
    ],
    PRODUCTION_WORKFLOW: [
        "**Batching:** Film 3-5 videos in one session to save setup time.",
        "**Hook First:** Spend 50% of your scripting time on the first 3 seconds.",
        "**B-Roll:** Film random clips of your day/work to overlay on voiceovers.",
        "**Consistency:** Post at the same time daily to train the algorithm."
    ],
    GROWTH_MAINTENANCE: [
        "**Engage:** Reply to every comment in the first hour.",
        "**Analyze:** Check retention graphs. If people drop at 0:05, fix your hook.",
        "**Trend Jacking:** Use trending audio but add your niche twist.",
        "**Community:** DM 5 new followers daily to say thanks."
    ]
};

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

// --- LOADING COMPONENT ---
const LoadingCard = ({ height = "clamp(180px, 20vh, 250px)", title }) => (
    <div className="final-card ai-shimmer" style={{ height, width: '100%', minHeight: height, position: 'relative', overflow: 'hidden' }}>
        {title && <div className="shimmer-line" style={{ width: '40%', height: '24px', marginBottom: '20px', background: 'rgba(255,255,255,0.1)' }}></div>}
        <div className="shimmer-line" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}></div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div className="spin-loader" style={{ width: '30px', height: '30px', borderTopColor: '#a855f7' }}></div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Begynning...</span>
        </div>
    </div>
);

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
                            minWidth: 'clamp(180px, 30vw, 250px)'
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
                            minWidth: 'clamp(40px, 8vw, 50px)',
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

export default function YourGuidePage({ userInfo, setOnboardedStatus }) {
    // Derived state from props
    const brandData = userInfo?.brandData;
    const roadmapProgress = userInfo?.roadmapProgress || {};
    const loading = !userInfo; // Loading if userInfo is not yet available

    // Check if we are in generating state
    const isGenerating = brandData?.roadmapStatus === 'generating';
    const generationStartedRef = useRef(false);

    // Local loading states for independent sections
    const [loadingRoadmap, setLoadingRoadmap] = useState(isGenerating);
    const [loadingChecklist, setLoadingChecklist] = useState(isGenerating);
    const [loadingPillars, setLoadingPillars] = useState(isGenerating);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile detection
    const navigate = useNavigate();
    const uid = auth.currentUser?.uid;

    console.log("YourGuidePage Rendered. UserInfo present:", !!userInfo, "Generating:", isGenerating);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- SPLIT GENERATION LOGIC ---
    useEffect(() => {
        const generateAll = async () => {
            if (!uid || !brandData || !isGenerating || generationStartedRef.current) return;

            generationStartedRef.current = true;
            console.log("STARTING PARALLEL AI GENERATION...");

            // 1. Generate Roadmap Steps
            const pRoadmap = generateContent({
                type: "generateRoadmapSteps",
                payload: {
                    formData: brandData,
                    dynamicAnswers: brandData.dynamicAnswers || []
                }
            }).then(async (res) => {
                let data = typeof res === 'object' ? res : JSON.parse(res);
                const steps = (data.roadmapSteps || []).map((step, index) => ({
                    id: `step-${index + 1}`,
                    title: step.title,
                    description: step.description,
                    detailedDescription: step.detailedDescription || step.description,
                    phase: step.phase,
                    timeEstimate: step.timeEstimate || "30 mins",
                    suggestions: step.suggestions || [],
                    resources: step.resources || [],
                    subNodes: step.subNodes || [],
                    generatorLink: step.generatorLink || null,
                    type: 'ai-generated'
                }));

                await updateDoc(doc(db, "brands", uid), {
                    "brandData.aiGenerated.roadmapSteps": steps
                });
                setLoadingRoadmap(false);
                return steps;
            }).catch(e => {
                console.error("Roadmap Gen Failed:", e);
                setLoadingRoadmap(false);
            });

            // 2. Generate Checklist
            const pChecklist = generateContent({
                type: "generateChecklist",
                payload: { formData: brandData }
            }).then(async (res) => {
                let data = typeof res === 'object' ? res : JSON.parse(res);
                await updateDoc(doc(db, "brands", uid), {
                    "brandData.aiGenerated.sevenDayChecklist": data.sevenDayChecklist || []
                });
                setLoadingChecklist(false);
            }).catch(e => {
                console.error("Checklist Gen Failed:", e);
                setLoadingChecklist(false);
            });

            // 3. Generate Pillars
            const pPillars = generateContent({
                type: "generatePillars",
                payload: { formData: brandData }
            }).then(async (res) => {
                let data = typeof res === 'object' ? res : JSON.parse(res);
                await updateDoc(doc(db, "brands", uid), {
                    "brandData.aiGenerated.contentPillars": data.contentPillars || []
                });
                setLoadingPillars(false);
            }).catch(e => {
                console.error("Pillars Gen Failed:", e);
                setLoadingPillars(false);
            });

            // Wait for all to finish to mark global status as complete
            await Promise.allSettled([pRoadmap, pChecklist, pPillars]);

            // Final update to remove 'generating' status and save static playbook
            await updateDoc(doc(db, "brands", uid), {
                "brandData.roadmapStatus": "complete",
                "brandData.aiGenerated.detailedGuide": TACTICAL_PLAYBOOK
            });

            // Award Credits
            try {
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const funcs = getFunctions();
                const completeGuideFn = httpsCallable(funcs, 'completeGuide');
                await completeGuideFn();
            } catch (creditError) {
                console.error("Failed to award completion credits:", creditError);
            }
        };

        generateAll();
    }, [uid, brandData, isGenerating, userInfo]);


    const updateRoadmapItem = async (category, index, newText) => {
        if (!brandData || !uid) return;
        const newBrandData = JSON.parse(JSON.stringify(brandData));

        // Ensure aiGenerated and the category exist before updating
        if (newBrandData.aiGenerated && Array.isArray(newBrandData.aiGenerated[category])) {
            newBrandData.aiGenerated[category][index] = newText;
            // No local state update needed, Firestore snapshot in App.jsx will trigger re-render
            await updateDoc(doc(db, "brands", uid), { brandData: newBrandData });
        }
    };

    const handleStepComplete = async (stepId) => {
        if (!uid) return;

        // No local state update needed, Firestore snapshot in App.jsx will trigger re-render
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

    if (loading) {
        console.log("Rendering LOADING state");
        return <div className="guide-container"><div className="ai-loader">Begynning...</div></div>;
    }

    // Check if brandData exists AND aiGenerated data exists AND the roadmap steps exist
    // BUT if we are generating, we want to show the UI with loaders
    if (!isGenerating && (!brandData || !brandData.aiGenerated || !brandData.aiGenerated.roadmapSteps)) {
        console.log("Rendering NO MISSION state. BrandData:", brandData);
        return (
            <div className="guide-container">
                <div className="step-container" style={{ textAlign: 'center', padding: 'clamp(24px, 5vw, 40px)' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>No Active Mission Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>It looks like you haven't initialized your creator roadmap yet.</p>
                    <button onClick={retakeGuide} style={{ background: '#a855f7', color: 'white', padding: 'clamp(10px, 2vw, 12px) clamp(20px, 5vw, 30px)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: 'clamp(1rem, 3vw, 1.1rem)' }}>
                        Initialize Begyn Mission Control
                    </button>
                </div>
            </div>
        );
    }


    const gen = brandData.aiGenerated || {};
    const { coreTopic, primaryGoal } = brandData;
    // Use local loading state or fallback to empty array
    const sevenDayChecklist = gen.sevenDayChecklist || [];
    const contentPillars = gen.contentPillars || [];
    const dynamicRoadmapSteps = (gen.roadmapSteps && gen.roadmapSteps.length > 0) ? gen.roadmapSteps : [];
    // Use static playbook if generation is done or if it exists, otherwise static fallback
    const detailedGuide = gen.detailedGuide || TACTICAL_PLAYBOOK;

    // Prepare steps with status for MobileRoadmap
    const mobileSteps = dynamicRoadmapSteps.map(step => ({
        ...step,
        status: roadmapProgress[step.id]?.completed ? 'completed' : (step.id === progressStats.nextStep?.id ? 'in-progress' : 'locked')
    }));

    console.log("Rendering DASHBOARD state. Generating:", isGenerating);
    return (
        <div className={`guide-container ${isMobile ? 'mobile-view' : ''}`} style={{
            minHeight: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'clamp(16px, 5vw, 40px)',
            maxWidth: 'min(95vw, 1400px)',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
        }}>

            {/* HEADER */}
            < div className="mobile-header" style={{
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
                <div style={{ flex: '1 1 auto', minWidth: 'clamp(180px, 30vw, 250px)' }}>
                    <h1 style={{
                        fontSize: 'clamp(1.8rem, 6vw, 2.5rem)',
                        margin: 0,
                        background: 'linear-gradient(to right, var(--text-primary), #a855f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: '1.2'
                    }}>

                        Begyn Mission Control
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        margin: 'clamp(5px, 2vw, 8px) 0 0 0',
                        fontSize: 'clamp(0.85rem, 3vw, 1rem)'
                    }}>Your Begyn command center for content domination.</p>
                </div>
                {!isGenerating && (
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
                )}
            </div >

            {/* DASHBOARD GRID */}
            < div className={`dashboard-grid ${isMobile ? 'mobile-dashboard' : ''}`} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 'clamp(16px, 4vw, 20px)',
                marginBottom: 'clamp(30px, 6vw, 40px)'
            }}>

                {/* CARD 1: MISSION STATUS */}
                {loadingRoadmap ? <LoadingCard height="180px" title /> : (
                    < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
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
                        }}>Begyn Status</h3>
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
                    </div >
                )}

                {/* CARD 2: CURRENT OBJECTIVE */}
                {loadingRoadmap ? <LoadingCard height="180px" title /> : (
                    < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
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
                        }}>Begyn Objective</h3>
                        <div style={{ fontSize: 'clamp(1rem, 4vw, 1.1rem)', fontWeight: '600', marginBottom: 'clamp(5px, 2vw, 8px)', color: 'var(--text-primary)', lineHeight: '1.3' }}>{coreTopic || 'Niche Undefined'}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)' }}>Goal: {primaryGoal || 'Growth'}</div>
                        {
                            progressStats.nextStep && (
                                <div style={{ marginTop: 'clamp(12px, 3vw, 15px)', padding: 'clamp(10px, 3vw, 12px)', background: 'rgba(52, 211, 153, 0.1)', borderLeft: '3px solid #34d399', borderRadius: '6px' }}>
                                    <div style={{ fontSize: 'clamp(0.75rem, 3vw, 0.8rem)', color: '#34d399', fontWeight: 'bold' }}>NEXT UP:</div>
                                    <div style={{ fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>{progressStats.nextStep.title}</div>
                                </div>
                            )
                        }
                    </div >
                )}

                {/* CARD 3: QUICK ACTIONS */}
                {loadingRoadmap ? <LoadingCard height="180px" title /> : (
                    < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
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
                    </div >
                )}
            </div >

            {/* MAIN CONTENT SPLIT */}
            < div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: 'clamp(20px, 5vw, 30px)'
            }}>

                {/* LEFT COL: CHECKLISTS */}
                < div id="checklist-section" >
                    {loadingChecklist ? <LoadingCard height="300px" title /> : (
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
                    )}

                    {loadingPillars ? <LoadingCard height="300px" title /> : (
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
                    )}
                </div >

                {/* RIGHT COL: DETAILED GUIDE (STATIC PLAYBOOK) */}
                < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                    height: 'fit-content',
                    maxHeight: 'clamp(600px, 60vh, 800px)',
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

                    {
                        detailedGuide.GEAR_EQUIPMENT && (
                            <div style={{ marginBottom: 'clamp(20px, 4vw, 25px)' }}>
                                <h4 style={{ color: '#d8b4fe', marginBottom: 'clamp(8px, 2vw, 10px)', fontSize: 'clamp(1rem, 3.5vw, 1.1rem)' }}>🛠️ Gear & Tech</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {detailedGuide.GEAR_EQUIPMENT.map((c, i) => <li key={i} style={{ marginBottom: 'clamp(8px, 2vw, 10px)', color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', paddingLeft: 'clamp(12px, 3vw, 15px)', borderLeft: '2px solid var(--border-color)', lineHeight: '1.5' }}>{formatText(c)}</li>)}
                                </ul>
                            </div>
                        )
                    }

                    {
                        detailedGuide.PRODUCTION_WORKFLOW && (
                            <div style={{ marginBottom: 'clamp(20px, 4vw, 25px)' }}>
                                <h4 style={{ color: '#d8b4fe', marginBottom: 'clamp(8px, 2vw, 10px)', fontSize: 'clamp(1rem, 3.5vw, 1.1rem)' }}>🎬 Workflow</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {detailedGuide.PRODUCTION_WORKFLOW.map((c, i) => <li key={i} style={{ marginBottom: 'clamp(8px, 2vw, 10px)', color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', paddingLeft: 'clamp(12px, 3vw, 15px)', borderLeft: '2px solid var(--border-color)', lineHeight: '1.5' }}>{formatText(c)}</li>)}
                                </ul>
                            </div>
                        )
                    }

                    {
                        detailedGuide.GROWTH_MAINTENANCE && (
                            <div>
                                <h4 style={{ color: '#d8b4fe', marginBottom: 'clamp(8px, 2vw, 10px)', fontSize: 'clamp(1rem, 3.5vw, 1.1rem)' }}>📈 Growth Strategy</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {detailedGuide.GROWTH_MAINTENANCE.map((c, i) => <li key={i} style={{ marginBottom: 'clamp(8px, 2vw, 10px)', color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', paddingLeft: 'clamp(12px, 3vw, 15px)', borderLeft: '2px solid var(--border-color)', lineHeight: '1.5' }}>{formatText(c)}</li>)}
                                </ul>
                            </div>
                        )
                    }
                </div >
            </div >

            {/* ROADMAP SECTION */}
            < div id="roadmap-section" style={{ marginTop: 'clamp(40px, 8vw, 50px)' }}>
                {
                    loadingRoadmap ? <LoadingCard height="400px" title /> : (
                        isMobile ? (
                            <MobileRoadmap
                                steps={mobileSteps}
                                onStepComplete={handleStepComplete}
                            />
                        ) : (
                            <>
                                <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', marginBottom: 'clamp(16px, 4vw, 20px)', color: 'var(--text-primary)' }} >🗺️ The Begyn Journey</h2 >
                                <Roadmap steps={dynamicRoadmapSteps} />
                            </>
                        )
                    )
                }
            </div >

        </div >
    );
}
